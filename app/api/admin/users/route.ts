import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const ADMIN_EMAILS = new Set(["michael.liarzi@gmail.com"]);
const DELETED_BACKUPS_DIR = path.join(process.cwd(), "backups", "deleted-users");
const SIX_MONTHS_MS = 180 * 24 * 60 * 60 * 1000;

function escapeSqlValue(val: any): string {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "number") return val.toString();
  if (typeof val === "boolean") return val ? "TRUE" : "FALSE";
  if (val instanceof Date) return `'${val.toISOString()}'`;
  if (typeof val === "object") return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
  return `'${String(val).replace(/'/g, "''")}'`;
}

async function fetchAllUserReports(supabase: any, userId: string): Promise<any[]> {
  const allReports: any[] = [];
  const pageSize = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      throw new Error("שגיאה בשליפת דיווחי השעות: " + error.message);
    }
    if (!data || data.length === 0) break;
    allReports.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return allReports;
}

/** Clean up physical files in deleted-users older than 6 months */
function cleanupExpiredDeletedFiles() {
  try {
    if (!fs.existsSync(DELETED_BACKUPS_DIR)) return;
    const now = Date.now();
    const files = fs.readdirSync(DELETED_BACKUPS_DIR);
    for (const f of files) {
      const fullPath = path.join(DELETED_BACKUPS_DIR, f);
      const stat = fs.statSync(fullPath);
      if (now - stat.mtimeMs > SIX_MONTHS_MS) {
        console.log(`[Backup Retention] Removing 6-month expired deleted-user backup: ${f}`);
        fs.unlinkSync(fullPath);
      }
    }
  } catch (e) {
    console.error("[Backup Retention] Error cleaning up expired files:", e);
  }
}

/** GET /api/admin/users - List all users (admin only) */
export async function GET() {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user || !user.email || !ADMIN_EMAILS.has(user.email.toLowerCase())) {
      return NextResponse.json({ error: "גישה נדחתה. דרושות הרשאות מנהל." }, { status: 403 });
    }

    const { data: profiles, error: dbError } = await supabase
      .from("profiles")
      .select("id, email, annual_vacation_quota, created_at, reports(count)")
      .order("created_at", { ascending: false });

    // Fetch latest backup for each user from user_backups table
    const lastBackupMap = new Map<string, string>();
    try {
      const { data: latestBackups } = await supabase
        .from("user_backups")
        .select("user_id, created_at")
        .order("created_at", { ascending: false });

      if (latestBackups) {
        for (const b of latestBackups) {
          if (!lastBackupMap.has(b.user_id)) {
            lastBackupMap.set(b.user_id, b.created_at);
          }
        }
      }
    } catch (e) {
      console.warn("Could not fetch user_backups:", e);
    }

    if (dbError) {
      // Fallback without reports join if relation issue occurs
      const { data: fallbackProfiles, error: fallbackError } = await supabase
        .from("profiles")
        .select("id, email, annual_vacation_quota, created_at")
        .order("created_at", { ascending: false });

      if (fallbackError) {
        return NextResponse.json({ error: fallbackError.message }, { status: 500 });
      }

      const mapped = (fallbackProfiles || []).map((p: any) => ({
        id: p.id,
        email: p.email,
        annual_vacation_quota: p.annual_vacation_quota,
        created_at: p.created_at,
        reports_count: null,
        last_backup_at: lastBackupMap.get(p.id) || null,
        is_current_auth_user: p.id === user.id,
      }));
      return NextResponse.json({ users: mapped });
    }

    const mapped = (profiles || []).map((p: any) => ({
      id: p.id,
      email: p.email,
      annual_vacation_quota: p.annual_vacation_quota,
      created_at: p.created_at,
      reports_count: p.reports?.[0]?.count ?? 0,
      last_backup_at: lastBackupMap.get(p.id) || null,
      is_current_auth_user: p.id === user.id,
    }));

    return NextResponse.json({ users: mapped });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "שגיאה בטעינת משתמשים" },
      { status: 500 }
    );
  }
}

/** DELETE /api/admin/users - Pre-backup (6-month retention) and delete user */
export async function DELETE(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user || !user.email || !ADMIN_EMAILS.has(user.email.toLowerCase())) {
      return NextResponse.json({ error: "גישה נדחתה. דרושות הרשאות מנהל." }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    let email = typeof body.email === "string" ? body.email.trim() : null;
    let userId = typeof body.userId === "string" ? body.userId.trim() : null;

    if (!email && !userId) {
      return NextResponse.json({ error: "נא לספק מזהה משתמש או כתובת אימייל למחיקה." }, { status: 400 });
    }

    // Safety guard: Never allow deleting the currently logged-in active user!
    if (userId && userId === user.id) {
      return NextResponse.json({ error: "פעולה חסומה: לא ניתן למחוק את החשבון הפעיל המחובר כעת." }, { status: 400 });
    }
    if (email && email.toLowerCase() === user.email.toLowerCase()) {
      return NextResponse.json({ error: "פעולה חסומה: לא ניתן למחוק את כתובת האימייל של החשבון המחובר." }, { status: 400 });
    }

    // 1. Resolve user profile and details for pre-deletion backup
    let profileQuery = supabase.from("profiles").select("*");
    if (userId) {
      profileQuery = profileQuery.eq("id", userId);
    } else if (email) {
      profileQuery = profileQuery.eq("email", email);
    }
    const { data: profiles } = await profileQuery;
    const targetProfile = profiles?.[0];

    const resolvedUserId = targetProfile?.id || userId;
    const resolvedEmail = targetProfile?.email || email || resolvedUserId;

    // Additional safety guard
    if (resolvedUserId === user.id || resolvedEmail.toLowerCase() === user.email.toLowerCase()) {
      return NextResponse.json({ error: "פעולה חסומה: לא ניתן למחוק את החשבון הפעיל." }, { status: 400 });
    }

    // 2. Fetch all reports and workday_standards for backup before deletion
    let userReports: any[] = [];
    let userStandards: any[] = [];
    if (resolvedUserId) {
      userReports = await fetchAllUserReports(supabase, resolvedUserId);

      const { data: stds } = await supabase
        .from("workday_standards")
        .select("*")
        .eq("user_id", resolvedUserId);
      userStandards = stds || [];
    }

    // 3. Generate SQL & JSON pre-deletion backup
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SIX_MONTHS_MS);
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, "");
    const safeEmail = resolvedEmail.replace(/[^a-zA-Z0-9_-]/g, "_");

    const backupFileName = `deleted-user-${safeEmail}-${dateStr}-${timeStr}.sql`;

    const sqlLines = [
      `-- ============================================================`,
      `-- PRE-DELETION USER BACKUP (Retention: 6 Months until ${expiresAt.toISOString().slice(0, 10)})`,
      `-- User: ${resolvedEmail}`,
      `-- User ID: ${resolvedUserId}`,
      `-- Deleted At: ${now.toISOString()}`,
      `-- Expires At: ${expiresAt.toISOString()}`,
      `-- Total Reports: ${userReports.length}`,
      `-- Total Standards: ${userStandards.length}`,
      `-- ============================================================`,
      `BEGIN;`,
      ``,
    ];

    if (targetProfile) {
      sqlLines.push(`-- Profile`);
      sqlLines.push(`INSERT INTO public.profiles ("id", "email", "annual_vacation_quota") VALUES (${escapeSqlValue(targetProfile.id)}, ${escapeSqlValue(targetProfile.email)}, ${escapeSqlValue(targetProfile.annual_vacation_quota)}) ON CONFLICT (id) DO NOTHING;`);
      sqlLines.push(``);
    }

    if (userStandards.length > 0) {
      sqlLines.push(`-- Workday Standards (${userStandards.length} rows)`);
      for (const std of userStandards) {
        const keys = Object.keys(std);
        const cols = keys.map((k) => `"${k}"`).join(", ");
        const vals = keys.map((k) => escapeSqlValue(std[k])).join(", ");
        sqlLines.push(`INSERT INTO public.workday_standards (${cols}) VALUES (${vals});`);
      }
      sqlLines.push(``);
    }

    if (userReports.length > 0) {
      sqlLines.push(`-- Reports (${userReports.length} rows)`);
      for (const rep of userReports) {
        const keys = Object.keys(rep);
        const cols = keys.map((k) => `"${k}"`).join(", ");
        const vals = keys.map((k) => escapeSqlValue(rep[k])).join(", ");
        sqlLines.push(`INSERT INTO public.reports (${cols}) VALUES (${vals});`);
      }
      sqlLines.push(``);
    }

    sqlLines.push(`COMMIT;`);
    const backupSql = sqlLines.join("\n");

    // Optional write file to disk (non-blocking for serverless/read-only environments)
    try {
      const targetDir = process.env.VERCEL ? "/tmp" : DELETED_BACKUPS_DIR;
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      fs.writeFileSync(path.join(targetDir, backupFileName), backupSql, "utf8");
    } catch (diskErr) {
      console.warn("[Pre-deletion Backup] Could not write to disk (safe to ignore on serverless):", diskErr);
    }

    // Save to PostgreSQL deleted_user_backups table for 6 months
    try {
      await supabase.from("deleted_user_backups").insert({
        user_id: resolvedUserId,
        email: resolvedEmail,
        reports_count: userReports.length,
        backup_data: {
          profile: targetProfile,
          standards: userStandards,
          reports: userReports,
        },
        backup_sql: backupSql,
        deleted_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      });

      // Run automated DB cleanup for expired backups older than 6 months
      await supabase.rpc("cleanup_expired_deleted_user_backups");
    } catch (dbSaveErr) {
      console.warn("[Pre-deletion Backup] Could not save to DB table (saved to disk):", dbSaveErr);
    }

    // Clean up physical disk files older than 6 months
    cleanupExpiredDeletedFiles();

    // 4. Perform actual user deletion via RPC
    let rpcResponse: any;
    if (resolvedUserId) {
      rpcResponse = await supabase.rpc("delete_user_by_id", { target_user_id: resolvedUserId });
    } else {
      rpcResponse = await supabase.rpc("delete_user_by_email", { target_email: resolvedEmail });
    }

    if (rpcResponse.error) {
      return NextResponse.json({ error: rpcResponse.error.message }, { status: 500 });
    }

    const result = rpcResponse.data;
    if (!result?.success) {
      return NextResponse.json({ error: result?.error || "המחיקה נכשלה" }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      message: `המשתמש ${resolvedEmail} נמחק בהצלחה. בוצע גיבוי מקדים של ${userReports.length} דיווחים שיישמר למשך 6 חודשים.`,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "שגיאה במחיקת המשתמש" },
      { status: 500 }
    );
  }
}

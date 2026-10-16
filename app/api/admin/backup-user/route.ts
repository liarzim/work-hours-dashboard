import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const ADMIN_EMAILS = new Set(["michael.liarzi@gmail.com"]);
const BACKUP_USER_DIR = path.join(process.cwd(), "backups", "users");

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

/** POST /api/admin/backup-user - Backup data for a specific user */
export async function POST(req: NextRequest) {
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
    const targetUserId = typeof body.userId === "string" ? body.userId.trim() : null;
    let targetEmail = typeof body.email === "string" ? body.email.trim() : null;

    if (!targetUserId && !targetEmail) {
      return NextResponse.json({ error: "נא לציין מזהה משתמש או אימייל לגיבוי." }, { status: 400 });
    }

    // Resolve user profile
    let profileQuery = supabase.from("profiles").select("*");
    if (targetUserId) {
      profileQuery = profileQuery.eq("id", targetUserId);
    } else if (targetEmail) {
      profileQuery = profileQuery.eq("email", targetEmail);
    }
    const { data: profiles, error: profileErr } = await profileQuery;
    if (profileErr || !profiles || profiles.length === 0) {
      return NextResponse.json({ error: "פרופיל המשתמש לא נמצא." }, { status: 404 });
    }

    const profile = profiles[0];
    const resolvedUserId = profile.id;
    targetEmail = profile.email || targetEmail || resolvedUserId;

    // Fetch all reports using pagination to prevent 1000 limit
    const userReports = await fetchAllUserReports(supabase, resolvedUserId);

    // Fetch workday standards
    const { data: standards, error: standardsErr } = await supabase
      .from("workday_standards")
      .select("*")
      .eq("user_id", resolvedUserId);

    if (standardsErr) {
      console.warn("Could not fetch workday standards for user:", standardsErr.message);
    }

    const userStandards = standards || [];

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, "");
    const safeEmail = targetEmail.replace(/[^a-zA-Z0-9_-]/g, "_");
    const fileName = `backup-user-${safeEmail}-${dateStr}-${timeStr}.sql`;

    // Build SQL Dump
    const lines = [
      `-- ============================================================`,
      `-- User Data Backup: ${targetEmail}`,
      `-- User ID: ${resolvedUserId}`,
      `-- Date: ${now.toISOString()}`,
      `-- Total Reports: ${userReports.length}`,
      `-- Total Standards: ${userStandards.length}`,
      `-- ============================================================`,
      `BEGIN;`,
      ``,
      `-- 1. Profile`,
      `INSERT INTO public.profiles ("id", "email", "annual_vacation_quota") VALUES (${escapeSqlValue(profile.id)}, ${escapeSqlValue(profile.email)}, ${escapeSqlValue(profile.annual_vacation_quota)}) ON CONFLICT (id) DO UPDATE SET "annual_vacation_quota" = EXCLUDED."annual_vacation_quota";`,
      ``,
      `-- 2. Workday Standards (${userStandards.length} rows)`,
      `DELETE FROM public.workday_standards WHERE "user_id" = ${escapeSqlValue(resolvedUserId)};`,
    ];

    for (const std of userStandards) {
      const keys = Object.keys(std);
      const cols = keys.map((k) => `"${k}"`).join(", ");
      const vals = keys.map((k) => escapeSqlValue(std[k])).join(", ");
      lines.push(`INSERT INTO public.workday_standards (${cols}) VALUES (${vals});`);
    }

    lines.push(``);
    lines.push(`-- 3. Reports (${userReports.length} rows)`);
    lines.push(`DELETE FROM public.reports WHERE "user_id" = ${escapeSqlValue(resolvedUserId)};`);

    for (const rep of userReports) {
      const keys = Object.keys(rep);
      const cols = keys.map((k) => `"${k}"`).join(", ");
      const vals = keys.map((k) => escapeSqlValue(rep[k])).join(", ");
      lines.push(`INSERT INTO public.reports (${cols}) VALUES (${vals});`);
    }

    lines.push(``);
    lines.push(`COMMIT;`);
    lines.push(`-- Backup completed for user ${targetEmail}.`);

    const sqlContent = lines.join("\n");

    // 1. Save backup permanently to PostgreSQL public.user_backups table
    try {
      await supabase.from("user_backups").insert({
        user_id: resolvedUserId,
        email: targetEmail,
        filename: fileName,
        reports_count: userReports.length,
        standards_count: userStandards.length,
        backup_sql: sqlContent,
      });
    } catch (dbErr) {
      console.warn("[User Backup] Could not save to DB table:", dbErr);
    }

    // 2. Optional disk write (non-blocking for serverless/read-only environments like Vercel)
    try {
      const targetDir = process.env.VERCEL ? "/tmp" : BACKUP_USER_DIR;
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      fs.writeFileSync(path.join(targetDir, fileName), sqlContent, "utf8");
    } catch (diskErr) {
      console.warn("[User Backup] Could not write to disk (safe to ignore on serverless):", diskErr);
    }

    return NextResponse.json({
      ok: true,
      filename: fileName,
      reportsCount: userReports.length,
      standardsCount: userStandards.length,
      userEmail: targetEmail,
      sqlContent,
      message: `הגיבוי נוצר בהצלחה! נשמרו ${userReports.length.toLocaleString("he-IL")} דיווחים.`,
    });
  } catch (e) {
    console.error("[User Backup Error]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "שגיאה ביצירת גיבוי למשתמש" },
      { status: 500 }
    );
  }
}

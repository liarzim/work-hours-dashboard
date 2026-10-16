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

    // Fetch reports
    const { data: reports, error: reportsErr } = await supabase
      .from("reports")
      .select("*")
      .eq("user_id", resolvedUserId)
      .order("date", { ascending: true });

    if (reportsErr) {
      return NextResponse.json({ error: "שגיאה בשליפת דיווחי השעות: " + reportsErr.message }, { status: 500 });
    }

    // Fetch workday standards
    const { data: standards, error: standardsErr } = await supabase
      .from("workday_standards")
      .select("*")
      .eq("user_id", resolvedUserId);

    if (standardsErr) {
      console.warn("Could not fetch workday standards for user:", standardsErr.message);
    }

    const userReports = reports || [];
    const userStandards = standards || [];

    // Ensure directory exists
    if (!fs.existsSync(BACKUP_USER_DIR)) {
      fs.mkdirSync(BACKUP_USER_DIR, { recursive: true });
    }

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, "");
    const safeEmail = targetEmail.replace(/[^a-zA-Z0-9_-]/g, "_");
    const fileName = `backup-user-${safeEmail}-${dateStr}-${timeStr}.sql`;
    const filePath = path.join(BACKUP_USER_DIR, fileName);

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
    fs.writeFileSync(filePath, sqlContent, "utf8");

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

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/user/backups - List personal backups for the authenticated user
 */
export async function GET() {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "משתמש לא מחובר" }, { status: 401 });
    }

    const { data: backups, error: dbErr } = await supabase
      .from("user_backups")
      .select("id, filename, reports_count, standards_count, terms_count, backup_type, file_size_kb, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (dbErr) {
      throw new Error("שגיאה בשליפת הגיבויים האישיים: " + dbErr.message);
    }

    return NextResponse.json({
      ok: true,
      backups: backups || [],
    });
  } catch (err: any) {
    console.error("[User Backups GET Error]", err);
    return NextResponse.json(
      { error: err.message || "שגיאה בטעינת גיבויים אישיים" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user/backups - Create personal backup, restore personal backup, or download SQL
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "משתמש לא מחובר" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action;

    // 1. Action: CREATE PERSONAL BACKUP
    if (action === "create") {
      const { data, error } = await supabase.rpc("generate_user_backup", {
        p_user_id: user.id,
        p_backup_type: "manual_user",
      });

      if (error) {
        throw new Error("שגיאה ביצירת הגיבוי האישי ב-NAS: " + error.message);
      }

      return NextResponse.json({
        ok: true,
        backupId: data,
        message: "הגיבוי האישי שלך נשמר בהצלחה ב-NAS!",
      });
    }

    // 2. Action: RESTORE PERSONAL BACKUP
    if (action === "restore") {
      const backupId = body.backupId;
      if (!backupId) {
        return NextResponse.json({ error: "מזהה גיבוי חסר לשחזור." }, { status: 400 });
      }

      const { data, error } = await supabase.rpc("restore_user_backup_by_id", {
        p_backup_id: backupId,
        p_user_id: user.id,
      });

      if (error) {
        throw new Error("שגיאה בשחזור הגיבוי האישי: " + error.message);
      }

      return NextResponse.json({
        ok: true,
        result: data,
        message: "הנתונים האישיים שלך שוחזרו בהצלחה מנקודת הגיבוי! (נוצר גיבוי ביטחון אישי מקדים)",
      });
    }

    // 3. Action: DOWNLOAD PERSONAL SQL
    if (action === "download") {
      const backupId = body.backupId;
      if (!backupId) {
        return NextResponse.json({ error: "מזהה גיבוי חסר להורדה." }, { status: 400 });
      }

      const { data, error } = await supabase
        .from("user_backups")
        .select("filename, backup_sql")
        .eq("id", backupId)
        .eq("user_id", user.id)
        .single();

      if (error || !data) {
        throw new Error("קובץ הגיבוי לא נמצא או שאינו שייך לך: " + (error?.message || ""));
      }

      return NextResponse.json({
        ok: true,
        filename: data.filename,
        sql: data.backup_sql,
      });
    }

    return NextResponse.json({ error: "פעולה לא חוקית." }, { status: 400 });
  } catch (err: any) {
    console.error("[User Backups POST Error]", err);
    return NextResponse.json(
      { error: err.message || "שגיאה בביצוע הפעולה" },
      { status: 500 }
    );
  }
}

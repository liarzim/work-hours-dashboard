import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ADMIN_EMAILS = new Set(["michael.liarzi@gmail.com"]);

/**
 * GET /api/user/backups - List personal backups or download backup by ID
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "משתמש לא מחובר" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const backupId = searchParams.get("id");
    const isAdmin = user.email ? ADMIN_EMAILS.has(user.email.toLowerCase()) : false;

    // Single backup download
    if (backupId) {
      let query = supabase
        .from("user_backups")
        .select("id, filename, backup_sql, user_id")
        .eq("id", backupId);

      if (!isAdmin) {
        query = query.eq("user_id", user.id);
      }

      const { data, error: dbErr } = await query.single();
      if (dbErr || !data) {
        return NextResponse.json({ error: "קובץ גיבוי לא נמצא או שאינך מורשה לגשת אליו" }, { status: 404 });
      }

      return NextResponse.json({
        ok: true,
        filename: data.filename,
        sql_dump: data.backup_sql,
      });
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

      const isAdmin = user.email ? ADMIN_EMAILS.has(user.email.toLowerCase()) : false;
      const targetUserId = (isAdmin && body.targetUserId) ? body.targetUserId : user.id;

      const { data, error } = await supabase.rpc("restore_user_backup_by_id", {
        p_backup_id: backupId,
        p_user_id: targetUserId,
      });

      if (error) {
        throw new Error("שגיאה בשחזור הגיבוי: " + error.message);
      }

      return NextResponse.json({
        ok: true,
        result: data,
        message: "הנתונים שוחזרו בהצלחה מנקודת הגיבוי! (נוצר גיבוי ביטחון מקדים)",
      });
    }

    // 3. Action: DOWNLOAD PERSONAL SQL
    if (action === "download") {
      const backupId = body.backupId;
      if (!backupId) {
        return NextResponse.json({ error: "מזהה גיבוי חסר להורדה." }, { status: 400 });
      }

      const isAdmin = user.email ? ADMIN_EMAILS.has(user.email.toLowerCase()) : false;
      let query = supabase
        .from("user_backups")
        .select("filename, backup_sql, user_id")
        .eq("id", backupId);

      if (!isAdmin) {
        query = query.eq("user_id", user.id);
      }

      const { data, error } = await query.single();

      if (error || !data) {
        throw new Error("קובץ הגיבוי לא נמצא או שאינך מורשה לגשת אליו: " + (error?.message || ""));
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

/**
 * DELETE /api/user/backups - Delete a user backup by ID (owner or admin)
 */
export async function DELETE(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "משתמש לא מחובר" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const body = await req.json().catch(() => ({}));
    const backupId = searchParams.get("id") || body.backupId || body.id;

    if (!backupId) {
      return NextResponse.json({ error: "מזהה גיבוי חסר למחיקה." }, { status: 400 });
    }

    const isAdmin = user.email ? ADMIN_EMAILS.has(user.email.toLowerCase()) : false;

    let query = supabase.from("user_backups").delete().eq("id", backupId);
    if (!isAdmin) {
      query = query.eq("user_id", user.id);
    }

    const { error: delErr } = await query;
    if (delErr) {
      throw new Error("שגיאה במחיקת הגיבוי: " + delErr.message);
    }

    return NextResponse.json({
      ok: true,
      message: "הגיבוי נמחק בהצלחה מה-NAS.",
    });
  } catch (err: any) {
    console.error("[User Backup DELETE Error]", err);
    return NextResponse.json(
      { error: err.message || "שגיאה במחיקת הגיבוי" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ADMIN_EMAILS = new Set(["michael.liarzi@gmail.com"]);

/**
 * GET /api/admin/backups - List system backups and current retention setting stored on the NAS
 */
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

    const { data: backups, error: dbErr } = await supabase
      .from("system_backups")
      .select("id, filename, backup_type, reports_count, profiles_count, standards_count, terms_count, file_size_kb, created_at")
      .order("created_at", { ascending: false });

    if (dbErr) {
      throw new Error("שגיאה בשליפת רשימת הגיבויים מה-NAS: " + dbErr.message);
    }

    // Fetch retention setting
    const { data: configData } = await supabase
      .from("system_config")
      .select("value")
      .eq("key", "backup_retention_days")
      .maybeSingle();

    let retentionDays = 30;
    if (configData?.value !== undefined && configData?.value !== null) {
      const parsed = parseInt(String(configData.value), 10);
      if (!isNaN(parsed) && parsed >= 1) {
        retentionDays = parsed;
      }
    }

    return NextResponse.json({
      ok: true,
      backups: backups || [],
      retentionDays,
    });
  } catch (err: any) {
    console.error("[Backups API GET Error]", err);
    return NextResponse.json(
      { error: err.message || "שגיאה בטעינת גיבויים" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/backups - Create, restore, download NAS backups, or set retention days
 */
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
    const action = body.action;

    // 1. Action: SET RETENTION DAYS
    if (action === "set_retention") {
      const days = parseInt(body.retentionDays, 10);
      if (isNaN(days) || days < 1 || days > 365) {
        return NextResponse.json({ error: "מספר הימים חייב להיות מספר חיובי בין 1 ל-365." }, { status: 400 });
      }

      const { error: upsertErr } = await supabase
        .from("system_config")
        .upsert({
          key: "backup_retention_days",
          value: days,
          updated_at: new Date().toISOString(),
        });

      if (upsertErr) {
        throw new Error("שגיאה בעדכון ימי הגיבוי: " + upsertErr.message);
      }

      // Enforce immediate cleanup of backups beyond the new limit
      try {
        const { data: allBackups } = await supabase
          .from("system_backups")
          .select("id")
          .order("created_at", { ascending: false });

        if (allBackups && allBackups.length > days) {
          const toDeleteIds = allBackups.slice(days).map((b) => b.id);
          await supabase.from("system_backups").delete().in("id", toDeleteIds);
        }
      } catch (cleanErr) {
        console.warn("Immediate cleanup note:", cleanErr);
      }

      return NextResponse.json({
        ok: true,
        retentionDays: days,
        message: `מדיניות השמירה עודכנה בהצלחה: יישמרו ${days} ימי גיבוי אחרונים ב-NAS.`,
      });
    }

    // 2. Action: CREATE MANUAL BACKUP ON NAS
    if (action === "create") {
      const { data, error } = await supabase.rpc("generate_system_backup", {
        p_backup_type: "manual_admin",
      });

      if (error) {
        throw new Error("שגיאה ביצירת הגיבוי ב-NAS: " + error.message);
      }

      return NextResponse.json({
        ok: true,
        backupId: data,
        message: "הגיבוי נוצר ונשמר בהצלחה ב-NAS!",
      });
    }

    // 3. Action: RESTORE BACKUP FROM NAS
    if (action === "restore") {
      const backupId = body.backupId;
      if (!backupId) {
        return NextResponse.json({ error: "מזהה גיבוי חסר לשחזור." }, { status: 400 });
      }

      const { data, error } = await supabase.rpc("restore_system_backup_by_id", {
        p_backup_id: backupId,
      });

      if (error) {
        throw new Error("שגיאה בביצוע השחזור ב-NAS: " + error.message);
      }

      return NextResponse.json({
        ok: true,
        result: data,
        message: "המערכת שוחזרה בהצלחה לנקודת הגיבוי שנבחרה! (נוצר גיבוי ביטחון מקדים באופן אוטומטי)",
      });
    }

    // 4. Action: DOWNLOAD SQL CONTENT OF A BACKUP
    if (action === "download") {
      const backupId = body.backupId;
      if (!backupId) {
        return NextResponse.json({ error: "מזהה גיבוי חסר להורדה." }, { status: 400 });
      }

      const { data, error } = await supabase
        .from("system_backups")
        .select("filename, backup_sql")
        .eq("id", backupId)
        .single();

      if (error || !data) {
        throw new Error("קובץ הגיבוי לא נמצא ב-NAS: " + (error?.message || ""));
      }

      return NextResponse.json({
        ok: true,
        filename: data.filename,
        sql: data.backup_sql,
      });
    }

    return NextResponse.json({ error: "פעולה לא חוקית." }, { status: 400 });
  } catch (err: any) {
    console.error("[Backups API POST Error]", err);
    return NextResponse.json(
      { error: err.message || "שגיאה בביצוע הפעולה" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/backups - Delete a system backup by ID (admin only)
 */
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

    const { searchParams } = new URL(req.url);
    const body = await req.json().catch(() => ({}));
    const backupId = searchParams.get("id") || body.backupId || body.id;

    if (!backupId) {
      return NextResponse.json({ error: "מזהה גיבוי חסר למחיקה." }, { status: 400 });
    }

    const { error: delErr } = await supabase
      .from("system_backups")
      .delete()
      .eq("id", backupId);

    if (delErr) {
      throw new Error("שגיאה במחיקת גיבוי המערכת: " + delErr.message);
    }

    return NextResponse.json({
      ok: true,
      message: "גיבוי המערכת נמחק בהצלחה מה-NAS.",
    });
  } catch (err: any) {
    console.error("[System Backup DELETE Error]", err);
    return NextResponse.json(
      { error: err.message || "שגיאה במחיקת הגיבוי" },
      { status: 500 }
    );
  }
}

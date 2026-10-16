import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ADMIN_EMAILS = new Set(["michael.liarzi@gmail.com"]);

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
      .select("id, email, annual_vacation_quota, created_at")
      .order("created_at", { ascending: false });

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ users: profiles || [] });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "שגיאה בטעינת משתמשים" },
      { status: 500 }
    );
  }
}

/** DELETE /api/admin/users - Delete a user and wipe all their data (admin only) */
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
    const email = typeof body.email === "string" ? body.email.trim() : null;
    const userId = typeof body.userId === "string" ? body.userId.trim() : null;

    if (!email && !userId) {
      return NextResponse.json({ error: "נא לספק מזהה משתמש או כתובת אימייל למחיקה." }, { status: 400 });
    }

    // Call RPC function in DB with SECURITY DEFINER
    let rpcResponse: any;
    if (email) {
      rpcResponse = await supabase.rpc("delete_user_by_email", { target_email: email });
    } else if (userId) {
      rpcResponse = await supabase.rpc("delete_user_by_id", { target_user_id: userId });
    }

    if (rpcResponse.error) {
      return NextResponse.json({ error: rpcResponse.error.message }, { status: 500 });
    }

    const result = rpcResponse.data;
    if (!result?.success) {
      return NextResponse.json({ error: result?.error || "המחיקה נכשלה" }, { status: 400 });
    }

    return NextResponse.json({ ok: true, message: result.message });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "שגיאה במחיקת המשתמש" },
      { status: 500 }
    );
  }
}

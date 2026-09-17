import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /auth/callback — completes the Supabase OAuth / email verification login flow.
 * Exchanges the code parameter for a session, setting cookies, and redirects to home.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next") ?? "/";
  // Validate that next is a relative path starting with a single '/' to prevent open redirects (e.g. //evil.com or /\evil.com)
  const safeNext =
    typeof rawNext === "string" &&
    rawNext.startsWith("/") &&
    !rawNext.startsWith("//") &&
    !rawNext.startsWith("/\\")
      ? rawNext
      : "/";

  if (code) {
    try {
      const supabase = createSupabaseServerClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return NextResponse.redirect(`${origin}${safeNext}`);
      }
      console.error("Auth exchange error:", error);
    } catch (err) {
      console.error("Auth exchange exception:", err);
    }
  }

  // Redirect to login page on authentication failure
  return NextResponse.redirect(`${origin}/login?auth=failed`);
}

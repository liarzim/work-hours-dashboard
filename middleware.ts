import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const isAuthPage = request.nextUrl.pathname.startsWith("/login");
  const isAuthCallback = request.nextUrl.pathname.startsWith("/auth/callback");
  const isApiRequest = request.nextUrl.pathname.startsWith("/api/");

  // Bypass middleware logic if Supabase is not configured (mock mode active)
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return response;
  }

  // FAST PATH: Check if any Supabase session cookies exist in the request.
  // Supabase SSR cookies always have names starting with "sb-".
  // If no auth cookies exist, there is no active session — no need to make external network calls!
  const hasAuthCookies = request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-"));

  if (!hasAuthCookies) {
    if (isAuthPage || isAuthCallback) {
      return response;
    }
    if (isApiRequest) {
      return NextResponse.json(
        { error: "משתמש לא מחובר", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // User has auth cookies: verify with Supabase.
  // We protect this with a strict 2.5s timeout to prevent Vercel 504 MIDDLEWARE_INVOCATION_TIMEOUT
  // in case the self-hosted database, tunnel, or network is slow or unreachable.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  let user = null;
  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      const timer = setTimeout(() => reject(new Error("AUTH_TIMEOUT")), 2500);
      if (typeof timer.unref === "function") timer.unref();
    });

    const result = await Promise.race([
      supabase.auth.getUser(),
      timeoutPromise,
    ]);
    user = result?.data?.user ?? null;
  } catch (err) {
    // If the database is unreachable, timing out, or invalid credentials, fail gracefully
    console.warn("Middleware: Auth verification failed or timed out:", err);
    user = null;
  }

  if (!user && !isAuthPage && !isAuthCallback) {
    if (isApiRequest) {
      return NextResponse.json(
        { error: "משתמש לא מחובר", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user && isAuthPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - icon-192.png, icon-512.png (PWA icons)
     * - manifest.json (PWA manifest)
     * - sw.js (PWA service worker)
     */
    "/((?!_next/static|_next/image|favicon.ico|icon-192.png|icon-512.png|manifest.json|sw.js).*)",
  ],
};

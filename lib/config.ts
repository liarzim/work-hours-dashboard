import "server-only";

/**
 * Checks if the Supabase environment variables are configured.
 * If not, the application falls back to Mock (in-memory demo) mode.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function currentMode(): "live" | "mock" {
  return isSupabaseConfigured() ? "live" : "mock";
}
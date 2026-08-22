// Central place to read Supabase env vars and know whether they're real.
// While the values are still placeholders (or missing), `isSupabaseConfigured`
// is false and the app gracefully falls back to the gist data + disabled auth,
// so nothing crashes before you finish setting up your project.

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured =
  SUPABASE_URL.length > 0 &&
  SUPABASE_ANON_KEY.length > 0 &&
  !SUPABASE_URL.includes("your-project") &&
  !SUPABASE_ANON_KEY.includes("your-anon-key");

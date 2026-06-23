// Public by design (RLS protects the data). Overridable via env on Vercel.
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://sktbbdgcubnedpsvzxxp.supabase.co";
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "sb_publishable_lbDiWL5tuQXQ2UUB4DEknw_9w3gfv7T";
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://repotato.sh";
export const GITHUB_URL =
  process.env.NEXT_PUBLIC_GITHUB_URL ?? "https://github.com/mnlt/repotato";

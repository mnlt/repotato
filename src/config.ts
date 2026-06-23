// Supabase connection. The publishable key is public by design (RLS protects
// the data) — safe to ship in the client/repo. Never put the service_role key
// here.
export const SUPABASE_URL = "https://sktbbdgcubnedpsvzxxp.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_lbDiWL5tuQXQ2UUB4DEknw_9w3gfv7T";

// The web showcase base URL — used to build shareable product links.
export const SITE_URL = process.env.REPOTATO_SITE_URL ?? "https://repotato.vercel.app";

// GitHub OAuth App Client ID for the device flow (used to star repos on upvote).
// NOT a secret — device flow is built for public clients (no client secret).
// Fill this with your OAuth App's Client ID and enable "Device Flow" on it.
export const GITHUB_CLIENT_ID = "Ov23lit6ck78QwDXoKCI";

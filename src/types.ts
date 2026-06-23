// Mirror of the Supabase `products` row. Keep in sync with supabase/schema.sql
// when the backend lands (Fase 1 step 1). The CLI never sees the DB directly in
// the walking skeleton — `api.ts` is the seam we swap fixture -> Supabase later.
export interface Product {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  /** "owner/repo" — used for the star action and the OpenGraph cover. */
  repo_full_name: string;
  /** The maker/owner (the repo's GitHub owner). */
  built_by_login: string;
  built_by_avatar_url: string;
  /** The "hunter" — who submitted it (may differ from the owner). */
  posted_by_login?: string | null;
  posted_by_github_id?: number | null;
  cover_url: string;
  /** Full-quality demo (gif/video/image) opened in the browser via "view demo".
   *  Falls back to cover_url when absent. */
  demo_url?: string;
  media_type: "image" | "gif" | "video";
  /** Source of truth later = the repo's GitHub topics; fixture for now. */
  tags: string[];
  stars_cached: number;
  upvotes_count: number;
  created_at?: string;
}

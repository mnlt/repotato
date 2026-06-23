import type { Product } from "./types.js";
import { products as fixture } from "./fixtures/products.js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const headers = {
  apikey: SUPABASE_ANON_KEY,
  authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  "content-type": "application/json",
};

export interface AppStatus {
  min_version: string;
  latest_version: string | null;
  message: string | null;
  message_level: "info" | "warn";
}

/** Remote app status: min supported version, latest version, and an optional
 *  message to show users (MOTD). Read-only, public. */
export async function getAppStatus(): Promise<AppStatus | null> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/app_status?id=eq.1&select=min_version,latest_version,message,message_level`,
      { headers },
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as AppStatus[];
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

// The data seam. Reads from Supabase PostgREST with the publishable key; RLS
// limits this to approved products. Falls back to the local fixture if the
// request fails (offline, schema not applied yet) so the TUI never breaks.
export async function getFeed(): Promise<Product[]> {
  try {
    const url =
      `${SUPABASE_URL}/rest/v1/products` +
      `?status=eq.approved&order=upvotes_count.desc&select=*`;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`supabase ${res.status}`);
    const rows = (await res.json()) as Product[];
    if (!Array.isArray(rows) || rows.length === 0) throw new Error("empty");
    return rows;
  } catch {
    return fixture;
  }
}

/** Upsert this install into users (telemetry for future prioritization). Fire
 *  and forget — never blocks or breaks the UI. */
export async function registerUser(opts: {
  installId: string;
  os: string;
  terminal: string;
  githubId?: number | null;
  githubLogin?: string | null;
}): Promise<void> {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/rpc/register_user`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        p_install_id: opts.installId,
        p_os: opts.os,
        p_terminal: opts.terminal,
        p_github_id: opts.githubId ?? null,
        p_github_login: opts.githubLogin ?? null,
      }),
    });
  } catch {
    /* non-fatal */
  }
}

/** Submit a product via the `submit` Edge Function. The function verifies the
 *  GitHub token (poster identity), fetches the repo (owner/cover/tags/stars) and
 *  inserts it as pending. Returns {ok, status:'pending'|'exists'} or an error. */
export async function submitProduct(
  repoFullName: string,
  githubToken: string,
  overrides?: { tagline?: string },
): Promise<{ ok: boolean; status?: string; slug?: string; error?: string }> {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/submit`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        repo_full_name: repoFullName,
        github_token: githubToken,
        tagline: overrides?.tagline,
      }),
    });
    const j = (await res.json()) as { status?: string; slug?: string; error?: string };
    if (!res.ok) return { ok: false, error: j.error || `submit ${res.status}` };
    return { ok: true, status: j.status, slug: j.slug };
  } catch (e) {
    return { ok: false, error: String((e as Error).message || e) };
  }
}

/** Record a usage event (tried / uninstalled). Keyed by install (+ github when
 *  signed in). Fire-and-forget; stats only. */
export async function trackEvent(opts: {
  installId: string;
  githubId: number | null;
  productId: string;
  type: "tried" | "uninstalled";
}): Promise<void> {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/rpc/track_event`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        p_install_id: opts.installId,
        p_github_id: opts.githubId,
        p_product_id: opts.productId,
        p_type: opts.type,
      }),
    });
  } catch {
    /* non-fatal */
  }
}

/** Persist an upvote via the Edge Function (GitHub-verified). Returns the new
 *  authoritative count, or null on failure (caller keeps the optimistic value). */
export async function castVote(
  productId: string,
  action: "up" | "down",
  githubToken: string,
): Promise<number | null> {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/upvote`, {
      method: "POST",
      headers,
      body: JSON.stringify({ product_id: productId, action, github_token: githubToken }),
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { upvotes_count?: number };
    return typeof j.upvotes_count === "number" ? j.upvotes_count : null;
  } catch {
    return null;
  }
}

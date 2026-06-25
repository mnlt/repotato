import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config";

export interface Product {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  repo_full_name: string;
  built_by_login: string;
  built_by_avatar_url: string;
  posted_by_login: string | null;
  cover_url: string;
  tags: string[];
  stars_cached: number;
  upvotes_count: number;
  created_at: string;
}

const headers = {
  apikey: SUPABASE_ANON_KEY,
  authorization: `Bearer ${SUPABASE_ANON_KEY}`,
};

/** Live star count from GitHub. stars_cached in Supabase is frozen at launch, so
 *  we overlay the real count here. Cached by Next for 1h, so GitHub is hit at
 *  most once per repo per hour — comfortably under the unauthenticated limit. */
async function liveStars(repoFullName: string): Promise<number | null> {
  try {
    const r = await fetch(`https://api.github.com/repos/${repoFullName}`, {
      headers: { "user-agent": "repotato", accept: "application/vnd.github+json" },
      next: { revalidate: 3600 },
    });
    if (!r.ok) return null;
    const j = (await r.json()) as { stargazers_count?: number };
    return typeof j.stargazers_count === "number" ? j.stargazers_count : null;
  } catch {
    return null;
  }
}

/** Approved products, ranked by upvotes. RLS limits this to approved rows. */
export async function getProducts(): Promise<Product[]> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/products?status=eq.approved&order=upvotes_count.desc,created_at.desc&select=*`,
    { headers, next: { revalidate: 60 } },
  );
  if (!res.ok) return [];
  const products = (await res.json()) as Product[];
  await Promise.all(
    products.map(async (p) => {
      const s = await liveStars(p.repo_full_name);
      if (s != null) p.stars_cached = s;
    }),
  );
  return products;
}

export async function getProduct(slug: string): Promise<Product | null> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/products?slug=eq.${encodeURIComponent(slug)}&status=eq.approved&select=*`,
    { headers, next: { revalidate: 60 } },
  );
  if (!res.ok) return null;
  const rows = (await res.json()) as Product[];
  const p = rows[0];
  if (!p) return null;
  const s = await liveStars(p.repo_full_name);
  if (s != null) p.stars_cached = s;
  return p;
}

export function formatCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) {
    const k = n / 1000;
    return (k < 100 ? k.toFixed(1) : Math.round(k).toString()) + "k";
  }
  return (n / 1_000_000).toFixed(1) + "M";
}

/** "today" / "yesterday" / "3d ago" — the PH feel without empty daily buckets. */
export function relativeDay(iso: string, now: number): string {
  const days = Math.floor((now - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

/** Section label for a day bucket: "Today" / "Yesterday" / "Mon, Jun 23" (UTC). */
export function dayLabel(iso: string, now: number): string {
  const startOfDay = (t: number) => {
    const d = new Date(t);
    d.setUTCHours(0, 0, 0, 0);
    return d.getTime();
  };
  const diff = Math.round(
    (startOfDay(now) - startOfDay(new Date(iso).getTime())) / 86_400_000,
  );
  if (diff <= 0) return "Today";
  if (diff === 1) return "Yesterday";
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

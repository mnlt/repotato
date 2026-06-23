import { getProduct, formatCount } from "@/lib/db";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/config";

export const revalidate = 300;

const MEDAL = ["🥇", "🥈", "🥉"];
const MEDAL_BG = ["#d4a017", "#9aa0a6", "#cd7f32"]; // gold / silver / bronze

function svgBadge(label: string, value: string, valueBg: string): Response {
  const lw = 10 + label.length * 6.5;
  // crude width: emoji ~ 12px, rest ~7px
  const vw = 16 + value.length * 7;
  const w = Math.round(lw + vw);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="20" role="img" aria-label="${label}: ${value}">
  <rect width="${w}" height="20" rx="3" fill="#444"/>
  <rect x="${Math.round(lw)}" width="${Math.round(vw)}" height="20" rx="3" fill="${valueBg}"/>
  <rect x="${Math.round(lw)}" width="4" height="20" fill="${valueBg}"/>
  <g fill="#fff" font-family="Verdana,DejaVu Sans,sans-serif" font-size="11" text-anchor="middle">
    <text x="${Math.round(lw / 2)}" y="14">${label}</text>
    <text x="${Math.round(lw + vw / 2)}" y="14" font-weight="bold">${value}</text>
  </g>
</svg>`;
  return new Response(svg, {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "public, max-age=300, s-maxage=300",
    },
  });
}

/** Daily-ranking badge: 🥇/🥈/🥉 "#N Repo of the Day" if the repo placed top-3
 *  on its launch day (UTC); otherwise the normal upvote count. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) return svgBadge("repotato", "▲ 0", "#57ab5a");

  // The launch day in UTC.
  const d = new Date(p.created_at ?? Date.now());
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const end = new Date(start.getTime() + 86_400_000);

  let rank = 0;
  try {
    const url =
      `${SUPABASE_URL}/rest/v1/products?status=eq.approved` +
      `&created_at=gte.${start.toISOString()}&created_at=lt.${end.toISOString()}` +
      `&order=upvotes_count.desc,created_at.asc&select=slug`;
    const rows = (await fetch(url, {
      headers: { apikey: SUPABASE_ANON_KEY, authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      next: { revalidate: 300 },
    }).then((r) => r.json())) as { slug: string }[];
    rank = rows.findIndex((r) => r.slug === slug) + 1;
  } catch {
    rank = 0;
  }

  if (rank >= 1 && rank <= 3) {
    return svgBadge("repotato", `${MEDAL[rank - 1]} #${rank} Repo of the Day`, MEDAL_BG[rank - 1]);
  }
  return svgBadge("repotato", "▲ " + formatCount(p.upvotes_count), "#57ab5a");
}

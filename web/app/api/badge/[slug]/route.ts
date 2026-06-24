import { getProduct, formatCount } from "@/lib/db";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/config";

export const revalidate = 300;

const MEDAL = ["🥇", "🥈", "🥉"];
const MEDAL_BG = ["#876a00", "#5c636e", "#7a4a26"]; // darkened gold / silver / bronze
const BRAND_BG = "#444"; // "repotato"
const NAME_BG = "#30363d"; // owner/repo (near-black slate, clearly distinct from silver)
const GREEN = "#2da44e"; // upvotes

type Seg = { text: string; bg: string };

function textWidth(text: string): number {
  const emojis = (text.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu) || []).length;
  return (text.length - emojis) * 7 + emojis * 14;
}

/** Render a shields-style badge as a row of distinctly-coloured blocks. */
function svgBadge(segs: Seg[]): Response {
  let x = 0;
  const rects: string[] = [];
  const texts: string[] = [];
  for (const s of segs) {
    const w = Math.round(textWidth(s.text) + 18);
    rects.push(`<rect x="${x}" width="${w}" height="20" fill="${s.bg}"/>`);
    texts.push(`<text x="${x + w / 2}" y="14">${s.text}</text>`);
    x += w;
  }
  const W = x;
  const aria = segs.map((s) => s.text).join(": ");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="20" role="img" aria-label="${aria}">
  <clipPath id="r"><rect width="${W}" height="20" rx="3"/></clipPath>
  <g clip-path="url(#r)">${rects.join("")}</g>
  <g fill="#fff" font-family="Verdana,DejaVu Sans,sans-serif" font-size="11" text-anchor="middle">${texts.join("")}</g>
</svg>`;
  return new Response(svg, {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "public, max-age=300, s-maxage=300",
    },
  });
}

/** The one repotato badge. Blocks: repotato | [Repo of the Day] | name | ▲ N.
 *  The medal block only appears on the day the repo places top-3 in its launch-day
 *  cohort (by votes received that day, frozen once the day closes). The upvote
 *  count is always its own green block. Embed it once — it updates itself. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) return svgBadge([{ text: "repotato", bg: BRAND_BG }, { text: "▲ 0", bg: GREEN }]);

  // Repo name only (no owner).
  const who = ((p.repo_full_name || slug).split("/").pop() || slug).slice(0, 32);
  const votes: Seg = { text: `▲ ${formatCount(p.upvotes_count)}`, bg: GREEN };

  let rank = 0;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/day_rank`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ p_slug: slug }),
      next: { revalidate: 300 },
    });
    rank = Number(await res.json()) || 0;
  } catch {
    rank = 0;
  }

  const brand: Seg = { text: "repotato", bg: BRAND_BG };
  const name: Seg = { text: who, bg: NAME_BG };
  if (rank >= 1 && rank <= 3) {
    return svgBadge([
      brand,
      { text: `${MEDAL[rank - 1]} #${rank} Repo of the Day`, bg: MEDAL_BG[rank - 1] },
      name,
      votes,
    ]);
  }
  return svgBadge([brand, name, votes]);
}

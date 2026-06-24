import { getProduct, formatCount } from "@/lib/db";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/config";

export const revalidate = 300;

const MEDAL = ["🥇", "🥈", "🥉"];
// Darkened gold / silver / bronze: the medal emoji already signals the metal,
// so these stay dark enough for the emoji + white text to read clearly on top.
const MEDAL_BG = ["#876a00", "#5c636e", "#7a4a26"];
const GREEN = "#57ab5a";

function svgBadge(label: string, value: string, valueBg: string): Response {
  const lw = 10 + label.length * 6.5;
  // crude width: emoji ~12px, the rest ~7px
  const emojis = (value.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu) || []).length;
  const vw = 16 + (value.length - emojis) * 7 + emojis * 12;
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

/** The one repotato badge. Always shows the repo name + live upvote count, and
 *  auto-upgrades to a 🥇/🥈/🥉 "Repo of the Day" medal on the day the repo places
 *  top-3 in its launch-day cohort (by votes received that day, frozen once the
 *  day closes). One URL — embed it once, it updates itself. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) return svgBadge("repotato", "▲ 0", GREEN);

  // owner/repo — self-identifying, so a badge can't be passed off as another
  // repo's achievement.
  const who = (p.repo_full_name || slug).slice(0, 40);

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

  if (rank >= 1 && rank <= 3) {
    return svgBadge(
      "repotato",
      `${who}  ${MEDAL[rank - 1]} #${rank} Repo of the Day  ▲ ${formatCount(p.upvotes_count)}`,
      MEDAL_BG[rank - 1],
    );
  }
  return svgBadge("repotato", `${who}  ▲ ${formatCount(p.upvotes_count)}`, GREEN);
}

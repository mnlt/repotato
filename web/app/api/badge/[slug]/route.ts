import { getProduct, formatCount } from "@/lib/db";

export const revalidate = 300;

/** A shields-style SVG badge: "repotato | ▲ N" — for repo READMEs. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const p = await getProduct(slug);
  const value = p ? `▲ ${formatCount(p.upvotes_count)}` : "▲ 0";
  const label = "repotato";

  // Rough monospace width estimate (px) per segment.
  const lw = 10 + label.length * 6.5;
  const vw = 14 + value.length * 7;
  const w = Math.round(lw + vw);
  const h = 20;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" role="img" aria-label="${label}: ${value}">
  <rect width="${w}" height="${h}" rx="3" fill="#444"/>
  <rect x="${Math.round(lw)}" width="${Math.round(vw)}" height="${h}" rx="3" fill="#57ab5a"/>
  <rect x="${Math.round(lw)}" width="4" height="${h}" fill="#57ab5a"/>
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

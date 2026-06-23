import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProduct, formatCount } from "@/lib/db";
import { SITE_URL } from "@/lib/config";
import { CopyCommand } from "../../CopyCommand";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) return { title: "repotato" };
  return {
    title: `${p.name} — repotato`,
    description: p.tagline || p.description,
    openGraph: {
      title: `${p.name} — repotato`,
      description: p.tagline || p.description,
      images: [p.cover_url],
      url: `${SITE_URL}/p/${p.slug}`,
    },
    twitter: { card: "summary_large_image" },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) notFound();

  const badgeUrl = `${SITE_URL}/api/badge/${p.slug}`;
  const badgeMd = `[![repotato](${badgeUrl})](${SITE_URL}/p/${p.slug})`;

  return (
    <main className="wrap">
      <a className="back" href="/">{"← all products"}</a>
      <img className="hero" src={p.cover_url} alt={p.name} style={{ marginTop: 16 }} />

      <h1 className="ptitle">{p.name}</h1>
      <div className="psub">
        {"by @" + p.built_by_login}
        {p.posted_by_login && p.posted_by_login !== p.built_by_login
          ? `  ·  posted by @${p.posted_by_login}`
          : ""}
      </div>

      <div className="row">
        <span className="pill">{"▲ " + formatCount(p.upvotes_count) + " upvotes"}</span>
        <span className="stars">{"★ " + formatCount(p.stars_cached)}</span>
      </div>

      <div className="tags" style={{ marginTop: 12 }}>
        {p.tags.map((t) => "#" + t).join("  ")}
      </div>
      <p className="desc">{p.description}</p>

      <div className="cta">
        <h3>Upvote it in your terminal</h3>
        <CopyCommand text={`npx repotato open ${p.slug}`} />
        <div className="note">
          One upvote = one ⭐ on{" "}
          <a href={`https://github.com/${p.repo_full_name}`} style={{ color: "var(--accent)" }}>
            {p.repo_full_name}
          </a>
          . repotato lives in the terminal — that&apos;s the only place to vote.
        </div>
      </div>

      <div className="cta">
        <h3>Add the badge to your README</h3>
        <CopyCommand text={badgeMd} />
        <div className="note">Shows your live repotato upvote count.</div>
      </div>

      <p className="footer">🥔 repotato</p>
    </main>
  );
}

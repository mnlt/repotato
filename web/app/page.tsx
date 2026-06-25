import { getProducts, formatCount, dayLabel } from "@/lib/db";
import type { Product } from "@/lib/db";
import { GITHUB_URL } from "@/lib/config";
import { CopyCommand } from "./CopyCommand";

export const revalidate = 60;

const dayStartUTC = (t: number) => {
  const d = new Date(t);
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
};

/** Group the (upvote-sorted) feed into day buckets, newest day first. Order
 *  within a day is preserved (already upvotes desc from the query). */
function groupByDay(products: Product[], now: number) {
  const map = new Map<number, { ts: number; label: string; items: Product[] }>();
  for (const p of products) {
    const ts = dayStartUTC(new Date(p.created_at).getTime());
    let g = map.get(ts);
    if (!g) {
      g = { ts, label: dayLabel(p.created_at, now), items: [] };
      map.set(ts, g);
    }
    g.items.push(p);
  }
  return [...map.values()].sort((a, b) => b.ts - a.ts);
}

export default async function Home() {
  const products = await getProducts();
  const now = Date.now();
  const groups = groupByDay(products, now);

  return (
    <main className="wrap">
      <header className="head">
        <img className="logo" src="/repotato_logo.png" alt="repotato" />
        <div>
          <div className="brand">repotato</div>
          <div className="headline">
            Discover, try and upvote awesome repos from your terminal
          </div>
        </div>
      </header>

      <CopyCommand text="npx repotato" />

      {products.length === 0 ? (
        <p className="note">No products yet.</p>
      ) : (
        groups.map((g) => (
          <section key={g.ts} className="daygroup">
            <h2 className="dayhead">{g.label}</h2>
            <ol className="list">
              {g.items.map((p, i) => (
                <li key={p.id}>
                  <a className="item" href={`/p/${p.slug}`}>
                    <div className="itop">
                      <span className="rank">{i + 1}</span>
                      <span className="iname">{p.name}</span>
                      <span className="counts">
                        {"▲ " + formatCount(p.upvotes_count)}
                        <span className="star">{"★ " + formatCount(p.stars_cached)}</span>
                      </span>
                    </div>
                    <div className="itag">
                      {p.tags.length ? p.tags.map((t) => "#" + t).join(" ") + " — " : ""}
                      {p.tagline}
                    </div>
                  </a>
                </li>
              ))}
            </ol>
          </section>
        ))
      )}

      <p className="footer">
        <a href={GITHUB_URL}>GitHub</a>
      </p>
    </main>
  );
}

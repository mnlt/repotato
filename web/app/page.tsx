import { getProducts, formatCount, relativeDay } from "@/lib/db";
import { GITHUB_URL } from "@/lib/config";
import { CopyCommand } from "./CopyCommand";

export const revalidate = 60;

export default async function Home() {
  const products = await getProducts();
  const now = Date.now();

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
        <ol className="list">
          {products.map((p, i) => (
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
                  <span className="when">{"  · " + relativeDay(p.created_at, now)}</span>
                </div>
              </a>
            </li>
          ))}
        </ol>
      )}

      <p className="footer">
        <a href={GITHUB_URL}>GitHub</a>
      </p>
    </main>
  );
}

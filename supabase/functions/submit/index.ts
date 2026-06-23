// Supabase Edge Function: submit a product. The poster is verified from their
// GitHub token; the repo metadata (owner, cover, tags, stars) is fetched
// server-side so the client only needs to send a repo. Inserts as `pending`.
// Owner (built_by) and poster (posted_by) may be different people.
// Deploy with Verify JWT OFF.
import { createClient } from "jsr:@supabase/supabase-js@2";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const gh = (token: string) => ({
  Authorization: `Bearer ${token}`,
  "User-Agent": "repotato",
  Accept: "application/vnd.github+json",
});

Deno.serve(async (req) => {
  try {
    const { repo_full_name, github_token, tagline } = await req.json();
    if (!repo_full_name || !github_token) return json({ error: "bad request" }, 400);

    const uRes = await fetch("https://api.github.com/user", { headers: gh(github_token) });
    if (!uRes.ok) return json({ error: "invalid github token" }, 401);
    const poster = await uRes.json();

    const rRes = await fetch(`https://api.github.com/repos/${repo_full_name}`, {
      headers: gh(github_token),
    });
    if (!rRes.ok) return json({ error: "repo not found" }, 404);
    const repo = await rRes.json();

    if (repo.private) return json({ error: "repo must be public to launch" }, 400);

    const slug = String(repo.full_name).toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Dedup on the canonical repo identity (not slug — seed slugs differ).
    const { data: existing } = await supa
      .from("products")
      .select("id")
      .eq("repo_full_name", repo.full_name)
      .maybeSingle();
    if (existing) return json({ status: "exists", slug });

    // Tagline override is honored ONLY if the poster is the repo owner.
    const isOwner = poster.id === repo.owner?.id;
    const finalTagline =
      isOwner && typeof tagline === "string" && tagline.trim()
        ? tagline.slice(0, 80)
        : (repo.description ?? "").slice(0, 80);

    const product = {
      slug,
      name: repo.name,
      tagline: finalTagline,
      description: repo.description ?? "",
      repo_full_name: repo.full_name,
      built_by_login: repo.owner?.login ?? "",
      built_by_avatar_url: repo.owner?.avatar_url ?? "",
      posted_by_login: poster.login,
      posted_by_github_id: poster.id,
      cover_url: `https://opengraph.githubassets.com/repotato/${repo.full_name}`,
      media_type: "image",
      tags: Array.isArray(repo.topics) ? repo.topics.slice(0, 5) : [],
      stars_cached: repo.stargazers_count ?? 0,
      status: "approved",
    };

    const { error } = await supa.from("products").insert(product);
    if (error) {
      // 23505 = unique violation (race): another insert won — treat as exists.
      if ((error as { code?: string }).code === "23505")
        return json({ status: "exists", slug });
      return json({ error: error.message }, 500);
    }
    return json({ status: "approved", slug });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

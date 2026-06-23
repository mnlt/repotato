// Supabase Edge Function: upvote (action 'up') or remove an upvote
// (action 'down') with a GitHub-verified identity, then recompute the tally.
// A row in `votes` == an upvote. There is no downvote. Deploy with Verify JWT
// OFF. SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are auto-injected.
import { createClient } from "jsr:@supabase/supabase-js@2";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

Deno.serve(async (req) => {
  try {
    const { product_id, action, github_token } = await req.json();
    if (!product_id || !github_token || (action !== "up" && action !== "down")) {
      return json({ error: "bad request" }, 400);
    }

    const ghRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${github_token}`,
        "User-Agent": "repotato",
        Accept: "application/vnd.github+json",
      },
    });
    if (!ghRes.ok) return json({ error: "invalid github token" }, 401);
    const gh = await ghRes.json();
    const github_id = gh.id as number;

    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    if (action === "up") {
      await supa
        .from("votes")
        .upsert({ github_id, product_id }, { onConflict: "github_id,product_id", ignoreDuplicates: true });
    } else {
      await supa.from("votes").delete().eq("github_id", github_id).eq("product_id", product_id);
    }

    const { count } = await supa
      .from("votes")
      .select("*", { count: "exact", head: true })
      .eq("product_id", product_id);

    const upvotes_count = count ?? 0;
    await supa.from("products").update({ upvotes_count }).eq("id", product_id);

    return json({ upvotes_count });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

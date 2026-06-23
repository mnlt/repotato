// Direct GitHub API calls made client-side with the user's device-flow token.
// "upvote = star" happens here; the repotato tally (persisted count) is layered
// on top via a Supabase Edge Function later.
const API = "https://api.github.com";

function headers(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "repotato",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

/** PUT /user/starred/{owner}/{repo} — 204 on success. */
export async function star(token: string, repoFullName: string): Promise<boolean> {
  const r = await fetch(`${API}/user/starred/${repoFullName}`, {
    method: "PUT",
    headers: { ...headers(token), "Content-Length": "0" },
  });
  return r.status === 204;
}

/** DELETE /user/starred/{owner}/{repo} — 204 on success. */
export async function unstar(token: string, repoFullName: string): Promise<boolean> {
  const r = await fetch(`${API}/user/starred/${repoFullName}`, {
    method: "DELETE",
    headers: headers(token),
  });
  return r.status === 204;
}

/** GET /user/starred/{owner}/{repo} — 204 starred, 404 not. */
export async function isStarred(
  token: string,
  repoFullName: string,
): Promise<boolean> {
  const r = await fetch(`${API}/user/starred/${repoFullName}`, {
    headers: headers(token),
  });
  return r.status === 204;
}

function readHeaders(token?: string): Record<string, string> {
  const h: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "repotato",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

/** Live stargazers_count from GET /repos/{owner}/{repo}. Null on failure. */
export async function getStars(
  repoFullName: string,
  token?: string,
): Promise<number | null> {
  try {
    const r = await fetch(`${API}/repos/${repoFullName}`, {
      headers: readHeaders(token),
    });
    if (!r.ok) return null;
    const j = (await r.json()) as { stargazers_count?: number };
    return typeof j.stargazers_count === "number" ? j.stargazers_count : null;
  } catch {
    return null;
  }
}

export interface RepoMeta {
  full_name: string;
  name: string;
  description: string;
  owner_login: string;
  owner_avatar: string;
  stars: number;
  topics: string[];
  private: boolean;
}

/** Fetch repo metadata for a launch preview. Null if not found. */
export async function getRepo(
  repoFullName: string,
  token?: string,
): Promise<RepoMeta | null> {
  try {
    const r = await fetch(`${API}/repos/${repoFullName}`, {
      headers: readHeaders(token),
    });
    if (!r.ok) return null;
    const j = (await r.json()) as {
      full_name: string;
      name: string;
      description: string | null;
      owner?: { login?: string; avatar_url?: string };
      stargazers_count?: number;
      topics?: string[];
      private?: boolean;
    };
    return {
      full_name: j.full_name,
      name: j.name,
      description: j.description ?? "",
      owner_login: j.owner?.login ?? "",
      owner_avatar: j.owner?.avatar_url ?? "",
      stars: j.stargazers_count ?? 0,
      topics: Array.isArray(j.topics) ? j.topics : [],
      private: !!j.private,
    };
  } catch {
    return null;
  }
}

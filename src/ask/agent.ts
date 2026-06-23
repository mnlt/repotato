import { spawn, type ChildProcess } from "node:child_process";
import os from "node:os";
import type { Product } from "../types.js";

export interface AskContext {
  osName: string;
  terminal: string;
  /** cwd the user invoked /repotato from (what they're building), if known. */
  fromCwd?: string;
}

export interface AskCallbacks {
  onText: (chunk: string) => void;
  onTool?: (name: string) => void;
  onDone: (sessionId: string | null) => void;
  onError: (msg: string) => void;
}

export function gatherContext(): AskContext {
  return {
    osName: `${os.platform()} ${os.release()}`,
    terminal: process.env.TERM_PROGRAM || process.env.TERM || "unknown",
    fromCwd: process.env.REPOTATO_FROM_CWD || undefined,
  };
}

export function buildSystemPrompt(p: Product, ctx: AskContext): string {
  return [
    `You are repotato's in-feed assistant — a sharp engineer friend helping the user decide on a GitHub repo from a terminal feed.`,
    `Repo: "${p.repo_full_name}" — ${p.name}: ${p.tagline}. ${p.description}`,
    `Known signals: ~${p.stars_cached} stars; tags: ${p.tags.join(", ") || "none"}.`,
    `User's environment: OS ${ctx.osName}, terminal ${ctx.terminal}${ctx.fromCwd ? `, currently working in ${ctx.fromCwd}` : ""}.`,
    ``,
    `Be SMART and decisive. Before recommending anything:`,
    `1. INVESTIGATE the repo with the tools you have (Bash, the GitHub token, WebFetch, web search): what it actually is, how you'd really try it, and its health/trust — stars, RECENT activity (check the latest commit/release date), whether the README is clear, and anything sketchy (install scripts that curl|bash, odd postinstall, etc.).`,
    `2. Lead with a one-line TRUST read, honestly: e.g. "Supabase — 75k★, very active, safe to run" OR "heads up: ~80★ and no commits in 2 years; I'd skim the code before running it." Flag real risk; reassure when it's clearly solid.`,
    `3. Then give the BEST concrete way to try it, adapted to the repo type:`,
    `   - CLI / tool / library → just install it and show a quick demo (they already opted in — don't ask permission).`,
    `   - Platform / service / web app that isn't a local install → say so in one line and give the single best way to actually try it (e.g. cloud signup, a local instance), and offer a concrete next step.`,
    `4. Be decisive: propose a default action, never a vague "what do you want to do?". Concise, practical, in the user's language. You can also uninstall cleanly (leave no trace) or review the code if asked.`,
    ``,
    `IMPORTANT tracking markers: if you SUCCESSFULLY install the repo, output on its own final line exactly "REPOTATO_EVENT:installed". If you SUCCESSFULLY uninstall it, output exactly "REPOTATO_EVENT:uninstalled". Put nothing after that line. Only emit a marker when the action truly succeeded.`,
  ].join("\n");
}

/**
 * Run one conversational turn via `claude -p` (their subscription/OAuth — NOT
 * --bare, which would need an API key). Streams text via callbacks. Pass the
 * sessionId returned by the previous turn to continue the conversation.
 * Returns the child process so the caller can cancel it.
 */
export function runAskTurn(opts: {
  prompt: string;
  sessionId: string | null;
  systemPrompt: string;
  cwd: string;
  cb: AskCallbacks;
}): ChildProcess {
  const { prompt, sessionId, systemPrompt, cwd, cb } = opts;

  const args = [
    "-p",
    prompt,
    "--model",
    process.env.REPOTATO_ASK_MODEL || "haiku",
    "--output-format",
    "stream-json",
    "--include-partial-messages",
    "--verbose",
    // Drop MCP servers (e.g. the user's global ones) from this subprocess to
    // save tokens and keep the assistant focused. OAuth/login is untouched.
    "--strict-mcp-config",
    "--mcp-config",
    '{"mcpServers":{}}',
    // Pre-authorize the tools install/try/uninstall need (no interactive prompt
    // is possible in -p). The user explicitly opted into letting it act.
    "--allowedTools",
    "Bash,Read,Write,Edit,WebFetch,WebSearch",
  ];
  if (sessionId) args.push("--resume", sessionId);
  else args.push("--append-system-prompt", systemPrompt);

  const child = spawn("claude", args, { cwd, env: process.env });
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");

  let buf = "";
  let sid: string | null = sessionId;
  let stderr = "";

  child.stdout.on("data", (d: string) => {
    buf += d;
    let nl: number;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl);
      buf = buf.slice(nl + 1);
      if (!line.trim()) continue;
      let obj: any;
      try {
        obj = JSON.parse(line);
      } catch {
        continue;
      }
      if (obj.session_id) sid = obj.session_id;
      if (
        obj.type === "stream_event" &&
        obj.event?.delta?.type === "text_delta"
      ) {
        cb.onText(obj.event.delta.text);
      } else if (obj.type === "assistant" && Array.isArray(obj.message?.content)) {
        for (const b of obj.message.content) {
          if (b.type === "tool_use" && b.name) cb.onTool?.(b.name);
        }
      }
    }
  });

  child.stderr.on("data", (d: string) => {
    stderr += d;
  });

  child.on("error", (e) => cb.onError(String((e as Error).message || e)));
  child.on("close", (code) => {
    if (code && code !== 0) cb.onError(stderr.trim() || `claude exited ${code}`);
    else cb.onDone(sid);
  });

  return child;
}

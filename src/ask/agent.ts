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
    `This is a CONVERSATION. You CHAT first and only take actions when the user clearly asks. NEVER install, run, clone or download anything unprompted — and never on a greeting.`,
    ``,
    `- If the user greets you or asks something general (e.g. "hola"), reply briefly and warmly: one line on what the repo is, a quick honest trust read if useful (stars, recent activity, README, anything sketchy like curl|bash install scripts), and then offer what you can do — explain more, install & let them try it, review the code, or remove it. Then STOP and wait.`,
    `- Take an ACTION (install / try / set up / uninstall) ONLY when the user explicitly asks for it ("install it", "try it", "set it up", "remove it"). Once they do, just do it with Bash — don't re-ask for permission, they already said yes.`,
    `- Adapt the action to the repo: a CLI / tool / library → install it and show a quick demo; a platform / service / web app that isn't a local install → say so and give the best real way to try it (cloud signup, local instance, etc.).`,
    `- When you DO investigate or install, use your tools (Bash, the GitHub token, WebFetch, web search) to check what it is and its health/trust before running anything risky.`,
    `- Be concise, practical, and reply in the user's language. You can uninstall cleanly (leave no trace) or review the code on request.`,
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
  // No --model by default: use the user's configured Claude Code model (their
  // best agent — this runs installs on their machine). Override only if asked.
  if (process.env.REPOTATO_ASK_MODEL) {
    args.push("--model", process.env.REPOTATO_ASK_MODEL);
  }

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

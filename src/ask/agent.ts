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
    `You are repotato's in-feed assistant. repotato is a Product-Hunt-style feed of GitHub repos, browsed from the terminal.`,
    `The user is looking at "${p.repo_full_name}" — ${p.name}: ${p.tagline}. ${p.description}`,
    `Their environment: OS ${ctx.osName}, terminal ${ctx.terminal}${ctx.fromCwd ? `, currently working in ${ctx.fromCwd}` : ""}.`,
    `You can: explain what it is and why it might fit what they're building; INSTALL it and let them try it; UNINSTALL it cleanly (leave no trace) if they don't like it; or answer anything they ask, including reviewing the repo's code.`,
    `When they ask you to install / try / uninstall, just do it with Bash — don't ask for permission to proceed, they already opted in. Be concise and practical. Always reply in the user's language.`,
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
    "haiku",
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

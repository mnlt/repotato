import { spawn } from "node:child_process";

/** 28500 -> "28.5k", 1200000 -> "1.2M" */
export function formatCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) {
    const k = n / 1000;
    return (k < 100 ? k.toFixed(1) : Math.round(k).toString()) + "k";
  }
  const m = n / 1_000_000;
  return (m < 10 ? m.toFixed(1) : Math.round(m).toString()) + "M";
}

/** Extract "owner/repo" from a GitHub URL or shorthand. Null if not parseable. */
export function parseRepoFullName(input: string): string | null {
  const s = input.trim().replace(/\.git$/, "");
  const m = s.match(/(?:github\.com[/:])?([^/\s]+\/[^/\s]+?)(?:[/#?].*)?$/);
  const fn = m?.[1];
  return fn && /^[^/\s]+\/[^/\s]+$/.test(fn) ? fn : null;
}

/** Open a URL in the user's default app/browser, cross-platform. */
export function openUrl(url: string): void {
  const cmd =
    process.platform === "darwin"
      ? "open"
      : process.platform === "win32"
        ? "cmd"
        : "xdg-open";
  const args =
    process.platform === "win32" ? ["/c", "start", "", url] : [url];
  spawn(cmd, args, { stdio: "ignore", detached: true }).unref();
}

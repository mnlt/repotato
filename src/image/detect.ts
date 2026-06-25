// Which inline-image protocol can this terminal do?
// - kitty: kitty, Ghostty, WezTerm (kitty graphics protocol) -> crisp via
//   Unicode placeholders (composes with Ink).
// - iterm2: iTerm.app — detected, but its inline protocol desyncs Ink's frame
//   renderer, so render.ts treats it as half-block for now.
// - halfblock: everything else (incl. Apple Terminal). Universal floor.
export type ImageCap = "iterm2" | "kitty" | "halfblock";

export function detectImageCap(): ImageCap {
  const tp = process.env.TERM_PROGRAM ?? "";
  const term = process.env.TERM ?? "";
  if (
    process.env.KITTY_WINDOW_ID ||
    process.env.GHOSTTY_RESOURCES_DIR ||
    tp === "ghostty" ||
    term.includes("kitty") ||
    term.includes("ghostty")
  ) {
    return "kitty";
  }
  if (tp === "iTerm.app" || tp === "WezTerm") return "iterm2";
  return "halfblock";
}

/** Truecolor is required for the half-block renderer to look right. */
export function hasTruecolor(): boolean {
  const ct = process.env.COLORTERM ?? "";
  return ct === "truecolor" || ct === "24bit";
}

/**
 * Ask the terminal itself whether it speaks the kitty graphics protocol, instead
 * of guessing by name. We send a 1×1 query image (a=q) followed by a Primary
 * Device Attributes request (`ESC [ c`) as a sentinel: every terminal answers
 * DA1, so if the kitty "OK" arrives we know it's supported, and if only DA1 comes
 * back it isn't — no need to wait the full timeout. Returns false off a TTY, in
 * tmux (passthrough is finicky), or on timeout.
 */
export function probeKittyGraphics(timeoutMs = 250): Promise<boolean> {
  const stdin = process.stdin;
  const stdout = process.stdout;
  if (!stdin.isTTY || !stdout.isTTY || process.env.TMUX) {
    return Promise.resolve(false);
  }
  return new Promise<boolean>((resolve) => {
    let done = false;
    let buf = "";
    const wasRaw = stdin.isRaw;
    let timer: ReturnType<typeof setTimeout>;
    const finish = (val: boolean) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      stdin.removeListener("data", onData);
      try {
        stdin.setRawMode(wasRaw);
      } catch {
        /* ignore */
      }
      stdin.pause();
      resolve(val);
    };
    const onData = (d: Buffer) => {
      buf += d.toString("latin1");
      if (/\x1b_G[^\x1b]*;OK\x1b\\/.test(buf)) return finish(true); // kitty OK
      if (/\x1b\[\?[0-9;]*c/.test(buf)) return finish(false); // DA1 only → no
    };
    try {
      stdin.setRawMode(true);
    } catch {
      return resolve(false);
    }
    stdin.resume();
    stdin.on("data", onData);
    const pixel = Buffer.from([0, 0, 0]).toString("base64"); // 1 RGB pixel
    stdout.write(`\x1b_Gi=31,s=1,v=1,a=q,t=d,f=24;${pixel}\x1b\\\x1b[c`);
    timer = setTimeout(() => finish(false), timeoutMs);
  });
}

/** Resolve the image capability, asking the terminal directly when its name
 *  isn't a known kitty-class one. */
export async function resolveImageCap(): Promise<ImageCap> {
  const cap = detectImageCap();
  if (cap === "kitty") return cap; // known kitty-class: skip the probe
  return (await probeKittyGraphics()) ? "kitty" : cap;
}

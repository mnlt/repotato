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

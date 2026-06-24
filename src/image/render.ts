import sharp from "sharp";
import type { ImageCap } from "./detect.js";
import { kittyTransmit, kittyPlaceholderLines, KITTY_MAX_ROWS } from "./kitty.js";

const ESC = "\x1b";
const UPPER_HALF = "▀"; // ▀  fg = top pixel, bg = bottom pixel
const RESET = `${ESC}[0m`;

/** A rendered cover. `lines` are placed by Ink (half-block cells, or kitty
 *  placeholder cells). `transmit`, when present, must be written to stdout once
 *  out of band to load the kitty image. */
export interface Cover {
  lines: string[];
  transmit?: string;
  id?: number;
}

async function fetchBytes(url: string): Promise<Buffer> {
  let lastErr = "cover fetch failed";
  // GitHub's OpenGraph service rate-limits (429), esp. in bursts — retry briefly.
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, { headers: { "user-agent": "repotato" } });
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    lastErr = `cover fetch ${res.status}`;
    if (res.status === 429 || res.status >= 500) {
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
      continue;
    }
    break;
  }
  throw new Error(lastErr);
}

/**
 * Universal fallback: render the image as `rows` ANSI strings, `cols` wide, with
 * Unicode half-blocks (two vertical pixels per cell). Truecolor, no binaries.
 */
export async function renderHalfBlock(
  url: string,
  cols: number,
  rows: number,
): Promise<string[]> {
  const input = await fetchBytes(url);
  const { data, info } = await sharp(input)
    .resize(cols, rows * 2, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const ch = info.channels; // 3 after removeAlpha
  const W = info.width;
  const lines: string[] = [];
  for (let r = 0; r < rows; r++) {
    let line = "";
    let prevTop = "";
    let prevBot = "";
    for (let c = 0; c < cols; c++) {
      const top = (2 * r * W + c) * ch;
      const bot = ((2 * r + 1) * W + c) * ch;
      const tFg = `${data[top]};${data[top + 1]};${data[top + 2]}`;
      const tBg = `${data[bot]};${data[bot + 1]};${data[bot + 2]}`;
      if (tFg !== prevTop) {
        line += `${ESC}[38;2;${tFg}m`;
        prevTop = tFg;
      }
      if (tBg !== prevBot) {
        line += `${ESC}[48;2;${tBg}m`;
        prevBot = tBg;
      }
      line += UPPER_HALF;
    }
    lines.push(line + RESET);
  }
  return lines;
}

/** Dim placeholder shown while a cover loads or if it fails. */
export function placeholderCover(cols: number, rows: number): string[] {
  const row = `${ESC}[38;5;236m` + "░".repeat(cols) + RESET;
  return Array.from({ length: rows }, () => row);
}

/**
 * A sober "cover" band for terminals without crisp graphics (Terminal.app,
 * iTerm2, VS Code, …). A soft vertical potato gradient — reads as a header, not
 * a low-res photo. Short on purpose, so the card stays compact and sharp.
 */
export function bandCover(cols: number, rows = 2): string[] {
  const steps = rows * 2; // two vertical pixels per half-block row
  const c0 = [38, 30, 8]; // dark amber (top)
  const c1 = [120, 95, 24]; // potato (bottom)
  const px = (i: number) =>
    c0.map((a, k) => Math.round(a + (c1[k] - a) * (i / (steps - 1))));
  const lines: string[] = [];
  for (let r = 0; r < rows; r++) {
    const t = px(2 * r);
    const b = px(2 * r + 1);
    lines.push(
      `${ESC}[38;2;${t[0]};${t[1]};${t[2]}m${ESC}[48;2;${b[0]};${b[1]};${b[2]}m` +
        UPPER_HALF.repeat(cols) +
        RESET,
    );
  }
  return lines;
}

/**
 * Build a cover for the given terminal capability. kitty (Ghostty/kitty/WezTerm)
 * gets a crisp PNG via Unicode placeholders; everything else (incl. iTerm2,
 * whose inline protocol desyncs Ink) falls back to half-blocks.
 */
export async function buildCover(
  url: string,
  cap: ImageCap,
  cols: number,
  rows: number,
  kittyId: number,
): Promise<Cover> {
  if (cap === "kitty" && rows <= KITTY_MAX_ROWS) {
    const input = await fetchBytes(url);
    const png = await sharp(input)
      .resize({ width: 900, withoutEnlargement: true })
      .png()
      .toBuffer();
    return {
      lines: kittyPlaceholderLines(kittyId, cols, rows),
      transmit: kittyTransmit(png, kittyId, cols, rows),
      id: kittyId,
    };
  }
  return { lines: await renderHalfBlock(url, cols, rows) };
}

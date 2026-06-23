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
  const res = await fetch(url, { headers: { "user-agent": "repotato" } });
  if (!res.ok) throw new Error(`cover fetch ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
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

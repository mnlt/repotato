// Kitty graphics protocol via Unicode placeholders — the one crisp path that
// composes with Ink. Flow:
//   1) transmit the PNG once, out of band (written straight to stdout). With
//      U=1 it creates a *virtual* placement: nothing shows yet, no cursor move.
//   2) in the Ink layout, emit a grid of placeholder cells (U+10EEEE). Each cell
//      is width-1 so Ink lays them out normally; kitty paints the image through
//      them. The image id is carried in the cell foreground color.
// Supported by kitty, Ghostty and WezTerm. Untestable from Apple Terminal.
// Spec: https://sw.kovidgoyal.net/kitty/graphics-protocol/#unicode-placeholders

const ESC = "\x1b";
const PLACEHOLDER = "\u{10EEEE}";

// kitty's rowcolumn diacritics, in order. Index N -> the combining mark that
// encodes row/column N. We only need indices up to the number of rows.
// prettier-ignore
const DIACRITICS = [
  0x0305,0x030d,0x030e,0x0310,0x0312,0x033d,0x033e,0x033f,0x0346,0x034a,
  0x034b,0x034c,0x0350,0x0351,0x0352,0x0357,0x035b,0x0363,0x0364,0x0365,
  0x0366,0x0367,0x0368,0x0369,0x036a,0x036b,0x036c,0x036d,0x036e,0x036f,
  0x0483,0x0484,0x0485,0x0486,0x0487,0x0592,0x0593,0x0594,0x0595,0x0597,
  0x0598,0x0599,0x059c,0x059d,0x059e,0x059f,0x05a0,0x05a1,0x05a8,0x05a9,
  0x05ab,0x05ac,0x05af,0x05c4,0x0610,0x0611,0x0612,0x0613,0x0614,0x0615,
  0x0616,0x0617,0x0657,0x0658,
];

export const KITTY_MAX_ROWS = DIACRITICS.length;

/** Build the (chunked) transmit escape. Write this to stdout once per image id;
 *  it is invisible and does not move the cursor (U=1 virtual placement). */
export function kittyTransmit(
  png: Buffer,
  id: number,
  cols: number,
  rows: number,
): string {
  const b64 = png.toString("base64");
  const CHUNK = 4096;
  let out = "";
  for (let i = 0; i < b64.length; i += CHUNK) {
    const chunk = b64.slice(i, i + CHUNK);
    const last = i + CHUNK >= b64.length;
    const ctrl =
      i === 0
        ? `a=T,U=1,i=${id},f=100,c=${cols},r=${rows},q=2,m=${last ? 0 : 1}`
        : `m=${last ? 0 : 1}`;
    out += `${ESC}_G${ctrl};${chunk}${ESC}\\`;
  }
  return out;
}

/** Build the placeholder grid as `rows` strings of `cols` cells each. The first
 *  cell of each row carries (row, col=0); the rest auto-increment the column. */
export function kittyPlaceholderLines(
  id: number,
  cols: number,
  rows: number,
): string[] {
  const fg = `${ESC}[38;2;0;0;${id}m`; // 24-bit fg == image id (id <= 255)
  const reset = `${ESC}[0m`;
  const r0col0 = String.fromCodePoint(DIACRITICS[0]);
  const n = Math.min(rows, DIACRITICS.length);
  const lines: string[] = [];
  for (let r = 0; r < n; r++) {
    let line = fg + PLACEHOLDER + String.fromCodePoint(DIACRITICS[r]) + r0col0;
    for (let c = 1; c < cols; c++) line += PLACEHOLDER;
    lines.push(line + reset);
  }
  return lines;
}

/** Delete all images (run on exit so covers don't linger in scrollback). */
export function kittyDeleteAll(): string {
  return `${ESC}_Ga=d,q=2;${ESC}\\`;
}

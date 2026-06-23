// Headless validation of the kitty path WITHOUT a kitty terminal. We can't see
// the image from here, but we CAN verify the critical Ink-layout assumption:
// every placeholder line must measure exactly `cols` wide via string-width (the
// same algorithm Ink uses). If that holds, Ink reserves the right rectangle.
import stringWidth from "string-width";
import { kittyPlaceholderLines, kittyTransmit } from "./image/kitty.js";

const COLS = 24;
const ROWS = 6;

const lines = kittyPlaceholderLines(7, COLS, ROWS);
let ok = true;
lines.forEach((l, i) => {
  const w = stringWidth(l);
  const pass = w === COLS;
  ok = ok && pass;
  console.log(`row ${i}: string-width=${w} (expect ${COLS}) ${pass ? "✓" : "✗"}`);
});

// Transmit must be a non-empty APC sequence; sanity-check structure.
const t = kittyTransmit(Buffer.from("fakepngbytes".repeat(500)), 7, COLS, ROWS);
const looksRight = t.startsWith("\x1b_G") && t.endsWith("\x1b\\") && t.includes("U=1");
console.log(`transmit: ${t.length} bytes, well-formed=${looksRight ? "✓" : "✗"}`);

console.log(ok && looksRight ? "\nKITTY SMOKE: OK" : "\nKITTY SMOKE: FAIL");
process.exit(ok && looksRight ? 0 : 1);

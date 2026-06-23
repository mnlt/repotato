// Headless check of the image pipeline (the riskiest bit). The Ink TUI itself
// needs a real TTY, so this verifies fetch -> sharp -> half-blocks end to end
// and prints the result so you can eyeball it: `npm run smoke`.
import { renderHalfBlock } from "./image/render.js";
import { products } from "./fixtures/products.js";
import { COVER_COLS, COVER_ROWS } from "./theme.js";

const p = products[0];
console.log(`Rendering cover for ${p.repo_full_name} (${p.cover_url})\n`);
const lines = await renderHalfBlock(p.cover_url, COVER_COLS, COVER_ROWS);
console.log(lines.join("\n"));
console.log(
  `\nOK — ${lines.length} rows, ${COVER_COLS} cols, ${lines[0].length} bytes/row (incl. ANSI).`,
);

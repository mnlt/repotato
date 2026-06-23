// GameBoy-ish proportions: a fixed-width, portrait-leaning card.
// Cover is 2:1 (matches GitHub's OpenGraph card), rendered with Unicode
// half-blocks so two vertical pixels share one cell -> square pixels.
export const COVER_COLS = 48; // 48 px wide
export const COVER_ROWS = 12; // 24 px tall -> 48x24 == 2:1, same as OG cards
export const CARD_INNER = COVER_COLS; // content lines wrap at the cover width
export const CARD_WIDTH = COVER_COLS + 2 /*padding*/ + 2 /*border*/; // 52

export const palette = {
  potato: "#d9a441",
  star: "#f5c518",
  upvote: "#57ab5a",
  upvoteDark: "#2f6e3a", // unvoted / hollow tone
  down: "#e5534b", // downvote red
  downDark: "#8b2f2a",
  accent: "#6cb6ff",
  accentDark: "#2a5d8f",
  dim: "#768390",
  cream: "#f6ede1", // tagline bar fill (KEYPOP-ish cream chip)
  ink: "#1b1b1f", // text on light pills
  next: "#8b949e", // neutral pill
  nextDark: "#4a4f55",
} as const;

/** Horizontal padding inside the card border (kept in one place so the cover
 *  width always matches the content width). */
export const PAD_X = 2;

/** Vertical rows the card spends on everything that is NOT the cover (header,
 *  legend, borders, padding, meta block, description, gaps). Used to fit the
 *  cover to the available height so the card never overflows the window. */
const CHROME_ROWS = 21;

/**
 * Responsive layout from the terminal size. The card grows with the window
 * width (within bounds); the cover targets 2:1 but shrinks to fit the available
 * height, staying centered. Recomputed on every resize.
 */
export function computeLayout(cols: number, rows: number) {
  const cardWidth = Math.max(46, Math.min(74, cols - 2));
  const inner = cardWidth - 2 - PAD_X * 2; // 1 border + PAD_X padding each side

  let coverCols = inner;
  let coverRows = Math.round(inner / 4); // ideal 2:1 at full width
  const maxCoverRows = Math.max(3, rows - CHROME_ROWS);
  if (coverRows > maxCoverRows) {
    coverRows = maxCoverRows;
    coverCols = Math.min(inner, coverRows * 4); // keep 2:1, narrower than card
  }
  return { cardWidth, inner, coverCols, coverRows };
}

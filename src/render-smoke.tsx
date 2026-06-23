// Headless render check of the Card layout (no TTY needed). Uses a placeholder
// cover so it's deterministic. Run: `npx tsx src/render-smoke.tsx`
import React from "react";
import { render } from "ink-testing-library";
import { Card } from "./components/Card.js";
import { products } from "./fixtures/products.js";
import { placeholderCover } from "./image/render.js";
import { computeLayout } from "./theme.js";

const { cardWidth, coverCols } = computeLayout(80, 40);
const { lastFrame } = render(
  <Card
    product={products[1]}
    coverLines={placeholderCover(coverCols, 3)} // 3 rows is enough to eyeball layout
    width={cardWidth}
    upvotes={products[1].upvotes_count}
    stars={products[1].stars_cached}
    voted={false}
    dayRank={1}
  />,
);
console.log(lastFrame());

import React from "react";
import { Box, Text } from "ink";
import type { Product } from "../types.js";
import { palette } from "../theme.js";
import { formatCount } from "../util.js";

const MEDALS = ["🥇", "🥈", "🥉"];
const SECTION_LABEL: Record<ListItem["section"], string> = {
  today: "Today",
  yesterday: "Yesterday",
};

/** A product placed in its launch-day leaderboard: which day it belongs to and
 *  its rank within that day (by votes received that day). */
export type ListItem = {
  product: Product;
  section: "today" | "yesterday";
  rank: number;
};

export interface ListScreenProps {
  width: number;
  items: ListItem[];
  selected: number;
  /** Max item rows to render at once; the window scrolls to keep selected in view. */
  maxVisible: number;
}

export function ListScreen({ width, items, selected, maxVisible }: ListScreenProps) {
  const n = items.length;
  const win = Math.max(1, Math.min(maxVisible, n));
  // Window that always contains the selection (roughly centered), clamped to
  // the ends — so navigating never scrolls the selected row out of view.
  let start = selected - Math.floor(win / 2);
  start = Math.max(0, Math.min(start, n - win));
  const end = Math.min(n, start + win);
  const slice = items.slice(start, end);
  const moreAbove = start;
  const moreBelow = n - end;

  let lastSection: ListItem["section"] | null = null;

  return (
    <Box flexDirection="column" width={width}>
      <Box>
        <Text bold color={palette.potato}>
          🥔 repotato
        </Text>
        <Text color={palette.dim}>{"  ·  daily leaderboard"}</Text>
      </Box>

      <Box flexDirection="column" marginTop={1}>
        {n === 0 ? (
          <Text color={palette.dim}>No launches today or yesterday.</Text>
        ) : (
          <>
            {moreAbove > 0 ? (
              <Text color={palette.dim}>{`   ↑ ${moreAbove} more`}</Text>
            ) : null}
            {slice.map((it, j) => {
              const i = start + j; // index into the full list
              const sel = i === selected;
              const showHeader = it.section !== lastSection;
              lastSection = it.section;
              const badge =
                it.rank >= 1 && it.rank <= 3
                  ? MEDALS[it.rank - 1] + " "
                  : it.rank >= 1
                    ? `${it.rank}. `
                    : "· ";
              return (
                <React.Fragment key={it.product.id}>
                  {showHeader ? (
                    <Box marginTop={j === 0 ? 0 : 1}>
                      <Text color={palette.dim}>{SECTION_LABEL[it.section]}</Text>
                    </Box>
                  ) : null}
                  <Box width={width}>
                    <Text color={sel ? palette.potato : palette.dim}>
                      {sel ? "❯ " : "  "}
                    </Text>
                    <Box flexGrow={1}>
                      <Text bold={sel} color={sel ? palette.potato : undefined}>
                        {badge + it.product.name}
                      </Text>
                    </Box>
                    <Text color={palette.upvote}>{"▲" + formatCount(it.product.upvotes_count)}</Text>
                    <Text color={palette.star}>{"  ★" + formatCount(it.product.stars_cached)}</Text>
                  </Box>
                </React.Fragment>
              );
            })}
            {moreBelow > 0 ? (
              <Text color={palette.dim}>{`   ↓ ${moreBelow} more`}</Text>
            ) : null}
          </>
        )}
      </Box>
    </Box>
  );
}

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
}

export function ListScreen({ width, items, selected }: ListScreenProps) {
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
        {items.length === 0 ? (
          <Text color={palette.dim}>No launches today or yesterday.</Text>
        ) : (
          items.map((it, i) => {
            const sel = i === selected;
            const showHeader = it.section !== lastSection;
            lastSection = it.section;
            // Top-3 of each day wear the medal; the rest show their day rank.
            const badge =
              it.rank >= 1 && it.rank <= 3
                ? MEDALS[it.rank - 1] + " "
                : it.rank >= 1
                  ? `${it.rank}. `
                  : "· ";
            return (
              <React.Fragment key={it.product.id}>
                {showHeader ? (
                  <Box marginTop={i === 0 ? 0 : 1}>
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
          })
        )}
      </Box>
    </Box>
  );
}

import React from "react";
import { Box, Text } from "ink";
import type { Product } from "../types.js";
import { palette } from "../theme.js";
import { formatCount } from "../util.js";

export interface ListScreenProps {
  width: number;
  items: Product[];
  selected: number;
}

export function ListScreen({ width, items, selected }: ListScreenProps) {
  return (
    <Box flexDirection="column" width={width}>
      <Box>
        <Text bold color={palette.potato}>
          🥔 repotato
        </Text>
        <Text color={palette.dim}>{"  ·  today & yesterday"}</Text>
      </Box>

      <Box flexDirection="column" marginTop={1}>
        {items.length === 0 ? (
          <Text color={palette.dim}>No launches today or yesterday.</Text>
        ) : (
          items.map((p, i) => {
            const sel = i === selected;
            return (
              <Box key={p.id} width={width}>
                <Text color={sel ? palette.potato : palette.dim}>{sel ? "❯ " : "  "}</Text>
                <Box flexGrow={1}>
                  <Text bold={sel} color={sel ? palette.potato : undefined}>
                    {`${i + 1}. ${p.name}`}
                  </Text>
                </Box>
                <Text color={palette.upvote}>{"▲" + formatCount(p.upvotes_count)}</Text>
                <Text color={palette.star}>{"  ★" + formatCount(p.stars_cached)}</Text>
              </Box>
            );
          })
        )}
      </Box>
    </Box>
  );
}

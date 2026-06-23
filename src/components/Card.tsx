import React from "react";
import { Box, Text } from "ink";
import type { Product } from "../types.js";
import { palette, PAD_X } from "../theme.js";
import { formatCount } from "../util.js";

/** Center a string within a fixed width with spaces. */
function center(s: string, w: number): string {
  const pad = Math.max(0, w - s.length);
  const left = Math.floor(pad / 2);
  return " ".repeat(left) + s + " ".repeat(pad - left);
}

/** A 2-row Product-Hunt-style upvote button: ▲ on top, count below. ▲ green when
 *  you've upvoted, △ hollow when not. There is no downvote — ↓ just removes it. */
function VoteButton({ count, voted }: { count: number; voted: boolean }) {
  const label = formatCount(count);
  const w = Math.max(3, label.length) + 2;
  const bg = voted ? palette.upvote : palette.upvoteDark;
  return (
    <Box flexDirection="column">
      <Text bold color="#ffffff" backgroundColor={bg}>
        {center(voted ? "▲" : "△", w)}
      </Text>
      <Text bold color="#ffffff" backgroundColor={bg}>
        {center(label, w)}
      </Text>
    </Box>
  );
}

export interface CardProps {
  product: Product;
  coverLines: string[];
  width: number;
  upvotes: number;
  stars: number;
  voted: boolean;
}

export function Card({ product, coverLines, width, upvotes, stars, voted }: CardProps) {
  const inner = width - 2 - PAD_X * 2; // border + horizontal padding

  return (
    <Box
      flexDirection="column"
      width={width}
      borderStyle="bold"
      borderColor={palette.potato}
      paddingX={PAD_X}
      paddingY={1}
    >
      {/* Cover (centered when narrower than the card, e.g. height-constrained) */}
      <Box width={inner} justifyContent="center">
        <Box flexDirection="column">
          {coverLines.map((line, i) => (
            <Text key={i}>{line}</Text>
          ))}
        </Box>
      </Box>

      {/* Title row: name + stars (left)  ·  upvote button (right) */}
      <Box width={inner} justifyContent="space-between" marginTop={1}>
        <Box>
          <Text bold color={palette.potato}>
            {product.name}
          </Text>
          <Text bold color={palette.star}>
            {"  ★ " + formatCount(stars)}
          </Text>
        </Box>
        <VoteButton count={upvotes} voted={voted} />
      </Box>

      {/* By line */}
      <Text color={palette.dim}>{"by @" + product.built_by_login}</Text>

      {/* Tags as hashtags */}
      <Box marginTop={1}>
        <Text bold color={palette.accent}>
          {product.tags.map((t) => "#" + t).join("  ")}
        </Text>
      </Box>

      {/* Tagline (the hook) */}
      <Box marginTop={1}>
        <Text bold>{product.tagline}</Text>
      </Box>

      {/* Description */}
      <Box width={inner} marginTop={1}>
        <Text color={palette.dim}>{product.description}</Text>
      </Box>
    </Box>
  );
}

import React from "react";
import { Box, Text } from "ink";
import { palette } from "../theme.js";

export function WelcomeScreen({ width }: { width: number }) {
  return (
    <Box
      flexDirection="column"
      width={width}
      borderStyle="bold"
      borderColor={palette.potato}
      paddingX={2}
      paddingY={1}
    >
      <Text bold color={palette.potato}>
        🥔  Welcome to repotato
      </Text>
      <Box marginTop={1}>
        <Text>Discover, try and upvote awesome GitHub repos — from your terminal.</Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text>
          <Text color={palette.upvote}>{"  ↑  "}</Text>upvote a repo — it stars it on GitHub
        </Text>
        <Text>
          <Text color={palette.accent}>{"  a  "}</Text>ask to explain, install & try, or remove a repo
        </Text>
        <Text>
          <Text color={palette.accent}>{"  L  "}</Text>launch your own repo
        </Text>
        <Text>
          <Text color={palette.accent}>{"  s  "}</Text>share a repo
        </Text>
      </Box>

      <Box marginTop={1}>
        <Text color={palette.dim}>An upvote is a real GitHub star.</Text>
      </Box>
    </Box>
  );
}

import React from "react";
import { Box, Text } from "ink";
import { palette } from "../theme.js";

export interface Msg {
  role: "user" | "assistant";
  text: string;
}

export interface AskScreenProps {
  width: number;
  productName: string;
  messages: Msg[];
  streaming: boolean;
  streamingText: string;
  toolNote: string;
  input: string;
}

export function AskScreen({
  width,
  productName,
  messages,
  streaming,
  streamingText,
  toolNote,
  input,
}: AskScreenProps) {
  const empty = messages.length === 0 && !streaming;
  return (
    <Box flexDirection="column" width={width}>
      <Box>
        <Text bold color={palette.potato}>
          🥔 ask
        </Text>
        <Text color={palette.dim}>{`  ·  ${productName}`}</Text>
      </Box>

      <Box
        flexDirection="column"
        width={width}
        borderStyle="round"
        borderColor={palette.dim}
        paddingX={1}
        paddingY={0}
      >
        {empty ? (
          <Text color={palette.dim}>
            Ask anything about {productName} — or say “install it” to try it, or
            “uninstall it” to remove it cleanly.
          </Text>
        ) : null}

        {messages.map((m, i) => (
          <Box key={i} flexDirection="column" marginBottom={1}>
            <Text bold color={m.role === "user" ? palette.accent : palette.potato}>
              {m.role === "user" ? "you" : "🥔 repotato"}
            </Text>
            <Text color={m.role === "user" ? undefined : palette.dim}>{m.text}</Text>
          </Box>
        ))}

        {streaming ? (
          <Box flexDirection="column">
            <Text bold color={palette.potato}>
              🥔 repotato
            </Text>
            <Text color={palette.dim}>{streamingText || "…"}</Text>
            {toolNote ? <Text color={palette.accent}>{`↳ ${toolNote}`}</Text> : null}
          </Box>
        ) : null}
      </Box>

      <Box>
        <Text color={palette.accent}>{"› "}</Text>
        <Text>{input}</Text>
        {!streaming ? <Text color={palette.dim}>▋</Text> : null}
      </Box>

      <Text color={palette.dim}>
        {streaming
          ? "esc cancel · ctrl+c quit   ·   uses your Claude credits"
          : "enter send · esc back to feed · ctrl+c quit"}
      </Text>
    </Box>
  );
}

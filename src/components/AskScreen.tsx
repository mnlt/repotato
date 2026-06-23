import React from "react";
import { Box, Text } from "ink";
import { palette } from "../theme.js";

export interface Msg {
  role: "user" | "assistant";
  text: string;
}

/** Render inline markdown (**bold**, `code`, __bold__) as Ink segments. */
function renderInline(line: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(line)) !== null) {
    if (m.index > last) out.push(<Text key={k++}>{line.slice(last, m.index)}</Text>);
    const tok = m[0];
    if (tok.startsWith("`")) {
      out.push(
        <Text key={k++} color={palette.upvote}>
          {tok.slice(1, -1)}
        </Text>,
      );
    } else {
      out.push(
        <Text key={k++} bold>
          {tok.slice(2, -2)}
        </Text>,
      );
    }
    last = m.index + tok.length;
  }
  if (last < line.length) out.push(<Text key={k++}>{line.slice(last)}</Text>);
  return out;
}

/** Minimal markdown -> Ink: headings, bullets, inline bold/code, code fences. */
function Markdown({ text }: { text: string }) {
  const rows: React.ReactNode[] = [];
  let inCode = false;
  text.split("\n").forEach((line, i) => {
    if (/^\s*```/.test(line)) {
      inCode = !inCode;
      return; // hide the fence
    }
    if (inCode) {
      rows.push(
        <Text key={i} color={palette.upvote}>
          {line}
        </Text>,
      );
      return;
    }
    const heading = line.match(/^#{1,6}\s+(.*)/);
    if (heading) {
      rows.push(
        <Text key={i} bold color={palette.potato}>
          {heading[1]}
        </Text>,
      );
      return;
    }
    const bullet = line.match(/^\s*[-*]\s+(.*)/);
    if (bullet) {
      rows.push(<Text key={i}>{["  • ", ...renderInline(bullet[1])]}</Text>);
      return;
    }
    rows.push(<Text key={i}>{line.trim() ? renderInline(line) : " "}</Text>);
  });
  return <Box flexDirection="column">{rows}</Box>;
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
            {m.role === "user" ? <Text>{m.text}</Text> : <Markdown text={m.text} />}
          </Box>
        ))}

        {streaming ? (
          <Box flexDirection="column">
            <Text bold color={palette.potato}>
              🥔 repotato
            </Text>
            <Markdown text={streamingText || "…"} />
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

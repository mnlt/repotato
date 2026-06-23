import React from "react";
import { Box, Text } from "ink";
import { palette } from "../theme.js";
import { formatCount } from "../util.js";
import type { RepoMeta } from "../github.js";

export type LaunchStep = "url" | "preview" | "submitting" | "done" | "error";

export interface LaunchScreenProps {
  width: number;
  step: LaunchStep;
  url: string;
  draft: RepoMeta | null;
  tagline: string;
  editable: boolean;
  message: string;
  posterLogin: string | null;
}

export function LaunchScreen({
  width,
  step,
  url,
  draft,
  tagline,
  editable,
  message,
  posterLogin,
}: LaunchScreenProps) {
  const inner = width - 6; // border (2) + paddingX 2 each side (4)
  return (
    <Box flexDirection="column" width={width}>
      <Box>
        <Text bold color={palette.potato}>
          🥔 launch a product
        </Text>
      </Box>

      <Box
        flexDirection="column"
        width={width}
        borderStyle="bold"
        borderColor={palette.potato}
        paddingX={2}
        paddingY={1}
      >
        {step === "url" ? (
          <>
            <Text>Paste the GitHub repo URL you want to launch:</Text>
            <Box marginTop={1}>
              <Text color={palette.accent}>{"› "}</Text>
              <Text>{url}</Text>
              <Text color={palette.dim}>▋</Text>
            </Box>
            {message ? (
              <Box marginTop={1}>
                <Text color={palette.down}>{message}</Text>
              </Box>
            ) : null}
          </>
        ) : null}

        {step === "preview" && draft ? (
          <>
            <Box width={inner} justifyContent="space-between">
              <Text bold color={palette.potato}>
                {draft.name}
              </Text>
              <Text color={palette.star}>{"★ " + formatCount(draft.stars)}</Text>
            </Box>
            <Text color={palette.dim}>{"maker @" + draft.owner_login}</Text>
            {draft.private ? (
              <Text color={palette.down}>
                ⚠ private repo — make it public to launch
              </Text>
            ) : null}
            <Box marginTop={1}>
              <Text color={palette.accent}>
                {draft.topics.slice(0, 5).map((t) => "#" + t).join("  ") || "(no topics)"}
              </Text>
            </Box>
            <Box marginTop={1} flexDirection="column">
              <Text color={palette.dim}>
                {editable ? "Tagline (editable — it's your repo):" : "Tagline:"}
              </Text>
              <Box>
                <Text>{tagline || (editable ? "" : "(none)")}</Text>
                {editable ? <Text color={palette.dim}>▋</Text> : null}
              </Box>
            </Box>
            <Box marginTop={1}>
              <Text color={palette.dim}>{`posting as @${posterLogin ?? "(sign in on submit)"}`}</Text>
            </Box>
          </>
        ) : null}

        {step === "submitting" ? <Text color={palette.dim}>Submitting…</Text> : null}

        {step === "done" ? <Text color={palette.upvote}>{"✅ " + message}</Text> : null}

        {step === "error" ? <Text color={palette.down}>{"⚠ " + message}</Text> : null}
      </Box>

      <Text color={palette.dim}>
        {step === "url"
          ? "enter preview · esc cancel"
          : step === "preview"
            ? editable
              ? "type to edit tagline · enter submit · esc back"
              : "enter submit · esc back"
            : step === "submitting"
              ? "…"
              : "esc back to feed"}
      </Text>
    </Box>
  );
}

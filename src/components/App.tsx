import React, { useEffect, useRef, useState } from "react";
import os from "node:os";
import type { ChildProcess } from "node:child_process";
import { Box, Text, useApp, useInput, useStdout } from "ink";
import type { Product } from "../types.js";
import { getFeed, registerUser, castVote, submitProduct } from "../api.js";
import { getInstallId } from "../identity.js";
import { buildCover, placeholderCover, type Cover } from "../image/render.js";
import { detectImageCap } from "../image/detect.js";
import { kittyDeleteAll } from "../image/kitty.js";
import {
  runAskTurn,
  buildSystemPrompt,
  gatherContext,
  type AskContext,
} from "../ask/agent.js";
import { loadAuth, authenticate, type AuthState } from "../auth.js";
import { star, unstar, getStars, isStarred, getRepo, type RepoMeta } from "../github.js";
import { palette, computeLayout } from "../theme.js";
import { openUrl, parseRepoFullName } from "../util.js";
import { Card } from "./Card.js";
import { AskScreen, type Msg } from "./AskScreen.js";
import { LaunchScreen, type LaunchStep } from "./LaunchScreen.js";

type Flash = { text: string; color: string } | null;
type AuthPrompt = { code: string; url: string } | null;

function useTerminalSize() {
  const { stdout } = useStdout();
  const [size, setSize] = useState({
    cols: stdout?.columns ?? 80,
    rows: stdout?.rows ?? 24,
  });
  useEffect(() => {
    if (!stdout) return;
    const onResize = () => setSize({ cols: stdout.columns, rows: stdout.rows });
    stdout.on("resize", onResize);
    return () => {
      stdout.off("resize", onResize);
    };
  }, [stdout]);
  return size;
}

export default function App() {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const { cols, rows } = useTerminalSize();
  const { cardWidth, coverCols, coverRows } = computeLayout(cols, rows);
  const cap = detectImageCap();
  const centered = cols >= cardWidth + 2;

  const [feed, setFeed] = useState<Product[] | null>(null);
  const [index, setIndex] = useState(0);
  const [covers, setCovers] = useState<Record<string, Cover>>({});
  const [flash, setFlash] = useState<Flash>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cover bookkeeping.
  const inflight = useRef<Set<string>>(new Set());
  const kittyIds = useRef<Map<string, number>>(new Map());
  const kittyCounter = useRef(1);
  const transmitted = useRef<Set<number>>(new Set());

  // Voting + auth.
  const [votes, setVotes] = useState<Record<string, boolean>>({});
  const [serverCounts, setServerCounts] = useState<Record<string, number>>({});
  const [liveStars, setLiveStars] = useState<Record<string, number>>({});
  const [authPrompt, setAuthPrompt] = useState<AuthPrompt>(null);
  const authRef = useRef<AuthState | null>(loadAuth());
  const authCancel = useRef<(() => void) | null>(null);
  const hydratedVotes = useRef<Set<string>>(new Set());

  // Ask mode.
  const [mode, setMode] = useState<"feed" | "ask" | "launch">(
    process.env.REPOTATO_MODE === "launch" ? "launch" : "feed",
  );
  const [messages, setMessages] = useState<Msg[]>([]);
  const [askInput, setAskInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [toolNote, setToolNote] = useState("");
  const askSession = useRef<string | null>(null);
  const askSystem = useRef<string>("");
  const askChild = useRef<ChildProcess | null>(null);
  const askAcc = useRef<string>("");
  const ctxRef = useRef<AskContext | null>(null);
  if (!ctxRef.current) ctxRef.current = gatherContext();

  // Launch mode.
  const [launchStep, setLaunchStep] = useState<LaunchStep>("url");
  const [launchUrl, setLaunchUrl] = useState("");
  const [launchDraft, setLaunchDraft] = useState<RepoMeta | null>(null);
  const [launchTagline, setLaunchTagline] = useState("");
  const [launchMsg, setLaunchMsg] = useState("");

  useEffect(() => {
    getFeed().then(setFeed);
  }, []);

  // For the current product: fetch the live star count, and hydrate the user's
  // prior vote from whether they've already starred the repo (the source of
  // truth for an upvote) so it shows ▲ on open instead of △.
  useEffect(() => {
    if (!feed) return;
    const prod = feed[index];
    if (liveStars[prod.id] == null) {
      getStars(prod.repo_full_name, authRef.current?.access_token).then((s) => {
        if (s != null) setLiveStars((m) => ({ ...m, [prod.id]: s }));
      });
    }
    const token = authRef.current?.access_token;
    if (token && !hydratedVotes.current.has(prod.id)) {
      hydratedVotes.current.add(prod.id);
      isStarred(token, prod.repo_full_name).then((starred) => {
        if (starred) setVotes((v) => (v[prod.id] ? v : { ...v, [prod.id]: true }));
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feed, index]);

  // Register this install (telemetry for future prioritization). Fire-and-forget.
  useEffect(() => {
    const c = ctxRef.current!;
    registerUser({
      installId: getInstallId(),
      os: c.osName,
      terminal: c.terminal,
      githubId: authRef.current?.github_id ?? null,
      githubLogin: authRef.current?.login ?? null,
    });
  }, []);

  useEffect(() => {
    return () => {
      if (cap === "kitty") stdout?.write(kittyDeleteAll());
      askChild.current?.kill();
      authCancel.current?.();
    };
  }, [cap, stdout]);

  useEffect(() => {
    if (!feed) return;
    const want = [index, index + 1, index - 1]
      .map((i) => (i + feed.length) % feed.length)
      .filter((i, pos, arr) => arr.indexOf(i) === pos);
    for (const i of want) {
      const prod = feed[i];
      const key = `${prod.id}:${coverCols}x${coverRows}`;
      if (covers[key] || inflight.current.has(key)) continue;
      inflight.current.add(key);
      let id = 0;
      if (cap === "kitty") {
        id = kittyIds.current.get(key) ?? kittyCounter.current++;
        kittyIds.current.set(key, id);
      }
      buildCover(prod.cover_url, cap, coverCols, coverRows, id)
        .then((cover) => {
          if (cover.transmit && cover.id != null && !transmitted.current.has(cover.id)) {
            stdout?.write(cover.transmit);
            transmitted.current.add(cover.id);
          }
          setCovers((c) => ({ ...c, [key]: cover }));
        })
        .catch(() =>
          setCovers((c) => ({
            ...c,
            [key]: { lines: placeholderCover(coverCols, coverRows) },
          })),
        )
        .finally(() => inflight.current.delete(key));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feed, index, coverCols, coverRows, cap, stdout]);

  function showFlash(text: string, color: string) {
    setFlash({ text, color });
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(null), 2600);
  }

  // ── Voting ────────────────────────────────────────────────────────────────
  function doVote(product: Product, dir: "up" | "down") {
    const auth = authRef.current;
    if (!auth) {
      beginAuth(() => doVote(product, dir));
      return;
    }
    const voted = !!votes[product.id];
    if (dir === "up") {
      if (voted) {
        showFlash(`Already upvoted ${product.name}`, palette.dim);
        return;
      }
      setVotes((v) => ({ ...v, [product.id]: true }));
      showFlash(`★ Starred and upvoted ${product.name}`, palette.upvote);
      star(auth.access_token, product.repo_full_name);
    } else {
      if (!voted) {
        showFlash(`You haven't upvoted ${product.name}`, palette.dim);
        return;
      }
      setVotes((v) => ({ ...v, [product.id]: false }));
      showFlash(`Removed your upvote and star from ${product.name}`, palette.dim);
      unstar(auth.access_token, product.repo_full_name);
    }
    castVote(product.id, dir, auth.access_token).then((count) => {
      if (count != null) setServerCounts((s) => ({ ...s, [product.id]: count }));
    });
  }

  function beginAuth(then: () => void) {
    authCancel.current = authenticate({
      onCode: (code, url) => {
        setAuthPrompt({ code, url });
        openUrl(url);
      },
      onSuccess: (state) => {
        authRef.current = state;
        setAuthPrompt(null);
        registerUser({
          installId: getInstallId(),
          os: ctxRef.current!.osName,
          terminal: ctxRef.current!.terminal,
          githubId: state.github_id,
          githubLogin: state.login,
        });
        then(); // resume the action that triggered sign-in
      },
      onError: (e) => {
        setAuthPrompt(null);
        showFlash(`GitHub sign-in failed: ${e}`, palette.dim);
      },
    }).cancel;
  }

  // ── Launch ──────────────────────────────────────────────────────────────
  function enterLaunch() {
    setLaunchStep("url");
    setLaunchUrl("");
    setLaunchDraft(null);
    setLaunchMsg("");
    setMode("launch");
  }

  function launchPreview() {
    const fn = parseRepoFullName(launchUrl);
    if (!fn) {
      setLaunchMsg("That doesn't look like a GitHub repo URL.");
      return;
    }
    setLaunchMsg("");
    setLaunchDraft(null);
    setLaunchStep("preview");
    getRepo(fn, authRef.current?.access_token).then((meta) => {
      if (meta) {
        setLaunchDraft(meta);
        setLaunchTagline(meta.description.slice(0, 80));
      } else {
        setLaunchStep("error");
        setLaunchMsg(`Couldn't find ${fn} on GitHub.`);
      }
    });
  }

  function launchSubmit() {
    const draft = launchDraft;
    if (!draft) return;
    if (draft.private) {
      setLaunchStep("error");
      setLaunchMsg(`${draft.name} is private — make it public to launch it on repotato.`);
      return;
    }
    const submitNow = () => {
      // Always send the tagline; the server applies it ONLY if your token is the
      // repo owner (you can only edit your own listing). Otherwise it's ignored.
      setLaunchStep("submitting");
      submitProduct(draft.full_name, authRef.current!.access_token, {
        tagline: launchTagline,
      }).then((res) => {
        if (res.ok && res.status === "exists") {
          setLaunchStep("error");
          setLaunchMsg(`${draft.name} is already on repotato — a repo can only be posted once.`);
        } else if (res.ok) {
          setLaunchStep("done");
          setLaunchMsg(
            `Submitted ${draft.name} — pending review.\nIt'll be shareable at /p/${res.slug ?? draft.name} once the web is live.`,
          );
        } else {
          setLaunchStep("error");
          setLaunchMsg(res.error || "Submission failed.");
        }
      });
    };
    if (!authRef.current) beginAuth(submitNow);
    else submitNow();
  }

  // ── Ask ───────────────────────────────────────────────────────────────────
  function openAsk(product: Product) {
    askSession.current = null;
    askAcc.current = "";
    askSystem.current = buildSystemPrompt(product, ctxRef.current!);
    setMessages([]);
    setAskInput("");
    setStreaming(false);
    setStreamingText("");
    setToolNote("");
    setMode("ask");
  }

  function sendAsk(text: string) {
    setMessages((m) => [...m, { role: "user", text }]);
    setStreaming(true);
    setStreamingText("");
    setToolNote("");
    askAcc.current = "";
    askChild.current = runAskTurn({
      prompt: text,
      sessionId: askSession.current,
      systemPrompt: askSystem.current,
      cwd: ctxRef.current?.fromCwd || os.homedir(),
      cb: {
        onText: (t) => {
          askAcc.current += t;
          setStreamingText(askAcc.current);
        },
        onTool: (n) => setToolNote(`running ${n}…`),
        onDone: (sid) => {
          askSession.current = sid;
          const final = askAcc.current;
          setMessages((m) => [...m, { role: "assistant", text: final || "(no response)" }]);
          setStreaming(false);
          setStreamingText("");
          setToolNote("");
        },
        onError: (e) => {
          setMessages((m) => [...m, { role: "assistant", text: `⚠ ${e}` }]);
          setStreaming(false);
          setStreamingText("");
          setToolNote("");
        },
      },
    });
  }

  useInput((input, key) => {
    // Auth overlay swallows input.
    if (authPrompt) {
      if (key.escape || (key.ctrl && input === "c")) {
        authCancel.current?.();
        setAuthPrompt(null);
        if (key.ctrl) exit();
      }
      return;
    }

    // Launch mode.
    if (mode === "launch") {
      if (key.ctrl && input === "c") {
        exit();
        return;
      }
      if (launchStep === "url") {
        if (key.escape) {
          setMode("feed");
          return;
        }
        if (key.return) {
          launchPreview();
          return;
        }
        if (key.backspace || key.delete) {
          setLaunchUrl((s) => s.slice(0, -1));
          return;
        }
        if (input && !key.ctrl && !key.meta) setLaunchUrl((s) => s + input);
        return;
      }
      if (launchStep === "preview") {
        if (key.escape) {
          setLaunchStep("url");
          return;
        }
        if (key.return) {
          launchSubmit();
          return;
        }
        // Editing the tagline is only offered when the repo is yours.
        const ownerEditable =
          !!authRef.current && authRef.current.login === launchDraft?.owner_login;
        if (ownerEditable) {
          if (key.backspace || key.delete) {
            setLaunchTagline((s) => s.slice(0, -1));
          } else if (input && !key.ctrl && !key.meta) {
            setLaunchTagline((s) => s + input);
          }
        }
        return;
      }
      // submitting | done | error
      if (key.escape || key.return) setMode("feed");
      return;
    }

    // Ask mode.
    if (mode === "ask") {
      if (key.ctrl && input === "c") {
        askChild.current?.kill();
        exit();
        return;
      }
      if (key.escape) {
        if (streaming) {
          askChild.current?.kill();
          setStreaming(false);
          setStreamingText("");
          setToolNote("");
        } else {
          setMode("feed");
        }
        return;
      }
      if (streaming) return;
      if (key.return) {
        const t = askInput.trim();
        if (t) {
          setAskInput("");
          sendAsk(t);
        }
        return;
      }
      if (key.backspace || key.delete) {
        setAskInput((s) => s.slice(0, -1));
        return;
      }
      if (input && !key.ctrl && !key.meta) setAskInput((s) => s + input);
      return;
    }

    // Feed mode.
    if (!feed) return;
    if (input === "q" || key.escape || (key.ctrl && input === "c")) {
      exit();
      return;
    }
    const product = feed[index];
    if (key.rightArrow) {
      setFlash(null);
      setIndex((i) => (i + 1) % feed.length);
    } else if (key.leftArrow) {
      setFlash(null);
      setIndex((i) => (i - 1 + feed.length) % feed.length);
    } else if (key.upArrow) {
      doVote(product, "up");
    } else if (key.downArrow) {
      doVote(product, "down");
    } else if (input === "v") {
      openUrl(product.demo_url ?? product.cover_url);
      showFlash(`Opening ${product.name}'s demo in your browser…`, palette.accent);
    } else if (input === "a") {
      openAsk(product);
    } else if (input === "l" || input === "L") {
      enterLaunch();
    }
  });

  // ── Auth overlay (modal; appears during feed voting or launch submit) ──
  if (authPrompt) {
    return (
      <Box
        flexDirection="column"
        width={centered ? cols : undefined}
        alignItems={centered ? "center" : "flex-start"}
        paddingY={1}
      >
        <Box
          width={cardWidth}
          flexDirection="column"
          borderStyle="bold"
          borderColor={palette.potato}
          paddingX={2}
          paddingY={1}
        >
          <Text bold color={palette.potato}>
            🥔 Connect GitHub
          </Text>
          <Box marginTop={1}>
            <Text>{"Opening "}</Text>
            <Text color={palette.accent}>{authPrompt.url}</Text>
          </Box>
          <Text>{"Enter this code:"}</Text>
          <Box marginTop={1}>
            <Text bold color={palette.star}>{`   ${authPrompt.code}`}</Text>
          </Box>
          <Box marginTop={1}>
            <Text color={palette.dim}>Waiting for authorization…</Text>
          </Box>
        </Box>
        <Box width={cardWidth} justifyContent="center">
          <Text color={palette.dim}>esc cancel</Text>
        </Box>
      </Box>
    );
  }

  // ── Launch screen (does not need the feed) ──
  if (mode === "launch") {
    return (
      <Box
        flexDirection="column"
        width={centered ? cols : undefined}
        alignItems={centered ? "center" : "flex-start"}
        paddingY={1}
      >
        <LaunchScreen
          width={cardWidth}
          step={launchStep}
          url={launchUrl}
          draft={launchDraft}
          tagline={launchTagline}
          editable={
            !!authRef.current && authRef.current.login === launchDraft?.owner_login
          }
          message={launchMsg}
          posterLogin={authRef.current?.login ?? null}
        />
      </Box>
    );
  }

  if (!feed) {
    return (
      <Box padding={1}>
        <Text color={palette.dim}>🥔 loading repotato…</Text>
      </Box>
    );
  }

  const product = feed[index];

  // ── Ask screen ──
  if (mode === "ask") {
    return (
      <Box
        flexDirection="column"
        width={centered ? cols : undefined}
        alignItems={centered ? "center" : "flex-start"}
        paddingY={1}
      >
        <AskScreen
          width={cardWidth}
          productName={product.name}
          messages={messages}
          streaming={streaming}
          streamingText={streamingText}
          toolNote={toolNote}
          input={askInput}
        />
      </Box>
    );
  }

  // ── Feed ──
  const coverKey = `${product.id}:${coverCols}x${coverRows}`;
  const cover = covers[coverKey];
  const coverLines = cover?.lines ?? placeholderCover(coverCols, coverRows);
  const voted = !!votes[product.id];
  // Counts are server truth (recomputed from the votes table). Never add a
  // client-side optimistic +1 — the base already includes your own vote, which
  // is what caused the phantom "2". The button colour gives instant feedback;
  // the number updates when castVote returns.
  const upvotes = serverCounts[product.id] ?? product.upvotes_count;
  const stars = liveStars[product.id] ?? product.stars_cached;

  return (
    <Box
      flexDirection="column"
      width={centered ? cols : undefined}
      alignItems={centered ? "center" : "flex-start"}
      paddingY={1}
    >
      <Box width={cardWidth}>
        <Text bold color={palette.potato}>
          🥔 repotato
        </Text>
      </Box>

      <Card
        product={product}
        coverLines={coverLines}
        width={cardWidth}
        upvotes={upvotes}
        stars={stars}
        voted={voted}
      />

      <Box width={cardWidth} justifyContent="center">
        <Text color={flash ? flash.color : palette.dim}>
          {flash
            ? flash.text
            : "←/→ nav   ↑ upvote   v demo   a ask/try   L launch   q quit"}
        </Text>
      </Box>
    </Box>
  );
}

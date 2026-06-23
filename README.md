# 🥔 repotato

Discover, try and upvote awesome GitHub repos — **from your terminal**.

A Product-Hunt-style feed of GitHub repos that lives in your terminal, for the
downtime while your coding agent works. One product at a time, GameBoy-ish card.
**An upvote is a real GitHub star.** Ask its built-in assistant to explain,
install & try, or uninstall a repo cleanly — powered by your local Claude.

> Early work in progress.

## Run it

```bash
npm install
npm run dev
```

- `←/→` navigate · `↑` upvote (= star) · `↓` remove · `v` view demo · `a` ask/try · `L` launch · `q` quit
- First upvote signs you in to GitHub via device flow (token stored in `~/.repotato`).

There's also a `/repotato` Claude Code slash command that opens the feed in a new
terminal window, and `/repotato launch` to submit a product.

## How it fits together

- **CLI** (`src/`) — the Ink TUI feed, vote, ask/try and launch flows.
- **`supabase/`** — schema + Edge Functions (vote / submit) on Supabase.
- **`web/`** — the read-only showcase (Next.js, deploys to Vercel). The product
  lives in the terminal; the web is just the window + shareable pages + README badge.

## Notes

- The Supabase publishable key and GitHub OAuth Client ID in the source are
  **public by design** (RLS protects the data; device flow needs no secret).
- Upvote = star. There is no downvote — `↓` just removes your upvote.

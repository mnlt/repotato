# 🥔 repotato

Share, discover, try out, and support amazing GitHub repositories - all from your terminal while Claude works.

A daily feed of GitHub repos you browse in your terminal, one at a time.

## Install

```bash
npx repotato
```

## If you're discovering repos

- Browse the feed: `npx repotato`
- **Upvote** a repo with `↑` — it stars the repo on GitHub.
- **Ask / try**: press `a` to ask repotato's assistant to explain a repo, install
  and let you try it, or uninstall it cleanly — powered by your local Claude.
- Open a specific repo: `npx repotato open <slug>`

## If you made a repo

- **Launch it**: run `npx repotato` and press `L` (or `/repotato launch`).
- Every upvote it gets is a real ⭐ on your repo.
- Add a live badge to your README to show your repotato upvotes.

## Keys

`←/→` navigate · `↑` upvote · `v` view demo · `a` ask/try · `s` share · `L` launch · `q` quit

## How it's built

- **CLI** — the terminal app (Ink).
- **`supabase/`** — database + functions (votes, submissions).
- **`web/`** — a read-only showcase + shareable pages. The product lives in the terminal.

MIT.

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
- Press `f` for the **daily leaderboard** (Today / Yesterday).
- Open a specific repo: `npx repotato open <slug>`

## Voting & Repo of the Day

- **One upvote = one ⭐.** Upvoting stars the repo on GitHub; there's no downvote —
  removing your upvote just un-stars it. The count is always the server's truth.
- Each repo competes within **its launch day**. The top 3 by votes that day earn
  🥇 / 🥈 / 🥉 **Repo of the Day** — frozen for good once the day closes (UTC).

## If you made a repo

- **Launch it**: run `npx repotato` and press `L` (or `/repotato launch`).
- Every upvote it gets is a real ⭐ on your repo.
- **Add the badge** (from your page on the web): it shows your repo name + live
  upvotes and **auto-upgrades to the 🥇 Repo of the Day medal** on the day you
  place top-3. One badge — paste it once, it updates itself.

## Keys

`←/→` navigate · `↑` upvote · `v` view demo · `a` ask/try · `s` share · `L` launch · `q` quit

## How it's built

- **CLI** — the terminal app (Ink).
- **`supabase/`** — database + functions (votes, submissions).
- **`web/`** — a read-only showcase + shareable pages. The product lives in the terminal.

MIT.

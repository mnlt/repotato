import type { Product } from "../types.js";

// Walking-skeleton seed. Covers use GitHub's OpenGraph card endpoint, which
// renders a 1200x600 social image for any public repo — perfect stand-in for a
// product cover until authors upload their own to Supabase Storage.
const og = (repo: string) => `https://opengraph.githubassets.com/repotato/${repo}`;

export const products: Product[] = [
  {
    id: "1",
    slug: "bubbletea",
    name: "Bubble Tea",
    tagline: "A powerful little TUI framework",
    description:
      "A fun, functional and stateful way to build terminal apps. Based on The Elm Architecture. Batteries included.",
    repo_full_name: "charmbracelet/bubbletea",
    built_by_login: "charmbracelet",
    built_by_avatar_url: "https://github.com/charmbracelet.png",
    cover_url: og("charmbracelet/bubbletea"),
    media_type: "image",
    tags: ["tui", "go", "framework"],
    stars_cached: 28600,
    upvotes_count: 142,
  },
  {
    id: "2",
    slug: "ratatui",
    name: "Ratatui",
    tagline: "Build rich terminal UIs in Rust",
    description:
      "A Rust library to cook up delicious text-based user interfaces. Immediate-mode rendering, fully composable widgets.",
    repo_full_name: "ratatui/ratatui",
    built_by_login: "ratatui",
    built_by_avatar_url: "https://github.com/ratatui.png",
    cover_url: og("ratatui/ratatui"),
    media_type: "image",
    tags: ["tui", "rust", "widgets"],
    stars_cached: 12900,
    upvotes_count: 98,
  },
  {
    id: "3",
    slug: "ink",
    name: "Ink",
    tagline: "React for interactive command-line apps",
    description:
      "Render React components to the terminal. Same flexbox layout and component model you already know, in your CLI.",
    repo_full_name: "vadimdemedes/ink",
    built_by_login: "vadimdemedes",
    built_by_avatar_url: "https://github.com/vadimdemedes.png",
    cover_url: og("vadimdemedes/ink"),
    media_type: "image",
    tags: ["react", "cli", "node"],
    stars_cached: 28100,
    upvotes_count: 211,
  },
  {
    id: "4",
    slug: "chafa",
    name: "Chafa",
    tagline: "Images and GIFs in your terminal",
    description:
      "A tiny tool and C library that turns images, animated GIFs and video frames into terminal graphics — sixel, kitty, or plain ANSI.",
    repo_full_name: "hpjansson/chafa",
    built_by_login: "hpjansson",
    built_by_avatar_url: "https://github.com/hpjansson.png",
    cover_url: og("hpjansson/chafa"),
    media_type: "image",
    tags: ["images", "terminal", "c"],
    stars_cached: 3500,
    upvotes_count: 67,
  },
  {
    id: "5",
    slug: "supabase",
    name: "Supabase",
    tagline: "The open source Firebase alternative",
    description:
      "Postgres, auth, storage, edge functions and realtime in one box. The backend behind repotato itself.",
    repo_full_name: "supabase/supabase",
    built_by_login: "supabase",
    built_by_avatar_url: "https://github.com/supabase.png",
    cover_url: og("supabase/supabase"),
    media_type: "image",
    tags: ["backend", "postgres", "auth"],
    stars_cached: 75200,
    upvotes_count: 188,
  },
];

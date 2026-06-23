-- repotato schema — source of truth. Apply in the Supabase SQL editor:
--   https://supabase.com/dashboard/project/sktbbdgcubnedpsvzxxp/sql/new
-- Safe to re-run (idempotent).

-- ── products ────────────────────────────────────────────────────────────────
create table if not exists public.products (
  id                  uuid primary key default gen_random_uuid(),
  slug                text unique not null,
  name                text not null,
  tagline             text not null default '',
  description         text not null default '',
  repo_full_name      text not null,
  built_by_login      text not null default '',  -- maker/owner (repo owner)
  built_by_avatar_url text not null default '',
  posted_by_login     text,                       -- hunter (who submitted)
  posted_by_github_id bigint,
  cover_url           text not null default '',
  demo_url            text,
  media_type          text not null default 'image'
                        check (media_type in ('image','gif','video')),
  tags                text[] not null default '{}',
  stars_cached        integer not null default 0,
  upvotes_count       integer not null default 0,
  status              text not null default 'pending'
                        check (status in ('pending','approved','rejected')),
  created_at          timestamptz not null default now()
);

alter table public.products enable row level security;

-- Anyone (publishable key / anon) may read only approved products.
drop policy if exists "public read approved" on public.products;
create policy "public read approved"
  on public.products for select
  using (status = 'approved');

-- A repo can only be posted once (canonical identity = repo_full_name).
create unique index if not exists products_repo_full_name_key
  on public.products (repo_full_name);

-- ── votes (one row per user+product == one upvote; remove = delete the row) ──
create table if not exists public.votes (
  github_id   bigint not null,
  product_id  uuid not null references public.products(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (github_id, product_id)
);

alter table public.votes enable row level security;
-- No public policies: writes go through the `upvote` Edge Function (service role).

-- ── users (telemetry for future feed prioritization) ────────────────────────
-- install_id = a per-install uuid stored in ~/.repotato/install_id. terminals
-- accumulates every terminal the install has been seen in (deduped) so we can
-- prioritize, e.g., Ghostty-related repos for Ghostty users.
create table if not exists public.users (
  install_id   uuid primary key,
  github_id    bigint,
  github_login text,
  os           text,
  terminals    text[] not null default '{}',
  streak       integer not null default 0,
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

alter table public.users enable row level security;
-- No direct table policies; all writes go through register_user() below.

-- Upsert a user, unioning the terminal into terminals[]. SECURITY DEFINER so it
-- can write under RLS; callable by the anon (publishable) key.
create or replace function public.register_user(
  p_install_id   uuid,
  p_os           text default null,
  p_terminal     text default null,
  p_github_id    bigint default null,
  p_github_login text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users
    (install_id, os, terminals, github_id, github_login, streak, last_seen_at)
  values (
    p_install_id, p_os,
    case when p_terminal is null then '{}'::text[] else array[p_terminal] end,
    p_github_id, p_github_login, 1, now()
  )
  on conflict (install_id) do update set
    os           = coalesce(excluded.os, public.users.os),
    github_id    = coalesce(excluded.github_id, public.users.github_id),
    github_login = coalesce(excluded.github_login, public.users.github_login),
    terminals    = (
      select coalesce(array_agg(distinct t), '{}'::text[])
      from unnest(
        public.users.terminals ||
        case when p_terminal is null then '{}'::text[] else array[p_terminal] end
      ) as t
    ),
    streak       = case
      when (public.users.last_seen_at at time zone 'utc')::date = (now() at time zone 'utc')::date
        then public.users.streak
      when (public.users.last_seen_at at time zone 'utc')::date = ((now() at time zone 'utc')::date - 1)
        then public.users.streak + 1
      else 1
    end,
    last_seen_at = now();
end;
$$;

grant execute on function
  public.register_user(uuid, text, text, bigint, text) to anon, authenticated;

-- ── events (usage stats: tried / uninstalled; for the future profile screen) ─
create table if not exists public.events (
  id          bigint generated always as identity primary key,
  install_id  uuid not null,
  github_id   bigint,
  product_id  uuid not null references public.products(id) on delete cascade,
  type        text not null check (type in ('tried','uninstalled')),
  created_at  timestamptz not null default now()
);

alter table public.events enable row level security;
-- No public read; writes go through track_event() (security definer).

create or replace function public.track_event(
  p_install_id uuid,
  p_github_id  bigint,
  p_product_id uuid,
  p_type       text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_type not in ('tried', 'uninstalled') then
    return;
  end if;
  insert into public.events (install_id, github_id, product_id, type)
  values (p_install_id, p_github_id, p_product_id, p_type);
end;
$$;

grant execute on function
  public.track_event(uuid, bigint, uuid, text) to anon, authenticated;

-- ── day_rank: a repo's place among repos launched the same UTC day, by votes ──
-- received THAT day. Frozen once the day closes. SECURITY DEFINER so the badge
-- can use it without exposing the (private) votes table. Returns 0 if unranked.
create or replace function public.day_rank(p_slug text)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  with me as (
    select id, created_at from public.products
    where slug = p_slug and status = 'approved'
  ),
  bounds as (
    select date_trunc('day', (select created_at from me) at time zone 'utc')
             at time zone 'utc' as day_start
  ),
  cohort as (
    select p.id, p.created_at,
      (select count(*) from public.votes v
        where v.product_id = p.id
          and v.created_at >= (select day_start from bounds)
          and v.created_at <  (select day_start from bounds) + interval '1 day'
      ) as day_votes
    from public.products p
    where p.status = 'approved'
      and (p.created_at at time zone 'utc')::date
          = ((select day_start from bounds) at time zone 'utc')::date
  ),
  ranked as (
    select id, row_number() over (order by day_votes desc, created_at asc) as rnk
    from cohort
  )
  select coalesce((select rnk from ranked where id = (select id from me)), 0)::integer;
$$;

grant execute on function public.day_rank(text) to anon, authenticated;

-- ── seed (the walking-skeleton catalogue) ───────────────────────────────────
insert into public.products
  (slug, name, tagline, description, repo_full_name, built_by_login,
   built_by_avatar_url, cover_url, media_type, tags, stars_cached,
   upvotes_count, status)
values
  ('bubbletea','Bubble Tea','A powerful little TUI framework',
   'A fun, functional and stateful way to build terminal apps. Based on The Elm Architecture. Batteries included.',
   'charmbracelet/bubbletea','charmbracelet','https://github.com/charmbracelet.png',
   'https://opengraph.githubassets.com/repotato/charmbracelet/bubbletea','image',
   '{tui,go,framework}',28600,142,'approved'),

  ('ratatui','Ratatui','Build rich terminal UIs in Rust',
   'A Rust library to cook up delicious text-based user interfaces. Immediate-mode rendering, fully composable widgets.',
   'ratatui/ratatui','ratatui','https://github.com/ratatui.png',
   'https://opengraph.githubassets.com/repotato/ratatui/ratatui','image',
   '{tui,rust,widgets}',12900,98,'approved'),

  ('ink','Ink','React for interactive command-line apps',
   'Render React components to the terminal. Same flexbox layout and component model you already know, in your CLI.',
   'vadimdemedes/ink','vadimdemedes','https://github.com/vadimdemedes.png',
   'https://opengraph.githubassets.com/repotato/vadimdemedes/ink','image',
   '{react,cli,node}',28100,211,'approved'),

  ('chafa','Chafa','Images and GIFs in your terminal',
   'A tiny tool and C library that turns images, animated GIFs and video frames into terminal graphics — sixel, kitty, or plain ANSI.',
   'hpjansson/chafa','hpjansson','https://github.com/hpjansson.png',
   'https://opengraph.githubassets.com/repotato/hpjansson/chafa','image',
   '{images,terminal,c}',3500,67,'approved'),

  ('supabase','Supabase','The open source Firebase alternative',
   'Postgres, auth, storage, edge functions and realtime in one box. The backend behind repotato itself.',
   'supabase/supabase','supabase','https://github.com/supabase.png',
   'https://opengraph.githubassets.com/repotato/supabase/supabase','image',
   '{backend,postgres,auth}',75200,188,'approved')
on conflict (slug) do nothing;

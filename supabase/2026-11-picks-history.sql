-- Value Verdict: a daily history of the AI picks (one row per pick per page per day).
-- Only page, rank, ASIN and our own score: no Amazon product content (title, brand, price, images), which may
-- not be kept past 24 hours; ASINs may be kept. Written by src/lib/curate.ts (keepHistory) after each day's picks.
-- Read to see how often each page's top 5 changes, and by the reels to skip a budget page whose picks didn't change.
-- Run once in Supabase → SQL Editor → New query → paste → Run. Safe to re-run.
create table if not exists deal_picks_history (
  cycle      timestamptz not null,
  group_key  text        not null,
  rank       int         not null,
  asin       text        not null,
  score      int,
  saved_at   timestamptz not null default now(),
  primary key (cycle, group_key, asin)
);
create index if not exists deal_picks_history_page on deal_picks_history (group_key, cycle desc);

-- written by the site's server key; anyone may read it (pages, ranks and ASINs the site already shows)
alter table deal_picks_history enable row level security;
drop policy if exists "history is public" on deal_picks_history;
create policy "history is public" on deal_picks_history for select using (true);

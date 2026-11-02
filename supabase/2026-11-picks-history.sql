-- Value Verdict: a daily history of the AI picks (one row per pick per page per day).
-- Lets us see how often each page's top 5 changes, and lets the reels skip a budget page whose picks didn't change.
-- Run once in Supabase → SQL Editor → New query → paste → Run. Safe to re-run.
create table if not exists deal_picks_history (
  cycle      timestamptz not null,
  group_key  text        not null,
  rank       int         not null,
  asin       text        not null,
  brand      text,
  title      text,
  price      numeric,
  score      int,
  saved_at   timestamptz not null default now(),
  primary key (cycle, group_key, asin)
);
create index if not exists deal_picks_history_page on deal_picks_history (group_key, cycle desc);

-- written by the site's server key; anyone may read it (it only holds what the site already shows)
alter table deal_picks_history enable row level security;
drop policy if exists "history is public" on deal_picks_history;
create policy "history is public" on deal_picks_history for select using (true);

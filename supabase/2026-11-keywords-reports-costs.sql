-- Value Verdict: keyword data, AI cost log and the weekly report (Phase 6). All three are private: row level
-- security is on with no policy, so only the secret key (scripts, GitHub Actions) reads or writes them.
-- Run once in Supabase → SQL Editor → New query → paste → Run. Safe to re-run.

-- Keyword data imported from Google's own exports (never invented): Keyword Planner "keyword ideas" CSVs
-- (monthly searches in India, often a range like 1K–10K on a low-spend Ads account) and Google Trends CSVs
-- (relative interest 0–100, weekly). Written by scripts/keywords.ts; read by the weekly research and report.
create table if not exists keywords (
  id             bigint generated always as identity primary key,
  keyword        text        not null,
  category       text,                     -- our category slug, or null when it fits none
  source         text        not null check (source in ('keyword_planner', 'google_trends', 'bing')),
  searches_low   int,                      -- average monthly searches (low end of Google's range; = high when exact)
  searches_high  int,
  competition    text,                     -- Low / Medium / High (Keyword Planner)
  change_3m      numeric,                  -- % change over three months (Keyword Planner)
  change_yoy     numeric,                  -- % change year on year (Keyword Planner)
  trend          jsonb,                    -- [{period, value}]: monthly searches, or weekly Trends interest
  period         text,                     -- what the numbers cover, e.g. "Nov 2025 – Oct 2026"
  file           text,                     -- the file it came from
  imported_at    timestamptz not null default now(),
  unique (source, keyword)
);
create index if not exists keywords_category on keywords (category, searches_high desc nulls last);
alter table keywords enable row level security;

-- One row per AI call with its tokens and cost in US dollars (list prices, see src/lib/costs.ts).
-- The budget guard adds up this month's rows: optional jobs (research, report, guides) skip at $8, the daily
-- picks always run.
create table if not exists ai_costs (
  id             bigint generated always as identity primary key,
  at             timestamptz not null default now(),
  job            text        not null check (job in ('picks', 'research', 'report', 'guide')),
  model          text        not null,
  input_tokens   int         not null default 0,
  output_tokens  int         not null default 0,
  cache_read     int         not null default 0,
  cache_write    int         not null default 0,
  web_searches   int         not null default 0,
  batch          boolean     not null default false,
  cost_usd       numeric(10, 4) not null,
  detail         text
);
create index if not exists ai_costs_at on ai_costs (at desc);
alter table ai_costs enable row level security;

-- The weekly report (Opus 5.5): what happened last week and what to do next, with the numbers it was based on.
create table if not exists weekly_reports (
  id             bigint generated always as identity primary key,
  week           date        not null,
  status         text        not null default 'running' check (status in ('running', 'done', 'failed', 'skipped')),
  model          text,
  report         jsonb,                    -- the model's structured answer
  markdown       text,                     -- the same, readable (also shown in the GitHub run summary)
  inputs         jsonb,                    -- the numbers it was given
  cost_usd       numeric(10, 4),
  error          text,
  created_at     timestamptz not null default now()
);
create index if not exists weekly_reports_week on weekly_reports (week desc);
alter table weekly_reports enable row level security;

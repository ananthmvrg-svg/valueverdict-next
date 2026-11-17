-- Value Verdict: small saved state for scheduled jobs that have no disk of their own (Netlify functions).
-- Row "telegram-channel": which products the Telegram channel posted and when, today's menu/summary flags
-- (reels/channel.mjs with STATE_STORE=supabase). Private: row level security is on with no policy, so only the
-- secret key reads or writes it.
-- Run once in Supabase → SQL Editor → New query → paste → Run. Safe to re-run.
create table if not exists job_state (
  name        text        primary key,
  data        jsonb       not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);
alter table job_state enable row level security;

# Jobs that run on your PC

GitHub Actions no longer runs any Value Verdict jobs. GitHub's hosted runners are only for building, testing and
deploying the repo's own code, and rendering videos or running a bot there is what got the account suspended.
Here is where each job runs now:

| Job | Where | When |
|---|---|---|
| Deal refresh + AI picks | Netlify function `refresh-deals` (unchanged) | every 2 min |
| Telegram channel (menu, 50 deals, night summary) | Netlify function `telegram-channel` | every 15 min |
| Daily reels (Chromium + ffmpeg) + Telegram music removals | this PC, `run-job.ps1 reels` | daily 08:00 |
| Reel music (Lyria) | this PC, `run-job.ps1 music` | Sunday 07:00 |
| Weekly research | this PC, `run-job.ps1 research` | Sunday 04:00 |
| Weekly report | this PC, `run-job.ps1 report` | Monday 05:00 |

Research and report stay off Netlify because they run longer than the 30 seconds a Netlify scheduled function
gets (longer Netlify "background functions" need a paid plan).

## One-time setup (Windows)

1. Install Node.js 22.18 or newer, Git, and ffmpeg: `winget install OpenJS.NodeJS.LTS Git.Git Gyan.FFmpeg`
2. Clone the repo, e.g. `git clone https://github.com/ananthmvrg-svg/valueverdict-next C:\valueverdict-next`
3. In the repo folder, create `.env.local` (never committed) with the secrets that used to be GitHub secrets:
   ```
   TELEGRAM_BOT_TOKEN=...
   TELEGRAM_CHAT_ID=...
   ANTHROPIC_API_KEY=...
   GEMINI_API_KEY=...
   SUPABASE_SECRET_KEY=...
   AMAZON_CREDENTIAL_ID=...
   AMAZON_CREDENTIAL_SECRET=...
   GSC_SERVICE_ACCOUNT_JSON={...one line...}
   GA4_PROPERTY_ID=...
   YT_CLIENT_ID=...
   YT_CLIENT_SECRET=...
   YT_REFRESH_TOKEN=...
   ```
4. Try it once: `powershell -ExecutionPolicy Bypass -File .\pc\run-job.ps1 reels`
5. Schedule everything: `powershell -ExecutionPolicy Bypass -File .\pc\install-tasks.ps1`

A missed time (PC off or asleep) runs as soon as the PC is back on. Logs are in `pc\logs\`.
A reel ZIP over 50 MB stays in `reels\out\` (Telegram tells you); there are no GitHub releases any more.

## Netlify setup (Telegram channel)

1. Supabase → SQL Editor: run `supabase/2026-11-job-state.sql` once.
2. Netlify → Site configuration → Environment variables: add `TELEGRAM_BOT_TOKEN` (SUPABASE_SECRET_KEY is already
   there for refresh-deals). Optional: `TELEGRAM_CHANNEL`, `REELS_TIME`, `DEALS_UNTIL`, `DEALS_PER_DAY`, `SUMMARY_TIME`.
3. Deploy. Netlify → Logs → Functions → `telegram-channel` shows each 15-minute run.

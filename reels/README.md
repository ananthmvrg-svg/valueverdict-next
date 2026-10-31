# Value Verdict reel kit

Two extra reels come from the mixed lists: **Today's Top 10 Deals** (first 10 of the Top 100) and **Top 10 Amazon Finds**
(the #1 of each Amazon Finds section); both point to the website for the rest.

Every day at 8:00 AM IST (after the 6 AM picks run), GitHub Actions reads the same AI picks the website shows
(Supabase `deal_picks`) and makes one reel per budget page, e.g. Refrigerators · Under ₹35,000, with its top 1–5 picks:

- Hook slide (product photos + category + budget), one slide per pick, call-to-action slide
- Each pick shows the Amazon photo, name, spec chips, 👍 Best for, ✓ Pros, ✕ Cons and 💡 Good to know
  (spec chips and Good to know come from the site's own `src/lib/specs.ts` and `src/lib/tips.ts`)
- 1–3 picks play #1 → #N; 4–5 count down #N → #1
- `reel.mp4` (1080×1920, silent: add a trending sound in Instagram), `cover.jpg`, `slides/*.jpg`, `caption.txt` (5 hashtags)
- Telegram gets one message with one ZIP of everything (attached when under 50 MB, else a download button to a GitHub release; the last 7 are kept)

AI hooks (`copy.mjs`): one Claude call per run writes the hook title, emotional line, honest urgency line, follow line,
caption opener and post title for every page, using the season from `season.json` (edit it for the next festival) and only
real facts from the picks (Amazon deal labels, deal end dates, low stock). Needs the `ANTHROPIC_API_KEY` secret the site
already uses; without it, plain lines are used.

Prices on slides and posts carry the time Amazon confirmed them; post reels the same day.

Run now from the phone: GitHub app → this repo → Actions → **Daily Reels** → **Run workflow**
(optional: only some category slugs, picks per reel). Repo secrets: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`.

Local: `cd reels && npm install && npx playwright install chromium && npm run sample` (needs Node 22.18+, ffmpeg, zip).
Optional: put Amazon's official "Available at Amazon" badge (Associates Central) at `reels/amazon-badge.png` and it replaces the "on Amazon.in" text chip.
Design lives in `template.mjs`; data, timings, captions and hashtags in `generate.mjs`.

## Telegram channel (`channel.mjs`, workflow "Telegram Channel")

- **8:00 AM IST:** a "Today's best picks" menu with a button per category (website pages, Top 100, Amazon Finds), pinned for the day.
- **8:30 AM – 10:00 PM IST, every 30 minutes:** one deal: Amazon photo, deal price / M.R.P. / % off, deal end, low stock,
  best for, two pros, and buttons **🛒 Buy on Amazon** (direct affiliate link) and **📊 Compare top 5** (website).
  Categories take turns; a product posted in the last 3 days is skipped (state kept in the Actions cache).
- Needs the `TELEGRAM_BOT_TOKEN` secret, the bot as channel admin (post + pin), and optionally a `TELEGRAM_CHANNEL` variable.
- Try it: `node channel.mjs --menu --dry-run` or `node channel.mjs --deal --dry-run --count=3`.

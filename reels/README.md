# Value Verdict reel kit

Every day at 8:00 AM IST (after the 6 AM picks run), GitHub Actions reads the same AI picks the website shows
(Supabase `deal_picks`) and makes one reel per budget page, e.g. Refrigerators · Under ₹35,000, with its top 1–5 picks:

- Hook slide (product photos + category + budget), one slide per pick, call-to-action slide
- Each pick shows the Amazon photo, name, spec chips, 👍 Best for, ✓ Pros, ✕ Cons and 💡 Good to know
  (spec chips and Good to know come from the site's own `src/lib/specs.ts` and `src/lib/tips.ts`)
- 1–3 picks play #1 → #N; 4–5 count down #N → #1
- `reel.mp4` (1080×1920, silent: add a trending sound in Instagram), `cover.jpg`, `slides/*.jpg`, `caption.txt` (5 hashtags)
- Telegram gets every reel with its caption, plus one ZIP per category

AI hooks (`copy.mjs`): one Claude call per run writes the hook title, emotional line, honest urgency line, follow line,
caption opener and post title for every page, using the season from `season.json` (edit it for the next festival) and only
real facts from the picks (Amazon deal labels, deal end dates, low stock). Needs the `ANTHROPIC_API_KEY` secret the site
already uses; without it, plain lines are used.

Reels never print prices or discounts: a reel stays up for weeks, Amazon prices change daily.

Run now from the phone: GitHub app → this repo → Actions → **Daily Reels** → **Run workflow**
(optional: only some category slugs, picks per reel). Repo secrets: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`.

Local: `cd reels && npm install && npx playwright install chromium && npm run sample` (needs Node 22.18+, ffmpeg, zip).
Optional: put Amazon's official "Available at Amazon" badge (Associates Central) at `reels/amazon-badge.png` and it replaces the "on Amazon.in" text chip.
Design lives in `template.mjs`; data, timings, captions and hashtags in `generate.mjs`.

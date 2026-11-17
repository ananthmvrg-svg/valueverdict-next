# Value Verdict reel kit

Two extra reels come from the mixed lists: **Today's Top 10 Deals** (first 10 of the Top 100) and **Top 10 Amazon Finds**
(the #1 of each Amazon Finds section); both point to the website for the rest.

Every day at 8:00 AM IST (after the 6 AM picks run), your PC (`pc/run-job.ps1 reels`, see `pc/README.md`) reads the same AI picks the website shows
(Supabase `deal_picks`) and makes one reel per budget page, e.g. Refrigerators · Under ₹35,000, with its top 1–5 picks:

- Hook slide (product photos + category + budget), one slide per pick, call-to-action slide
- Each pick shows the Amazon photo, name, spec chips, 👍 Best for, ✓ Pros, ✕ Cons and 💡 Good to know
  (spec chips and Good to know come from the site's own `src/lib/specs.ts` and `src/lib/tips.ts`)
- 1–3 picks play #1 → #N; 4–5 count down #N → #1
- Every reel comes twice, in its own folder (files named `<folder>_<date>`):
  - `instagram/`: video ("Link in bio" on the slides), cover (no Amazon branding), single-image post, `_instagram.txt`
    (caption whose first line is the search phrase for Instagram search, #ad disclosure, 3–5 hashtags, alt text), `slides/`
  - `youtube/`: video ("Subscribe · valueverdict.in" instead of "link in bio"), thumbnail ("on Amazon"), `_youtube.txt`
- Background music from `reels/audio/` (royalty-free tracks you upload; see the README there), the same track in both versions.
  No tracks: silent videos.
- Every slide also says where the rest are: "Didn't find what you want? Every budget & brand on our website: link in bio"
  (YouTube: "at valueverdict.in"), since a reel shows only the top picks.
- **Telegram ZIP** (repository variable `AUTO_POST`, default off):
  - off (everything posted by hand): Top 10 Deals + Top 10 Amazon Finds (silent, add a trending sound) **plus every
    budget page whose picks or their order changed since the last ZIP** (all of them the first time; 🔄 in the list).
    Unchanged pages are left out, so the same reel is never posted twice.
  - `AUTO_POST=true`: only `MANUAL_REELS` (default `top-100,amazon-finds`); the rest are for automatic posting.
  All reels are always in `reels/out/ValueVerdict_all_*.zip` on the PC.
- Telegram gets one message with that ZIP (attached when under 50 MB; a bigger one stays in `reels/out/` on the PC)

AI hooks (`copy.mjs`): one Claude call per run writes the hook title, emotional line, honest urgency line, follow line,
caption opener and post title for every page, using the season from `season.json` (edit it for the next festival) and only
real facts from the picks (Amazon deal labels, deal end dates, low stock). Needs the `ANTHROPIC_API_KEY` secret the site
already uses; without it, plain lines are used.

Prices on slides and posts carry the time Amazon confirmed them; post reels the same day.

Run now: `powershell -ExecutionPolicy Bypass -File .\pc\run-job.ps1 reels`. Secrets live in `.env.local`.

Local: `cd reels && npm install && npx playwright install chromium && npm run sample` (needs Node 22.18+, ffmpeg, zip).
Optional: put Amazon's official "Available at Amazon" badge (Associates Central) at `reels/amazon-badge.png` and it replaces the "on Amazon.in" text chip.
Design lives in `template.mjs`; data, timings, captions and hashtags in `generate.mjs`.

## Telegram channel (`channel.mjs`, Netlify function `telegram-channel`)

- **8:00 AM IST, then each time the website re-checks prices (9, 12, 3, 6, 9; posted when the re-check is done, at the
  latest an hour later):** the "Today's best picks" menu (with "Prices just re-checked") with a button per category (website pages, Top 100, Amazon Finds), the newest one pinned.
- **8:30 AM – 10:00 PM IST, 50 deals spread evenly (about one every 16 minutes):** one deal: Amazon photo, deal price / M.R.P. / % off, deal end, low stock,
  best for, two pros, and buttons **🛒 Buy on Amazon** (direct affiliate link) and **📊 Compare top 5** (website).
  Every 10th post is a **💥 loot deal** (₹500 or less, 60%+ off, from everything Amazon returned today), and every
  post has a **📤 Share with a friend** button. **9:30 PM:** "Today's Top 5 deals" in one post.
  Categories take turns (Top 100, Amazon Finds, #1 and #2 of every budget page); a product posted in the last 2 days is skipped (state kept in the Supabase table `job_state`).
- Needs the `TELEGRAM_BOT_TOKEN` secret, the bot as channel admin (post + pin), and optionally a `TELEGRAM_CHANNEL` variable.
- Try it: `node channel.mjs --menu --dry-run` or `node channel.mjs --deal --dry-run --count=3`.

## YouTube Shorts (`youtube.mjs`)

**Now:** uploads are paused. Every reel's `youtube/` folder has `<name>_youtube.txt` (title, description, tags, hashtags).
Add `-Youtube` to `pc/run-job.ps1 reels` to upload private Shorts again (it reuses that metadata, no second search).


- Uploads the day's best 6 reels as **private** Shorts: Today's Top 10 Deals, Top 10 Amazon Finds, and 4 budget pages that take turns.
  You add a sound in YouTube Studio (Editor → Audio) and make them public. Telegram gets a list with Studio links.
- SEO researched fresh for each Short from YouTube's own data: autocomplete for the page's main query, and the 25 most
  viewed Shorts of the last 30 days for it. Tags may only be autocomplete phrases, those Shorts' tags, our brands and the
  query; hashtags only ones those Shorts really use (spelt the way most of them spell it), plus #Shorts and #ValueVerdict.
  Claude Haiku picks and writes from that; anything else it suggests is dropped. The cover is the first frame, since Shorts can't take a custom thumbnail by API.
- Secrets: `YT_CLIENT_ID`, `YT_CLIENT_SECRET`, `YT_REFRESH_TOKEN`. Without them the step is skipped.
- Preview the metadata without uploading: `node youtube.mjs --dry-run` after `npm run sample`.

## Daily time (no code change needed)

- Reels + ZIP + YouTube Shorts and the Telegram menu start at the daily time; Telegram deals follow every 30 minutes until 22:00.
- Default `08:00` IST in `reels/schedule.json`. To change it: GitHub → Settings → Secrets and variables → Actions →
  **Variables** → New variable `REELS_TIME` = `06:30` (24-hour, India time). Delete the variable to go back to 08:00.
  Optional variables: `DEALS_UNTIL` (default `22:00`), `DEALS_PER_DAY` (default `50`), `SUMMARY_TIME` (default `21:30`).
- One-off date: add it to `overrides` in `reels/schedule.json` (e.g. `"2026-11-01": "06:30"`); it wins over the variable for that day.
- GitHub checks every 15 minutes, so a run starts within about 15 minutes of the time (sometimes a little later when GitHub is busy).
- `node reels/when.mjs show` prints today's times.

## vidIQ SEO library (`seo/vidiq.json`)

Keyword data from vidIQ (India): monthly YouTube searches, competition and vidIQ score for each category's searches,
budget phrases ("best fridge under 20000") and hashtags. Claude refreshes it every few days with the vidIQ connection.
`youtube.mjs` uses it for every Short: the title follows the pattern of breakout Indian "top 5 under budget" Shorts
("Top 5 Best Fridge Under 35000 in 2026🔥Best Refrigerator Under 35000 on Amazon⚡Diwali Sale"), the page's keywords
lead the tags, the category's hashtags lead the hashtag line, and each reel gets an "opportunity" (searches × ease).
The Telegram message then says which 3 to post today: Top Deals, Amazon Finds and the budget page with the biggest
opportunity; the rest are listed as extras, best first.

## Instagram comment-to-DM (ManyChat)

Repository variable `MANYCHAT_KEYWORD`: empty = "Link in bio" (as before). A word such as `LINK` = every Instagram reel
says "Comment LINK for the link" (slides, caption, first comment). `category` = one word per category: FRIDGE, WASHING,
TV, AC, LAPTOP, SOUNDBAR, KITCHEN, GEYSER, STABILIZER, DEALS, FINDS. Set up the same word(s) in ManyChat first.

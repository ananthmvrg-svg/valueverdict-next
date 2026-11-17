import { SITE_URL, SUPABASE_KEY, SUPABASE_URL } from "../../src/lib/config";

/* Netlify scheduled function: every 15 minutes, the Telegram channel poster (reels/channel.mjs --auto) decides
   whether it's time for the category menu, a deal post or the night summary, and posts at most a few messages.
   It replaces the old GitHub Actions workflow. Its memory (what was posted when) is the Supabase row
   job_state/"telegram-channel" (run supabase/2026-11-job-state.sql once).
   Needs in the site's environment variables: TELEGRAM_BOT_TOKEN, SUPABASE_SECRET_KEY; optional TELEGRAM_CHANNEL
   (default @valueverdict), REELS_TIME, DEALS_UNTIL, DEALS_PER_DAY, SUMMARY_TIME. */
export default async function telegramChannelJob() {
  if (!process.env.TELEGRAM_BOT_TOKEN) { console.log("telegram-channel: TELEGRAM_BOT_TOKEN not set, skipped"); return; }
  process.env.SITE_URL ||= SITE_URL;
  process.env.SUPABASE_URL ||= SUPABASE_URL;
  process.env.SUPABASE_PUBLISHABLE_KEY ||= SUPABASE_KEY;
  process.env.STATE_STORE = "supabase";
  /* imported after the values above are set: shared.mjs reads them when it loads */
  const { run } = await import("../../reels/channel.mjs");
  await run("auto");
}

export const config = { schedule: "*/15 * * * *" };

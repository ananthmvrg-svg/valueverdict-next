/* Daily schedule, read by the reels, the Telegram Netlify function and pc/run-job.ps1 (India time, 24-hour "HH:MM").
   Order: a one-day override in schedule.json, then the REELS_TIME environment variable, then schedule.json "time".
   node when.mjs reels   → prints go=true when it's at or past today's time 
   node when.mjs show    → prints today's times */
import { appendFileSync } from "node:fs";
/* imported (not read from disk) so it is bundled into the Netlify function too */
import cfg from "./schedule.json" with { type: "json" };
const valid = (t) => /^([01]?\d|2[0-3]):[0-5]\d$/.test(String(t || "").trim()) ? String(t).trim().padStart(5, "0") : null;

export const istNow = () => new Date(Date.now() + 5.5 * 3600e3);
export const today = () => istNow().toISOString().slice(0, 10);
export const minutes = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };
export const nowMinutes = () => { const d = istNow(); return d.getUTCHours() * 60 + d.getUTCMinutes(); };
/* today's start time for reels, the Telegram menu and YouTube */
export function startTime(date = today()) {
  return valid(cfg.overrides?.[date]) || valid(process.env.REELS_TIME) || valid(cfg.time) || "08:00";
}
export const dealsUntil = () => valid(process.env.DEALS_UNTIL) || valid(cfg.deals_until) || "22:00";
/* deal posts per day (spread evenly from 30 minutes after the start until DEALS_UNTIL) and how often the category menu is re-posted */
export const dealsPerDay = () => Math.min(80, Math.max(1, parseInt(process.env.DEALS_PER_DAY || cfg.deals_per_day || 50, 10) || 50));
export const summaryTime = () => valid(process.env.SUMMARY_TIME) || valid(cfg.summary_time) || "21:30";

if (process.argv[1] && process.argv[1].endsWith("when.mjs")) {
  const what = process.argv[2], start = startTime();
  const out = (k, v) => { console.log(`${k}=${v}`); if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${k}=${v}\n`); };
  if (what === "reels") { out("date", today()); out("go", nowMinutes() >= minutes(start)); out("start", start); }
  else console.log(`today ${today()}: reels, YouTube and Telegram menu at ${start} IST; ${dealsPerDay()} deals until ${dealsUntil()}, menu after each price re-check, top-5 summary at ${summaryTime()}`);
}

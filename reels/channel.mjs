/* Value Verdict Telegram channel poster.
   node channel.mjs --menu    8 AM: "Today's picks" menu with a button per category (website pages), pinned for the day
   node channel.mjs --deal    one deal post: Amazon photo, deal price / M.R.P. / % off, best for, pros,
                              [🛒 Buy on Amazon] (direct affiliate link) [📊 Compare] (website page)
   Options: --dry-run (print instead of posting), --sample (sample.json, no network), --count=N (deals per run)
   Env: TELEGRAM_BOT_TOKEN, TELEGRAM_CHANNEL (default @valueverdict), STATE_FILE (default reels/channel-state.json)

   Deals come from the same AI picks the website shows (price confirmed by Amazon in the last 24 hours):
   Top 100, Amazon Finds and the #1 of every budget page. Categories take turns, and a product posted in the
   last 3 days is skipped. The state file is kept between runs by the workflow's cache. */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SITE_URL, select, shortName, clean, brandCase } from "./shared.mjs";
import { startTime, dealsUntil, dealEvery, minutes, nowMinutes } from "./when.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const opt = (k) => args.find((a) => a.startsWith(`--${k}=`))?.split("=")[1];
const DRY = flag("--dry-run"), SAMPLE = flag("--sample");
const COUNT = Math.max(1, parseInt(opt("count") || process.env.DEALS_PER_RUN || "1", 10) || 1);
const CHANNEL = process.env.TELEGRAM_CHANNEL || "@valueverdict";
const STATE_FILE = process.env.STATE_FILE || join(here, "channel-state.json");
const UTM = "utm_source=telegram&utm_medium=channel";
const REPEAT_DAYS = 3;

const ist = (d = new Date()) => new Date(d.getTime() + 5.5 * 3600e3);
const DATE = ist().toISOString().slice(0, 10);
const esc = (s) => String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
const inr = (n) => "₹" + Math.round(n).toLocaleString("en-IN");
const site = (path) => `${SITE_URL}${path}${path.includes("?") ? "&" : "?"}${UTM}`;
const timeOf = (iso) => new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit" });
const dayMonth = (iso) => new Date(iso).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" });

async function loadData() {
  if (SAMPLE) return JSON.parse(readFileSync(join(here, "sample.json"), "utf8"));
  const since = new Date(Date.now() - 24 * 36e5).toISOString();
  const [cats, subs, picks] = await Promise.all([
    select("categories", "select=category_id,name,slug,icon,sort_order,active"),
    select("subcategories", "select=subcategory_id,category_id,name,slug,sort_order,active"),
    select("deal_picks", `select=group_key,rank,section,category,data,best_for,strengths,limitations,price_checked_at&price_checked_at=gte.${encodeURIComponent(since)}&order=group_key.asc,rank.asc&limit=3000`),
  ]);
  return { cats, subs, picks };
}

async function tg(method, body) {
  if (DRY) { console.log(`\n--- ${method} ---\n${JSON.stringify(body, null, 2)}`); return { result: { message_id: 0 } }; }
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("Set TELEGRAM_BOT_TOKEN (or use --dry-run)");
  const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ chat_id: CHANNEL, ...body }),
  });
  const j = await r.json().catch(() => ({}));
  if (!j.ok) throw new Error(`Telegram ${method}: ${j.description || r.status}`);
  return j;
}

/* ---------- 8 AM menu ---------- */
async function menu({ cats, picks }) {
  const live = new Set(picks.map((p) => p.group_key.split("/")[0]));
  const list = cats.filter((c) => c.active !== false && !["amazon-finds", "top-100"].includes(c.slug) && live.has(c.slug))
    .sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999));
  const btn = (c) => ({ text: `${c.icon || "🛍️"} ${c.name}`, url: site(`/${c.slug}`), style: "primary" });
  const rows = [];
  for (let i = 0; i < list.length; i += 2) rows.push(list.slice(i, i + 2).map(btn));
  rows.push([{ text: "🔥 Today's Top 100 Deals", url: site("/top-deals"), style: "danger" }]);
  if (picks.some((p) => p.group_key === "amazon-finds")) rows.push([{ text: "🛒 Amazon Finds", url: site("/amazon-finds"), style: "success" }]);
  const day = new Date().toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", weekday: "long", day: "numeric", month: "long" });
  const text = [
    `🪔 <b>Today's best picks · ${esc(day)}</b>`,
    "",
    "Shopping for something specific? Tap a category 👇",
    "Top 5 at every budget, with pros, cons and today's Amazon price.",
    "",
    "Deals keep coming here all day till 10 PM. Turn on 🔔 so you don't miss one.",
    "",
    "<i>As an Amazon Associate we earn from qualifying purchases.</i>",
  ].join("\n");
  const sent = await tg("sendMessage", { text, parse_mode: "HTML", link_preview_options: { is_disabled: true }, reply_markup: { inline_keyboard: rows } });
  /* keep only today's menu pinned */
  await tg("unpinAllChatMessages", {}).catch((e) => console.warn("unpin:", e.message));
  await tg("pinChatMessage", { message_id: sent.result.message_id, disable_notification: true }).catch((e) => console.warn("pin:", e.message));
  console.log(`✔ menu posted with ${list.length} categories`);
}

/* ---------- deal posts ---------- */
const sectionName = (p) => String(p.section || "").replace(/\s*deals?$/i, "");

/* every candidate, with the website page to compare on; categories take turns so the feed stays varied */
function queue({ cats, subs, picks }) {
  const subOf = new Map(subs.map((s) => [`${cats.find((c) => c.category_id === s.category_id)?.slug}/${s.slug}`, s]));
  const catName = new Map(cats.map((c) => [c.slug, c.name]));
  const byKind = new Map(); /* kind → list in priority order */
  const add = (kind, p, compare, label) => {
    if (!p.data?.asin || p.data.price == null || !p.data.url) return;
    if (!byKind.has(kind)) byKind.set(kind, []);
    byKind.get(kind).push({ p, compare, label });
  };
  for (const p of picks.filter((x) => x.group_key === "top-100").sort((a, b) => a.rank - b.rank))
    add(p.category || "top", p, p.category && catName.has(p.category) ? `/${p.category}` : "/top-deals", sectionName(p));
  for (const p of picks.filter((x) => x.group_key === "amazon-finds").sort((a, b) => a.rank - b.rank))
    add(`find:${p.section}`, p, "/amazon-finds", sectionName(p));
  for (const p of picks.filter((x) => x.group_key.includes("/") && x.rank === 1)) {
    const [cat] = p.group_key.split("/");
    add(cat, p, `/${p.group_key}`, `${catName.get(cat) || ""} · ${subOf.get(p.group_key)?.name || ""}`);
  }
  /* round-robin across kinds, dropping repeats of the same product */
  const lists = [...byKind.values()], out = [], seen = new Set();
  for (let i = 0; lists.some((l) => l.length > i); i++)
    for (const l of lists) if (l[i] && !seen.has(l[i].p.data.asin)) { seen.add(l[i].p.data.asin); out.push(l[i]); }
  return out;
}

function dealPost({ p, compare, label }) {
  const d = p.data, brand = brandCase(d.brand || "");
  const name = `${brand ? brand + " " : ""}${shortName(d.title, d.brand)}`;
  const pros = clean(p.strengths).slice(0, 2);
  const lines = [ /* null = line left out; "" = blank spacer line */
    `🔥 <b>${esc(name)}</b>`,
    label ? `<i>${esc(label)}</i>` : null,
    "",
    `✅ Deal price: <b>${inr(d.price)}</b>${d.off ? `  (${Math.round(d.off)}% off)` : ""}`,
    d.was && d.was > d.price ? `❌ M.R.P.: <s>${inr(d.was)}</s>` : null,
    d.deal ? `🏷️ ${esc(d.deal)}${d.dealEnds ? `, ends ${dayMonth(d.dealEnds)}` : ""}` : d.dealEnds ? `⏳ Deal ends ${dayMonth(d.dealEnds)}` : null,
    d.lowStock ? `⚡ ${esc(d.lowStock.replace(/\.$/, ""))}` : null,
    p.best_for || pros.length ? "" : null,
    p.best_for ? `👍 <b>Best for:</b> ${esc(p.best_for)}` : null,
    ...pros.map((x) => `✓ ${esc(x)}`),
    "",
    `<i>Amazon.in price at ${timeOf(p.price_checked_at)}, may change · #ad</i>`,
  ].filter((x) => x !== null);
  return {
    photo: d.image ? d.image.replace(/\._SL\d+_\./, "._SL1000_.") : undefined,
    caption: lines.join("\n").slice(0, 1024),
    parse_mode: "HTML",
    /* coloured buttons (Telegram Bot API "style"; older apps show them plain) */
    reply_markup: { inline_keyboard: [[{ text: "🛒 Buy on Amazon", url: d.url, style: "success" }, { text: "📊 Compare top 5", url: site(compare), style: "primary" }]] },
  };
}

function loadState() {
  try { return JSON.parse(readFileSync(STATE_FILE, "utf8")); } catch { return { posted: {} }; }
}
function saveState(s) {
  const cutoff = new Date(Date.now() - 14 * 864e5).toISOString().slice(0, 10);
  for (const [asin, day] of Object.entries(s.posted)) if (day < cutoff) delete s.posted[asin];
  if (!DRY) writeFileSync(STATE_FILE, JSON.stringify(s, null, 1));
}

async function deals(data) {
  const state = loadState();
  const recent = new Date(Date.now() - REPEAT_DAYS * 864e5).toISOString().slice(0, 10);
  const fresh = queue(data).filter((x) => !(state.posted[x.p.data.asin] >= recent));
  if (!fresh.length) { console.log("no new deal to post"); return; }
  /* continue the day's rotation where the last run stopped */
  const start = state.day === DATE ? state.next || 0 : 0;
  for (let k = 0; k < COUNT; k++) {
    const item = fresh[(start + k) % fresh.length];
    const post = dealPost(item);
    try {
      if (post.photo) await tg("sendPhoto", post);
      else await tg("sendMessage", { text: post.caption, parse_mode: "HTML", reply_markup: post.reply_markup });
    } catch (e) {
      /* Telegram sometimes can't fetch a photo URL: post the text instead of skipping the deal */
      if (!post.photo || !/photo|image|URL|wrong file/i.test(e.message)) throw e;
      await tg("sendMessage", { text: post.caption, parse_mode: "HTML", reply_markup: post.reply_markup });
    }
    state.posted[item.p.data.asin] = DATE;
    console.log(`✔ posted ${item.p.data.asin} (${item.label || item.p.group_key})`);
  }
  state.day = DATE; state.next = start; /* repeats are filtered next time, so the same index is the next new item */
  saveState(state);
}

/* --auto (the 15-minute schedule): today's menu once at the start time (schedule.json / REELS_TIME), then a deal
   every DEAL_EVERY_MINUTES from 30 minutes later until DEALS_UNTIL. Every other run does nothing. */
async function auto() {
  const state = loadState(), now = nowMinutes(), start = minutes(startTime());
  if (now < start) { console.log(`before today's start (${startTime()} IST), nothing to do`); return; }
  if (state.menuDay !== DATE) {
    await menu(await loadData());
    state.menuDay = DATE; saveState(state); return;
  }
  if (now < start + 30 || now > minutes(dealsUntil())) { console.log("outside deal hours"); return; }
  if (state.lastDealAt && Date.now() - Date.parse(state.lastDealAt) < (dealEvery() - 5) * 60e3) { console.log("last deal was recent"); return; }
  await deals(await loadData());
  const after = loadState(); after.lastDealAt = new Date().toISOString(); saveState(after);
}

if (flag("--auto")) await auto();
else if (flag("--menu")) await menu(await loadData());
else if (flag("--deal")) await deals(await loadData());
else console.log("Use --auto, --menu or --deal (add --dry-run to preview)");

/* Value Verdict Telegram channel poster.
   node channel.mjs --menu    "Today's picks" menu with a button per category (website pages), pinned; re-posted after each price re-check
   node channel.mjs --summary night post: today's top 5 deals (--deal --loot: a loot deal first)
   node channel.mjs --deal    one deal post: Amazon photo, deal price / M.R.P. / % off, best for, pros,
                              [🛒 Buy on Amazon] (direct affiliate link) [📊 Compare] (website page)
   Options: --dry-run (print instead of posting), --sample (sample.json, no network), --count=N (deals per run)
   Env: TELEGRAM_BOT_TOKEN, TELEGRAM_CHANNEL (default @valueverdict), STATE_FILE (default reels/channel-state.json)

   Deals come from the same AI picks the website shows (price confirmed by Amazon in the last 24 hours):
   Top 100, Amazon Finds and the #1 of every budget page. Categories take turns, and a product posted in the
   last 2 days is skipped. State: STATE_STORE=supabase keeps it in the Supabase table job_state (row "telegram-channel",
   needs SUPABASE_SECRET_KEY; used by netlify/functions/telegram-channel.mts), otherwise in STATE_FILE. */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SITE_URL, SUPABASE_URL, select, shortName, clean, brandCase } from "./shared.mjs";
import { startTime, dealsUntil, dealsPerDay, summaryTime, minutes, nowMinutes } from "./when.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const opt = (k) => args.find((a) => a.startsWith(`--${k}=`))?.split("=")[1];
const DRY = flag("--dry-run"), SAMPLE = flag("--sample");
const COUNT = Math.max(1, parseInt(opt("count") || process.env.DEALS_PER_RUN || "1", 10) || 1);
const CHANNEL = process.env.TELEGRAM_CHANNEL || "@valueverdict";
const STATE_FILE = process.env.STATE_FILE || join(here, "channel-state.json");
const UTM = "utm_source=telegram&utm_medium=channel";
const REPEAT_DAYS = 2; /* ~50 posts a day: a product may come back after two days (sooner only if nothing new is left) */

const ist = (d = new Date()) => new Date(d.getTime() + 5.5 * 3600e3);
let DATE = ist().toISOString().slice(0, 10); /* set again at the start of every run (Netlify reuses warm modules) */
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
  return { cats, subs, picks, loot: await lootDeals(since) };
}

/* loot deals: anything Amazon gave us today (all searches, not only the AI picks) at ₹500 or less with 60%+ off */
const LOOT_MAX = 500, LOOT_OFF = 60;
async function lootDeals(since) {
  try {
    const rows = await select("deals", `select=data,fetched_at&fetched_at=gte.${encodeURIComponent(since)}&limit=5000`);
    const seen = new Set();
    return rows.filter((r) => { const d = r.data || {}; return d.asin && d.url && d.price != null && d.price <= LOOT_MAX && (d.off ?? 0) >= LOOT_OFF && !seen.has(d.asin) && seen.add(d.asin); })
      .sort((a, b) => (b.data.off ?? 0) - (a.data.off ?? 0))
      .map((r) => ({ p: { data: r.data, price_checked_at: r.fetched_at, best_for: "", strengths: [] }, compare: "/amazon-finds", label: "", loot: true }));
  } catch (e) { console.warn("loot deals skipped:", e.message); return []; }
}

/* "📤 Share" button: Telegram's share screen with a link to the post (or the channel) */
const USERNAME = CHANNEL.startsWith("@") ? CHANNEL.slice(1) : "";
const shareRow = (messageId, text) => USERNAME
  ? [{ text: "📤 Share", url: `https://t.me/share/url?url=${encodeURIComponent(`https://t.me/${USERNAME}${messageId ? "/" + messageId : ""}`)}&text=${encodeURIComponent(text)}` }]
  : null;
async function addShare(sent, markup, text) {
  const row = shareRow(sent?.result?.message_id, text);
  if (!row || DRY) return;
  /* next to a lone last button (Compare) when there is one, else on its own row */
  const rows = markup.inline_keyboard.map((r) => [...r]), last = rows[rows.length - 1];
  if (last && last.length === 1 && rows.length > 1) last.push(...row); else rows.push(row);
  await tg("editMessageReplyMarkup", { message_id: sent.result.message_id, reply_markup: { inline_keyboard: rows } })
    .catch((e) => console.warn("share button:", e.message));
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

/* ---------- category menu: at the start time, then each time the website's prices are re-checked ---------- */
async function menu({ cats, picks }, again = false) {
  const live = new Set(picks.map((p) => p.group_key.split("/")[0]));
  const list = cats.filter((c) => c.active !== false && !["amazon-finds", "top-100"].includes(c.slug) && live.has(c.slug))
    .sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999));
  /* category buttons stay plain (their icons, e.g. ❄️, would vanish on a blue button) */
  const btn = (c) => ({ text: `${c.icon || "🛍️"} ${c.name}`, url: site(`/${c.slug}`) });
  const rows = [];
  for (let i = 0; i < list.length; i += 2) rows.push(list.slice(i, i + 2).map(btn));
  rows.push([{ text: "⭐ Today's Top 100 Deals", url: site("/top-deals"), style: "danger" }]);
  if (picks.some((p) => p.group_key === "amazon-finds")) rows.push([{ text: "🛍️ Amazon Finds", url: site("/amazon-finds"), style: "success" }]);
  const share = shareRow(0, "Value Verdict: the best Amazon deals for every budget, every day 👇");
  if (share) rows.push([{ ...share[0], text: "📤 Share this channel" }]);
  const day = new Date().toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", weekday: "long", day: "numeric", month: "long" });
  const text = [
    `🪔 <b>Today's best picks · ${esc(day)}</b>${again ? `\n💰 <i>Prices just re-checked on Amazon (${esc(new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit" }))})</i>` : ""}`,
    "",
    "Shopping for something specific? Tap a category 👇",
    "Top 5 at every budget, with pros, cons and today's Amazon price.",
    "",
    `Deals keep coming here all day till ${esc(dealsUntil().replace(/^(\d+):(\d+)$/, (m, h, mm) => `${((+h + 11) % 12) + 1}${mm === "00" ? "" : ":" + mm} ${+h >= 12 ? "PM" : "AM"}`))}. Turn on 🔔 so you don't miss one.`,
    "",
    "<i>As an Amazon Associate we earn from qualifying purchases.</i>",
  ].join("\n");
  const sent = await tg("sendMessage", { text, parse_mode: "HTML", link_preview_options: { is_disabled: true }, reply_markup: { inline_keyboard: rows } });
  /* keep only the latest menu pinned */
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
  for (const p of picks.filter((x) => x.group_key.includes("/") && x.rank <= 2).sort((a, b) => a.rank - b.rank)) {
    const [cat] = p.group_key.split("/");
    add(cat, p, `/${p.group_key}`, `${catName.get(cat) || ""} · ${subOf.get(p.group_key)?.name || ""}`);
  }
  /* round-robin across kinds, dropping repeats of the same product */
  const lists = [...byKind.values()], out = [], seen = new Set();
  for (let i = 0; lists.some((l) => l.length > i); i++)
    for (const l of lists) if (l[i] && !seen.has(l[i].p.data.asin)) { seen.add(l[i].p.data.asin); out.push(l[i]); }
  return out;
}

function dealPost(item) {
  const { p, compare, label } = item;
  const d = p.data, brand = brandCase(d.brand || "");
  const name = `${brand ? brand + " " : ""}${shortName(d.title, d.brand)}`;
  const pros = clean(p.strengths).slice(0, 2);
  const lines = [ /* null = line left out; "" = blank spacer line */
    ...(item.loot ? [`💥 <b>LOOT DEAL</b> · under ₹${LOOT_MAX}`, ""] : []),
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
    /* Buy gets its own full-width row so its label never gets cut; Compare and Share share the row below.
       Emoji picked to stand out on the coloured buttons (multi-colour bags on green, gold trophy on blue) */
    reply_markup: { inline_keyboard: [[{ text: "🛍️ Buy on Amazon", url: d.url, style: "success" }], [{ text: "🏆 Compare", url: site(compare), style: "primary" }]] },
  };
}

/* where the posted-products memory lives: Supabase on Netlify (no disk that survives between runs), a file locally */
const STATE_ROW = "telegram-channel";
const inDb = () => process.env.STATE_STORE === "supabase";
async function db(method, path, body) {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error("STATE_STORE=supabase needs SUPABASE_SECRET_KEY");
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { method, headers: { apikey: key, "content-type": "application/json",
    ...(method === "POST" ? { Prefer: "resolution=merge-duplicates,return=minimal" } : {}) }, body: body && JSON.stringify(body) });
  if (!r.ok) throw new Error(`Supabase job_state: HTTP ${r.status} ${await r.text()}`);
  const t = await r.text(); return t ? JSON.parse(t) : null;
}
async function loadState() {
  if (inDb()) {
    const rows = await db("GET", `job_state?name=eq.${STATE_ROW}&select=data`);
    return { posted: {}, ...(rows?.[0]?.data || {}) };
  }
  try { return JSON.parse(readFileSync(STATE_FILE, "utf8")); } catch { return { posted: {} }; }
}
async function saveState(s) {
  const cutoff = new Date(Date.now() - 14 * 864e5).toISOString().slice(0, 10);
  for (const [asin, day] of Object.entries(s.posted || {})) if (day < cutoff) delete s.posted[asin];
  if (DRY) return;
  if (inDb()) await db("POST", "job_state?on_conflict=name", { name: STATE_ROW, data: s, updated_at: new Date().toISOString() });
  else writeFileSync(STATE_FILE, JSON.stringify(s, null, 1));
}

async function deals(data, count = COUNT, lootFirst = false) {
  const state = await loadState();
  const recent = new Date(Date.now() - REPEAT_DAYS * 864e5).toISOString().slice(0, 10);
  const all = queue(data), when = (x) => state.posted[x.p.data.asin];
  let fresh = all.filter((x) => !(when(x) >= recent));
  /* every 10th post is a loot deal (₹500 or less, 60%+ off) when there's a new one */
  const loot = lootFirst ? (data.loot || []).find((x) => !(when(x) >= recent)) : null;
  /* not enough new ones: the longest-unposted, never one already posted today */
  if (fresh.length < count) fresh = [...fresh, ...all.filter((x) => when(x) && when(x) >= recent && when(x) < DATE).sort((a, b) => (when(a) < when(b) ? -1 : 1))];
  if (!fresh.length) { console.log("no new deal to post"); return 0; }
  /* continue the day's rotation where the last run stopped */
  const start = state.day === DATE ? state.next || 0 : 0;
  let posted = 0;
  for (let k = 0; k < Math.min(count, fresh.length + (loot ? 1 : 0)); k++) {
    if (k) await new Promise((r) => setTimeout(r, 4000));
    const item = loot && k === 0 ? loot : fresh[(start + k - (loot ? 1 : 0)) % fresh.length];
    const post = dealPost(item);
    let sent;
    try {
      if (post.photo) sent = await tg("sendPhoto", post);
      else sent = await tg("sendMessage", { text: post.caption, parse_mode: "HTML", reply_markup: post.reply_markup });
    } catch (e) {
      /* Telegram sometimes can't fetch a photo URL: post the text instead of skipping the deal */
      if (!post.photo || !/photo|image|URL|wrong file/i.test(e.message)) throw e;
      sent = await tg("sendMessage", { text: post.caption, parse_mode: "HTML", reply_markup: post.reply_markup });
    }
    const d = item.p.data;
    await addShare(sent, post.reply_markup, `${item.loot ? "💥 Loot deal: " : "🔥 "}${brandCase(d.brand || "")} ${shortName(d.title, d.brand)} at ${inr(d.price)}${d.off ? ` (${Math.round(d.off)}% off)` : ""}`);
    state.posted[item.p.data.asin] = DATE; posted++;
    console.log(`✔ posted ${item.p.data.asin} (${item.label || item.p.group_key})`);
  }
  state.day = DATE; state.next = start; /* repeats are filtered next time, so the same index is the next new item */
  await saveState(state);
  return posted;
}

/* ---------- night summary: today's top 5 deals in one post ---------- */
async function summary({ picks }) {
  const top = picks.filter((p) => p.group_key === "top-100" && p.data?.url && p.data.price != null).sort((a, b) => a.rank - b.rank).slice(0, 5);
  if (!top.length) { console.log("no Top 100 picks for the summary"); return; }
  const num = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣"];
  const day = new Date().toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "long" });
  const lines = top.map((p, i) => {
    const d = p.data, name = `${brandCase(d.brand || "")} ${shortName(d.title, d.brand)}`.trim();
    return `${num[i]} <a href="${esc(d.url)}">${esc(name)}</a>\n     <b>${inr(d.price)}</b>${d.off ? ` · ${Math.round(d.off)}% off` : ""}${p.section ? ` · <i>${esc(sectionName(p))}</i>` : ""}`;
  });
  const at = top.map((p) => p.price_checked_at).filter(Boolean).sort()[0];
  const text = [`🌙 <b>Today's Top 5 deals · ${esc(day)}</b>`, "Missed the day? These were the best value on Amazon today 👇", "", ...lines, "",
    `<i>Amazon.in prices at ${at ? timeOf(at) : "today"}, may change · #ad</i>`].join("\n");
  const markup = { inline_keyboard: [[{ text: "⭐ See all 100 deals", url: site("/top-deals"), style: "danger" }]] };
  const sent = await tg("sendMessage", { text, parse_mode: "HTML", link_preview_options: { is_disabled: true }, reply_markup: markup });
  await addShare(sent, markup, `🌙 Today's Top 5 Amazon deals (${day})`);
  console.log(`✔ night summary posted (${top.length} deals)`);
}

/* the website re-checks prices 3, 6, 9… hours after its 6 AM picks (src/lib/refresh.ts: CYCLE_HOURS_IST, PRICE_CHECK_HOURS) */
const CYCLE_AT = 6 * 60, PRICE_EVERY = 3 * 60;
const priceSlot = (now) => { const k = Math.floor((now - CYCLE_AT) / PRICE_EVERY); return k >= 1 ? CYCLE_AT + k * PRICE_EVERY : null; };
/* done when no pick shown on the site still has a price from before that re-check */
async function pricesChecked(slot) {
  const since = new Date(Date.parse(`${DATE}T00:00:00+05:30`) + slot * 60e3).toISOString();
  try { return !(await select("deal_picks", `select=asin&price_checked_at=lt.${encodeURIComponent(since)}&limit=1`)).length; } catch { return false; }
}

/* --auto (the 15-minute schedule):
   - the category menu at the start time (schedule.json / REELS_TIME), then again as soon as the website has
     re-checked its prices (every 3 hours after the 6 AM picks: 9, 12, 3, 6, 9), pinned in place of the last one;
     if a re-check runs long, the menu goes out an hour after its start anyway;
   - DEALS_PER_DAY deals spread evenly from 30 minutes after the start until DEALS_UNTIL (every 10th a loot deal).
     A late or skipped GitHub run is made up by the next one (at most 3 at a time);
   - at SUMMARY_TIME (default 21:30), today's top 5 deals in one post. */
async function auto() {
  const state = await loadState(), now = nowMinutes(), start = minutes(startTime()), end = minutes(dealsUntil());
  if (now < start) { console.log(`before today's start (${startTime()} IST), nothing to do`); return; }
  const slot = priceSlot(now);
  if (state.menuDay !== DATE) {
    await menu(await loadData());
    state.menuDay = DATE; state.menuAt = slot && slot <= start ? slot : 0; await saveState(state); return;
  }
  if (slot && slot > (state.menuAt || 0) && now <= end && (now >= slot + 60 || await pricesChecked(slot))) {
    await menu(await loadData(), true);
    state.menuAt = slot; await saveState(state); return;
  }
  if (now >= minutes(summaryTime()) && state.summaryDay !== DATE && now <= end + 60) {
    await summary(await loadData());
    state.summaryDay = DATE; await saveState(state); return;
  }
  const first = start + 30, total = dealsPerDay();
  if (now < first || now > end + 15) { console.log("outside deal hours"); return; }
  const due = Math.min(total, Math.floor(((Math.min(now, end) - first) / Math.max(1, end - first)) * (total - 1)) + 1);
  const done = Object.values(state.posted || {}).filter((d) => d === DATE).length; /* posted today */
  if (due <= done) { console.log(`on schedule (${done}/${total} today)`); return; }
  const n = await deals(await loadData(), Math.min(3, due - done), done % 10 === 4);
  const after = await loadState(); after.lastDealAt = new Date().toISOString(); await saveState(after);
  console.log(`${done + n}/${total} deals today`);
}

/* one run; mode = auto | menu | deal | summary. Exported for netlify/functions/telegram-channel.mts */
export async function run(mode = "auto") {
  DATE = ist().toISOString().slice(0, 10);
  if (mode === "auto") return auto();
  if (mode === "menu") return menu(await loadData());
  if (mode === "deal") return deals(await loadData(), COUNT, flag("--loot"));
  if (mode === "summary") return summary(await loadData());
  throw new Error(`unknown mode ${mode}`);
}

if (process.argv[1] && /channel\.mjs$/.test(process.argv[1])) {
  const mode = ["auto", "menu", "deal", "summary"].find((m) => flag(`--${m}`));
  if (mode) await run(mode);
  else console.log("Use --auto, --menu, --deal or --summary (add --dry-run to preview)");
}

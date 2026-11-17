/* Upload today's best reels to the Value Verdict YouTube channel as PRIVATE Shorts, with researched
   titles, descriptions, tags and hashtags. You add audio in YouTube Studio and make them public yourself.

   node youtube.mjs              after generate.mjs (reads reels/out/latest.json)
   node youtube.mjs --dry-run    research + write the metadata, print it, upload nothing
   Env: YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN (OAuth, scopes youtube.upload + youtube.readonly)
        ANTHROPIC_API_KEY (titles/descriptions; plain ones without it), YT_SHORTS_PER_DAY (default 6),
        TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID (optional: a summary with Studio links)

   Which reels: Today's Top 10 Deals, Top 10 Amazon Finds, then budget pages taking turns day by day.
   SEO for each Short, researched fresh every day:
     1. YouTube search autocomplete for the page's main query (what people actually type)
     2. the 25 most viewed Shorts of the last 30 days for that query: their tags and the hashtags they really use
      (tags and hashtags on our Shorts come only from these, autocomplete, our brands and #Shorts/#ValueVerdict)
     3. our own data: products, specs, who they suit, the season
   Claude Haiku turns that into the title, description, tags and hashtags. */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { seasonFor, themeFor } from "./copy.mjs";
import { mainQuery, ONE } from "./shared.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const DRY = process.argv.includes("--dry-run");
const PER_DAY = Math.max(1, parseInt(process.env.YT_SHORTS_PER_DAY || "6", 10) || 6);
const MODEL = process.env.REELS_MODEL || "claude-haiku-5-5";
/* the run being worked on: out/latest.json when run on its own, or handed over by generate.mjs */
let manifest = null, season = "";
/* the last YouTube research failure (e.g. an expired login), so generate.mjs can warn on Telegram */
export let researchError = "";
export function useRun(run) { manifest = run; season = seasonFor(run.date); }

/* ---------- which reels ---------- */
function choose(reels) {
  const fixed = reels.filter((r) => ["top-100", "amazon-finds"].includes(r.catSlug));
  const pages = reels.filter((r) => !["top-100", "amazon-finds"].includes(r.catSlug) && r.items.length >= 2);
  /* budget pages take turns: a different set every day, cycling through all of them */
  const day = Math.floor(Date.parse(manifest.date) / 864e5), n = Math.max(0, PER_DAY - fixed.length);
  const start = pages.length ? (day * n) % pages.length : 0;
  const turn = Array.from({ length: Math.min(n, pages.length) }, (_, i) => pages[(start + i) % pages.length]);
  return [...fixed, ...turn].slice(0, PER_DAY);
}

/* ---------- OAuth ---------- */
let token = "";
async function accessToken() {
  if (token) return token;
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    body: new URLSearchParams({ client_id: process.env.YT_CLIENT_ID, client_secret: process.env.YT_CLIENT_SECRET, refresh_token: process.env.YT_REFRESH_TOKEN, grant_type: "refresh_token" }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error(`YouTube login failed: ${j.error || r.status} ${j.error_description || ""}`);
  return (token = j.access_token);
}
async function yt(path, params) {
  const r = await fetch(`https://www.googleapis.com/youtube/v3/${path}?${new URLSearchParams(params)}`, { headers: { Authorization: `Bearer ${await accessToken()}` } });
  const j = await r.json();
  if (!r.ok) throw new Error(`YouTube ${path}: ${j.error?.message || r.status}`);
  return j;
}

/* ---------- research ---------- */
async function autocomplete(q) {
  try {
    const r = await fetch(`https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&hl=en&gl=IN&q=${encodeURIComponent(q)}`, { signal: AbortSignal.timeout(10000) });
    const j = JSON.parse(await r.text());
    return (j[1] || []).slice(0, 12);
  } catch (e) { console.warn(`  autocomplete skipped (${e.message})`); return []; }
}
async function topShorts(q) {
  try {
    const after = new Date(Date.now() - 30 * 864e5).toISOString();
    const s = await yt("search", { part: "id", q, type: "video", order: "viewCount", publishedAfter: after, regionCode: "IN", relevanceLanguage: "en", videoDuration: "short", maxResults: "25" });
    const ids = (s.items || []).map((x) => x.id.videoId).filter(Boolean);
    if (!ids.length) return [];
    const v = await yt("videos", { part: "snippet,statistics", id: ids.join(",") });
    return (v.items || []).map((x) => ({ title: x.snippet.title, tags: (x.snippet.tags || []).slice(0, 20), views: Number(x.statistics?.viewCount || 0),
      hashtags: hashtagsIn(`${x.snippet.title}\n${x.snippet.description || ""}`) }));
  } catch (e) { console.warn(`  top Shorts skipped (${e.message})`); researchError = e.message; return []; }
}

/* hashtags as they're written in a text, e.g. "#AmazonFinds" */
const hashtagsIn = (text) => [...String(text).matchAll(/(^|\s)#([\p{L}\p{N}_]{2,40})/gu)].map((m) => m[2]);

/* hashtags real top Shorts use for this search: how many of them use each one, written the way most of them write it.
   Only these (plus #Shorts and our own #ValueVerdict) go on our Shorts, so every hashtag leads to a real, busy page. */
function realHashtags(top) {
  const count = new Map(), spelt = new Map();
  for (const v of top) for (const h of new Set(v.hashtags.map((x) => x.toLowerCase()))) count.set(h, (count.get(h) || 0) + 1);
  for (const v of top) for (const h of v.hashtags) { const k = h.toLowerCase(), m = spelt.get(k) || new Map(); m.set(h, (m.get(h) || 0) + 1); spelt.set(k, m); }
  return [...count.entries()].filter(([k]) => k !== "shorts" && k !== "short")
    .sort((a, b) => b[1] - a[1])
    .map(([k, n]) => ({ tag: "#" + [...spelt.get(k).entries()].sort((a, b) => b[1] - a[1])[0][0], used: n }));
}
/* tag phrases with real search behind them: YouTube autocomplete, top Shorts' own tags, our brands and the main query */
function tagPool(r, q, suggest, top) {
  const norm = (t) => String(t).toLowerCase().replace(/[^\p{L}\p{N} ]+/gu, " ").replace(/\s+/g, " ").trim();
  const seen = new Map();
  const add = (t, why) => { const k = norm(t); if (k && k.length <= 60 && !seen.has(k)) seen.set(k, why); };
  add(q, "main query"); suggest.filter((t) => !OFF_TAG.test(t)).forEach((t) => add(t, "autocomplete"));
  const tc = new Map();
  for (const v of top) for (const t of new Set(v.tags.map(norm))) tc.set(t, (tc.get(t) || 0) + 1);
  [...tc.entries()].filter(([t]) => !OFF_TAG.test(t)).sort((a, b) => b[1] - a[1]).slice(0, 40).forEach(([t, n]) => add(t, `used by ${n} top Shorts`));
  const one = ONE[r.catSlug] || r.catName.toLowerCase();
  if (!["top-100", "amazon-finds"].includes(r.catSlug)) for (const t of [`best ${one} in india`, `which ${one} to buy`, `${one} buying guide`, `best ${one} ${new Date().getFullYear()}`]) add(t, "evergreen search");
  for (const b of new Set(r.items.map((p) => p.brand).filter(Boolean))) { add(`${b} ${ONE[r.catSlug] || ""}`, "our brand"); add(b, "our brand"); }
  add("value verdict", "our channel");
  return { seen, norm };
}

/* Hashtags that always fit each page: long-running tags with lots of Shorts behind them (the first three show above
   the title, so the strongest go first). Hashtags the top Shorts for the search really use are added to the choice. */
const CAT_HASHTAGS = {
  refrigerators: ["#BestFridge", "#Refrigerator", "#Fridge", "#DoubleDoorFridge"],
  "washing-machines": ["#BestWashingMachine", "#WashingMachine", "#FrontLoad", "#TopLoad"],
  tvs: ["#BestSmartTV", "#SmartTV", "#4KTV", "#LEDTV"],
  "air-conditioners": ["#BestAC", "#InverterAC", "#SplitAC", "#AC"],
  laptops: ["#BestLaptop", "#Laptop", "#LaptopForStudents", "#LaptopDeals"],
  "soundbars-speakers": ["#BestSoundbar", "#Soundbar", "#HomeTheatre", "#Speaker"],
  "home-appliances": ["#HomeAppliances", "#KitchenAppliances", "#SmartHome", "#HomeGadgets"],
  geysers: ["#BestGeyser", "#Geyser", "#WaterHeater", "#InstantGeyser"],
  "fridge-accessories": ["#Stabilizer", "#VoltageStabilizer", "#HomeAppliances"],
  "top-100": ["#AmazonDeals", "#DealsOfTheDay", "#AmazonSale", "#OnlineShopping"],
  "amazon-finds": ["#AmazonFinds", "#AmazonFindsIndia", "#Gadgets", "#UsefulGadgets"],
};
const SEASON_HASHTAG = { diwali: "#DiwaliSale" };
/* search phrases that would bring the wrong viewers: another language's videos, or an old year */
const OLD_YEARS = Array.from({ length: new Date().getFullYear() - 2015 }, (_, i) => 2015 + i).join("|");
const OFF_TAG = new RegExp(`\\b(tamil|telugu|hindi|kannada|malayalam|marathi|bengali|gujarati|punjabi|urdu)\\b|\\b(${OLD_YEARS})\\b`, "i");

/* ---------- vidIQ library (reels/seo/vidiq.json, refreshed every few days from vidIQ) ---------- */
const LIB = (() => { try { return JSON.parse(readFileSync(join(here, "seo", "vidiq.json"), "utf8")); } catch { return null; } })();
const BRANDS = ["lg", "samsung", "whirlpool", "godrej", "haier", "bosch", "panasonic", "ifb", "voltas", "daikin", "blue star", "carrier", "lloyd",
  "sony", "tcl", "xiaomi", "mi", "hisense", "oneplus", "vw", "philips", "jbl", "boat", "zebronics", "sonos", "hp", "dell", "lenovo", "asus", "acer",
  "apple", "macbook", "msi", "havells", "v guard", "ao smith", "racold", "bajaj", "crompton", "liebherr", "ninja", "speed queen", "mitsubishi"];
const fmtK = (n) => (n >= 100000 ? `${+(n / 100000).toFixed(1)} lakh` : n >= 1000 && n % 1000 === 0 ? `${n / 1000}k` : String(n));
/* the page's budget as people type it: "under 35000" (+ "under 35k"), "43 inch", "above 1 lakh" */
function budgetOf(r) {
  const m = r.subName.match(/(under|above)\s*₹\s*([\d,.]+)\s*(lakh)?/i);
  if (m) {
    const n = m[3] ? Math.round(parseFloat(m[2]) * 100000) : parseInt(m[2].replace(/,/g, ""), 10);
    const word = m[1].toLowerCase(), plain = m[3] ? `${m[2]} lakh` : String(n);
    return { text: `${word[0].toUpperCase() + word.slice(1)} ${plain}`, forms: [`${word} ${plain}`, `${word} ${fmtK(n)}`], n };
  }
  const inch = r.subName.match(/(\d+)\s*(?:["″]|inch)/i);
  if (inch) return { text: `${inch[1]} Inch`, forms: [`${inch[1]} inch`], inch: inch[1] };
  return null;
}
/* title, keywords, hashtags and an "opportunity" (searches x ease) for one reel, from the vidIQ data */
export function libPlan(r) {
  const c = LIB?.categories?.[r.catSlug];
  if (!c) return null;
  const year = manifest.date.slice(0, 4), season = LIB.season?.[themeFor(manifest.date)];
  const b = budgetOf(r), [n1, n2] = c.nouns, top = r.items.length > 1 ? `Top ${r.items.length}` : "#1";
  const parts = r.catSlug === "top-100"
    ? [`Today's Top ${r.items.length} Amazon Deals`, `Amazon Sale Today ${new Date(manifest.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`, season ? `Diwali Sale ${year}` : `Best Amazon Deals India`]
    : r.catSlug === "amazon-finds"
      ? [`Top ${r.items.length} Amazon Finds India`, `Useful Gadgets on Amazon`, `Amazon Must Haves ${year}`]
      : b?.inch
        ? [`${top} Best ${b.inch} Inch ${n1} in ${year}`, `Best ${b.inch} Inch ${n2} on Amazon`, season ? "Diwali Sale" : ""]
        : b
          ? [`${top} Best ${n1} ${b.text} in ${year}`, `Best ${n2} ${b.text} on Amazon`, season ? "Diwali Sale" : ""]
          : [`${top} Best ${n1} in ${year}`, `Best ${n2} on Amazon`, season ? "Diwali Sale" : ""];
  let title = "";
  for (const [i, p] of parts.filter(Boolean).entries()) { const next = title + (i ? (i === 1 ? "🔥" : "⚡") : "") + p; if (next.length > 100) break; title = next; }
  /* keywords for this page: its budget/size, the plain ones, and the brands in the picks */
  const brands = r.items.map((p) => String(p.brand || "").toLowerCase().replace(/-/g, " ")).filter(Boolean);
  /* a brand keyword only when that brand is in the picks */
  const otherBrand = (k) => BRANDS.some((x) => (k === x || k.startsWith(x + " ")) && !brands.some((y) => y.startsWith(x)));
  const fits = (k) => !otherBrand(k) && ( (b ? b.forms.some((f) => k.includes(f)) || (b.inch && k.includes(`${b.inch} inch`)) : false)
    || (!/\d/.test(k) && !/\b(under|above)\b/.test(k)) || brands.some((x) => k.includes(x)));
  const kws = c.keywords.filter((x) => fits(x.k));
  const own = b ? [...new Set(b.forms.flatMap((f) => [`best ${n1.toLowerCase()} ${f}`, `${n1.toLowerCase()} ${f}`, `best ${n2.toLowerCase()} ${f}`]))] : [];
  const exact = c.keywords.filter((x) => b && b.forms.some((f) => x.k.includes(f)));
  const head = exact[0] || c.keywords[0];
  const opportunity = head ? Math.round((head.searches * (100 - head.competition)) / 100) : 0;
  return { title, keywords: kws, own, hashtags: [...c.hashtags, ...(season ? [season.hashtag] : [])], opportunity, head };
}

/* ---------- writing ---------- */
const SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string", description: "max 90 chars, main search phrase first, ends with #Shorts" },
    intro: { type: "string", description: "two short lines for the top of the description, see rules" },
    tags: { type: "array", items: { type: "string" }, description: "10-15 search phrases people type, no # signs" },
    hashtags: { type: "array", items: { type: "string" }, description: "3-5 hashtags without spaces, starting with #" },
  },
  required: ["title", "intro", "tags", "hashtags"],
  additionalProperties: false,
};
const SYSTEM = `You write YouTube Shorts metadata for Value Verdict, an Indian buying-guide channel that compares Amazon.in products by budget.
Goal: be found in YouTube search and make Indian shoppers tap and watch. Use the real search phrases and the titles/tags of
top Shorts you are given to choose keywords; prefer phrases people actually type ("best fridge under 30000").
Title: main search phrase first, then a hook (season, "Top 5", who it suits), and always the word "Amazon" (e.g. "on Amazon",
"Amazon deals"); max 90 characters; end with " #Shorts".
Intro: the first two lines of the description (the rest, with the picks and links, is added for you). Line 1 uses the
main search phrase naturally, line 2 a second popular phrase and who the picks suit. No hashtags, no prices or
discounts (they change), no claims you weren't given, no unrelated trending words.
Tags: 10-15 phrases chosen ONLY from the "allowed tags" list (copy them exactly), most searched first; total under 450 characters.
Hashtags: the 3 most relevant from the "allowed hashtags" list (copy them exactly), strongest first. Never invent one.`;

/* hashtags to choose from: the page's own, the season's, and those the top Shorts for this search really use */
function allowedHashtags(r, top) {
  const own = LIB?.categories?.[r.catSlug]?.hashtags || CAT_HASHTAGS[r.catSlug] || ["#HomeAppliances"], seasonal = SEASON_HASHTAG[themeFor(manifest.date)];
  const real = realHashtags(top).filter((h) => h.used >= 2).map((h) => h.tag);
  const seen = new Set(), out = [];
  for (const h of [...own, ...(seasonal ? [seasonal] : []), ...real, "#AmazonIndia"]) if (!seen.has(h.toLowerCase())) { seen.add(h.toLowerCase()); out.push(h); }
  return out;
}
/* final hashtag line: three strong ones (shown above the title), then #Shorts and ours */
function hashtagLine(chosen, allowed, seasonal) {
  const ok = new Map(allowed.map((h) => [h.toLowerCase(), h]));
  const pick = [...new Set([...chosen.map((h) => ok.get(String(h).trim().toLowerCase())).filter(Boolean), ...allowed])].slice(0, 3);
  /* during a festival its hashtag is always one of the three shown above the title */
  if (seasonal && !pick.includes(seasonal)) pick[2] = seasonal;
  return [...pick, "#Shorts", "#ValueVerdict"];
}

/* the description, laid out the same way every time: intro, numbered picks, links, disclosure, categories, hashtags */
const NUM = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
function compose(r, intro, hashtags) {
  const month = new Date(manifest.date).toLocaleString("en-IN", { month: "long", year: "numeric" });
  const head = r.coverLine || `Top ${r.items.length} ${r.catName} ${r.subName.replace(/^Under/, "under").replace(/^Above/, "above")}`;
  const picks = r.items.map((p, i) => `${NUM[i]} ${p.brand ? p.brand + " " : ""}${p.name}${p.bestFor ? `\n      👍 Best for: ${p.bestFor}` : ""}`);
  return [intro.trim(), "", `🏆 ${head} (${month}):`, "", ...picks, "",
    "🔗 Full comparison, pros & cons and today's price:", r.url.replace(/^https?:\/\//, ""), "",
    "🔔 Subscribe to Value Verdict for daily best-value picks.", "Affiliate links: as an Amazon Associate we earn from qualifying purchases.", "",
    hashtags.join(" ")].join("\n");
}

const seasonTag = () => SEASON_HASHTAG[themeFor(manifest.date)];
function fallback(r, q, top = [], suggest = []) {
  const head = q.replace(/\b\w/g, (c) => c.toUpperCase());
  const title = `${head}${/amazon/i.test(q) ? "" : " on Amazon"} ${manifest.date.slice(0, 4)} 🔥 Top ${r.items.length} #Shorts`.slice(0, 100);
  const tags = []; let len = 0;
  for (const t of tagPool(r, q, suggest, top).seen.keys()) { if (tags.length >= 15 || len + t.length + 1 > 480) break; tags.push(t); len += t.length + 1; }
  const hashtags = hashtagLine([], allowedHashtags(r, top), seasonTag());
  const intro = `${head}: our top picks on Amazon.in, compared on brand, service, specs and price.`;
  return { title, description: compose(r, intro, hashtags), tags, hashtags };
}

async function write(r, q, suggest, top) {
  const base = fallback(r, q, top, suggest);
  const allowed = allowedHashtags(r, top), { seen: pool, norm } = tagPool(r, q, suggest, top);
  if (!process.env.ANTHROPIC_API_KEY) return base;
  const facts = [
    `Page: ${r.coverLine || `${r.catName} · ${r.subName}`} | website: ${r.url}`,
    `Season: ${season || "none"} | date: ${manifest.date}`,
    `Picks: ${r.items.map((p, i) => `${i + 1}. ${p.brand} ${p.name} [${(p.specs || []).join(", ")}] best for: ${p.bestFor || "-"}`).join(" | ")}`,
    `Reel hook already on screen: ${r.copy?.hook_title || ""} / ${r.copy?.for_whom || ""}`,
    `Main query: ${q}`,
    `YouTube autocomplete for it: ${suggest.join("; ") || "none"}`,
    `Most viewed Shorts for it in the last 30 days: ${top.sort((a, b) => b.views - a.views).slice(0, 8).map((v) => `"${v.title}" (${v.views} views)`).join(" | ") || "none"}`,
    `Allowed tags (phrase: why): ${[...pool.entries()].map(([t, w]) => `${t}: ${w}`).join("; ")}`,
    `Allowed hashtags: ${allowed.join(" ")}`,
    `vidIQ keywords for this page (keyword: vidIQ score, monthly searches, competition; use the best ones in the intro): ${(libPlan(r)?.keywords || []).slice(0, 10).map((x) => `${x.k}: ${x.score}, ${x.searches}, ${x.competition}`).join("; ") || "none"}`,
  ].join("\n");
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", signal: AbortSignal.timeout(120000),
      headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: MODEL, max_tokens: 3000, system: SYSTEM, cache_control: { type: "ephemeral" },
        output_config: { format: { type: "json_schema", schema: SCHEMA } }, messages: [{ role: "user", content: facts }] }),
    });
    const j = await res.json();
    if (!res.ok) throw new Error(`${res.status} ${j.error?.message || ""}`);
    const o = JSON.parse((j.content || []).find((c) => c.type === "text")?.text || "{}");
    /* YouTube limits: title 100, description 5000, tags 500 characters in total */
    const title = String(o.title || "").replace(/[<>]/g, "").slice(0, 100) || base.title;
    const tags = []; let len = 0;
    /* only tags from the pool (searched or used by top Shorts), only hashtags real Shorts use */
    for (const t of (o.tags || []).map((x) => String(x).replace(/[<>,#]/g, "").trim()).filter((x) => pool.has(norm(x)))) { if (len + t.length + 1 > 480) break; tags.push(t); len += t.length + 1; }
    const hashtags = hashtagLine(o.hashtags || [], allowed, seasonTag());
    /* no stray hashtags in the title except #Shorts */
    const clean = (t) => t.replace(/(^|\s)#(?!shorts\b)[\p{L}\p{N}_]+/giu, "$1").replace(/\s{2,}/g, " ").trim();
    const t2 = /amazon/i.test(title) ? title : `${title.replace(/\s*#shorts\s*$/i, "").slice(0, 78)} on Amazon`;
    const intro = String(o.intro || "").replace(/[<>]/g, "").replace(/(^|\s)#[\p{L}\p{N}_]+/gu, "$1").trim().split("\n").slice(0, 3).join("\n");
    return { title: clean(/#shorts/i.test(t2) ? t2 : `${t2.slice(0, 91)} #Shorts`), description: compose(r, intro || base.description.split("\n")[0], hashtags).slice(0, 4900),
      tags: tags.length >= 5 ? tags : [...new Set([...tags, ...base.tags])], hashtags };
  } catch (e) { console.warn(`  AI metadata failed (${e.message}), using plain`); return base; }
}

/* every category page, in every description (plain text: Shorts links aren't clickable, long videos' are) */
function categoryBlock() {
  const seen = new Map();
  for (const r of manifest.reels) {
    if (r.catSlug === "top-100") seen.set("top-100", ["🔥 Today's Top 100 Deals", "valueverdict.in/top-deals"]);
    else if (r.catSlug === "amazon-finds") seen.set("amazon-finds", ["🛒 Amazon Finds", "valueverdict.in/amazon-finds"]);
    else if (!seen.has(r.catSlug)) seen.set(r.catSlug, [`${r.catName}`, `valueverdict.in/${r.catSlug}`]);
  }
  return ["📂 Best picks by category:", ...[...seen.values()].map(([n, u]) => `▸ ${n}: ${u}`)].join("\n");
}
function withCategories(description) {
  const lines = description.trimEnd().split("\n"), last = lines[lines.length - 1] || "";
  const block = categoryBlock();
  /* keep the hashtags as the last line */
  const out = /^\s*#/.test(last) ? [...lines.slice(0, -1), block, "", last] : [...lines, "", block];
  return out.join("\n").slice(0, 4900);
}

/* researched metadata for one reel: query, autocomplete, top Shorts, AI title/description/tags */
export async function seoFor(r) {
  const q = mainQuery(r);
  const [suggest, top] = await Promise.all([autocomplete(q), process.env.YT_REFRESH_TOKEN ? topShorts(q) : []]);
  const meta = await write(r, q, suggest, top);
  /* vidIQ library: the title follows the pattern of breakout Shorts, and its keywords lead the tags */
  const plan = libPlan(r);
  if (plan) {
    meta.title = plan.title;
    const tags = []; let len = 0;
    for (const t of [...plan.own, ...plan.keywords.map((x) => x.k), ...meta.tags]) {
      const k = String(t).toLowerCase().trim();
      if (!k || tags.includes(k) || OFF_TAG.test(k)) continue;
      if (len + k.length + 1 > 480) break;
      tags.push(k); len += k.length + 1;
    }
    meta.tags = tags;
    meta.opportunity = plan.opportunity;
    meta.vidiq = plan.keywords.slice(0, 8);
  }
  meta.description = withCategories(meta.description);
  meta.comment = pinnedComment(r);
  return { query: q, autocomplete: suggest, ...meta };
}

/* the comment to post and pin under the Short: links in comments are clickable (not in a Short's description),
   and a question gets replies, which helps the Short get shown */
function pinnedComment(r) {
  const n = r.items.length, url = `${r.url}${r.url.includes("?") ? "&" : "?"}utm_source=youtube&utm_medium=comment`;
  const ask = n > 1 ? `Which one would you pick? Comment ${n > 5 ? "the number" : `1 to ${n}`} 👇` : "Would you buy this one? Tell us 👇";
  return [ask, "", `🔗 Full list with pros, cons & today's price: ${url}`, "📢 50+ deals a day on Telegram: https://t.me/valueverdict",
    "🔔 Subscribe for a new best-value pick every day!"].join("\n");
}
/* the same, as a text file to copy from on the phone */
export function seoText(m) {
  return [`TITLE`, m.title, "", `DESCRIPTION`, m.description, "",
    ...(m.comment ? [`PINNED COMMENT (post it under the Short, then ⋮ → Pin)`, m.comment, ""] : []), `TAGS (YouTube Studio → Show more → Tags)`, m.tags.join(", "), "",
    `HASHTAGS`, m.hashtags.join(" "), "",
    ...(m.vidiq?.length ? [`vidIQ keywords used (score · monthly searches · competition):`, ...m.vidiq.map((x) => `  ${x.k}: ${x.score} · ${x.searches.toLocaleString("en-IN")} · ${x.competition}`), ""] : []),
    `(main search phrase: "${m.query}"; YouTube autocomplete: ${m.autocomplete.join(" · ") || "-"})`, ""].join("\n");
}

async function upload(file, meta) {
  const body = {
    snippet: { title: meta.title, description: meta.description, tags: meta.tags, categoryId: "26", defaultLanguage: "en", defaultAudioLanguage: "en" },
    status: { privacyStatus: "private", selfDeclaredMadeForKids: false, containsSyntheticMedia: false },
  };
  const size = statSync(file).size;
  const init = await fetch("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", {
    method: "POST",
    headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json; charset=UTF-8", "X-Upload-Content-Type": "video/mp4", "X-Upload-Content-Length": String(size) },
    body: JSON.stringify(body),
  });
  if (!init.ok) throw new Error(`upload start: ${init.status} ${await init.text()}`);
  const put = await fetch(init.headers.get("location"), { method: "PUT", headers: { "Content-Type": "video/mp4", "Content-Length": String(size) }, body: readFileSync(file) });
  const j = await put.json().catch(() => ({}));
  if (!put.ok || !j.id) throw new Error(`upload: ${put.status} ${j.error?.message || ""}`);
  return j.id;
}

/* our cover as the Short's thumbnail. YouTube may refuse it (custom thumbnails need a phone-verified channel, and
   Shorts thumbnails can't always be set by API); the upload stays, and the cover is the first frame anyway. */
async function setThumbnail(id, dir, base) {
  const jpg = join(dir, "thumb.jpg");
  execFileSync("ffmpeg", ["-y", "-v", "error", "-i", join(dir, `${base}_thumbnail.jpg`), "-vf", "scale=720:1280", "-q:v", "3", jpg]); /* well under the 2 MB limit */
  const r = await fetch(`https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${id}&uploadType=media`, {
    method: "POST", headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "image/jpeg" }, body: readFileSync(jpg),
  });
  if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(`${r.status} ${j.error?.message || ""}`); }
}

async function telegram(text) {
  const t = process.env.TELEGRAM_BOT_TOKEN, chat = process.env.TELEGRAM_CHAT_ID;
  if (!t || !chat || DRY) return;
  await fetch(`https://api.telegram.org/bot${t}/sendMessage`, { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chat, text, parse_mode: "HTML", link_preview_options: { is_disabled: true } }) }).catch(() => {});
}

/* ---------- main: upload as private Shorts (paused in the workflow; the texts come with the ZIP instead) ---------- */
if (process.argv[1] && process.argv[1].endsWith("youtube.mjs")) {
  useRun(JSON.parse(readFileSync(join(here, "out", "latest.json"), "utf8")));
  if (!DRY && !(process.env.YT_CLIENT_ID && process.env.YT_CLIENT_SECRET && process.env.YT_REFRESH_TOKEN)) {
    console.log("YouTube: YT_CLIENT_ID / YT_CLIENT_SECRET / YT_REFRESH_TOKEN not set, skipping");
    process.exit(0);
  }
  const canSearch = Boolean(process.env.YT_REFRESH_TOKEN);
  const done = [];
  for (const r of choose(manifest.reels)) {
    const dir = join(manifest.dir, r.slug, "youtube"), file = join(dir, `${r.base}.mp4`);
    if (!existsSync(file)) continue;
    const q = mainQuery(r), saved = join(here, "out", "meta", `${r.slug}.json`);
    console.log(`• ${r.slug}: "${q}"`);
    /* the metadata generate.mjs already researched today (saves YouTube search quota for the uploads) */
    let meta;
    if (existsSync(saved)) meta = JSON.parse(readFileSync(saved, "utf8"));
    else {
      const [suggest, top] = await Promise.all([autocomplete(q), canSearch ? topShorts(q) : []]);
      meta = await write(r, q, suggest, top);
      meta.description = withCategories(meta.description);
    }
    if (DRY) { console.log(`  ${meta.title}\n  tags: ${meta.tags.join(", ")}\n  ${meta.hashtags.join(" ")}`); continue; }
    try {
      const id = await upload(file, meta); /* the cover is already its first frame */
      let thumb = true;
      try { await setThumbnail(id, dir, r.base); } catch (e) { thumb = false; console.warn(`  thumbnail not set (${e.message})`); }
      done.push({ id, title: meta.title, thumb });
      console.log(`  ✔ uploaded private: https://studio.youtube.com/video/${id}/edit${thumb ? " (thumbnail set)" : ""}`);
    } catch (e) { console.error(`  ✖ ${e.message}`); if (/quota|uploadLimitExceeded/i.test(e.message)) break; }
  }
  if (done.length) {
    const esc = (s) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
    await telegram([`📺 <b>${done.length} Shorts uploaded to YouTube as Private</b>`, "Add a sound in Studio (Editor → Audio) and set them Public:", "",
      ...done.map((d, i) => `${i + 1}. <a href="https://studio.youtube.com/video/${d.id}/edit">${esc(d.title)}</a>${d.thumb ? "" : " (pick the cover frame as thumbnail in the YouTube app)"}`)].join("\n"));
  }
  console.log(`✔ YouTube: ${done.length} Shorts uploaded as private`);

}

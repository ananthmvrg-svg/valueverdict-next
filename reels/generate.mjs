/* Value Verdict daily reel kit.
   Reads the same AI picks the website shows (Supabase "deal_picks": rank, why, best for, pros, cons, product
   photo from the Amazon API), and for every budget page (e.g. refrigerators/under-35k) with 1–5 picks makes:
     slides/*.jpg   hook, one slide per product (#1…#5), call-to-action
   (every file is named <folder>_<date>, e.g. refrigerators-under-35k_2026-11-01.mp4)
     instagram/<name>.mp4            1080×1920 video, cover as the first frame, "link in bio" on the slides
     instagram/<name>_cover.jpg      reel cover (no Amazon branding)
     instagram/<name>_post.jpg       single-image post (1080×1350): all picks with photo, name and price at that time
     instagram/<name>_instagram.txt  caption written for Instagram search, alt text, 3–5 hashtags
     youtube/<name>.mp4              the same reel with "subscribe" and valueverdict.in instead of "link in bio"
     youtube/<name>_thumbnail.jpg    Shorts thumbnail ("on Amazon")
     youtube/<name>_youtube.txt      title, description, tags and hashtags from YouTube's own data (youtube.mjs)
   Background music: a track from reels/audio/ (audio.mjs), the same one in both versions.
   Then zips everything (one ZIP per category) and sends it to Telegram.

   node generate.mjs              live picks, send to Telegram (needs TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID)
   node generate.mjs --no-send    live picks, keep files in reels/out
   node generate.mjs --sample     saved sample picks (no network)
   ONLY=refrigerators,tvs         only these category slugs (env or --only=…)
   MAX_ITEMS=5                    picks per reel (top N by rank)
   Prices (slides and post.jpg) are stamped with the time Amazon confirmed them, since they change daily. */
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync, readFileSync, statSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { hookSlide, productSlide, ctaSlide, posterSlide, coverSlide, iconKey, setTheme, setPlatform } from "./template.mjs";
import { tracksFor, audioArgs } from "./audio.mjs";
import { writeCopy, seasonFor, themeFor } from "./copy.mjs";
import { SITE_URL, select, shortName, clean, brandCase, mainQuery } from "./shared.mjs";
import { tipsFor } from "../src/lib/tips.ts"; /* the website's own "Good to know" texts */
import { specChips } from "../src/lib/specs.ts"; /* and its spec chips */

const here = dirname(fileURLToPath(import.meta.url));
const { chromium } = createRequire(import.meta.url)("playwright");

const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const opt = (k) => args.find((a) => a.startsWith(`--${k}=`))?.split("=")[1];
const SAMPLE = flag("--sample");
const SEND = !flag("--no-send");
const ONLY = (opt("only") || process.env.ONLY || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
const MAX_ITEMS = Math.min(5, Math.max(1, parseInt(process.env.MAX_ITEMS || "5", 10) || 5));

const today = new Date(Date.now() + 5.5 * 3600e3); /* India date */
const DATE = today.toISOString().slice(0, 10);
const STAMP = `${DATE}_${today.toISOString().slice(11, 16).replace(":", "")}`; /* India date + time, e.g. 2026-10-31_0805 */
const YEAR = today.getUTCFullYear();
const MONTH = today.toLocaleString("en-IN", { month: "long", timeZone: "UTC" });

/* ---------- data ---------- */
async function loadData() {
  if (SAMPLE) return JSON.parse(readFileSync(join(here, "sample.json"), "utf8"));
  /* same rule as the website (src/lib/picks.ts): only picks whose price was confirmed in the last 24 hours */
  const since = new Date(Date.now() - 24 * 36e5).toISOString();
  const [cats, subs, picks] = await Promise.all([
    select("categories", "select=category_id,name,slug,icon,sort_order,active"),
    select("subcategories", "select=subcategory_id,category_id,name,slug,sort_order,active"),
    select("deal_picks", `select=group_key,rank,reason,section,category,data,best_for,strengths,limitations,price_checked_at&price_checked_at=gte.${encodeURIComponent(since)}&order=group_key.asc,rank.asc&limit=3000`),
  ]);
  return { cats, subs, picks };
}

const SKIP = new Set(["amazon-finds", "top-100"]); /* mixed lists: made as their own top-10 reels in reelsOf */
function mapItem(p, catSlug, badge) {
  const d = p.data, brand = brandCase(d.brand || "");
  return {
    brand, name: shortName(d.title, d.brand), imageUrl: d.image,
    specs: specChips(catSlug, d.specs || {}).slice(0, 5),
    bestFor: p.best_for || "",
    pros: clean(p.strengths).slice(0, 3),
    cons: clean(p.limitations).slice(0, 2),
    tip: (tipsFor(catSlug, d.specs || {}, 1)[0] || "").match(/^.*?[.!?](?=\s|$)/)?.[0] || "", /* first sentence keeps it to two lines */
    badge,
    price: d.price ?? null, was: d.was ?? null, off: d.off ?? null, priceAt: p.price_checked_at || "", primeOnly: Boolean(d.primeOnly),
    deal: d.deal || "", dealEnds: d.dealEnds || "", lowStock: d.lowStock || "", /* facts the AI copy may use */
  };
}
const priceTime = (items) => {
  const at = items.map((p) => p.priceAt).filter(Boolean).sort()[0];
  return at ? new Date(at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }) : "";
};
const want = (slug) => !ONLY.length || ONLY.includes(slug);
const sectionName = (p) => String(p.section || "").replace(/\s*deals?$/i, "");

function reelsOf({ cats, subs, picks }) {
  const ord = (a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999);
  const out = [];
  /* the two mixed lists: their top 10 on the reel, the rest on the website */
  const group = (key) => picks.filter((p) => p.group_key === key && p.data).sort((a, b) => a.rank - b.rank);
  const top = group("top-100");
  if (top.length && want("top-100")) {
    const items = top.slice(0, 10).map((p, i) => mapItem(p, p.category, i === 0 ? "🏆 Deal of the day" : sectionName(p)));
    out.push({ catName: "Deals", catSlug: "top-100", subName: `Today's top ${top.length}`, items, year: YEAR, month: MONTH, priceAt: priceTime(items),
      slug: "top-100-deals", icon: "generic", url: `${SITE_URL}/top-deals`, headline: `Top ${items.length} Deals`, coverLine: `Today's Top ${items.length} Deals`,
      pill: `${top.length} deals checked today`, more: `See all ${top.length} deals` });
  }
  const finds = group("amazon-finds");
  if (finds.length && want("amazon-finds")) {
    /* one per section (its #1), so earbuds, power banks, tablets… all get a turn */
    const seen = new Set(), firsts = finds.filter((p) => !seen.has(p.section) && seen.add(p.section));
    const items = firsts.slice(0, 10).map((p, i) => mapItem(p, "amazon-finds", i === 0 ? `🏆 ${sectionName(p)}` : sectionName(p)));
    out.push({ catName: "Amazon Finds", catSlug: "amazon-finds", subName: "Gadgets & more", items, year: YEAR, month: MONTH, priceAt: priceTime(items),
      slug: "amazon-finds", icon: "generic", url: `${SITE_URL}/amazon-finds`, headline: `Top ${items.length} Finds`, coverLine: `Top ${items.length} Amazon Finds`,
      pill: `${finds.length} finds on our site`, more: `See all ${finds.length} finds` });
  }
  for (const cat of cats.filter((c) => c.active !== false && !SKIP.has(c.slug)).sort(ord)) {
    if (!want(String(cat.slug).toLowerCase())) continue;
    for (const sub of subs.filter((s) => s.category_id === cat.category_id && s.active !== false).sort(ord)) {
      const key = `${cat.slug}/${sub.slug}`;
      const items = group(key).slice(0, MAX_ITEMS).map((p) => mapItem(p, cat.slug, p.rank === 1 ? "🏆 Top pick" : ""));
      if (!items.length) continue;
      out.push({
        catName: cat.name, catSlug: cat.slug, subName: sub.name, items, year: YEAR, month: MONTH, priceAt: priceTime(items),
        slug: `${cat.slug}-${sub.slug}`.toLowerCase().replace(/[^a-z0-9-]+/g, "-"),
        icon: iconKey(cat.slug, cat.name),
        url: `${SITE_URL}/${cat.slug}/${sub.slug}`,
      });
    }
  }
  return out;
}

/* product photo (the Amazon API image the website shows), inlined so screenshots never wait on the network.
   A failure just falls back to the category icon. */
async function loadImage(u) {
  u = String(u || "").trim();
  if (!u) return "";
  try {
    if (!/^https?:\/\//i.test(u)) { /* local file, used by sample.json */
      const f = join(here, u); if (!existsSync(f)) return "";
      return `data:image/${f.endsWith(".png") ? "png" : "jpeg"};base64,${readFileSync(f).toString("base64")}`;
    }
    u = u.replace(/\._SL\d+_\./, "._SL1000_."); /* bigger Amazon rendition for a full-width photo */
    const r = await fetch(u, { signal: AbortSignal.timeout(15000), headers: { "User-Agent": "Mozilla/5.0 (ValueVerdict reels)" } });
    const type = r.headers.get("content-type") || "";
    if (!r.ok || !type.startsWith("image/")) return "";
    return `data:${type.split(";")[0]};base64,${Buffer.from(await r.arrayBuffer()).toString("base64")}`;
  } catch (e) { console.warn(`  image skipped (${e.message}): ${u}`); return ""; }
}

/* 1–3 picks play #1→#N; 4–5 count down #N→#1 so viewers stay for the winner.
   Product slides carry pros/cons, so each one stays up long enough to read. */
function plan(r) {
  const n = r.items.length;
  const order = r.items.map((p, i) => ({ p, rank: i + 1 }));
  if (n >= 4) order.reverse();
  const per = n === 1 ? 6 : n === 2 ? 4.5 : n === 3 ? 3.8 : n <= 5 ? 3.2 : 2.8;
  return order.map((o) => ({ ...o, dur: n >= 4 && o.rank === 1 ? 3.8 : per }));
}

/* Instagram: 3–5 hashtags work best (Instagram's own advice); two for the product, one for Amazon India shoppers,
   one for the season, and ours. All are long-running, busy tags. */
const HASHTAGS = {
  "top-100": ["#dealsoftheday", "#onlineshopping"], "amazon-finds": ["#amazonfinds", "#amazonfindsindia"],
  refrigerators: ["#refrigerator", "#fridge"], "washing-machines": ["#washingmachine", "#laundry"],
  tvs: ["#smarttv", "#ledtv"], "air-conditioners": ["#airconditioner", "#inverterac"],
  laptops: ["#laptop", "#laptopdeals"], "soundbars-speakers": ["#soundbar", "#hometheater"],
  "home-appliances": ["#homeappliances", "#kitchenappliances"], geysers: ["#geyser", "#waterheater"],
  "fridge-accessories": ["#stabilizer", "#homeappliances"],
};
const SEASON_TAG = { diwali: "#diwalishopping" };
function caption(r) {
  const season = SEASON_TAG[themeFor(DATE)] || (["laptops", "tvs", "soundbars-speakers", "amazon-finds"].includes(r.catSlug) ? "#techdeals" : "#homeappliances");
  const tags = [...new Set([...(HASHTAGS[r.catSlug] || [`#${r.catSlug.replace(/[^a-z0-9]/gi, "")}`, "#homeappliances"]), "#amazonindia", season, "#valueverdict"])].slice(0, 5);
  const n = r.items.length;
  const list = r.items.map((p, i) => `#${i + 1} ${p.brand ? p.brand + " " : ""}${p.name}${p.bestFor ? `\n   👍 ${p.bestFor}` : ""}`).join("\n");
  const text = [
    r.copy.ig_search_line, /* what Instagram search reads first */
    "#ad · As an Amazon Associate we earn from qualifying purchases.",
    "",
    r.copy.caption_hook,
    r.coverLine ? `${r.coverLine} (${MONTH} ${YEAR})` : `${n === 1 ? "Our pick" : `Top ${n}`}: ${r.catName} ${r.subName.replace(/^Under/, "under").replace(/^Above/, "above")} (${MONTH} ${YEAR})`,
    "",
    list,
    "",
    r.more ? `👉 ${r.more} on our site: link in bio` : `👉 Pros, cons & today's price for each: link in bio`,
    `(${r.url.replace(/^https?:\/\//, "")})`,
    `⏳ ${r.copy.urgency}`,
    `💛 ${r.copy.follow_line}`,
    `💾 Save this for later · 📤 Send it to someone who's buying one`,
    "",
    tags.join(" "),
  ].join("\n");
  return [
    "CAPTION (paste as it is)", text, "",
    "ALT TEXT for the single-image post (Advanced settings → Accessibility → Write alt text)", r.copy.alt_text, "",
    `(Instagram search phrase: "${mainQuery(r)}"; it's in the caption's first line and on the first slide)`,
  ].join("\n");
}

/* one reel, made twice: instagram/ ("link in bio", caption, single-image post) and youtube/ ("subscribe" and the
   site's address, since Shorts have no bio link; title/description/tags come later from youtube.mjs).
   Both share one background track (audio.mjs). */
async function render(browser, r, dir, track) {
  const base = `${r.slug}_${DATE}`;
  r.base = base;
  for (const platform of ["instagram", "youtube"]) {
    setPlatform(platform);
    const out = join(dir, platform), slides = join(out, "slides");
    mkdirSync(slides, { recursive: true });
    const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
    const shot = async (html, file, type = "jpeg") => {
      await page.setContent(html, { waitUntil: "load" });
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(() => window.__ready); /* photos cropped to the product */
      await page.screenshot({ path: file, type, ...(type === "jpeg" ? { quality: 92 } : {}) });
    };
    const steps = plan(r), frames = [];
    await shot(hookSlide(r), join(slides, "01-hook.jpg"));
    frames.push({ file: join(slides, "01-hook.jpg"), dur: 2.0 });
    for (const [i, s] of steps.entries()) {
      const f = join(slides, `${String(i + 2).padStart(2, "0")}-rank${s.rank}.jpg`);
      await shot(productSlide(r, s.p, s.rank, i, steps.length), f);
      frames.push({ file: f, dur: s.dur });
    }
    const cta = join(slides, `${String(steps.length + 2).padStart(2, "0")}-cta.jpg`);
    await shot(ctaSlide(r), cta);
    frames.push({ file: cta, dur: 2.6 });
    const cover = join(out, platform === "youtube" ? `${base}_thumbnail.jpg` : `${base}_cover.jpg`);
    await shot(coverSlide(r), cover);
    /* the cover is the video's first frame, so it can be picked as the thumbnail in the app */
    frames.unshift({ file: cover, dur: 0.8 });
    if (platform === "instagram") {
      /* single-image post (4:5): all picks with photo, name and today's price */
      await page.setViewportSize({ width: 1080, height: 1350 });
      await shot(posterSlide(r), join(out, `${base}_post.jpg`));
      writeFileSync(join(out, `${base}_instagram.txt`), caption(r) + "\n");
    }
    await page.close();
    video(frames, join(out, `${base}.mp4`), track);
    if (platform === "youtube") rmSync(slides, { recursive: true, force: true }); /* the same slides are in instagram/slides */
  }
  setPlatform("instagram");
}

/* slides → MP4 with short slide/fade transitions, and the day's background track (or a silent one) */
function video(frames, out, track) {
  const T = 0.35, inputs = [], parts = [];
  frames.forEach((f, i) => {
    inputs.push("-loop", "1", "-t", String(f.dur + T), "-i", f.file);
    parts.push(`[${i}:v]scale=1080:1920,fps=30,format=yuv420p,setsar=1,settb=AVTB[v${i}]`);
  });
  let last = "v0", t = frames[0].dur;
  for (let i = 1; i < frames.length; i++) {
    const tr = i === 1 ? "fade" : i === frames.length - 1 ? "fadeblack" : "slideleft";
    parts.push(`[${last}][v${i}]xfade=transition=${tr}:duration=${T}:offset=${t.toFixed(2)}[x${i}]`);
    last = `x${i}`; t += frames[i].dur;
  }
  const total = t + T;
  const a = audioArgs(track, total, frames.length);
  execFileSync("ffmpeg", [
    "-y", "-v", "error", ...inputs, ...a.inputs,
    "-filter_complex", [...parts, ...a.filters].join(";"), "-map", `[${last}]`, "-map", a.map,
    "-t", total.toFixed(2), "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", out,
  ]);
}

/* ---------- Telegram ---------- */
async function tg(method, fields, file) {
  const token = process.env.TELEGRAM_BOT_TOKEN, chat = process.env.TELEGRAM_CHAT_ID;
  const fd = new FormData();
  fd.append("chat_id", chat);
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  if (file) fd.append(file.field, new Blob([readFileSync(file.path)]), file.name);
  const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, { method: "POST", body: fd });
  const j = await r.json().catch(() => ({}));
  if (!j.ok) throw new Error(`Telegram ${method}: ${j.description || r.status}`);
  await new Promise((res) => setTimeout(res, 1100)); /* stay under Telegram's per-chat rate limit */
}

/* ---------- main ---------- */
const reels = reelsOf(await loadData());
if (!reels.length) throw new Error("No budget group with products found" + (ONLY.length ? ` for ONLY=${ONLY}` : ""));
const name = `ValueVerdict_${STAMP}`, outDir = join(here, "out"), root = join(outDir, name);
rmSync(root, { recursive: true, force: true });
for (const r of reels) for (const p of r.items) p.image = await loadImage(p.imageUrl);
setTheme(themeFor(DATE)); /* e.g. Diwali backgrounds while season.json says so */
const copy = await writeCopy(reels, { date: DATE, season: seasonFor(DATE) });
for (const r of reels) r.copy = copy.get(r.slug);
const browser = await chromium.launch();
const tracks = tracksFor(reels.length, DATE, themeFor(DATE));
for (const [i, r] of reels.entries()) {
  r.track = tracks[i] ? tracks[i].split("/").pop() : "";
  console.log(`• ${r.slug} (${r.items.length} products)${r.track ? ` ♪ ${r.track}` : ""}`);
  await render(browser, r, join(root, r.slug), tracks[i]);
}
await browser.close();
/* manifest for later steps (YouTube upload): what each folder holds, without the inlined photos */
writeFileSync(join(outDir, "latest.json"), JSON.stringify({ stamp: STAMP, date: DATE, dir: root, reels: reels.map((r) => ({
  slug: r.slug, base: r.base, track: r.track, catSlug: r.catSlug, catName: r.catName, subName: r.subName, url: r.url, headline: r.headline || "", coverLine: r.coverLine || "",
  more: r.more || "", copy: r.copy, items: r.items.map((p) => ({ brand: p.brand, name: p.name, bestFor: p.bestFor, specs: p.specs, price: p.price, off: p.off })),
})) }, null, 1));

/* YouTube title / description / tags for every reel, researched fresh (youtube.mjs), as <name>_youtube.txt */
{
  const { useRun, seoFor, seoText } = await import("./youtube.mjs");
  const run = JSON.parse(readFileSync(join(outDir, "latest.json"), "utf8"));
  useRun(run);
  mkdirSync(join(outDir, "meta"), { recursive: true });
  for (const r of run.reels) {
    try {
      const m = await seoFor(r);
      writeFileSync(join(root, r.slug, "youtube", `${r.base}_youtube.txt`), seoText(m));
      writeFileSync(join(outDir, "meta", `${r.slug}.json`), JSON.stringify(m)); /* reused by the upload step: no second search */
    }
    catch (e) { console.warn(`  YouTube text for ${r.slug} failed: ${e.message}`); }
  }
  console.log(`✔ YouTube titles/descriptions for ${run.reels.length} reels`);
}

/* everything in one ZIP: one folder per reel, each with instagram/ (video, cover, post, caption, slides) and
   youtube/ (video, thumbnail, title/description/tags) */
const zip = join(outDir, `${name}.zip`);
rmSync(zip, { force: true });
execFileSync("zip", ["-qr", zip, name], { cwd: outDir });
const mb = statSync(zip).size / 1048576;
console.log(`✔ ${reels.length} reels → ${zip} (${mb.toFixed(0)} MB)`);

/* Telegram bots can send files up to 50 MB; a bigger ZIP goes to a GitHub release (when run in GitHub Actions)
   and Telegram gets one message with a download button. Old reel releases are pruned to the last 7. */
function publishRelease() {
  const repo = process.env.GITHUB_REPOSITORY, tag = `reels-${STAMP}`;
  execFileSync("gh", ["release", "create", tag, zip, "--repo", repo, "--title", `Reels ${STAMP.replace("_", " ")} IST`,
    "--notes", `${reels.length} reels: video, cover, post, Instagram and YouTube texts and slides for each.`], { stdio: "inherit" });
  try {
    const old = execFileSync("gh", ["release", "list", "--repo", repo, "--limit", "100", "--json", "tagName", "--jq", ".[].tagName"], { encoding: "utf8" })
      .split("\n").filter((t) => t.startsWith("reels-")).sort().reverse().slice(7);
    for (const t of old) execFileSync("gh", ["release", "delete", t, "--repo", repo, "--yes", "--cleanup-tag"], { stdio: "inherit" });
  } catch (e) { console.warn("old releases not pruned:", e.message); }
  return `https://github.com/${repo}/releases/download/${tag}/${name}.zip`;
}

if (SEND) {
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) throw new Error("Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID (or run with --no-send)");
  const text = `🎬 Value Verdict reels · ${STAMP.replace("_", " ")} IST\n${reels.length} reels in one ZIP (${mb.toFixed(0)} MB): a folder per reel with instagram/ (video, cover, post, caption) and youtube/ (video, thumbnail, title, description, tags).`;
  if (mb < 49) await tg("sendDocument", { caption: text }, { field: "document", path: zip, name: `${name}.zip` });
  else if (process.env.GITHUB_ACTIONS) {
    const url = publishRelease();
    await tg("sendMessage", { text, reply_markup: JSON.stringify({ inline_keyboard: [[{ text: `⬇️ Download ZIP (${mb.toFixed(0)} MB)`, url }]] }) });
  } else await tg("sendMessage", { text: `${text}\nToo big for Telegram (${mb.toFixed(0)} MB): find it in ${zip}` });
  console.log("✔ sent to Telegram");
}

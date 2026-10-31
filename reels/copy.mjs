/* AI-written hooks for the reels and posts: festive, urgent and warm, with a reason to follow Value Verdict.
   One Claude call per run writes the lines for every budget page. Facts it may lean on come only from the picks
   (Amazon deal labels, deal end dates, low stock); it never invents prices, discounts or deadlines.
   No ANTHROPIC_API_KEY, or any failure → plain fallback lines, and the run carries on. */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const MODEL = process.env.REELS_MODEL || "claude-haiku-5-5"; /* same model the site uses for its daily picks */

/* the festival or season to talk about today: SEASON env wins, else the first matching row of season.json */
export function seasonFor(dateISO) {
  if (process.env.SEASON) return process.env.SEASON;
  try {
    const rows = JSON.parse(readFileSync(join(here, "season.json"), "utf8"));
    return rows.find((s) => dateISO >= s.from && dateISO <= s.to)?.label || "";
  } catch { return ""; }
}

/* background theme for today: THEME env wins, else the season.json row's "theme" */
export function themeFor(dateISO) {
  if (process.env.THEME) return process.env.THEME;
  try {
    const rows = JSON.parse(readFileSync(join(here, "season.json"), "utf8"));
    return rows.find((s) => dateISO >= s.from && dateISO <= s.to)?.theme || "";
  } catch { return ""; }
}

const LIMITS = { for_whom: 32, hook_title: 36, hook_sub: 80, urgency: 64, follow_line: 64, caption_hook: 130, post_title: 32, season_tag: 24 };
const SCHEMA = {
  type: "object",
  properties: {
    reels: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          season_tag: { type: "string", description: "2-3 word label for the top of the hook slide, e.g. 'Diwali picks' (max 22 chars)" },
          for_whom: { type: "string", description: "who these picks suit, starting with 'for', max 30 chars, e.g. 'for growing families', 'for movie-night families', 'for first homes'" },
          hook_title: { type: "string", description: "big hook headline naming the product type, max 30 chars, a complete phrase" },
          hook_sub: { type: "string", description: "one emotional line under the headline, max 70 chars" },
          urgency: { type: "string", description: "one honest urgency line built only from the given facts, max 60 chars" },
          follow_line: { type: "string", description: "why to follow Value Verdict, warm and personal, max 60 chars" },
          caption_hook: { type: "string", description: "first line of the Instagram caption, max 110 chars, may use 1 emoji" },
          post_title: { type: "string", description: "headline for the single-image post naming the product type, max 30 chars" },
        },
        required: ["id", "for_whom", "season_tag", "hook_title", "hook_sub", "urgency", "follow_line", "caption_hook", "post_title"],
        additionalProperties: false,
      },
    },
  },
  required: ["reels"],
  additionalProperties: false,
};

const SYSTEM = `You write short, scroll-stopping English copy for Instagram reels and posts by Value Verdict, an Indian
buying-guide page that hand-picks the best-value products on Amazon.in at every budget. Audience: Indian families and
young professionals deciding what to buy. Voice: warm, confident, like a smart friend who did the research for you.

Goals for every budget page:
- Hook: make the viewer stop scrolling. Tie the product to the season and to real life (family, home, comfort, gifting,
  "finally upgrading", "no more ..."). Name the product type in hook_title and post_title.
- Urgency: honest only. You may use the Amazon deal labels and deal end dates given in the facts ("Great Indian Festival
  deal ends 5 Nov"), "only a few left" when low stock is given, and general truths ("festive offers change daily",
  "prices move fast before Diwali"). NEVER invent discounts, prices, percentages, stock counts, deadlines or claims like
  "lowest ever" or "selling out".
- Follow: give a personal reason to follow Value Verdict (we research so you don't overspend, daily picks, honest pros
  and cons). Make following feel like joining a smart-shopper family, not a demand.
- No rupee amounts, no percentages, no hashtags, at most one emoji per line, no ALL CAPS sentences.
- for_whom finishes the headline "Top 5 <product> on Amazon <for_whom>": make it specific to who the picks suit.
- Vary wording between pages; don't repeat the same hook.`;

/* a line that runs too long is dropped (plain line used), never cut mid-phrase */
const clip = (s, n) => {
  s = String(s || "").replace(/\s+/g, " ").trim();
  return s.length > n ? "" : s;
};
/* AI text never prints prices or discounts on a reel */
const safe = (s) => !/₹|rs\.?\s?\d|\d+\s?%|percent/i.test(s);

export function fallbackCopy(r, season) {
  const fest = season ? season.split(/[\s,(—-]/)[0] : "";
  return {
    season_tag: fest ? `${fest} picks` : "Today's best",
    for_whom: "for every home",
    hook_title: r.catName,
    hook_sub: "We compared them so you don't have to",
    urgency: fest ? `${fest} offers are live: prices change daily` : "Offers change daily: check today's price",
    follow_line: "Follow Value Verdict: smart picks every day",
    caption_hook: r.coverLine ? `${fest ? fest + " shopping? " : ""}${r.coverLine} on Amazon, hand-picked for you 🔥`
      : `${fest ? fest + " shopping? " : ""}The ${r.catName.toLowerCase()} worth your money ${r.subName.replace(/^Under/, "under")} 🔥`,
    post_title: `Best ${r.catName}`,
  };
}

export async function writeCopy(reels, { date, season }) {
  const out = new Map(reels.map((r) => [r.slug, fallbackCopy(r, season)]));
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) { console.log("AI copy: ANTHROPIC_API_KEY not set, using plain lines"); return out; }
  const facts = reels.map((r) => {
    const deals = [...new Set(r.items.map((p) => p.deal).filter(Boolean))];
    const ends = r.items.map((p) => p.dealEnds).filter(Boolean).sort()[0];
    const low = r.items.filter((p) => p.lowStock).length;
    return [`id: ${r.slug}`, `product type: ${r.catName}`, `budget page: ${r.subName}`, `picks: ${r.items.length}`,
      `top pick: ${r.items[0].brand} ${r.items[0].name} (best for: ${r.items[0].bestFor || "-"})`,
      `who the picks suit: ${r.items.map((p) => p.bestFor).filter(Boolean).join("; ") || "-"}`,
      `Amazon deal labels: ${deals.join(", ") || "none"}`,
      `earliest deal end: ${ends ? new Date(ends).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" }) : "none"}`,
      `picks with low stock: ${low}`].join(" | ");
  });
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: AbortSignal.timeout(120000),
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: MODEL, max_tokens: 16000, system: SYSTEM,
        output_config: { format: { type: "json_schema", schema: SCHEMA } },
        messages: [{ role: "user", content: `Today is ${date} (India). Season: ${season || "no festival, use everyday framing"}.\nWrite copy for each budget page below, one entry per id.\n\n${facts.join("\n")}` }],
      }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(`${r.status} ${j.error?.message || ""}`);
    const text = (j.content || []).find((c) => c.type === "text")?.text || "{}";
    let used = 0;
    for (const c of JSON.parse(text).reels || []) {
      if (!out.has(c.id)) continue;
      const base = out.get(c.id), merged = { ...base };
      for (const [k, n] of Object.entries(LIMITS)) { const v = clip(c[k], n); if (v && safe(v)) merged[k] = v; }
      if (!/^for\s/i.test(merged.for_whom)) merged.for_whom = "for " + merged.for_whom;
      out.set(c.id, merged); used++;
    }
    console.log(`AI copy: ${used}/${reels.length} pages written by ${MODEL}`);
  } catch (e) { console.warn(`AI copy failed (${e.message}), using plain lines`); }
  return out;
}

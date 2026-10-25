import Anthropic from "@anthropic-ai/sdk";
import { admin } from "./db";
import { getCatalog, subsOf } from "./catalog";
import { type GUIDE_CATEGORIES, guideSlug, type Guide } from "./guides";

/* AI drafts of buying guides (Claude Sonnet 5.5). A draft is only ever saved with status "draft":
   a person reads it in preview and publishes it (Supabase → guides → status = published).
   The text is general buying knowledge for Indian shoppers, written as structured sections (never HTML).
   Automatic checks below flag anything that needs a closer look in the draft's "notes". */

const MODEL = "claude-sonnet-5-5";

/* what each category's guide should cover; the specs are the ones our cards show */
const TOPICS: Record<(typeof GUIDE_CATEGORIES)[number], string> = {
  tvs: "panel types (LED, QLED, Mini LED, OLED), native refresh rate vs boosted 'motion' or 'game booster' figures, resolution and screen size for viewing distance, smart platforms (Google TV, webOS, Tizen, Fire TV), HDMI 2.1 and eARC, built-in sound vs a soundbar",
  refrigerators: "capacity by family size, single door vs double door vs side-by-side, direct cool vs frost free, inverter compressors, BEE star ratings and running cost, convertible freezers, voltage stabilisers",
  "washing-machines": "front load vs top load vs semi-automatic, drum capacity by family size, inverter/BLDC motors, in-built heater and steam, water and electricity use, spin speed, hard water",
  "air-conditioners": "tonnage by room size and sun exposure, inverter vs fixed speed, BEE star ratings and running cost, split vs window, copper condenser, convertible modes, installation and stabilisers",
  laptops: "processors (Intel Core / Core Ultra, AMD Ryzen, Apple M-series), RAM, SSD storage, integrated vs dedicated graphics and gaming GPUs, display size and refresh rate, operating systems (Windows, ChromeOS, macOS), battery and weight, choosing by use (students, office, gaming, creators)",
  "soundbars-speakers": "channels (2.0, 2.1, 5.1) and subwoofers, Dolby Atmos, connecting to a TV (HDMI eARC, optical, Bluetooth), wattage figures and what they really mean, room size",
};

const SYSTEM = `You write buying guides for Value Verdict, an Indian website that helps shoppers choose products on Amazon.in by budget.
Audience: ordinary Indian buyers, many buying the product for the first time. Plain, friendly English; short sentences; Indian context (rupees, Indian homes and rooms, Indian climate, power cuts and voltage, BEE star labels).
Goal: after reading, the shopper understands which specifications matter for them and can decide with confidence.

Rules (a person reviews every draft before it is published):
- General buying knowledge only. Never name or rank brands or models, and never say which brand is better or more reliable.
- No made-up facts: no statistics, percentages, market shares, test results, years or "latest" claims that may age, and no prices other than the page's budget ranges given below.
- Rules of thumb (e.g. capacity by family size, tonnage by room size) are fine when they are widely accepted; present them as typical guidance, not exact science.
- Be honest about trade-offs; don't oversell features.
- Don't mention Value Verdict's picks, AI, or affiliate links.

Output:
- title: e.g. "TV buying guide: how to choose the right TV";
- description: one sentence for search results, under 155 characters;
- summary: 4 to 6 short key points to remember;
- sections: 5 to 8 sections, each with a heading, 1 to 3 short paragraphs, optional bullets, and an optional comparison table (a header row and rows of short cells; use null when there is no table);
- faqs: 5 to 8 questions shoppers really ask, each answered in 2 to 4 sentences.`;

const TABLE = {
  type: ["object", "null"],
  properties: { head: { type: "array", items: { type: "string" } }, rows: { type: "array", items: { type: "array", items: { type: "string" } } } },
  required: ["head", "rows"], additionalProperties: false,
};
const SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" }, description: { type: "string" },
    summary: { type: "array", items: { type: "string" } },
    sections: {
      type: "array",
      items: {
        type: "object",
        properties: { heading: { type: "string" }, paragraphs: { type: "array", items: { type: "string" } }, bullets: { type: "array", items: { type: "string" } }, table: TABLE },
        required: ["heading", "paragraphs", "bullets", "table"], additionalProperties: false,
      },
    },
    faqs: { type: "array", items: { type: "object", properties: { q: { type: "string" }, a: { type: "string" } }, required: ["q", "a"], additionalProperties: false } },
  },
  required: ["title", "description", "summary", "sections", "faqs"], additionalProperties: false,
};

type Draft = Pick<Guide, "title" | "description" | "summary" | "sections" | "faqs">;

const UNVERIFIABLE = /\b(reliab\w*|durab\w*|best[\s-]*sell\w*|most\s+popular|market\s+share|trusted\s+brand|best\s+brand|top\s+brand|number\s+one|no\.\s*1)\b/i;

/* brands that are also ordinary words and can start a sentence ("Noise from the compressor…") */
const COMMON_WORDS = new Set(["noise", "boat", "instant", "generic", "basics", "candy"]);

/* "₹15,000", "15K", "₹1 Lakh", "Under 25K" → rupees */
export function rupees(s: string): number | null {
  const m = s.replace(/,/g, "").match(/(\d+(?:\.\d+)?)\s*(k|lakh|l\b)?/i);
  if (!m) return null;
  const unit = (m[2] ?? "").toLowerCase();
  return Math.round(Number(m[1]) * (unit === "k" ? 1e3 : unit === "lakh" || unit === "l" ? 1e5 : 1));
}

/* things a reviewer should double-check; empty when nothing was found */
export function reviewNotes(d: Draft, brands: string[], budgets: string[]): string[] {
  const texts = [d.title, d.description, ...d.summary, ...d.sections.flatMap((s) => [s.heading, ...s.paragraphs, ...s.bullets, ...(s.table ? [...s.table.head, ...s.table.rows.flat()] : [])]), ...d.faqs.flatMap((f) => [f.q, f.a])];
  const all = texts.join("\n"), notes: string[] = [];
  const found = (re: RegExp) => [...new Set([...all.matchAll(re)].map((m) => m[0].trim()))];
  /* brand names as written (case-sensitive), so the word "noise" isn't the brand Noise */
  const brandHits = brands.filter((b) => b.length > 2 && new RegExp(`\\b${b.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(all) && !COMMON_WORDS.has(b.toLowerCase()));
  if (brandHits.length) notes.push(`Brand names: ${brandHits.join(", ")}`);
  const pct = found(/\b\d+(?:\.\d+)?\s*%/g);
  if (pct.length) notes.push(`Percentages: ${pct.join(", ")}`);
  const years = found(/\b20\d\d\b/g);
  if (years.length) notes.push(`Years: ${years.join(", ")}`);
  /* prices are fine when they're one of the page's budget limits ("Under 15K" → ₹15,000, "Under 1 Lakh" → ₹1 lakh) */
  const allowed = new Set(budgets.map(rupees).filter((v): v is number => v != null));
  const prices = found(/(?:₹|\brs\.?)\s?\d[\d,]*(?:\.\d+)?(?:\s*(?:k|lakh)\b)?/gi).filter((p) => !allowed.has(rupees(p) ?? -1));
  if (prices.length) notes.push(`Prices: ${prices.join(", ")}`);
  const claims = found(new RegExp(UNVERIFIABLE.source, "gi"));
  if (claims.length) notes.push(`Unverifiable wording: ${claims.join(", ")}`);
  if (d.description.length > 160) notes.push(`Description is ${d.description.length} characters (aim for under 155)`);
  return notes;
}

/* drafts a guide for a category page and saves it as the next version, status "draft" */
export async function draftGuide(category: string): Promise<{ slug: string; version: number; notes: string[] }> {
  const topics = TOPICS[category as keyof typeof TOPICS];
  if (!topics) throw new Error(`No guide topics for "${category}"`);
  const db = await getCatalog();
  const cat = db.cats.find((c) => c.slug === category);
  if (!cat) throw new Error(`Unknown category "${category}"`);
  const budgets = subsOf(db, cat.category_id).map((s) => s.name);

  const client = new Anthropic();
  const message = await client.beta.messages.stream({
    model: MODEL,
    max_tokens: 32000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "high", format: { type: "json_schema", schema: SCHEMA } },
    system: SYSTEM,
    messages: [{ role: "user", content: `Write the buying guide for our "${cat.name}" page.\nCover: ${topics}.\nThe page's budget ranges: ${budgets.join(", ") || "none"}.` }],
  }).finalMessage();
  if (message.stop_reason === "refusal") throw new Error("The model declined to write this guide");
  if (message.stop_reason === "max_tokens") throw new Error("The guide was cut off (max_tokens)");
  const text = message.content.find((b) => b.type === "text")?.text;
  if (!text) throw new Error("No guide text returned");
  const draft = JSON.parse(text) as Draft;

  /* brands seen in today's deals, to flag any brand the guide names */
  const brands = (await admin<{ brand: string }[]>("GET", "deal_picks?select=brand:data->>brand&limit=1000")).map((r) => r.brand).filter(Boolean);
  const notes = reviewNotes(draft, [...new Set(brands)], budgets);

  const slug = guideSlug(category);
  const last = (await admin<{ version: number }[]>("GET", `guides?slug=eq.${slug}&select=version&order=version.desc&limit=1`))[0]?.version ?? 0;
  await admin("POST", "guides", {
    slug, version: last + 1, category, ...draft, status: "draft",
    author: `AI draft (${message.model}), needs human review`, notes: notes.join("\n"),
  }, "return=minimal");
  return { slug, version: last + 1, notes };
}

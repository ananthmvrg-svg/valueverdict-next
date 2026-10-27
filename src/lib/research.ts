import Anthropic from "@anthropic-ai/sdk";
import { admin, select, selectJson } from "./db";
import { search } from "./amazon";
import type { Deal } from "./amazon";
import { isOn, type Row } from "./products";
import { searchConsole, type GscData } from "./gsc";

/* Pipeline B: weekly market research (Sunday 4 AM IST, GitHub Actions: .github/workflows/research.yml).
   1. inputs: our categories and searches, today's candidates with their Amazon.in best-seller rank (a same-day
      snapshot, never stored as history), searches that found little, the date and season;
      later also Search Console queries (not connected yet);
   2. research: Claude Sonnet 5.5 with web search, on what Indian shoppers will buy in the next two weeks;
   3. plan: extra Amazon searches and content ideas, each with its sources (structured output);
   4. checks: known category, generic words (no brands), sources, no duplicates, plan searches ≤ 30% of the
      daily Amazon calls, and a live Amazon search that finds at least 3 usable products;
   5. activate: the plan's searches are added to amazon_deal_searches (source = plan) and only then is last
      week's plan switched off. Any failure leaves last week's plan running (Pipeline A is never blocked). */

const MODEL = "claude-sonnet-5-5";
export const PLAN_SHARE = 0.3;      /* plan searches: at most 30% of all Amazon search jobs */
const PAGES_PER_TARGET = 3;          /* refresh.ts: BUDGET_PAGES / CATEGORY_PAGES */
const MIN_ITEMS = 3;                 /* a plan search must find at least this many usable products */
const MAX_PLAN_AGE_DAYS = 28;        /* a plan that was never replaced is switched off after 4 weeks */
const FINDS = "amazon-finds";

export type PlanSearch = { category: string; keywords: string; section: string; reason: string; sources: string[] };
export type ContentIdea = { category: string; title: string; reason: string; sources: string[] };
export type Plan = { summary: string; searches: PlanSearch[]; content_ideas: ContentIdea[] };

type Cat = { id: string; slug: string; name: string; subs: number; sections: string[]; keywords: string[] };
export type Inputs = {
  date: string; cats: Cat[]; brands: string[]; baselineJobs: number;
  topSellers: Record<string, { title: string; price: number | null; node: string; rank: number }[]>;
  thinSearches: { category: string; section: string; keywords: string; items: number }[];
  searchConsole: GscData | null; searchConsoleError: string;
};

const istDate = (d = new Date()) => new Date(d.getTime() + 5.5 * 36e5).toISOString().slice(0, 10);
const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9₹ ]+/g, " ").replace(/\s+/g, " ").trim();
const jobsFor = (c: Cat) => Math.max(1, c.subs) * PAGES_PER_TARGET;

/* 1. inputs from our own data */
export async function gatherInputs(): Promise<Inputs> {
  const [cats, subs, searches, jobs] = await Promise.all([
    select("categories"), select("subcategories"),
    select("amazon_deal_searches", "active=eq.true"),
    admin<{ search_id: number; sub_slug: string; page: number; item_count: number }[]>("GET", "deal_jobs?select=search_id,sub_slug,page,item_count"),
  ]);
  const since = new Date(Date.now() - 24 * 36e5).toISOString();
  const deals = await selectJson<{ search_id: number; data: Deal }>("deals", `select=search_id,data&fetched_at=gte.${encodeURIComponent(since)}&limit=5000`);
  const live = cats.filter((c) => isOn(c.active));
  const baseline = searches.filter((s) => (s.source || "baseline") === "baseline");
  const catOf = new Map(searches.map((s) => [String(s.id), s.category_id]));
  const out: Cat[] = live.map((c) => ({
    id: c.category_id, slug: c.slug, name: c.name,
    subs: subs.filter((x) => x.category_id === c.category_id && isOn(x.active)).length,
    sections: [...new Set(baseline.filter((s) => s.category_id === c.category_id).map((s) => s.section))],
    keywords: baseline.filter((s) => s.category_id === c.category_id).map((s) => s.keywords),
  }));
  /* Amazon.in best-seller rank among today's candidates, per category (today only) */
  const topSellers: Inputs["topSellers"] = {};
  for (const c of out) {
    const seen = new Set<string>();
    topSellers[c.slug] = deals.filter((d) => catOf.get(String(d.search_id)) === c.id && d.data?.salesRank && !seen.has(d.data.asin) && seen.add(d.data.asin))
      .sort((a, b) => a.data.salesRank!.rank - b.data.salesRank!.rank).slice(0, 8)
      .map((d) => ({ title: d.data.title.slice(0, 90), price: d.data.price, node: d.data.salesRank!.node, rank: d.data.salesRank!.rank }));
  }
  /* page-1 searches that found few usable products: gaps worth a second search */
  const thinSearches = jobs.filter((j) => j.page === 1 && j.item_count < MIN_ITEMS).map((j) => {
    const s = searches.find((x) => String(x.id) === String(j.search_id));
    return s ? { category: out.find((c) => c.id === s.category_id)?.slug ?? "", section: s.section, keywords: `${s.keywords}${j.sub_slug ? ` (${j.sub_slug})` : ""}`, items: j.item_count } : null;
  }).filter((x): x is NonNullable<typeof x> => Boolean(x && x.category));
  const brands = [...new Set(deals.map((d) => d.data?.brand).filter((b): b is string => Boolean(b && b.length > 1)))];
  /* Search Console is helpful, not required: a problem with it is recorded and the research goes on */
  let gsc: GscData | null = null, gscError = "";
  try { gsc = await searchConsole(); } catch (e) { gscError = (e as Error).message; }
  return { date: istDate(), cats: out, brands, baselineJobs: out.reduce((n, c) => n + jobsFor(c) * Math.max(1, c.keywords.length), 0), topSellers, thinSearches, searchConsole: gsc, searchConsoleError: gscError };
}

/* 2 + 3. research with web search, then a structured plan */
const RESEARCH_SYSTEM = `You research the Indian consumer market for Value Verdict, a website that lists Amazon.in deals by category and budget.
Find what Indian shoppers are likely to buy on Amazon.in in the next 14 days: seasonal needs (weather, festivals, school/college terms, weddings), announced Amazon.in sale events, newly popular product types and features.
Use web search. Prefer recent, specific sources (news, Amazon.in announcements, retail and consumer-electronics publications). Record the URL of every source you rely on.
Report facts with their sources; do not invent figures, dates or events. If something is uncertain, say so.`;

const PLAN_SYSTEM = `You turn market research into a weekly search plan for Value Verdict (Amazon.in deals, India).
Rules for "searches" (extra Amazon.in keyword searches that add candidates to our existing pages):
- 0 to 8 searches in total; only where the research or our own data gives a clear reason;
- "category" must be one of the given category slugs; keywords are 2 to 6 generic shopping words as an Indian shopper would type them (e.g. "inverter split ac 1.5 ton", "oil filled room heater"), never brand or model names, never prices;
- do not repeat or closely reword a current search;
- "section": for amazon-finds, a short new section name ending in "deals" (e.g. "Room heater deals") or one of its current sections; for other categories, one of that category's current sections;
- "reason": one sentence on why, naming the evidence; "sources": URLs from the research (at least one), or "our-data:<what>" when the reason is our own data (e.g. "our-data:thin-search", "our-data:search-console");
- Search Console shows what Indian shoppers already search for when they find us; a query with many impressions where we have no matching products or rank poorly is a strong reason for a search or a content idea. Treat a query with only 1–2 impressions as weak evidence.
"content_ideas": 0 to 5 buying-guide or FAQ topics shoppers will need soon, each with a reason and sources.
"summary": 2 to 4 sentences on this week's Indian market outlook.`;

const PLAN_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    searches: { type: "array", items: { type: "object", properties: {
      category: { type: "string" }, keywords: { type: "string" }, section: { type: "string" }, reason: { type: "string" }, sources: { type: "array", items: { type: "string" } },
    }, required: ["category", "keywords", "section", "reason", "sources"], additionalProperties: false } },
    content_ideas: { type: "array", items: { type: "object", properties: {
      category: { type: "string" }, title: { type: "string" }, reason: { type: "string" }, sources: { type: "array", items: { type: "string" } },
    }, required: ["category", "title", "reason", "sources"], additionalProperties: false } },
  },
  required: ["summary", "searches", "content_ideas"], additionalProperties: false,
};

function describe(inputs: Inputs) {
  return [
    `Today (India): ${inputs.date}.`,
    "Our categories (slug: name — current sections — current search words):",
    ...inputs.cats.map((c) => `- ${c.slug}: ${c.name} — ${c.sections.join(", ") || "-"} — ${c.keywords.join(" | ")}`),
    "Today's Amazon.in best-seller ranks among our candidates (category: rank in Amazon category, product, price):",
    ...Object.entries(inputs.topSellers).filter(([, v]) => v.length).map(([k, v]) => `- ${k}: ${v.slice(0, 5).map((x) => `#${x.rank} in ${x.node}: ${x.title} (₹${x.price ?? "?"})`).join("; ")}`),
    inputs.thinSearches.length ? `Searches that found fewer than ${MIN_ITEMS} usable products today: ${inputs.thinSearches.slice(0, 15).map((t) => `${t.category} "${t.keywords}" (${t.items})`).join("; ")}` : "No thin searches today.",
    ...gscLines(inputs),
  ].join("\n");
}

/* Search Console in a few lines: totals, the searches we're shown for most, and those close to page 1 */
function gscLines(inputs: Inputs): string[] {
  const g = inputs.searchConsole;
  if (!g) return [inputs.searchConsoleError ? `Search Console: unavailable (${inputs.searchConsoleError}).` : "Search Console: not connected."];
  const path = (u?: string) => (u ?? "").replace(/^https?:\/\/[^/]+/, "") || "/";
  const row = (r: GscData["queries"][number]) => `"${r.query}"${r.page ? ` → ${path(r.page)}` : ""} (${r.impressions} impressions, ${r.clicks} clicks, position ${r.position})`;
  const impressions = g.queries.reduce((n, r) => n + r.impressions, 0), clicks = g.queries.reduce((n, r) => n + r.clicks, 0);
  const near = g.pairs.filter((r) => r.position >= 5 && r.position <= 20 && r.impressions >= 3).sort((a, b) => b.impressions - a.impressions).slice(0, 15);
  return [
    `Search Console, India only, ${g.start} to ${g.end}: ${g.queries.length} queries, ${impressions} impressions, ${clicks} clicks. Small numbers are weak evidence.`,
    `Most shown queries: ${g.queries.sort((a, b) => b.impressions - a.impressions).slice(0, 20).map(row).join("; ") || "none yet"}`,
    `Close to page 1 (positions 5–20, query → our page): ${near.map(row).join("; ") || "none yet"}`,
  ];
}

async function researchNotes(client: Anthropic, inputs: Inputs): Promise<{ text: string; sources: string[] }> {
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: `${describe(inputs)}\n\nResearch the next 14 days of Indian shopping demand for these categories (and anything clearly trending that would fit "amazon-finds"). End with a list of the sources you used.` }];
  const sources = new Set<string>();
  let text = "";
  /* web search can pause a long turn; continue it a few times */
  for (let turn = 0; turn < 4; turn++) {
    const msg = await client.beta.messages.stream({
      model: MODEL, max_tokens: 16000, system: RESEARCH_SYSTEM, messages,
      betas: ["server-side-fallback-2026-07-01"], fallbacks: "default",
      output_config: { effort: "high" },
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 10, user_location: { type: "approximate", country: "IN", timezone: "Asia/Kolkata" } }],
    }).finalMessage();
    if (msg.stop_reason === "refusal") throw new Error("research declined by the model");
    for (const b of msg.content) {
      if (b.type === "text") {
        text += b.text;
        for (const c of b.citations ?? []) if ("url" in c && c.url) sources.add(c.url);
      }
      if (b.type === "web_search_tool_result" && Array.isArray(b.content)) for (const r of b.content) if (r.type === "web_search_result") sources.add(r.url);
    }
    if (msg.stop_reason !== "pause_turn") break;
    messages.push({ role: "assistant", content: msg.content });
  }
  if (!text.trim()) throw new Error("research returned no text");
  return { text, sources: [...sources] };
}

export async function makePlan(inputs: Inputs): Promise<{ plan: Plan; notes: string; sources: string[] }> {
  const client = new Anthropic();
  const { text, sources } = await researchNotes(client, inputs);
  const msg = await client.beta.messages.stream({
    model: MODEL, max_tokens: 8000, system: PLAN_SYSTEM,
    betas: ["server-side-fallback-2026-07-01"], fallbacks: "default",
    output_config: { effort: "high", format: { type: "json_schema", schema: PLAN_SCHEMA } },
    messages: [{ role: "user", content: `${describe(inputs)}\n\nResearch notes:\n${text}\n\nSources found (use these URLs exactly):\n${sources.join("\n")}` }],
  }).finalMessage();
  if (msg.stop_reason === "refusal") throw new Error("plan declined by the model");
  const out = msg.content.find((b) => b.type === "text");
  if (!out || out.type !== "text") throw new Error("plan returned no text");
  return { plan: JSON.parse(out.text) as Plan, notes: text, sources };
}

/* 4. checks that don't need Amazon */
export function checkPlan(plan: Plan, inputs: Inputs, knownSources: string[]): { ok: PlanSearch[]; rejected: { search: PlanSearch; why: string }[] } {
  const ok: PlanSearch[] = [], rejected: { search: PlanSearch; why: string }[] = [];
  const known = new Set(knownSources);
  const taken = new Set(inputs.cats.flatMap((c) => c.keywords.map(norm)));
  const brandRe = inputs.brands.length ? new RegExp(`\\b(${inputs.brands.map((b) => b.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`) : null;
  let planJobs = 0;
  const maxPlanJobs = Math.floor((PLAN_SHARE / (1 - PLAN_SHARE)) * inputs.baselineJobs);
  for (const s of plan.searches ?? []) {
    const no = (why: string) => rejected.push({ search: s, why });
    const cat = inputs.cats.find((c) => c.slug === s.category);
    const words = norm(s.keywords).split(" ").filter(Boolean);
    if (!cat) { no("unknown category"); continue; }
    if (words.length < 2 || words.length > 6) { no("keywords must be 2 to 6 words"); continue; }
    if (/₹|\brs\b|\d{4,}|under|below|cheap/.test(norm(s.keywords))) { no("prices belong to our budget pages, not the search words"); continue; }
    if (brandRe?.test(norm(s.keywords))) { no("brand names are not allowed"); continue; }
    /* TV size pages add their size to every search ("smart tv 43 inch"); a size in the plan's words would be searched on every size page */
    if (s.category === "tvs" && /\b\d{2,3}\s*(?:inch|in|cm)\b|″|"/i.test(s.keywords)) { no("screen sizes come from our TV size pages, not the search words"); continue; }
    if (taken.has(norm(s.keywords))) { no("duplicates a current search"); continue; }
    const sources = (s.sources ?? []).filter((u) => known.has(u) || /^our-data:/.test(u));
    if (!sources.length) { no("no source from the research or our data"); continue; }
    const section = s.category === FINDS
      ? (/deals$/i.test(s.section.trim()) && s.section.trim().length <= 30 ? s.section.trim() : "")
      : cat.sections.find((x) => x.toLowerCase() === s.section.trim().toLowerCase()) ?? cat.sections[0];
    if (!section) { no('amazon-finds sections must be short and end in "deals"'); continue; }
    if (planJobs + jobsFor(cat) > maxPlanJobs) { no(`over the ${Math.round(PLAN_SHARE * 100)}% share of daily searches`); continue; }
    planJobs += jobsFor(cat);
    taken.add(norm(s.keywords));
    ok.push({ ...s, section, sources });
  }
  return { ok, rejected };
}

/* the filters a plan search runs with: those of the category's search for the same section; for a new section
   (e.g. "Room heater deals" in Amazon Finds) only the minimum rating, and the category's typical (median) minimum
   discount, never another section's search index or title rules (a smartwatch rule would reject every heater) */
export function filtersFor(s: PlanSearch, catId: string, baseRows: Row[]): Row | null {
  const own = baseRows.filter((b) => b.category_id === catId);
  const same = own.find((b) => b.section === s.section);
  if (same) return same;
  if (!own.length) return null;
  const pcts = own.map((b) => Number(b.min_saving_percent)).filter((n) => n > 0).sort((a, b) => a - b);
  return {
    category_id: catId, section: s.section, min_rating: own[0].min_rating,
    min_saving_percent: pcts.length ? String(pcts[Math.floor(pcts.length / 2)]) : "", search_index: "", must_include: "", sort_by: "", brand: "",
  } as Row;
}

/* 4b. a live Amazon search with the category's own filters must find enough usable products */
async function amazonCheck(s: PlanSearch, base: Row): Promise<number> {
  const r = await search({ ...base, keywords: s.keywords, section: s.section, max_price: "", min_price: "" } as Row, 1);
  return r.items.length;
}

/* 5. the whole weekly run; returns what happened (also saved in research_plans) */
export async function runResearch(opts: { dryRun?: boolean } = {}): Promise<string> {
  const week = istDate();
  /* a plan nobody replaced for 4 weeks is switched off, so stale searches don't run forever */
  const old = new Date(Date.now() - MAX_PLAN_AGE_DAYS * 864e5).toISOString();
  if (!opts.dryRun) await admin("PATCH", `amazon_deal_searches?source=eq.plan&active=eq.true&created_at=lt.${encodeURIComponent(old)}`, { active: false }, "return=minimal");
  const [row] = opts.dryRun ? [{ id: 0 }] : await admin<{ id: number }[]>("POST", "research_plans", { week, status: "draft", model: MODEL }, "return=representation");
  const save = (patch: Record<string, unknown>) => (opts.dryRun ? Promise.resolve() : admin("PATCH", `research_plans?id=eq.${row.id}`, patch, "return=minimal"));
  try {
    const inputs = await gatherInputs();
    const { plan, notes, sources } = await makePlan(inputs);
    const { ok, rejected } = checkPlan(plan, inputs, sources);
    /* live Amazon check, 1 request per ~1.2 s */
    const baseRows = await select("amazon_deal_searches", "active=eq.true&source=eq.baseline");
    const accepted: (PlanSearch & { items: number })[] = [];
    const amazonOk = Boolean(process.env.AMAZON_CREDENTIAL_ID && process.env.AMAZON_CREDENTIAL_SECRET);
    for (const s of ok) {
      const cat = inputs.cats.find((c) => c.slug === s.category)!;
      const base = filtersFor(s, cat.id, baseRows);
      if (!base) { rejected.push({ search: s, why: "no baseline search to copy filters from" }); continue; }
      if (!amazonOk) { rejected.push({ search: s, why: "Amazon keys missing, so it could not be checked" }); continue; }
      const items = await amazonCheck(s, base).catch(() => -1);
      await new Promise((r) => setTimeout(r, 1200));
      if (items < MIN_ITEMS) { rejected.push({ search: s, why: items < 0 ? "Amazon search failed" : `Amazon found only ${items} usable products` }); continue; }
      accepted.push({ ...s, items });
    }
    await save({ summary: plan.summary, searches: accepted, rejected, content_ideas: plan.content_ideas ?? [], research_notes: notes.slice(0, 20000), inputs: { ...inputs, sources } });
    if (opts.dryRun) return `dry run: ${accepted.length} searches would be added, ${rejected.length} rejected\n${JSON.stringify({
      summary: plan.summary, accepted, rejected: rejected.map((r) => ({ ...r.search, why: r.why })), content_ideas: plan.content_ideas, sources: sources.length,
    }, null, 1)}`;
    if (!accepted.length) {
      await save({ status: "failed", error: "no search passed the checks; last week's plan stays active" });
      return "no search passed the checks; last week's plan stays active";
    }
    /* add the new searches first, then switch off the previous plan's */
    const maxId = (await admin<{ id: number }[]>("GET", "amazon_deal_searches?select=id&order=id.desc&limit=1"))[0]?.id ?? 0;
    await admin("POST", "amazon_deal_searches", accepted.map((s, i) => {
      const cat = inputs.cats.find((c) => c.slug === s.category)!;
      const base = filtersFor(s, cat.id, baseRows)!;
      return {
        id: maxId + 1 + i, category_id: cat.id, section: s.section, keywords: s.keywords, search_index: base.search_index || null,
        min_saving_percent: Number(base.min_saving_percent) || null, min_rating: Number(base.min_rating) || null,
        sort_by: base.sort_by || null, must_include: base.must_include || null, active: true, source: "plan", plan_id: row.id, reason: s.reason.slice(0, 300),
      };
    }), "return=minimal");
    await admin("PATCH", `amazon_deal_searches?source=eq.plan&active=eq.true&plan_id=neq.${row.id}`, { active: false }, "return=minimal");
    await admin("PATCH", `research_plans?status=eq.active&id=neq.${row.id}`, { status: "archived" }, "return=minimal");
    await save({ status: "active", activated_at: new Date().toISOString() });
    return `plan ${row.id} active: ${accepted.length} searches added, ${rejected.length} rejected, ${(plan.content_ideas ?? []).length} content ideas`;
  } catch (e) {
    await save({ status: "failed", error: (e as Error).message.slice(0, 500) }).catch(() => {});
    return `research failed (${(e as Error).message}); last week's plan stays active`;
  }
}

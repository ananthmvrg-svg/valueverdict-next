import Anthropic from "@anthropic-ai/sdk";
import { admin, select, selectJson } from "./db";
import type { Deal } from "./amazon";
import { isOn } from "./products";

/* AI deal picks, twice a day (called by lib/refresh.ts once a cycle's candidates are all in).
   One request per budget page (top 5) and one for Amazon Finds (50–60 across its sections), sent through
   Anthropic's Message Batches API (half price; results arrive within minutes, so each 2-minute scheduled run
   just submits or checks, well inside Netlify's 30-second limit). Every pick also gets a value score (1–100);
   the Top 100 page is the highest-scoring picks across the site (topHundred), with no extra AI call.
   Needs ANTHROPIC_API_KEY. The AI sees only listing text (no ratings or reviews), so the prompt asks it
   to judge from brand, specs, price and discount and never invent facts. */

const MODEL = "claude-haiku-5-5";
const TOP_PER_BUDGET = 5;
const FINDS_SLUG = "amazon-finds";

export const aiConfigured = () => Boolean(process.env.ANTHROPIC_API_KEY);

type Candidate = Deal & { section: string; category: string };
type Group = { key: string; title: string; category: string; want: string; max: number; items: Candidate[] };
type Run = { id: number; stage: "groups"; batch_id: string | null; status: string };
type Pick = { asin: string; reason: string; score: number };

const SYSTEM = `You choose the best deals for Value Verdict, an Indian website that helps shoppers pick products by budget.
Pick products a careful buyer would be glad they bought:
- a genuine product of the page's type, never an accessory, spare part, cover or unrelated item;
- a reliable brand with good service in India;
- sensible specifications for the price (capacity, energy rating, processor, screen, warranty, whatever matters for the type);
- a real discount.
Prefer variety: never pick two colour, size or storage variants of the same model, and avoid several picks from one brand when good alternatives exist.
You only see the listing text, with no ratings or reviews, so judge from brand, specs, price and discount, and never invent facts that are not in the listing.
Each reason is one plain sentence under 20 words naming the concrete advantage, for example "5-star inverter, 8 kg drum and steam wash at the lowest price for this capacity".
Each score is the deal's overall value from 1 to 100 on one scale for the whole site (90+ only for exceptional value, 70–89 a strong deal, 50–69 decent), so scores from different pages can be compared.
Return only ASINs from the candidate list.`;

const SCHEMA = {
  type: "object",
  properties: {
    picks: {
      type: "array",
      items: {
        type: "object",
        properties: { asin: { type: "string" }, reason: { type: "string" }, score: { type: "integer" } },
        required: ["asin", "reason", "score"],
        additionalProperties: false,
      },
    },
  },
  required: ["picks"],
  additionalProperties: false,
};

const inr = (n: number | null) => (n == null ? "?" : "₹" + Math.round(n).toLocaleString("en-IN"));
const cut = (t: string, n: number) => (t.length > n ? t.slice(0, n - 1) + "…" : t);
const line = (x: Candidate, extra = "") =>
  [x.asin, x.brand || "-", cut(x.title, 130), `${inr(x.price)}${x.was ? ` (was ${inr(x.was)}, ${x.off ?? "?"}% off)` : ""}`,
    x.deal || "-", cut(x.features.join(" / "), 220), extra].filter(Boolean).join(" | ");

const request = (custom_id: string, task: string, lines: string[], maxTokens: number): Anthropic.Messages.BatchCreateParams.Request => ({
  custom_id,
  params: {
    model: MODEL,
    max_tokens: maxTokens,
    system: SYSTEM,
    output_config: { format: { type: "json_schema", schema: SCHEMA } },
    messages: [{ role: "user", content: `${task}\n\nCandidates (ASIN | brand | title | price | deal | features${custom_id === "top-100" ? " | page" : ""}):\n${lines.join("\n")}` }],
  },
});

/* custom_id allows only letters, digits, _ and -, so budget page keys are numbered */
const idOf = (i: number) => `g${i}`;

/* candidates saved for this cycle, as groups the AI will judge */
async function buildGroups(): Promise<Group[]> {
  const [cats, subs, searches] = await Promise.all([select("categories"), select("subcategories"), select("amazon_deal_searches", "active=eq.true")]);
  const since = new Date(Date.now() - 24 * 36e5).toISOString();
  const rows = await selectJson<{ search_id: number; sub_slug: string; data: Deal }>("deals",
    `select=search_id,sub_slug,data&fetched_at=gte.${encodeURIComponent(since)}&order=page.asc,position.asc&limit=5000`);
  const searchOf = new Map(searches.map((s) => [s.id, s]));
  const groups: Group[] = [];
  for (const cat of cats.filter((c) => isOn(c.active))) {
    const mine = rows.filter((r) => searchOf.get(String(r.search_id))?.category_id === cat.category_id);
    const pick = (sub: string) => {
      const seen = new Set<string>();
      return mine.filter((r) => r.sub_slug === sub && r.data?.asin && !seen.has(r.data.asin) && seen.add(r.data.asin))
        .map((r) => ({ ...r.data, section: searchOf.get(String(r.search_id))!.section, category: cat.slug }));
    };
    const catSubs = subs.filter((x) => x.category_id === cat.category_id && isOn(x.active));
    if (catSubs.length) {
      for (const sub of catSubs) {
        const items = pick(sub.slug);
        if (items.length) groups.push({
          key: `${cat.slug}/${sub.slug}`, title: `${cat.name}, ${sub.name}`, category: cat.slug, items, max: TOP_PER_BUDGET,
          want: `Page: ${cat.name}, ${sub.name}. Pick the best ${Math.min(TOP_PER_BUDGET, items.length)} deals, best first. Shoppers on this page have this budget to spend, so prefer products that make good use of it over simply the cheapest ones.${new Set(items.map((x) => x.section)).size > 1 ? " Candidates come from several sections (for example everyday and gaming laptops): include the best of each section that has a good option." : ""}`,
        });
      }
    } else {
      const items = pick("");
      if (items.length) groups.push(cat.slug === FINDS_SLUG
        ? { key: cat.slug, title: cat.name, category: cat.slug, items, max: 60,
            want: `Page: ${cat.name}, popular deals beyond our main categories. Pick 50 to 60 deals, best first, covering every section that has good options: at least 3 from each such section and at most 8 from any one section.` }
        : { key: cat.slug, title: cat.name, category: cat.slug, items, max: TOP_PER_BUDGET,
            want: `Page: ${cat.name}. Pick the best ${Math.min(TOP_PER_BUDGET, items.length)} deals, best first.` });
    }
  }
  return groups;
}

/* the answer's picks, keeping only real candidates, in order, without repeats */
function picksFrom(message: Anthropic.Messages.Message, valid: Set<string>, max: number): Pick[] {
  if (message.stop_reason === "refusal") return [];
  const text = message.content.find((b): b is Anthropic.Messages.TextBlock => b.type === "text")?.text;
  if (!text) return [];
  let parsed: { picks?: Pick[] };
  try { parsed = JSON.parse(text); } catch { return []; }
  const seen = new Set<string>();
  return (parsed.picks || []).filter((p) => p && valid.has(p.asin) && !seen.has(p.asin) && seen.add(p.asin)).slice(0, max)
    .map((p) => ({ asin: p.asin, reason: String(p.reason || "").trim().slice(0, 200), score: Math.max(1, Math.min(100, Math.round(Number(p.score) || 50))) }));
}

const pickRows = (groupKey: string, cycle: string, picks: Pick[], byAsin: Map<string, Candidate>) => picks.map((p, i) => {
  const { section, category, ...data } = byAsin.get(p.asin)!;
  return { group_key: groupKey, rank: i + 1, asin: p.asin, reason: p.reason, score: p.score, section, category, data, cycle };
});

async function savePicks(groupKey: string, cycle: string, picks: Pick[], byAsin: Map<string, Candidate>) {
  await admin("DELETE", `deal_picks?group_key=eq.${encodeURIComponent(groupKey)}`);
  if (picks.length) await admin("POST", "deal_picks", pickRows(groupKey, cycle, picks, byAsin), "return=minimal");
  return picks.length;
}

async function results(client: Anthropic, batchId: string) {
  const out = new Map<string, Anthropic.Messages.Message>();
  for await (const r of await client.messages.batches.results(batchId)) {
    if (r.result.type === "succeeded") out.set(r.custom_id, r.result.message);
  }
  return out;
}

/* One step of the twice-daily AI run; safe to call every few minutes. Returns what it did. */
export async function curate(cycle: string): Promise<string> {
  if (!aiConfigured()) return "AI off: ANTHROPIC_API_KEY is not set";
  const client = new Anthropic();
  const runs = await admin<Run[]>("GET", `ai_runs?cycle=eq.${encodeURIComponent(cycle)}&select=id,stage,batch_id,status`);
  const groupsRun = runs.find((r) => r.stage === "groups");
  const record = (stage: Run["stage"], batchId: string, detail: string) =>
    admin("POST", "ai_runs", { cycle, stage, batch_id: batchId, status: "submitted", detail }, "return=minimal");
  const finish = (run: Run, status: string, detail: string) =>
    admin("PATCH", `ai_runs?id=eq.${run.id}`, { status, detail: detail.slice(0, 500), finished_at: new Date().toISOString() }, "return=minimal");

  /* stage 1: submit one batch with every budget page and Amazon Finds */
  if (!groupsRun) {
    const groups = await buildGroups();
    if (!groups.length) return "no candidates yet";
    const reqs = groups.map((g, i) => request(idOf(i), g.want, g.items.map((x) => line(x, `section: ${x.section}`)), g.key === FINDS_SLUG ? 16000 : 6000));
    const batch = await client.messages.batches.create({ requests: reqs });
    await record("groups", batch.id, JSON.stringify(groups.map((g, i) => [idOf(i), g.key])));
    return `submitted ${groups.length} pick requests (${batch.id})`;
  }

  /* stage 1 results → deal_picks, then stage 2: rank the Top 100 from all picks */
  if (groupsRun.status === "submitted") {
    const batch = await client.messages.batches.retrieve(groupsRun.batch_id!);
    if (batch.processing_status !== "ended") return `waiting for AI picks (${batch.request_counts.processing} left)`;
    const groups = await buildGroups();
    const keyOf = new Map<string, string>(JSON.parse((await admin<{ detail: string }[]>("GET", `ai_runs?id=eq.${groupsRun.id}&select=detail`))[0].detail));
    const answers = await results(client, groupsRun.batch_id!);
    /* every group's picks replaced in two requests (one delete, one insert), so saving stays fast */
    const rows: Record<string, unknown>[] = [], keys: string[] = [];
    let empty = 0;
    for (const [id, key] of keyOf) {
      const g = groups.find((x) => x.key === key), message = answers.get(id);
      const picks = g && message ? picksFrom(message, new Set(g.items.map((x) => x.asin)), g.max) : [];
      if (!g || !picks.length) { empty++; continue; }
      const byAsin = new Map(g.items.map((x) => [x.asin, x]));
      keys.push(g.key);
      rows.push(...pickRows(g.key, cycle, picks, byAsin));
    }
    if (keys.length) await admin("DELETE", `deal_picks?group_key=in.${encodeURIComponent(`(${keys.map((k) => `"${k}"`).join(",")})`)}`);
    if (rows.length) await admin("POST", "deal_picks", rows, "return=minimal");
    const saved = rows.length;
    const top = await topHundred(cycle);
    await finish(groupsRun, "done", `saved ${saved} picks, ${empty} groups without picks, Top 100: ${top}`);
    return `saved ${saved} AI picks (${empty} groups empty), Top 100: ${top}`;
  }
  return "AI picks done for this cycle";
}

/* Top 100: this cycle's picks with the highest value scores, at most PER_CATEGORY from one category so
   every category shows up; ties go to the better rank on its own page. */
const PER_CATEGORY = 15;
export async function topHundred(cycle: string) {
  type Saved = { asin: string; rank: number; reason: string; score: number | null; section: string; category: string; data: Deal };
  const all = await selectJson<Saved>("deal_picks", `select=asin,rank,reason,score,section,category,data&cycle=eq.${encodeURIComponent(cycle)}&group_key=neq.top-100&limit=3000`);
  const seen = new Set<string>(), perCat = new Map<string, number>(), top: Saved[] = [];
  for (const p of all.sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || a.rank - b.rank)) {
    if (top.length >= 100 || seen.has(p.asin) || (perCat.get(p.category) ?? 0) >= PER_CATEGORY) continue;
    seen.add(p.asin); perCat.set(p.category, (perCat.get(p.category) ?? 0) + 1); top.push(p);
  }
  const byAsin = new Map(top.map((p) => [p.asin, { ...p.data, section: p.section, category: p.category }]));
  return savePicks("top-100", cycle, top.map((p) => ({ asin: p.asin, reason: p.reason, score: p.score ?? 50 })), byAsin);
}

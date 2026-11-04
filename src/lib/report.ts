import Anthropic from "@anthropic-ai/sdk";
import { admin } from "./db";
import { analytics, type Ga4Data } from "./ga4";
import { searchConsole, type GscData } from "./gsc";
import { keywordLines } from "./research";
import type { KeywordRow } from "./keywords";
import { logCost, monthSpend, overBudget, MONTHLY_BUDGET } from "./costs";

/* Phase 6: the weekly report (Monday 5 AM IST, .github/workflows/report.yml, or npm run report:local).
   1. numbers, gathered and added up by code (never by the model): GA4 visits, pages, sources and our click
      events; Search Console searches; imported keyword data; last week's research plan; this month's AI spend;
      the actions the previous report suggested;
   2. Claude Opus 5.5 (effort medium) reads them and writes what worked, what didn't and what to do next, each
      point tied to a number it was given (structured output);
   3. saved in weekly_reports and shown in the GitHub run summary. It changes nothing on the site: every action
      is a suggestion for a person to approve (no automatic title rewrites, no publishing).
   Affiliate clicks are clicks, never purchases; Amazon Associates sales are not connected (no API for them). */

const MODEL = "claude-opus-5-5";

export type Action = { title: string; why: string; evidence: string; page: string; who: "site" | "you" | "research"; effort: "small" | "medium" | "large"; priority: number };
export type Report = {
  headline: string; summary: string; data_quality: string;
  wins: { what: string; evidence: string }[]; problems: { what: string; evidence: string }[];
  actions: Action[]; watch: string[];
};
export type ReportInputs = {
  week: string; ga4: Ga4Data | null; ga4Error: string; gsc: GscData | null; gscError: string;
  keywords: string[]; plan: { week: string; status: string; summary: string; searches: { category: string; keywords: string; reason: string }[]; content_ideas: { category: string; title: string }[] } | null;
  guides: string[]; spend: { total: number; byJob: Record<string, number> }; lastActions: Action[];
};

const SYSTEM = `You write the weekly performance report for Value Verdict (valueverdict.in), an Indian website that lists Amazon.in deals by category and budget, with buying guides. Its income is Amazon affiliate commission. The reader is the site's owner, who is not technical.
Rules:
- Use only the numbers you are given. Never invent figures, rankings, sales or causes. Every win, problem and action names the number it rests on ("evidence").
- Small numbers are weak evidence: under about 100 visitors or 50 search impressions in a week, say the signal is early and prefer actions that build traffic and data over changes based on noise.
- A click on an Amazon button is a click, not a purchase. Purchases are not in this data.
- Never promise Google rankings. Don't suggest changing a page's title or description unless Search Console shows it is shown often (impressions) but rarely clicked, over a meaningful number of impressions.
- Actions are suggestions for a person to approve; at most 7, the most valuable first (priority 1 = highest). "who": "site" = a change to the website, "you" = something the owner does (Google Ads/Analytics settings, posting, outreach), "research" = something for next week's research to look into. "page" is the page's path (e.g. "/tvs/under-30k") or "".
- Follow up on last week's suggested actions when the numbers show anything about them.
- Plain, short sentences. Indian context (₹, Amazon.in sales, festivals).
What already runs by itself (don't suggest doing it by hand): Amazon deals and AI picks refresh every day at 6 AM IST, prices are re-checked every 3 hours, market research runs every Sunday, this report every Monday. GA4 tracking is installed on every page; if GA4 numbers are missing, only this report's read access is missing.`;

const SCHEMA = {
  type: "object",
  properties: {
    headline: { type: "string" }, summary: { type: "string" }, data_quality: { type: "string" },
    wins: { type: "array", items: { type: "object", properties: { what: { type: "string" }, evidence: { type: "string" } }, required: ["what", "evidence"], additionalProperties: false } },
    problems: { type: "array", items: { type: "object", properties: { what: { type: "string" }, evidence: { type: "string" } }, required: ["what", "evidence"], additionalProperties: false } },
    actions: { type: "array", items: { type: "object", properties: {
      title: { type: "string" }, why: { type: "string" }, evidence: { type: "string" }, page: { type: "string" },
      who: { type: "string", enum: ["site", "you", "research"] }, effort: { type: "string", enum: ["small", "medium", "large"] }, priority: { type: "integer" },
    }, required: ["title", "why", "evidence", "page", "who", "effort", "priority"], additionalProperties: false } },
    watch: { type: "array", items: { type: "string" } },
  },
  required: ["headline", "summary", "data_quality", "wins", "problems", "actions", "watch"], additionalProperties: false,
};

const istDate = (d = new Date()) => new Date(d.getTime() + 5.5 * 36e5).toISOString().slice(0, 10);
const pct = (now: number, before: number) => (before ? `${now >= before ? "+" : ""}${Math.round(((now - before) / before) * 100)}%` : "new");

/* 1. the numbers; each source is optional, a problem with one is noted and the report goes on */
export async function gatherReport(): Promise<ReportInputs> {
  let ga4: Ga4Data | null = null, ga4Error = "", gsc: GscData | null = null, gscError = "";
  await Promise.all([
    analytics().then((d) => { ga4 = d; }, (e) => { ga4Error = (e as Error).message; }),
    searchConsole().then((d) => { gsc = d; }, (e) => { gscError = (e as Error).message; }),
  ]);
  const [kw, plans, guides, last, spend] = await Promise.all([
    admin<KeywordRow[]>("GET", "keywords?select=keyword,category,source,searches_low,searches_high,competition,change_3m,change_yoy,trend,period&order=searches_high.desc.nullslast&limit=2000").catch(() => []),
    admin<ReportInputs["plan"][]>("GET", "research_plans?select=week,status,summary,searches,content_ideas&order=id.desc&limit=1").catch(() => []),
    admin<{ slug: string; title: string }[]>("GET", "guides?select=slug,title&status=eq.published").catch(() => []),
    admin<{ report: Report | null }[]>("GET", "weekly_reports?select=report&status=eq.done&order=id.desc&limit=1").catch(() => []),
    monthSpend().catch(() => ({ total: 0, byJob: {} })),
  ]);
  return {
    week: istDate(), ga4, ga4Error, gsc, gscError, keywords: kw.length ? keywordLines(kw) : [],
    plan: plans[0] ?? null, guides: guides.map((g) => `/guides/${g.slug}`), spend, lastActions: last[0]?.report?.actions ?? [],
  };
}

const rows = (r: Record<string, string | number>[] | null, n = 15) => (r ?? []).slice(0, n).map((x) => Object.values(x).join(" | ")).join("; ") || "none";

export function describeReport(i: ReportInputs): string {
  const g = i.ga4, s = i.gsc;
  const path = (u?: string) => (u ?? "").replace(/^https?:\/\/[^/]+/, "") || "/";
  return [
    `Report date (India): ${i.week}.`,
    g ? [
      `GA4, ${g.start} to ${g.end} (7 days), against the 7 days before: users ${g.totals.users} (${pct(g.totals.users, g.totals.prevUsers)}), sessions ${g.totals.sessions} (${pct(g.totals.sessions, g.totals.prevSessions)}), page views ${g.totals.views} (${pct(g.totals.views, g.totals.prevViews)}).`,
      `Traffic sources (channel | sessions | users): ${rows(g.channels)}`,
      `Top pages (path | views | users): ${rows(g.pages, 25)}`,
      `Our events (name | count | users): ${rows(g.events)}`,
      `Amazon button clicks by page (path | clicks): ${rows(g.clicksByPage)}`,
      `Amazon button clicks by category (category | clicks): ${g.clicksByCategory ? rows(g.clicksByCategory) : "not available"}`,
      `Top 100 category chip clicks (category | clicks): ${g.filterByCategory ? rows(g.filterByCategory) : "not available"}`,
      `Telegram / Instagram / YouTube clicks by place (event | place | clicks): ${g.socialByWhere ? rows(g.socialByWhere) : "not available"}`,
      ...g.notes.map((n) => `GA4 note: ${n}`),
    ].join("\n") : `GA4: the site's tracking is installed and collecting, but this report can't read it yet (${i.ga4Error || "GA4_PROPERTY_ID and the service account's Viewer access are not set up"}).`,
    s ? [
      `Search Console, India, ${s.start} to ${s.end} (28 days): ${s.queries.reduce((n, r) => n + r.impressions, 0)} impressions, ${s.queries.reduce((n, r) => n + r.clicks, 0)} clicks.`,
      `Searches (query | impressions | clicks | position): ${s.queries.slice().sort((a, b) => b.impressions - a.impressions).slice(0, 25).map((r) => `"${r.query}" | ${r.impressions} | ${r.clicks} | ${r.position}`).join("; ") || "none yet"}`,
      `Pages in Google search (path | impressions | clicks | CTR % | position): ${s.pages.slice().sort((a, b) => b.impressions - a.impressions).slice(0, 20).map((r) => `${path(r.page)} | ${r.impressions} | ${r.clicks} | ${r.ctr} | ${r.position}`).join("; ") || "none yet"}`,
    ].join("\n") : `Search Console: ${i.gscError ? `unavailable (${i.gscError})` : "not connected"}.`,
    ...(i.keywords.length ? i.keywords : ["Keyword data: none imported yet."]),
    i.plan ? `Latest research plan (${i.plan.week}, ${i.plan.status}): ${i.plan.summary ?? ""} Extra searches: ${(i.plan.searches ?? []).map((x) => `${x.category} "${x.keywords}"`).join("; ") || "none"}. Content ideas: ${(i.plan.content_ideas ?? []).map((x) => x.title).join("; ") || "none"}.` : "No research plan yet.",
    `Published buying guides: ${i.guides.join(", ") || "none"}.`,
    `AI spend this month: $${i.spend.total.toFixed(2)} of $${MONTHLY_BUDGET} (${Object.entries(i.spend.byJob).map(([k, v]) => `${k} $${v.toFixed(2)}`).join(", ") || "nothing logged yet"}).`,
    i.lastActions.length ? `Last week's suggested actions: ${i.lastActions.map((a) => `${a.title}${a.page ? ` (${a.page})` : ""}`).join("; ")}.` : "This is the first report.",
  ].join("\n");
}

/* 3. readable version: the code's own numbers first, then the model's report */
export function toMarkdown(r: Report, i: ReportInputs, cost: number): string {
  const t = i.ga4?.totals;
  const imp = i.gsc ? i.gsc.queries.reduce((n, x) => n + x.impressions, 0) : null;
  const clicks = i.ga4?.events.find((e) => e.eventName === "store_click")?.eventCount;
  const table = [
    t ? `| Visitors | ${t.users} | ${pct(t.users, t.prevUsers)} |` : "| Visitors | GA4 not readable yet | |",
    t && `| Page views | ${t.views} | ${pct(t.views, t.prevViews)} |`,
    clicks != null && `| Amazon button clicks (not purchases) | ${clicks} | |`,
    imp != null ? `| Google search impressions (28 days, India) | ${imp} | |` : "| Google search | Search Console not connected | |",
    `| AI spend this month | $${i.spend.total.toFixed(2)} of $${MONTHLY_BUDGET} | |`,
  ].filter(Boolean);
  const lines = [
    `# Weekly report, ${i.week}`, "", `**${r.headline}**`, "", r.summary, "",
    "| Last 7 days | Value | Change |", "|---|---|---|", ...table, "",
    `*How much to trust this:* ${r.data_quality}`, "",
  ];
  if (r.wins.length) lines.push("## What worked", ...r.wins.map((w) => `- ${w.what} *(${w.evidence})*`), "");
  if (r.problems.length) lines.push("## What needs attention", ...r.problems.map((p) => `- ${p.what} *(${p.evidence})*`), "");
  if (r.actions.length) lines.push("## Suggested actions (for you to approve)", ...r.actions.slice().sort((a, b) => a.priority - b.priority)
    .map((a, k) => `${k + 1}. **${a.title}**${a.page ? ` \`${a.page}\`` : ""} (${a.who === "you" ? "you" : a.who === "site" ? "website change" : "next research"}, ${a.effort})\n   ${a.why} *(${a.evidence})*`), "");
  if (r.watch.length) lines.push("## Watch next week", ...r.watch.map((w) => `- ${w}`), "");
  lines.push(`<sub>${MODEL}, effort medium, this report cost $${cost.toFixed(3)}. Numbers above come from GA4 and Search Console directly; the text is the model's reading of them.</sub>`);
  return lines.join("\n");
}

/* 2. the model's reading */
async function write(inputs: ReportInputs): Promise<{ report: Report; cost: number; model: string }> {
  const client = new Anthropic();
  const msg = await client.beta.messages.stream({
    model: MODEL, max_tokens: 16000, system: SYSTEM,
    betas: ["server-side-fallback-2026-07-01"], fallbacks: "default",
    output_config: { effort: "medium", format: { type: "json_schema", schema: SCHEMA } },
    messages: [{ role: "user", content: `${describeReport(inputs)}\n\nWrite this week's report.` }],
  }).finalMessage();
  const cost = await logCost("report", msg.model, msg.usage, { detail: inputs.week });
  if (msg.stop_reason === "refusal") throw new Error("report declined by the model");
  if (msg.stop_reason === "max_tokens") throw new Error("report was cut off (max_tokens)");
  const out = msg.content.find((b) => b.type === "text");
  if (!out || out.type !== "text") throw new Error("report returned no text");
  return { report: JSON.parse(out.text) as Report, cost, model: msg.model };
}

export async function runReport(opts: { dryRun?: boolean } = {}): Promise<{ status: string; markdown: string }> {
  const week = istDate();
  const over = await overBudget();
  if (over) {
    if (!opts.dryRun) await admin("POST", "weekly_reports", { week, status: "skipped", error: over }, "return=minimal").catch(() => {});
    return { status: `report skipped: ${over}`, markdown: `Weekly report skipped: ${over}.` };
  }
  const [row] = opts.dryRun ? [{ id: 0 }] : await admin<{ id: number }[]>("POST", "weekly_reports", { week, model: MODEL }, "return=representation");
  const save = (patch: Record<string, unknown>) => (opts.dryRun ? Promise.resolve() : admin("PATCH", `weekly_reports?id=eq.${row.id}`, patch, "return=minimal"));
  try {
    const inputs = await gatherReport();
    const { report, cost, model } = await write(inputs);
    const markdown = toMarkdown(report, inputs, cost);
    await save({ status: "done", model, report, markdown, inputs, cost_usd: Math.round(cost * 1e4) / 1e4 });
    return { status: `report ${opts.dryRun ? "(dry run) " : ""}done: ${report.actions.length} actions, $${cost.toFixed(3)}`, markdown };
  } catch (e) {
    await save({ status: "failed", error: (e as Error).message.slice(0, 500) }).catch(() => {});
    return { status: `report failed (${(e as Error).message})`, markdown: `Weekly report failed: ${(e as Error).message}` };
  }
}

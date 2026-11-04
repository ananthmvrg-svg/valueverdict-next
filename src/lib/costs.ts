import { admin, canWrite } from "./db";

/* What each AI call costs, and the monthly budget guard.
   Every call records its tokens in ai_costs (supabase/2026-11-keywords-reports-costs.sql). Optional jobs (weekly
   research, weekly report, guide drafts) ask overBudget() first and skip once this month (IST) reaches SOFT_LIMIT;
   the daily picks always run (they are the site, about $0.04 a day). The hard stop is the monthly spend limit in
   the Anthropic Console (Settings → Limits), set to MONTHLY_BUDGET. */

export const MONTHLY_BUDGET = 10;  /* US dollars a month */
export const SOFT_LIMIT = 8;       /* optional jobs stop here, so the picks never hit the Console's hard limit */

/* list prices in US dollars per million tokens (Claude API, checked Nov 2026); Batch API = half price.
   Cache writes are billed at 1.25x input, cache reads at the listed rate; web search at $10 per 1,000 searches. */
const PRICES: Record<string, { input: number; output: number; cacheRead: number }> = {
  "claude-opus-5-5": { input: 4, output: 20, cacheRead: 0.2 },
  "claude-sonnet-5-5": { input: 2, output: 10, cacheRead: 0.2 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5, cacheRead: 0.01 },
};
const WEB_SEARCH = 10 / 1000;

export type Job = "picks" | "research" | "report" | "guide";
/* the usage block of a Messages API response (the fields we price) */
export type Usage = {
  input_tokens?: number | null; output_tokens?: number | null;
  cache_read_input_tokens?: number | null; cache_creation_input_tokens?: number | null;
  server_tool_use?: { web_search_requests?: number | null } | null;
};

export function costOf(model: string, u: Usage, batch = false): number {
  /* a fallback model's id can carry a suffix; price by the family it starts with, unknown models as Opus */
  const p = PRICES[Object.keys(PRICES).find((k) => model.startsWith(k)) ?? "claude-opus-5-5"];
  const tokens = ((u.input_tokens ?? 0) * p.input + (u.cache_creation_input_tokens ?? 0) * p.input * 1.25
    + (u.cache_read_input_tokens ?? 0) * p.cacheRead + (u.output_tokens ?? 0) * p.output) / 1e6;
  return (batch ? tokens / 2 : tokens) + (u.server_tool_use?.web_search_requests ?? 0) * WEB_SEARCH;
}

/* adds up several responses' usage (a research run is a few calls) */
export function addUsage(...all: Usage[]): Usage {
  const n = (f: (u: Usage) => number | null | undefined) => all.reduce((s, u) => s + (f(u) ?? 0), 0);
  return {
    input_tokens: n((u) => u.input_tokens), output_tokens: n((u) => u.output_tokens),
    cache_read_input_tokens: n((u) => u.cache_read_input_tokens), cache_creation_input_tokens: n((u) => u.cache_creation_input_tokens),
    server_tool_use: { web_search_requests: n((u) => u.server_tool_use?.web_search_requests) },
  };
}

/* records one call (or one job's calls added together); never throws, a missing log must not stop the job */
export async function logCost(job: Job, model: string, u: Usage, opts: { batch?: boolean; detail?: string } = {}): Promise<number> {
  const cost = costOf(model, u, opts.batch);
  if (!canWrite()) return cost;
  await admin("POST", "ai_costs", {
    job, model, batch: Boolean(opts.batch), cost_usd: Math.round(cost * 1e4) / 1e4, detail: opts.detail?.slice(0, 300) ?? null,
    input_tokens: u.input_tokens ?? 0, output_tokens: u.output_tokens ?? 0,
    cache_read: u.cache_read_input_tokens ?? 0, cache_write: u.cache_creation_input_tokens ?? 0,
    web_searches: u.server_tool_use?.web_search_requests ?? 0,
  }, "return=minimal").catch((e) => console.warn(`cost log failed: ${(e as Error).message}`));
  return cost;
}

/* the first moment of this month in India, as an ISO time */
export function monthStart(now = new Date()): string {
  const ist = new Date(now.getTime() + 5.5 * 36e5);
  return new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), 1) - 5.5 * 36e5).toISOString();
}

export async function monthSpend(): Promise<{ total: number; byJob: Record<string, number> }> {
  const rows = await admin<{ job: string; cost_usd: number }[]>("GET", `ai_costs?select=job,cost_usd&at=gte.${encodeURIComponent(monthStart())}`);
  const byJob: Record<string, number> = {};
  for (const r of rows) byJob[r.job] = (byJob[r.job] ?? 0) + Number(r.cost_usd);
  return { total: Object.values(byJob).reduce((a, b) => a + b, 0), byJob };
}

/* null = go ahead; otherwise why an optional job is skipped. If the log can't be read, the job goes ahead
   (the Console's hard limit still protects the budget). */
export async function overBudget(): Promise<string | null> {
  try {
    const { total } = await monthSpend();
    return total >= SOFT_LIMIT ? `this month's AI spend is $${total.toFixed(2)}, at the $${SOFT_LIMIT} limit for optional jobs` : null;
  } catch { return null; }
}

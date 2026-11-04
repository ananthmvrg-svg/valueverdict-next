import { googleToken, serviceKey } from "./google";

/* Google Search Console data for the weekly research (lib/research.ts), read-only.
   Signs in as the service account (lib/google.ts), added in Search Console as a Restricted user.
   India only, last 28 days with data (Search Console runs ~3 days behind). */

export type GscRow = { query?: string; page?: string; clicks: number; impressions: number; ctr: number; position: number };
export type GscData = { site: string; start: string; end: string; queries: GscRow[]; pages: GscRow[]; pairs: GscRow[] };

const API = "https://www.googleapis.com/webmasters/v3";
const day = (offset: number) => new Date(Date.now() - offset * 864e5).toISOString().slice(0, 10);

/* the Search Console property for valueverdict.in (domain or URL-prefix property, whichever was shared) */
async function siteUrl(tok: string): Promise<string> {
  const r = await fetch(`${API}/sites`, { headers: { Authorization: `Bearer ${tok}` } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Search Console sites: ${r.status}`);
  const sites = ((j.siteEntry ?? []) as { siteUrl: string }[]).map((s) => s.siteUrl).filter((u) => /valueverdict\.in/.test(u));
  if (!sites.length) throw new Error("the service account has no access to valueverdict.in in Search Console (add it under Users and permissions)");
  return sites.find((u) => u.startsWith("sc-domain:")) ?? sites[0];
}

async function query(tok: string, site: string, dimensions: string[], start: string, end: string, rowLimit: number): Promise<GscRow[]> {
  const r = await fetch(`${API}/sites/${encodeURIComponent(site)}/searchAnalytics/query`, {
    method: "POST", headers: { Authorization: `Bearer ${tok}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      startDate: start, endDate: end, dimensions, rowLimit, type: "web",
      dimensionFilterGroups: [{ filters: [{ dimension: "country", operator: "equals", expression: "ind" }] }],
    }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Search Console query: ${r.status} ${j.error?.message ?? ""}`.trim());
  return ((j.rows ?? []) as { keys: string[]; clicks: number; impressions: number; ctr: number; position: number }[]).map((x) => ({
    ...Object.fromEntries(dimensions.map((d, i) => [d, x.keys[i]])),
    clicks: x.clicks, impressions: x.impressions, ctr: Math.round(x.ctr * 1000) / 10, position: Math.round(x.position * 10) / 10,
  }));
}

/* null when no key is configured; throws when a configured key doesn't work, so the run reports it */
export async function searchConsole(): Promise<GscData | null> {
  const k = serviceKey();
  if (!k) return null;
  const tok = await googleToken(k, "https://www.googleapis.com/auth/webmasters.readonly");
  const site = await siteUrl(tok);
  const start = day(31), end = day(3);
  const [queries, pages, pairs] = await Promise.all([
    query(tok, site, ["query"], start, end, 100),
    query(tok, site, ["page"], start, end, 100),
    query(tok, site, ["query", "page"], start, end, 250),
  ]);
  return { site, start, end, queries, pages, pairs };
}

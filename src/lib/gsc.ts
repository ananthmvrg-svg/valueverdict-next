import { createSign } from "node:crypto";
import { readFileSync } from "node:fs";

/* Google Search Console data for the weekly research (lib/research.ts), read-only.
   Signs in as the service account (added in Search Console as a Restricted user) with its JSON key:
   GSC_SERVICE_ACCOUNT_JSON = the key file's contents (GitHub secret), or GSC_SERVICE_ACCOUNT_FILE = its path (local).
   India only, last 28 days with data (Search Console runs ~3 days behind). */

type Key = { client_email: string; private_key: string };
export type GscRow = { query?: string; page?: string; clicks: number; impressions: number; ctr: number; position: number };
export type GscData = { site: string; start: string; end: string; queries: GscRow[]; pages: GscRow[]; pairs: GscRow[] };

const API = "https://www.googleapis.com/webmasters/v3";
const b64url = (s: string | Buffer) => Buffer.from(s).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
const day = (offset: number) => new Date(Date.now() - offset * 864e5).toISOString().slice(0, 10);

function key(): Key | null {
  const raw = process.env.GSC_SERVICE_ACCOUNT_JSON || (process.env.GSC_SERVICE_ACCOUNT_FILE ? readFileSync(process.env.GSC_SERVICE_ACCOUNT_FILE, "utf8") : "");
  if (!raw.trim()) return null;
  const k = JSON.parse(raw) as Key;
  if (!k.client_email || !k.private_key) throw new Error("Search Console key is missing client_email or private_key");
  return k;
}

/* OAuth for service accounts: a signed JWT exchanged for an access token */
async function accessToken(k: Key): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const head = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(JSON.stringify({ iss: k.client_email, scope: "https://www.googleapis.com/auth/webmasters.readonly", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 }));
  const sig = b64url(createSign("RSA-SHA256").update(`${head}.${claim}`).sign(k.private_key));
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${head}.${claim}.${sig}` }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw new Error(`Search Console sign-in failed: ${r.status} ${j.error ?? ""}`.trim());
  return j.access_token as string;
}

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
  const k = key();
  if (!k) return null;
  const tok = await accessToken(k);
  const site = await siteUrl(tok);
  const start = day(31), end = day(3);
  const [queries, pages, pairs] = await Promise.all([
    query(tok, site, ["query"], start, end, 100),
    query(tok, site, ["page"], start, end, 100),
    query(tok, site, ["query", "page"], start, end, 250),
  ]);
  return { site, start, end, queries, pages, pairs };
}

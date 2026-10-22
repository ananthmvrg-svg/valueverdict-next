import { connection } from "next/server";
import { select } from "@/lib/db";

/* Live Amazon deals for the "Amazon Finds" page, from the Amazon Creators API.
   The page calls /api/amazon-deals; this runs on the server so the keys stay secret.

   Netlify → Site configuration → Environment variables (locally: .env.local):
     AMAZON_CREDENTIAL_ID      from Associates Central → Tools → Creators API → your app
     AMAZON_CREDENTIAL_SECRET  same place (never put these in index.html)
     AMAZON_PARTNER_TAG        optional, defaults to valueverdic03-21
     AMAZON_TOKEN_URL          optional, India (credential version 3.2) uses the default below

   What to search comes from the "amazon_deal_searches" table in Supabase (columns below), so deals
   can be changed without code. If the table can't be read or is empty, DEFAULT_SECTIONS is used.
     section | keywords | search_index | min_saving_percent | max_price | sort_by | sort_order | active
   Results are cached on Netlify's CDN for an hour, so Amazon is asked at most about once an hour. */

const SEARCH_URL = "https://creatorsapi.amazon/catalog/v1/searchItems";
const TOKEN_URL = process.env.AMAZON_TOKEN_URL || "https://api.amazon.co.uk/auth/o2/token";
const MARKETPLACE = "www.amazon.in";
const PARTNER_TAG = process.env.AMAZON_PARTNER_TAG || "valueverdic03-21";
const MAX_SECTIONS = 6; /* each section is one API call; calls are spaced ~1s apart for Amazon's rate limit */
const RESOURCES = ["images.primary.large", "itemInfo.title", "offersV2.listings.price", "offersV2.listings.dealDetails", "offersV2.listings.availability"];

type Section = Record<string, string>;
const DEFAULT_SECTIONS: Section[] = [
  { section: "Kitchen deals", keywords: "kitchen appliances", search_index: "HomeAndKitchen", min_saving_percent: "30" },
  { section: "Gadget deals", keywords: "gadgets", search_index: "Electronics", min_saving_percent: "30" },
  { section: "Home deals", keywords: "home essentials", search_index: "HomeAndKitchen", min_saving_percent: "40" },
];

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const isOn = (v?: string) => String(v ?? "").trim().toUpperCase() !== "FALSE";

async function sections(): Promise<Section[]> {
  try {
    const rows = (await select("amazon_deal_searches", "order=id")).filter(x => x.section && x.keywords && isOn(x.active));
    if (rows.length) return rows.sort((a: Section, b: Section) => (parseFloat(a.sort_order) || 999) - (parseFloat(b.sort_order) || 999));
  } catch (e) { console.warn("amazon_deal_searches not loaded", e); }
  return DEFAULT_SECTIONS;
}

/* OAuth token is valid ~1 hour; reuse it while this function instance stays warm */
let token: string | null = null, tokenUntil = 0;
async function getToken(): Promise<string> {
  if (token && Date.now() < tokenUntil) return token;
  const r = await fetch(TOKEN_URL, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ grant_type: "client_credentials", client_id: process.env.AMAZON_CREDENTIAL_ID, client_secret: process.env.AMAZON_CREDENTIAL_SECRET, scope: "creatorsapi::default" }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw new Error(`token ${r.status} ${j.error || ""} ${j.error_description || ""}`.trim());
  const t: string = j.access_token;
  token = t; tokenUntil = Date.now() + ((j.expires_in || 3600) - 120) * 1000;
  return t;
}

async function search(s: Section) {
  const body: Record<string, unknown> = { partnerTag: PARTNER_TAG, marketplace: MARKETPLACE, keywords: s.keywords, itemCount: 10, resources: RESOURCES, availability: "Available" };
  if (s.search_index) body.searchIndex = s.search_index;
  const pct = parseInt(s.min_saving_percent, 10); if (pct > 0 && pct < 100) body.minSavingPercent = pct;
  /* maxPrice is in the lowest currency unit (paise), like PA-API: ₹999 → 99900 */
  const max = parseFloat(String(s.max_price || "").replace(/[^\d.]/g, "")); if (max > 0) body.maxPrice = Math.round(max * 100);
  if (s.sort_by) body.sortBy = s.sort_by;
  const r = await fetch(SEARCH_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${await getToken()}`, "Content-Type": "application/json", "x-marketplace": MARKETPLACE },
    body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`search ${r.status} ${(j.errors?.[0]?.code || j.code || j.message || "").toString()}`.trim());
  return ((j.searchResult?.items || []) as unknown[]).map(item);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Amazon's response shape
function item(it: any) {
  const l = it.offersV2?.listings?.[0] || {}, p = l.price || {};
  const deal = l.dealDetails;
  return {
    asin: it.asin,
    title: it.itemInfo?.title?.displayValue || "",
    image: it.images?.primary?.large?.url || it.images?.primary?.medium?.url || "",
    url: it.detailPageURL || `https://www.amazon.in/dp/${it.asin}?tag=${PARTNER_TAG}`,
    price: p.money?.amount ?? null,
    was: p.savingBasis?.money?.amount ?? (p.money?.amount != null && p.savings?.money?.amount != null ? p.money.amount + p.savings.money.amount : null),
    off: p.savings?.percentage ?? null,
    deal: deal ? (typeof deal.badge === "string" && deal.badge) || "Deal" : "",
  };
}

const json = (data: unknown, status: number, cdnSeconds: number) => new Response(JSON.stringify(data), {
  status,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "public, max-age=300",
    /* Amazon's rules: prices shown must be refreshed within 24h, so cap staleness at ~2h */
    "Netlify-CDN-Cache-Control": `public, durable, s-maxage=${cdnSeconds}, stale-while-revalidate=${cdnSeconds}`,
  },
});

export async function GET() {
  await connection(); /* always run at request time, never at build */
  if (!process.env.AMAZON_CREDENTIAL_ID || !process.env.AMAZON_CREDENTIAL_SECRET) return json({ error: "not_configured", sections: [] }, 503, 60);
  const out: { title: string; items: ReturnType<typeof item>[] }[] = [], seen = new Set<string>(), errors: string[] = [];
  const list = (await sections()).slice(0, MAX_SECTIONS);
  for (let i = 0; i < list.length; i++) {
    if (i) await sleep(1100);
    try {
      const items = (await search(list[i])).filter((x) => x.asin && x.title && !seen.has(x.asin) && seen.add(x.asin));
      if (items.length) out.push({ title: list[i].section, items });
    } catch (e) { const msg = (e as Error).message; console.error(list[i].section, msg); errors.push(msg); if (/^token/.test(msg)) break; }
  }
  if (!out.length) return json({ error: errors[0] || "no_results", sections: [] }, errors.length ? 502 : 200, 300);
  return json({ updated: new Date().toISOString(), sections: out }, 200, 3600);
}

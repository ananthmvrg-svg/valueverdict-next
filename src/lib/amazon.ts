import { select } from "./db";
import { isOn, num, type Row } from "./products";

/* Live Amazon deals from the Amazon Creators API (server only, keys stay secret).

   Netlify → Site configuration → Environment variables (locally: .env.local):
     AMAZON_CREDENTIAL_ID      from Associates Central → Tools → Creators API → your app
     AMAZON_CREDENTIAL_SECRET  same place
     AMAZON_PARTNER_TAG        optional, defaults to valueverdic03-21
     AMAZON_TOKEN_URL          optional, India (credential version 3.2) uses the default below

   What to search comes from the "amazon_deal_searches" table in Supabase, one row per section:
     category_id | section | keywords | search_index | min_saving_percent | min_price | max_price (₹)
     | min_rating (1–4, Amazon returns ratings above it) | brand | must_include (see titleOk) | sort_by | sort_order | active
   Each category page (Amazon Finds included) shows only its own rows. A budget page (e.g. /refrigerators/under-25k)
   runs the same searches limited to that budget: its price band, or for size budgets like "32″ TVs" its name
   added to the search words. */

const SEARCH_URL = "https://creatorsapi.amazon/catalog/v1/searchItems";
const TOKEN_URL = process.env.AMAZON_TOKEN_URL || "https://api.amazon.co.uk/auth/o2/token";
const MARKETPLACE = "www.amazon.in";
const PARTNER_TAG = process.env.AMAZON_PARTNER_TAG || "valueverdic03-21";
/* each section is one API call, spaced ~1s apart for Amazon's 1 request/second limit */
const MAX_SECTIONS = 4;
/* first load fetches several pages per section (10 deals each) so search and filters have more to work with;
   at most CALLS_PER_LOAD Amazon calls in total, e.g. 1 section × 3 pages or 3 sections × 2 pages */
const PAGES_PER_LOAD = 3, CALLS_PER_LOAD = 6;
const RESOURCES = [
  "images.primary.large", "itemInfo.title", "itemInfo.features", "itemInfo.byLineInfo",
  "offersV2.listings.price", "offersV2.listings.dealDetails", "offersV2.listings.availability",
];

export type Deal = ReturnType<typeof item>;
export type DealSection = { id: string; title: string; category: string; items: Deal[]; more: boolean; page: number };
export const MAX_PAGE = 10; /* Amazon returns at most 10 pages of 10 */

export const amazonConfigured = () => Boolean(process.env.AMAZON_CREDENTIAL_ID && process.env.AMAZON_CREDENTIAL_SECRET);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const rupees = (v?: string) => { const n = num(String(v || "").replace(/[^\d.]/g, "")); return n && n > 0 ? n : null; };

/* "₹1 Lakh" → 100000, "₹50,000" → 50000 */
const amountIn = (t: string) => {
  const m = t.replace(/,/g, "").match(/(\d+(?:\.\d+)?)\s*(lakh|l\b|k\b)?/i);
  if (!m) return null;
  const unit = (m[2] || "").toLowerCase();
  return Number(m[1]) * (unit.startsWith("l") ? 100000 : unit === "k" ? 1000 : 1);
};

/* a budget page's limits: price band from the budgets' max_price, or extra search words for size budgets */
type Budget = { lo: number | null; hi: number | null; words: string };
async function budgetFor(categoryId: string, subSlug: string): Promise<Budget | null> {
  const subs = (await select("subcategories", `category_id=eq.${encodeURIComponent(categoryId)}`)).filter((x) => isOn(x.active));
  const sub = subs.find((x) => x.slug === subSlug);
  if (!sub) return null;
  const maxes = subs.map((x) => rupees(x.max_price)).filter((n): n is number => n != null);
  const hi = rupees(sub.max_price);
  if (hi) return { lo: Math.max(0, ...maxes.filter((n) => n < hi)) || null, hi, words: "" };
  if (/^above-/.test(sub.slug)) return { lo: amountIn(sub.name) ?? (Math.max(0, ...maxes) || null), hi: null, words: "" };
  return { lo: null, hi: null, words: sub.name.replace(/[″"]/g, " inch").replace(/\btvs?\b/gi, "").replace(/\s+/g, " ").trim() };
}

const limit = (r: Row, b: Budget | null): Row => !b ? r : {
  ...r,
  min_price: String(Math.max(rupees(r.min_price) || 0, b.lo || 0) || ""),
  max_price: String(b.hi ?? r.max_price ?? ""),
  keywords: b.words ? `${r.keywords} ${b.words}` : r.keywords,
  /* size budgets ("32″ TVs"): Amazon also returns other sizes, so the title must carry the number */
  title_has: (b.words.match(/\d+/) || [""])[0],
};

/* the active searches of one category (by its page slug), limited to a budget page when given */
async function searchesFor(slug: string, subSlug?: string): Promise<(Row & { slug: string })[]> {
  const cat = (await select("categories", `slug=eq.${encodeURIComponent(slug)}`)).find((c) => isOn(c.active));
  if (!cat) return [];
  const [rows, budget] = await Promise.all([
    select("amazon_deal_searches", `active=eq.true&category_id=eq.${encodeURIComponent(cat.category_id)}&order=sort_order.asc.nullslast,id.asc`),
    subSlug ? budgetFor(cat.category_id, subSlug) : null,
  ]);
  if (subSlug && !budget) return [];
  return rows.filter((r) => r.section && r.keywords).slice(0, MAX_SECTIONS).map((r) => ({ ...limit(r, budget), slug }));
}

/* "must_include" column: words separated by |, the title needs one of them; "!word" = the title must not have it.
   Whole words only, case-insensitive: "refrigerator|!for refrigerator|!stabilizer" */
const words = (t: string) => ` ${t.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `;
function titleOk(title: string, rule?: string) {
  const parts = String(rule || "").split("|").map((w) => w.trim()).filter(Boolean);
  if (!parts.length) return true;
  const t = words(title), has = (w: string) => t.includes(words(w));
  const need = parts.filter((w) => !w.startsWith("!")), not = parts.filter((w) => w.startsWith("!")).map((w) => w.slice(1));
  return (!need.length || need.some(has)) && !not.some(has);
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

async function search(s: Row, page = 1) {
  const body: Record<string, unknown> = { partnerTag: PARTNER_TAG, marketplace: MARKETPLACE, keywords: s.keywords, itemCount: 10, itemPage: page, resources: RESOURCES, availability: "Available", condition: "New" };
  if (s.search_index) body.searchIndex = s.search_index;
  if (s.brand) body.brand = s.brand;
  if (s.sort_by) body.sortBy = s.sort_by;
  const pct = num(s.min_saving_percent); if (pct && pct > 0 && pct < 100) body.minSavingPercent = Math.round(pct);
  const stars = num(s.min_rating); if (stars && stars >= 1 && stars <= 4) body.minReviewsRating = Math.round(stars);
  /* prices go to Amazon in paise: ₹999 → 99900 */
  const min = rupees(s.min_price); if (min) body.minPrice = Math.round(min * 100);
  const max = rupees(s.max_price); if (max) body.maxPrice = Math.round(max * 100);
  const r = await fetch(SEARCH_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${await getToken()}`, "Content-Type": "application/json", "x-marketplace": MARKETPLACE },
    body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`search ${r.status} ${(j.errors?.[0]?.code || j.code || j.message || "").toString()}`.trim());
  /* Amazon's price filters match any offer; keep only items whose shown price is inside them */
  const raw = (j.searchResult?.items || []) as unknown[];
  const inside = (x: Deal) => x.price == null || ((!min || x.price >= min) && (!max || x.price <= max));
  const sized = (x: Deal) => !s.title_has || new RegExp(`(^|[^0-9])${s.title_has}([^0-9]|$)`).test(x.title);
  /* a full page of 10 means Amazon may have more */
  return { items: raw.map(item).filter((x) => x.asin && x.title && inside(x) && sized(x) && titleOk(x.title, s.must_include)), more: raw.length === 10 && page < MAX_PAGE };
}

/* Amazon text sometimes uses "𝐁𝐨𝐥𝐝" math letters or full-width characters, which render in a different font: make it plain */
const plain = (t: unknown) => String(t ?? "").normalize("NFKC").replace(/\s+/g, " ").trim();

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Amazon's response shape
function item(it: any) {
  const l = it.offersV2?.listings?.[0] || {}, p = l.price || {};
  const deal = l.dealDetails, stock = l.availability || {};
  /* "About this item" bullets, first two, shortened for the card */
  const features = ((it.itemInfo?.features?.displayValues || []) as string[])
    .map(plain).filter(Boolean).slice(0, 2)
    .map((f) => (f.length > 140 ? f.slice(0, 137).replace(/\s+\S*$/, "") + "…" : f));
  return {
    asin: it.asin as string,
    title: plain(it.itemInfo?.title?.displayValue),
    brand: plain(it.itemInfo?.byLineInfo?.brand?.displayValue),
    features,
    image: (it.images?.primary?.large?.url || it.images?.primary?.medium?.url || "") as string,
    url: (it.detailPageURL || `https://www.amazon.in/dp/${it.asin}?tag=${PARTNER_TAG}`) as string,
    price: (p.money?.amount ?? null) as number | null,
    was: (p.savingBasis?.money?.amount ?? (p.money?.amount != null && p.savings?.money?.amount != null ? p.money.amount + p.savings.money.amount : null)) as number | null,
    off: (p.savings?.percentage ?? null) as number | null,
    deal: deal ? plain(deal.badge) || "Deal" : "",
    /* deal timer and progress, Prime-only access, low-stock note */
    dealEnds: (deal?.endTime || null) as string | null,
    claimed: deal?.percentClaimed != null && !isNaN(Number(deal.percentClaimed)) ? Number(deal.percentClaimed) : null,
    primeOnly: Boolean(deal?.accessType && deal.accessType !== "ALL"),
    lowStock: (stock.type === "IN_STOCK_SCARCE" && stock.message ? stock.message : "") as string,
  };
}

/* Live-deal sections for one category page (its slug), or one of its budget pages (subSlug). */
export async function getDeals(slug: string, subSlug?: string): Promise<{ sections: DealSection[]; errors: string[] }> {
  const out: DealSection[] = [], seen = new Set<string>(), errors: string[] = [];
  let list: (Row & { slug: string })[] = [];
  try { list = await searchesFor(slug, subSlug); } catch (e) { errors.push(`searches not loaded: ${(e as Error).message}`); }
  const pages = Math.max(1, Math.min(PAGES_PER_LOAD, Math.floor(CALLS_PER_LOAD / Math.max(1, list.length))));
  let calls = 0, stop = false;
  for (let i = 0; i < list.length && !stop; i++) {
    const items: Deal[] = [];
    let page = 0, more = true;
    while (more && page < pages) {
      if (calls++) await sleep(1100);
      try {
        const r = await search(list[i], ++page);
        items.push(...r.items.filter((x) => !seen.has(x.asin) && seen.add(x.asin)));
        more = r.more;
      } catch (e) {
        const msg = (e as Error).message; console.error(list[i].section, msg); errors.push(msg);
        more = false;
        if (/^token|^search 429/.test(msg)) stop = true; /* bad keys or over the rate limit: stop spending calls */
      }
    }
    if (items.length) out.push({ id: list[i].id, title: list[i].section, category: list[i].slug, items, more, page });
  }
  return { sections: out, errors };
}

/* One more page of a single section ("Show more deals"); page 2–10, limited to a budget page when given. */
export async function getDealPage(id: string, page: number, subSlug?: string): Promise<{ items: Deal[]; more: boolean }> {
  const rows = await select("amazon_deal_searches", `id=eq.${encodeURIComponent(id)}&active=eq.true`);
  if (!rows.length) return { items: [], more: false };
  const budget = subSlug ? await budgetFor(rows[0].category_id, subSlug) : null;
  if (subSlug && !budget) return { items: [], more: false };
  return search(limit(rows[0], budget), page);
}

import { googleToken, serviceKey } from "./google";

/* Google Analytics 4 numbers for the weekly report (lib/report.ts), read-only, through the GA4 Data API.
   Needs: GA4_PROPERTY_ID (the numeric property ID: GA4 → Admin → Property details), the service account
   (lib/google.ts) added to the property as a Viewer, and the "Google Analytics Data API" enabled in its
   Google Cloud project. Last 7 complete days, compared with the 7 before.
   Per-category numbers use our event parameters (item_category, where); GA4 only reports a parameter once it is
   registered as a custom dimension (Admin → Custom definitions), so until then those parts come back empty
   with a note, and the rest of the report still runs. */

const API = "https://analyticsdata.googleapis.com/v1beta";
type Row = Record<string, string | number>;
export type Ga4Data = {
  start: string; end: string;
  totals: { users: number; sessions: number; views: number; prevUsers: number; prevSessions: number; prevViews: number };
  pages: Row[];          /* page path, views, users */
  channels: Row[];       /* where visitors came from: Organic Search, Direct, Social… */
  events: Row[];         /* our events (store_click, telegram_join_click…) and how often */
  clicksByPage: Row[];   /* Amazon button clicks per page */
  clicksByCategory: Row[] | null;  /* Amazon clicks per item_category (null = custom dimension not registered) */
  filterByCategory: Row[] | null;  /* Top 100 category chip clicks per item_category */
  socialByWhere: Row[] | null;     /* Telegram / Instagram / YouTube clicks per place (header, bar, popup, footer) */
  notes: string[];
};

const OUR_EVENTS = ["store_click", "category_filter_click", "telegram_join_click", "instagram_follow_click", "youtube_subscribe_click",
  "social_click", "telegram_popup_view", "telegram_popup_close", "compare_add", "compare_open", "deal_filter", "deal_search", "see_all_deals"];

type Req = { dimensions?: string[]; metrics: string[]; events?: string[]; limit?: number; range?: [string, string] };

async function report(tok: string, property: string, q: Req): Promise<Row[]> {
  const [startDate, endDate] = q.range ?? ["7daysAgo", "yesterday"];
  const r = await fetch(`${API}/properties/${property}:runReport`, {
    method: "POST", headers: { Authorization: `Bearer ${tok}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      dateRanges: [{ startDate, endDate }],
      dimensions: (q.dimensions ?? []).map((name) => ({ name })), metrics: q.metrics.map((name) => ({ name })),
      ...(q.events ? { dimensionFilter: { filter: { fieldName: "eventName", inListFilter: { values: q.events } } } } : {}),
      ...(q.metrics.length ? { orderBys: [{ metric: { metricName: q.metrics[0] }, desc: true }] } : {}),
      limit: q.limit ?? 50,
    }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`GA4 report: ${r.status} ${j.error?.message ?? ""}`.trim());
  const dims = q.dimensions ?? [];
  return ((j.rows ?? []) as { dimensionValues?: { value: string }[]; metricValues: { value: string }[] }[]).map((x) => ({
    ...Object.fromEntries(dims.map((d, i) => [d.replace(/^customEvent:/, ""), x.dimensionValues?.[i]?.value ?? ""])),
    ...Object.fromEntries(q.metrics.map((m, i) => [m, Number(x.metricValues[i]?.value ?? 0)])),
  }));
}

/* null when GA4 isn't configured; throws when a configured property can't be read, so the report says why */
export async function analytics(): Promise<Ga4Data | null> {
  const property = process.env.GA4_PROPERTY_ID?.trim();
  const k = serviceKey();
  if (!property || !k) return null;
  const tok = await googleToken(k, "https://www.googleapis.com/auth/analytics.readonly");
  const run = (q: Req) => report(tok, property, q);
  const notes: string[] = [];
  /* a custom-dimension report fails until the dimension is registered; keep going without it */
  const custom = async (q: Req, name: string) => {
    try { return await run(q); } catch (e) {
      notes.push(`${name} not available (${(e as Error).message.slice(0, 120)}); register its parameter as a custom dimension in GA4`);
      return null;
    }
  };
  const totalsOf = async (range: [string, string]) => (await run({ metrics: ["activeUsers", "sessions", "screenPageViews"], range }))[0] ?? {};
  const [now, prev, pages, channels, events, clicksByPage, clicksByCategory, filterByCategory, socialByWhere] = await Promise.all([
    totalsOf(["7daysAgo", "yesterday"]), totalsOf(["14daysAgo", "8daysAgo"]),
    run({ dimensions: ["pagePath"], metrics: ["screenPageViews", "activeUsers"], limit: 40 }),
    run({ dimensions: ["sessionDefaultChannelGroup"], metrics: ["sessions", "activeUsers"], limit: 15 }),
    run({ dimensions: ["eventName"], metrics: ["eventCount", "totalUsers"], events: OUR_EVENTS }),
    run({ dimensions: ["pagePath"], metrics: ["eventCount"], events: ["store_click"], limit: 30 }),
    custom({ dimensions: ["customEvent:item_category"], metrics: ["eventCount"], events: ["store_click"] }, "Amazon clicks by category (item_category)"),
    custom({ dimensions: ["customEvent:item_category"], metrics: ["eventCount"], events: ["category_filter_click"] }, "Top 100 category chips (item_category)"),
    custom({ dimensions: ["eventName", "customEvent:where"], metrics: ["eventCount"], events: ["telegram_join_click", "instagram_follow_click", "youtube_subscribe_click"] }, "Social clicks by place (where)"),
  ]);
  const n = (r: Row, k: string) => Number(r[k] ?? 0);
  return {
    start: new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10), end: new Date(Date.now() - 864e5).toISOString().slice(0, 10),
    totals: {
      users: n(now, "activeUsers"), sessions: n(now, "sessions"), views: n(now, "screenPageViews"),
      prevUsers: n(prev, "activeUsers"), prevSessions: n(prev, "sessions"), prevViews: n(prev, "screenPageViews"),
    },
    pages, channels, events, clicksByPage, clicksByCategory, filterByCategory, socialByWhere, notes,
  };
}

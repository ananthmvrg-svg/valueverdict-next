import { cacheLife, cacheTag } from "next/cache";
import { SHEET_ID, SHOW_FLIPKART } from "./config";

import { isOn, num, safeUrl, type Catalog, type Category, type Product, type Row, type Subcategory } from "./products";
export * from "./products";

const ord = (a: Row, b: Row) => (num(a.sort_order) ?? 999) - (num(b.sort_order) ?? 999);

function parseCSV(text: string): Row[] {
  const rows: string[][] = [];
  let row: string[] = [], f = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c == '"') { if (text[i + 1] == '"') { f += '"'; i++; } else q = false; } else f += c;
    } else if (c == '"') q = true;
    else if (c == ",") { row.push(f); f = ""; }
    else if (c == "\n" || c == "\r") { if (c == "\r" && text[i + 1] == "\n") i++; row.push(f); rows.push(row); row = []; f = ""; }
    else f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  const h = (rows.shift() || []).map((x) => x.trim());
  return rows.filter((r) => r.some((x) => x.trim())).map((r) => Object.fromEntries(h.map((k, i) => [k, (r[i] || "").trim()])));
}

async function loadTab(name: string): Promise<Row[]> {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&headers=1&sheet=${encodeURIComponent(name)}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Sheet tab ${name}: HTTP ${r.status}`);
  return parseCSV(await r.text());
}

/* Products "expires" column (optional, for short-lived deals): hidden after the end of that day, India time.
   2026-10-25 or 25/10/2026. Empty or unreadable = keep showing. */
export function notExpired(v: string | undefined, now: number) {
  v = String(v || "").trim();
  if (!v) return true;
  let m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/), y: string, mo: string, d: string;
  if (m) [, y, mo, d] = m;
  else if ((m = v.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/))) [, d, mo, y] = m;
  else return true;
  return now <= Date.parse(`${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}T23:59:59+05:30`);
}

/* The whole catalog, cached for an hour (tag "catalog" to refresh it on demand).
   Phase 1 reads the Google Sheet; the database replaces only this function. */
export async function getCatalog(): Promise<Catalog> {
  "use cache";
  cacheLife("hours");
  cacheTag("catalog");
  const [c, s, p] = await Promise.all(["Categories", "Subcategories", "Products"].map(loadTab));
  const now = Date.now();
  const cats = c.filter((x) => x.category_id && isOn(x.active)).sort(ord) as Category[];
  const catIds = new Set(cats.map((x) => x.category_id));
  const subs = s.filter((x) => x.subcategory_id && isOn(x.active) && catIds.has(x.category_id)).sort(ord) as Subcategory[];
  const subIds = new Set(subs.map((x) => x.subcategory_id));
  const prods = p.filter(
    (x) =>
      x.product_id && x.name && isOn(x.active) && subIds.has(x.subcategory_id) &&
      notExpired(x.expires, now) && (SHOW_FLIPKART || safeUrl(x.amazon_url)),
  ) as Product[];
  return { cats, subs, prods };
}


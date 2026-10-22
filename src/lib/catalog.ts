import { cacheLife, cacheTag } from "next/cache";
import { SHOW_CATALOG, SHOW_FLIPKART } from "./config";
import { select } from "./db";

import { isOn, num, safeUrl, type Catalog, type Category, type Product, type Row, type Subcategory } from "./products";
export * from "./products";

const ord = (a: Row, b: Row) => (num(a.sort_order) ?? 999) - (num(b.sort_order) ?? 999);

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
   Read from the Supabase tables; product order within a budget follows sort_order. */
export async function getCatalog(): Promise<Catalog> {
  "use cache";
  cacheLife("hours");
  cacheTag("catalog");
  const [c, s, p] = await Promise.all([
    select("categories", "order=category_id"),
    select("subcategories", "order=subcategory_id"),
    SHOW_CATALOG ? select("products", "order=product_id") : Promise.resolve([]), /* off: live Amazon deals only */
  ]);
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


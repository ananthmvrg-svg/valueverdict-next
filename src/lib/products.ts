/* Catalog types and pure helpers, safe to use in both server and browser code. */
/* One row of the sheet. Every column is optional text; helpers below interpret it. */
export type Row = Record<string, string>;
export type Category = Row & { category_id: string; name: string; slug: string };
export type Subcategory = Row & { subcategory_id: string; category_id: string; name: string; slug: string };
export type Product = Row & { product_id: string; subcategory_id: string; name: string };
export type Catalog = { cats: Category[]; subs: Subcategory[]; prods: Product[] };

export const safeUrl = (u?: string) => (/^https?:\/\//i.test(u || "") ? u! : "");
export const isOn = (v?: string) => String(v ?? "").trim().toUpperCase() !== "FALSE";
export const isYes = (v?: string) => String(v ?? "").trim().toUpperCase() === "TRUE";
export const num = (v?: string) => {
  const n = parseFloat(v ?? "");
  return isNaN(n) ? null : n;
};
export const subsOf = (db: Catalog, cid: string) => db.subs.filter((s) => s.category_id === cid);
export const prodsOfSub = (db: Catalog, sid: string) => db.prods.filter((p) => p.subcategory_id === sid);
export const prodsOfCat = (db: Catalog, cid: string) => subsOf(db, cid).flatMap((s) => prodsOfSub(db, s.subcategory_id));

/* short_review may still carry "Best price seen: ₹24,990 on Amazon (…)." from the old price box; strip it so no price leaks */
export const reviewText = (p: Product) =>
  (p.short_review || "")
    .replace(/Best price seen:\s*₹\s?[\d,]+(?:\.\d+)?\s*on\s*[A-Za-z]+\s*(?:\(\s*[^):]+?\s*:\s*₹\s?[\d,]+(?:\.\d+)?\s*off\s*\))?\.?/i, "")
    .trim();

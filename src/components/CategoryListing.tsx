"use client";
/* Search, sort, brand and type filters over the products already on the page. */
import { useMemo, useState } from "react";
import type { Category, Product, Subcategory } from "@/lib/products";
import { num } from "@/lib/products";
import ProductCard from "./ProductCard";

type Sorter = (a: Product, b: Product) => number;
const SORTS: Record<string, [string, Sorter]> = {
  featured: ["Featured", (a, b) => (num(a.sort_order) ?? 999) - (num(b.sort_order) ?? 999)],
  capDesc: ["Capacity: high to low", (a, b) => (num(b.capacity_l) ?? -1) - (num(a.capacity_l) ?? -1)],
  capAsc: ["Capacity: low to high", (a, b) => (num(a.capacity_l) ?? 1e9) - (num(b.capacity_l) ?? 1e9)],
  starDesc: ["Energy rating: best first", (a, b) => (num(b.star_rating) ?? -1) - (num(a.star_rating) ?? -1)],
  brand: ["Brand: A to Z", (a, b) => (a.brand || "~").localeCompare(b.brand || "~") || a.name.localeCompare(b.name)],
  name: ["Name: A to Z", (a, b) => a.name.localeCompare(b.name)],
};

export type Group = { sub: Subcategory; items: Product[] };

/* groupTitles: on a whole-category page each budget gets its own heading; on a budget page there is one group */
export default function CategoryListing({ groups, cat, groupTitles, offersBanner }: { groups: Group[]; cat: Category; groupTitles: boolean; offersBanner?: string }) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("featured");
  const [brand, setBrand] = useState("");
  const [door, setDoor] = useState("");

  const all = useMemo(() => groups.flatMap((g) => g.items), [groups]);
  const brands = useMemo(() => [...new Set(all.map((p) => p.brand).filter(Boolean))].sort(), [all]);
  const doors = useMemo(() => [...new Set(all.map((p) => p.door_type).filter(Boolean))].sort(), [all]);
  const hasCap = all.some((p) => num(p.capacity_l) != null), hasStar = all.some((p) => num(p.star_rating) != null);
  const sorts = Object.entries(SORTS).filter(([k]) => !(k.startsWith("cap") && !hasCap) && !(k === "starDesc" && !hasStar));

  const ql = q.toLowerCase();
  const keep = (p: Product) =>
    (!ql || [p.name, p.brand, p.door_type, p.capacity_l].join(" ").toLowerCase().includes(ql)) &&
    (!brand || p.brand === brand) && (!door || p.door_type === door);
  const shown = groups.map((g) => ({ ...g, items: g.items.filter(keep).sort(SORTS[sort][1]) })).filter((g) => g.items.length);
  const n = shown.reduce((t, g) => t + g.items.length, 0);

  return (
    <>
      <div className="toolbar">
        <label className="search">🔍<input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search model, brand, type…" /></label>
        <select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value)}>
          {sorts.map(([k, [label]]) => <option key={k} value={k}>{label}</option>)}
        </select>
        {brands.length > 1 && (
          <select aria-label="Brand" value={brand} onChange={(e) => setBrand(e.target.value)}>
            <option value="">All brands</option>
            {brands.map((b) => <option key={b}>{b}</option>)}
          </select>
        )}
        {doors.length > 1 && (
          <select aria-label="Type" value={door} onChange={(e) => setDoor(e.target.value)}>
            <option value="">All types</option>
            {doors.map((d) => <option key={d}>{d}</option>)}
          </select>
        )}
        <span className="result-count">{n} product{n === 1 ? "" : "s"}</span>
      </div>
      {offersBanner && <div className="offers-banner">{offersBanner}</div>}
      {n ? (
        shown.map((g) => (
          <div key={g.sub.subcategory_id}>
            {groupTitles && <div className="group-title"><h3>{g.sub.name}</h3><span>{g.items.length} picks</span></div>}
            <div className="grid">{g.items.map((p) => <ProductCard key={p.product_id} p={p} sub={g.sub} cat={cat} />)}</div>
          </div>
        ))
      ) : (
        <div className="empty">No products match. Try clearing the filters.</div>
      )}
    </>
  );
}

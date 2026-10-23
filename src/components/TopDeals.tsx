"use client";
/* Top 100 list with category filter chips (picks come from the server page). */
import { useState } from "react";
import type { DealPick } from "@/lib/picks";
import { PickGrid } from "./LiveDeals";

export default function TopDeals({ items, cats }: { items: DealPick[]; cats: { slug: string; name: string }[] }) {
  const [cat, setCat] = useState("");
  const present = cats.filter((c) => items.some((x) => x.category === c.slug));
  const shown = cat ? items.filter((x) => x.category === cat) : items;
  return (
    <>
      <div className="chips">
        <button type="button" className={`chip ${!cat ? "on" : ""}`} onClick={() => setCat("")}>All<small>{items.length}</small></button>
        {present.map((c) => (
          <button type="button" key={c.slug} className={`chip ${cat === c.slug ? "on" : ""}`} onClick={() => setCat(c.slug)}>
            {c.name}<small>{items.filter((x) => x.category === c.slug).length}</small>
          </button>
        ))}
      </div>
      <div style={{ marginTop: 18 }}><PickGrid items={shown} /></div>
    </>
  );
}

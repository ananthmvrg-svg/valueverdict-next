"use client";
/* Top 100 list with category filter chips (picks come from the server page). */
import { useState } from "react";
import type { DealPick } from "@/lib/picks";
import { PickGrid } from "./LiveDeals";
import { GuideArt, themeFor } from "./GuideArt";

export default function TopDeals({ items, cats }: { items: DealPick[]; cats: { slug: string; name: string }[] }) {
  const [cat, setCat] = useState("");
  const present = cats.filter((c) => items.some((x) => x.category === c.slug));
  /* a filtered list is numbered within its category (#1, #2…), not by its place in the overall Top 100 */
  const shown = cat ? items.filter((x) => x.category === cat).map((x, i) => ({ ...x, rank: i + 1 })) : items;
  const catName = present.find((c) => c.slug === cat)?.name;
  return (
    <>
      {/* category filter: each chip shows its category's drawing and, when selected, its colours */}
      <div className="cat-chips">
        <button type="button" className={`cat-chip ${!cat ? "on" : ""}`} aria-pressed={!cat} onClick={() => setCat("")}
          style={{ "--g-from": "#ea580c", "--g-to": "#f59e0b" } as React.CSSProperties}>
          <span className="cat-chip-art" aria-hidden="true">🔥</span>All deals<small>{items.length}</small>
        </button>
        {present.map((c) => {
          const t = themeFor(c.slug);
          return (
            <button type="button" key={c.slug} className={`cat-chip ${cat === c.slug ? "on" : ""}`} aria-pressed={cat === c.slug} onClick={() => setCat(c.slug)}
              style={{ "--g-from": t.from, "--g-to": t.to } as React.CSSProperties}>
              <span className="cat-chip-art" aria-hidden="true"><GuideArt category={c.slug} /></span>
              {c.name}<small>{items.filter((x) => x.category === c.slug).length}</small>
            </button>
          );
        })}
      </div>
      <p className="cat-chips-result" aria-live="polite">
        {catName
          ? <>Showing <b>{shown.length} {catName}</b> deals, ranked by value · <button type="button" onClick={() => setCat("")}>Show all {items.length}</button></>
          : <>Showing all <b>{items.length}</b> deals, ranked by value</>}
      </p>
      <PickGrid key={cat || "all"} items={shown} />
    </>
  );
}

import Link from "next/link";
import type { DealPick } from "@/lib/picks";

/* "Today at a glance": facts about the picks on this page, counted from their listings (lib/specs.ts),
   e.g. "Prices ₹25,999–₹44,999 · 4 of 5 are 4K · 2 QLED, 1 Mini LED". Nothing is estimated or written by AI;
   a fact is shown only when the listings state it. */

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
const count = (items: DealPick[], f: (s: DealPick["specs"]) => boolean) => items.filter((x) => f(x.specs ?? {})).length;
/* "2 QLED, 1 Mini LED" from the values of one spec, most common first */
function tally(items: DealPick[], key: string, skip: string[] = []): string {
  const m = new Map<string, number>();
  for (const x of items) { const v = x.specs?.[key]; if (v != null && v !== "" && !skip.includes(String(v))) m.set(String(v), (m.get(String(v)) ?? 0) + 1); }
  return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([v, n]) => `${n} ${v}`).join(", ");
}
function range(items: DealPick[], key: string, unit: string): string {
  const v = items.map((x) => Number(x.specs?.[key])).filter((n) => Number.isFinite(n) && n > 0);
  if (!v.length) return "";
  const lo = Math.min(...v), hi = Math.max(...v);
  return lo === hi ? `${lo} ${unit}` : `${lo}–${hi} ${unit}`;
}

function facts(category: string, items: DealPick[]): string[] {
  const n = items.length, of = (k: number, what: string) => (k ? `${k} of ${n} ${what}` : "");
  switch (category) {
    case "tvs": return [
      of(count(items, (s) => s.resolution === "4K"), "are 4K"),
      tally(items, "display", ["LED"]) && `Panels: ${tally(items, "display")}`,
      of(count(items, (s) => Number(s.refresh_hz) >= 100), "list a native 100 Hz+ panel"),
      tally(items, "platform") && `Platforms: ${tally(items, "platform")}`,
    ];
    case "refrigerators": return [
      range(items, "capacity_l", "L") && `Capacity ${range(items, "capacity_l", "L")}`,
      tally(items, "doors"),
      of(count(items, (s) => Boolean(s.inverter)), "have an inverter compressor"),
      range(items, "energy_stars", "star") && `Energy rating ${range(items, "energy_stars", "star")}`,
    ];
    case "washing-machines": return [
      range(items, "capacity_kg", "kg") && `Capacity ${range(items, "capacity_kg", "kg")}`,
      tally(items, "load"),
      of(count(items, (s) => Boolean(s.inverter)), "have an inverter or BLDC motor"),
      of(count(items, (s) => Boolean(s.heater)), "have a built-in heater"),
    ];
    case "air-conditioners": return [
      range(items, "tons", "ton") && `Capacity ${range(items, "tons", "ton")}`,
      of(count(items, (s) => Boolean(s.inverter)), "are inverter ACs"),
      range(items, "energy_stars", "star") && `Energy rating ${range(items, "energy_stars", "star")}`,
    ];
    case "laptops": return [
      range(items, "ram_gb", "GB") && `RAM ${range(items, "ram_gb", "GB")}`,
      of(count(items, (s) => /rtx|gtx|radeon rx/i.test(String(s.gpu ?? ""))), "have dedicated graphics"),
      tally(items, "os") && `OS: ${tally(items, "os")}`,
    ];
    case "soundbars-speakers": return [
      tally(items, "channels") && `Channels: ${tally(items, "channels")}`,
      of(count(items, (s) => Boolean(s.dolby_atmos)), "support Dolby Atmos"),
      of(count(items, (s) => Boolean(s.subwoofer)), "include a subwoofer"),
    ];
    case "home-appliances": return [tally(items, "kind")];
    default: return [];
  }
}

export default function Glance({ category, items, guideHref, guideLabel }: { category: string; items: DealPick[]; guideHref?: string; guideLabel?: string }) {
  if (items.length < 2) return null;
  const prices = items.map((x) => x.price).filter((v): v is number => v != null);
  const offs = items.map((x) => x.off).filter((v): v is number => v != null);
  const lines = [
    prices.length ? `Prices ${inr(Math.min(...prices))}–${inr(Math.max(...prices))}` : "",
    offs.length ? `${Math.min(...offs)}–${Math.max(...offs)}% below Amazon's listed price` : "",
    ...facts(category, items),
  ].filter(Boolean);
  return (
    <aside className="glance" aria-label="Today at a glance">
      <h2>Today at a glance <small>{items.length} picks</small></h2>
      <ul>{lines.map((l) => <li key={l}>{l}</li>)}</ul>
      {guideHref && <Link className="glance-link" href={guideHref}>{guideLabel ?? "What do these specs mean? Read the buying guide"} →</Link>}
    </aside>
  );
}

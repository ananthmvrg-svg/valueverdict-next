"use client";
/* Bottom bar with the products picked for comparison, and the side-by-side table (up to 3). */
import { useEffect, useState } from "react";
import { compare, useCompare, type CompareItem } from "@/lib/compare";
import { safeUrl } from "@/lib/products";
import { track } from "@/lib/track";

const inr = (n: number | null) => (n == null ? "—" : "₹" + Math.round(n).toLocaleString("en-IN"));

/* friendly names for the spec rows, in display order; values missing for a product show as "—" (not stated) */
const LABELS: [string, string, (v: unknown) => string][] = [
  ["screen_inches", "Screen size", (v) => `${v}″`], ["display", "Panel", String], ["resolution", "Resolution", String],
  ["refresh_hz", "Refresh rate", (v) => `${v} Hz`], ["platform", "Smart platform", String], ["hdmi_ports", "HDMI ports", String],
  ["cpu", "Processor", String], ["ram_gb", "RAM", (v) => `${v} GB`], ["storage", "Storage", String], ["gpu", "Graphics", String],
  ["os", "Operating system", String], ["capacity_l", "Capacity", (v) => `${v} L`], ["capacity_kg", "Capacity", (v) => `${v} kg`],
  ["tons", "Capacity", (v) => `${v} ton`], ["doors", "Doors", String], ["load", "Loading", String], ["automation", "Type", String],
  ["type", "Type", String], ["cooling", "Cooling", String], ["energy_stars", "Energy rating", (v) => `${v} star`],
  ["inverter", "Inverter", () => "Yes"], ["steam", "Steam wash", () => "Yes"], ["heater", "Heater", () => "Yes"],
  ["copper", "Copper", () => "Yes"], ["channels", "Channels", String], ["watts", "Output", (v) => `${v} W`],
  ["sound_watts", "Sound output", (v) => `${v} W`], ["dolby_atmos", "Dolby Atmos", () => "Yes"], ["dolby_vision", "Dolby Vision", () => "Yes"],
];

function Table({ list, onClose }: { list: CompareItem[]; onClose: () => void }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    addEventListener("keydown", esc);
    return () => removeEventListener("keydown", esc);
  }, [onClose]);
  const rows = LABELS.filter(([k]) => list.some((x) => x.specs?.[k] != null));
  return (
    <div className="cmp-overlay" role="dialog" aria-modal="true" aria-label="Compare products" onClick={onClose}>
      <div className="cmp-panel" onClick={(e) => e.stopPropagation()}>
        <div className="cmp-top"><h2>Compare</h2><button type="button" className="cmp-close" onClick={onClose} aria-label="Close">✕</button></div>
        <div className="cmp-scroll">
          <table className="cmp-table">
            <thead>
              <tr><th scope="row" />{list.map((x) => (
                <th key={x.asin} scope="col">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {safeUrl(x.image) && <img src={x.image} alt="" />}
                  <span className="cmp-brand">{x.brand}</span>
                  <span className="cmp-title">{x.title}</span>
                </th>
              ))}</tr>
            </thead>
            <tbody>
              <tr><th scope="row">Price</th>{list.map((x) => <td key={x.asin}><b>{inr(x.price)}</b>{x.off ? <small> ({Math.round(x.off)}% off)</small> : null}</td>)}</tr>
              {rows.map(([k, label, fmt]) => (
                <tr key={k}><th scope="row">{label}</th>{list.map((x) => <td key={x.asin}>{x.specs?.[k] != null ? fmt(x.specs[k]) : <span className="cmp-na">—</span>}</td>)}</tr>
              ))}
              {list.some((x) => x.bestFor) && <tr><th scope="row">Best for</th>{list.map((x) => <td key={x.asin}>{x.bestFor || <span className="cmp-na">—</span>}</td>)}</tr>}
              {list.some((x) => x.strengths?.length) && <tr><th scope="row">Strengths</th>{list.map((x) => <td key={x.asin}>{x.strengths?.length ? <ul>{x.strengths.map((s) => <li key={s}>{s}</li>)}</ul> : <span className="cmp-na">—</span>}</td>)}</tr>}
              {list.some((x) => x.limitations?.length) && <tr><th scope="row">Limitations</th>{list.map((x) => <td key={x.asin}>{x.limitations?.length ? <ul>{x.limitations.map((s) => <li key={s}>{s}</li>)}</ul> : <span className="cmp-na">—</span>}</td>)}</tr>}
              <tr><th scope="row" />{list.map((x) => <td key={x.asin}>{safeUrl(x.url) && <a className="btn amz" href={x.url} target="_blank" rel="nofollow sponsored noopener">View on Amazon</a>}</td>)}</tr>
            </tbody>
          </table>
        </div>
        <p className="cmp-note">&ldquo;—&rdquo; means the listing doesn&apos;t state it. Prices are from Amazon.in and can change; the price on Amazon at checkout applies.</p>
      </div>
    </div>
  );
}

export default function CompareBar() {
  const list = useCompare();
  const [open, setOpen] = useState(false);
  if (!list.length) return null;
  return (
    <>
      <div className="cmp-bar" role="region" aria-label="Compare list">
        <div className="cmp-items">
          {list.map((x) => (
            <span key={x.asin} className="cmp-chip">
              {x.brand || x.title.slice(0, 18)}
              <button type="button" onClick={() => compare.remove(x.asin)} aria-label={`Remove ${x.title} from compare`}>✕</button>
            </span>
          ))}
          {list.length < 2 && <span className="cmp-hint">Add one more to compare</span>}
        </div>
        <div className="cmp-actions">
          <button type="button" className="clear-filters" onClick={() => compare.clear()}>Clear</button>
          <button type="button" className="cmp-go" disabled={list.length < 2} onClick={() => { setOpen(true); track("compare_open", { count: list.length }); }}>
            Compare {list.length}
          </button>
        </div>
      </div>
      {open && list.length > 1 && <Table list={list} onClose={() => setOpen(false)} />}
    </>
  );
}

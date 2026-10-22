"use client";
/* Live Amazon deals (from /api/amazon-deals/<category>[/<budget>]) with search, sort and filters.
   Amazon requires the "prices as of" time shown under them. */
import { useEffect, useMemo, useState } from "react";
import { safeUrl } from "@/lib/products";
import { GridSkeleton } from "./Skeleton";

type Deal = {
  asin: string; title: string; brand: string; features: string[]; image: string; url: string;
  price: number | null; was: number | null; off: number | null; deal: string;
  dealEnds: string | null; claimed: number | null; primeOnly: boolean; lowStock: string;
};
type Section = { id: string; title: string; category: string; items: Deal[]; more: boolean; page?: number };
type Deals = { updated?: string; sections?: Section[]; error?: string };
type Paging = { page: number; more: boolean; busy: boolean };

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

/* "Ends in 5h 20m" for deals ending within 3 days */
function endsIn(iso: string | null, now: number) {
  const ms = iso ? Date.parse(iso) - now : NaN;
  if (!(ms > 0) || ms > 3 * 864e5) return "";
  const h = Math.floor(ms / 36e5), m = Math.floor((ms % 36e5) / 6e4);
  return h >= 24 ? `Ends in ${Math.floor(h / 24)}d ${h % 24}h` : h ? `Ends in ${h}h ${m}m` : `Ends in ${m}m`;
}

type Sorter = (a: Deal, b: Deal) => number;
const big = (n: number | null, d: number) => (n == null ? d : n);
const SORTS: Record<string, [string, Sorter | null]> = {
  featured: ["Featured", null],
  priceAsc: ["Price: low to high", (a, b) => big(a.price, 1e12) - big(b.price, 1e12)],
  priceDesc: ["Price: high to low", (a, b) => big(b.price, -1) - big(a.price, -1)],
  discount: ["Biggest discount", (a, b) => big(b.off, -1) - big(a.off, -1)],
  ending: ["Ending soonest", (a, b) => big(a.dealEnds ? Date.parse(a.dealEnds) : null, 9e15) - big(b.dealEnds ? Date.parse(b.dealEnds) : null, 9e15)],
};
const DISCOUNTS = [0, 20, 30, 40, 50];

function DealCard({ x, now }: { x: Deal; now: number }) {
  const url = safeUrl(x.url), img = safeUrl(x.image);
  if (!url) return null;
  const timer = endsIn(x.dealEnds, now);
  return (
    <article className="card deal">
      <div className="thumb">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {img && <img src={img} alt={x.title} loading="lazy" />}
        {x.off ? <span className="badge">-{Math.round(x.off)}%</span> : null}
      </div>
      <div className="body">
        {x.brand && <div className="brand">{x.brand}</div>}
        <h4 title={x.title}>{x.title}</h4>
        {x.features.length > 0 && <ul className="deal-features">{x.features.map((f) => <li key={f}>{f}</li>)}</ul>}
        {(x.deal || timer || x.primeOnly || x.lowStock) && (
          <div className="deal-tags">
            {x.deal && <span className="deal-tag offer">🏷️ {x.deal}</span>}
            {timer && <span className="deal-tag timer">⏱ {timer}</span>}
            {x.primeOnly && <span className="deal-tag prime">Prime early access</span>}
            {x.lowStock && <span className="deal-tag stock">{x.lowStock}</span>}
          </div>
        )}
        {x.claimed != null && x.claimed > 0 && (
          <div className="claimed" aria-label={`${x.claimed}% claimed`}><i style={{ width: `${Math.min(100, x.claimed)}%` }} /><span>{x.claimed}% claimed</span></div>
        )}
        {x.price != null && (
          <div className="deal-price">
            <b>{inr(x.price)}</b>
            {x.was != null && x.was > x.price && <s>{inr(x.was)}</s>}
            {x.off ? <span className="deal-off">{Math.round(x.off)}% off</span> : null}
          </div>
        )}
        <div className="btns"><a className="btn amz" href={url} target="_blank" rel="nofollow sponsored noopener">View deal on Amazon</a></div>
      </div>
    </article>
  );
}

/* category: the page's slug; its own searches are shown, limited to a budget page (sub) when given.
   only: no hand-picked products on this page. banner: offers note above the deals */
export default function LiveDeals({ category, sub, only, heading, banner }: { category: string; sub?: string; only: boolean; heading?: string; banner?: string }) {
  const [d, setD] = useState<Deals | null>(null);
  const [items, setItems] = useState<Record<string, Deal[]>>({});
  const [paging, setPaging] = useState<Record<string, Paging>>({});
  const [now, setNow] = useState(0);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("featured");
  const [brand, setBrand] = useState("");
  const [minOff, setMinOff] = useState(0);

  useEffect(() => {
    fetch(`/api/amazon-deals/${category}${sub ? `/${sub}` : ""}`).then((r) => r.json()).catch(() => ({ sections: [] })).then((x: Deals) => {
      setItems(Object.fromEntries((x.sections || []).map((s) => [s.id, s.items])));
      setPaging(Object.fromEntries((x.sections || []).map((s) => [s.id, { page: s.page || 1, more: s.more, busy: false }])));
      setNow(Date.now());
      setD(x);
    });
  }, [category, sub]);
  /* deal timers tick once a minute */
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(t); }, []);

  const loadMore = async (id: string) => {
    const pg = paging[id], next = pg.page + 1;
    setPaging((cur) => ({ ...cur, [id]: { ...pg, busy: true } }));
    const r = await fetch(`/api/amazon-deals/more/${id}/${next}${sub ? `/${sub}` : ""}`).then((x) => x.json()).catch(() => ({ items: [], more: false }));
    const seen = new Set(Object.values(items).flat().map((x) => x.asin));
    const fresh = ((r.items || []) as Deal[]).filter((x) => !seen.has(x.asin) && seen.add(x.asin));
    setItems((cur) => ({ ...cur, [id]: [...(cur[id] || []), ...fresh] }));
    setPaging((cur) => ({ ...cur, [id]: { page: next, more: Boolean(r.more) && fresh.length > 0, busy: false } }));
  };

  const all = useMemo(() => Object.values(items).flat(), [items]);
  const brands = useMemo(() => [...new Set(all.map((x) => x.brand).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [all]);

  if (!d) return (
    <div role="status" aria-label="Loading today's Amazon deals">
      {heading && <h2 className="deals-heading">{heading}</h2>}
      <div className="toolbar"><span className="sk sk-input" /><span className="sk sk-select" /><span className="sk sk-select" /></div>
      <GridSkeleton n={4} />
    </div>
  );
  if (!d.sections?.length) {
    if (d.error) console.warn("Amazon deals:", d.error);
    return only ? <div className="empty">{d.error === "no_results" ? "No deals in this range right now. Try another budget, or check back later." : "Today's deals are being refreshed. Please check back in a little while."}</div> : null;
  }

  const ql = q.trim().toLowerCase();
  const keep = (x: Deal) =>
    (!ql || `${x.title} ${x.brand} ${x.features.join(" ")}`.toLowerCase().includes(ql)) &&
    (!brand || x.brand === brand) && (!minOff || (x.off ?? 0) >= minOff);
  const sorter = SORTS[sort][1];
  /* "Featured" keeps Amazon's order inside each section; any other sort ranks every section together */
  const shown = sorter
    ? [{ id: "all", title: "", list: all.filter(keep).sort(sorter) }]
    : d.sections.map((s) => ({ id: s.id, title: s.title, list: (items[s.id] || []).filter(keep) }));
  const n = shown.reduce((t, g) => t + g.list.length, 0);
  const filtered = Boolean(ql || brand || minOff || sort !== "featured");
  const clear = () => { setQ(""); setSort("featured"); setBrand(""); setMinOff(0); };
  const at = new Date(d.updated!).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

  return (
    <div className="live-deals">
      {heading && <h2 className="deals-heading">{heading}</h2>}
      <div className="toolbar">
        <label className="search">🔍<input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search model, brand, feature…" /></label>
        <select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value)}>
          {Object.entries(SORTS).map(([k, [label]]) => <option key={k} value={k}>{label}</option>)}
        </select>
        {brands.length > 1 && (
          <select aria-label="Brand" value={brand} onChange={(e) => setBrand(e.target.value)}>
            <option value="">All brands</option>
            {brands.map((b) => <option key={b}>{b}</option>)}
          </select>
        )}
        <select aria-label="Discount" value={minOff} onChange={(e) => setMinOff(Number(e.target.value))}>
          {DISCOUNTS.map((v) => <option key={v} value={v}>{v ? `${v}% off or more` : "Any discount"}</option>)}
        </select>
        <span className="result-count">
          {filtered && <button type="button" className="clear-filters" onClick={clear}>Clear</button>}
          {n} deal{n === 1 ? "" : "s"}
        </span>
      </div>
      {banner && <div className="offers-banner">{banner}</div>}
      {n ? shown.map((g) => {
        const pg = paging[g.id];
        if (!g.list.length) return null;
        return (
          <div key={g.id}>
            {g.title && <div className="group-title"><h3>{g.title}</h3><span>{g.list.length} deal{g.list.length === 1 ? "" : "s"}</span></div>}
            <div className="grid">{g.list.map((x) => <DealCard key={x.asin} x={x} now={now} />)}</div>
            {pg?.busy && <div style={{ marginTop: 16 }}><GridSkeleton n={4} /></div>}
            {pg?.more && !pg.busy && !filtered && <div className="more-row"><button type="button" className="more-btn" onClick={() => loadMore(g.id)}>Show more deals</button></div>}
          </div>
        );
      }) : (
        <div className="empty">No deals match. <button type="button" className="clear-filters" onClick={clear}>Clear the filters</button></div>
      )}
      <p className="deals-note">Prices from Amazon.in as of {at} IST. Prices and availability can change; the price on Amazon at the time of purchase applies.</p>
    </div>
  );
}

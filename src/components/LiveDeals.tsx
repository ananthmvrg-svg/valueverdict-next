"use client";
/* Live Amazon deals (from /api/amazon-deals). Amazon requires the "prices as of" time shown under them. */
import { useEffect, useState } from "react";
import { safeUrl } from "@/lib/products";

type Deal = { asin: string; title: string; image: string; url: string; price: number | null; was: number | null; off: number | null; deal: string };
type Deals = { updated?: string; sections?: { title: string; items: Deal[] }[]; error?: string };

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

function DealCard({ x }: { x: Deal }) {
  const url = safeUrl(x.url), img = safeUrl(x.image);
  if (!url) return null;
  const badge = x.off ? `-${Math.round(x.off)}%` : x.deal;
  return (
    <article className="card deal">
      <div className="thumb">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {img && <img src={img} alt={x.title} loading="lazy" />}
        {badge && <span className="badge">{badge}</span>}
      </div>
      <div className="body">
        <h4>{x.title}</h4>
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

/* only: no hand-picked products on this page, so say something when deals are unavailable */
export default function LiveDeals({ only }: { only: boolean }) {
  const [d, setD] = useState<Deals | null>(null);
  useEffect(() => {
    fetch("/api/amazon-deals").then((r) => r.json()).catch(() => ({ sections: [] })).then(setD);
  }, []);
  if (!d) return <div className="empty">Loading today&apos;s Amazon deals…</div>;
  if (!d.sections?.length) {
    if (d.error) console.warn("Amazon deals:", d.error);
    return only ? <div className="empty">Today&apos;s deals are being refreshed. Please check back in a little while.</div> : null;
  }
  const at = new Date(d.updated!).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  return (
    <>
      {d.sections.map((s) => (
        <div key={s.title}>
          <div className="group-title"><h3>{s.title}</h3><span>{s.items.length} deals</span></div>
          <div className="grid">{s.items.map((x) => <DealCard key={x.asin} x={x} />)}</div>
        </div>
      ))}
      <p className="deals-note">Prices from Amazon.in as of {at} IST. Prices and availability can change; the price on Amazon at the time of purchase applies.</p>
    </>
  );
}

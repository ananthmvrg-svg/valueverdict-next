import type { DealPick } from "@/lib/picks";
import { safeUrl } from "@/lib/products";

const inr = (n: number | null) => (n == null ? "" : "₹" + Math.round(n).toLocaleString("en-IN"));

/* small deal cards (photo, discount, price, "View deal") for pages whose job isn't comparing: the join page and
   the Amazon buying guide. The full cards with pros, cons and tips are on the deal pages. "where" goes to GA4's
   store_click (components/Tracking.tsx). */
export default function CompactDeals({ items, where }: { items: DealPick[]; where: string }) {
  if (!items.length) return <div className="empty">Today&apos;s deals are being prepared. Please check back after 6 AM.</div>;
  return (
    <div className="join-grid">
      {items.map((x) => {
        const url = safeUrl(x.url), img = safeUrl(x.image);
        return (
          <div key={x.asin} className="join-deal">
            {x.off ? <span className="join-off">-{Math.round(x.off)}%</span> : null}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {img && <img src={img} alt="" loading="lazy" />}
            <span className="join-brand">{x.brand}</span>
            <h3>{x.title}</h3>
            {x.bestFor && <p className="join-for">Best for: {x.bestFor}</p>}
            <p className="join-price"><b>{inr(x.price)}</b>{x.was && x.price && x.was > x.price ? <s>{inr(x.was)}</s> : null}</p>
            {url && <a className="btn amz" href={url} target="_blank" rel="nofollow sponsored noopener"
              data-asin={x.asin} data-category={x.category} data-price={x.price ?? ""} data-rank={x.rank} data-product={x.title.slice(0, 100)} data-where={where}>View deal</a>}
          </div>
        );
      })}
    </div>
  );
}

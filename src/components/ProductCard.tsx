import type { Category, Product, Subcategory } from "@/lib/products";
import { reviewText, safeUrl } from "@/lib/products";
import { SHOW_FLIPKART } from "@/lib/config";
import { ProdIcon } from "./Icon";

/* Product card. Prices stay hidden until the Amazon API supplies live ones (Phase 2). */
export default function ProductCard({ p, sub, cat }: { p: Product; sub?: Subcategory; cat?: Category }) {
  const amz = safeUrl(p.amazon_url), fk = SHOW_FLIPKART ? safeUrl(p.flipkart_url) : "", img = safeUrl(p.image_url);
  const specs = [p.capacity_l && `${p.capacity_l}L`, p.door_type, p.color].filter(Boolean) as string[];
  const badge = p.badge ? <span className="badge">{p.badge}</span> : null;
  const stars = p.star_rating ? <span className="stars">★ {p.star_rating} Star</span> : null;
  const brand = p.brand ? <div className="brand">{p.brand}</div> : null;
  return (
    <article className={`card${img ? "" : " no-thumb"}`}>
      {img && (
        <div className="thumb">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img} alt={p.name} loading="lazy" />
          {badge}{stars}
        </div>
      )}
      <div className="body">
        {img ? (
          <>
            {brand}
            <h4>{p.name}</h4>
            {specs.length > 0 && <div className="specs">{specs.map((s) => <span className="spec" key={s}>{s}</span>)}</div>}
          </>
        ) : (
          /* no product image yet: category icon beside the title instead of a big thumb */
          <>
            <div className="head-row">
              <div className="head-lead"><span className="mini-icon"><ProdIcon p={p} cat={cat} /></span>{brand}</div>
              <div className="head-tags">{badge}{stars}</div>
            </div>
            <div className="title-row">
              {specs.length > 0 && <div className="title-tags">{specs.map((s) => <span className="spec" key={s}>{s}</span>)}</div>}
              <h4>{p.name}</h4>
            </div>
          </>
        )}
        <p className="review">{reviewText(p)}</p>
        <div className="card-tags">
          {sub?.name && <span className="budget-badge">{sub.name}</span>}
          <span className="offers-live">🏷️ Offers live</span>
        </div>
        {(amz || fk) && (
          <div className="btns">
            {amz && <a className="btn amz" href={amz} target="_blank" rel="nofollow sponsored noopener">View on Amazon</a>}
            {fk && <a className="btn fk" href={fk} target="_blank" rel="nofollow sponsored noopener">View on Flipkart</a>}
          </div>
        )}
      </div>
    </article>
  );
}

import Link from "next/link";
import { getCatalog, isYes, prodsOfCat, prodsOfSub, subsOf } from "@/lib/catalog";
import { SHOW_CATALOG, STORES } from "@/lib/config";
import { CatIcon } from "@/components/Icon";
import CategoryCard from "@/components/CategoryCard";
import { PickGrid } from "@/components/LiveDeals";
import { getPicks, picksIn } from "@/lib/picks";
import { JsonLd, pageMeta, siteData } from "@/lib/seo";

export const metadata = pageMeta(
  "Value Verdict – Best Amazon Deals in India Today, Sorted by Budget",
  "Today's best Amazon.in deals on fridges, washing machines, TVs, ACs, laptops and more: top picks for every budget with real discounts, updated every day at 5 AM and 5 PM.",
  "/");

export default async function Home() {
  const [db, { picks }] = await Promise.all([getCatalog(), getPicks()]);
  const topDeals = picksIn(picks, "top-100").slice(0, 8);
  const brands = new Set(db.prods.map((p) => p.brand).filter(Boolean)).size;
  return (
    <>
      {siteData().map((d, i) => <JsonLd key={i} data={d} />)}
      <div className="hero">
        <div className="wrap">
          <div>
            <span className="eyebrow">● Festive sale {SHOW_CATALOG ? "picks" : "deals"}, updated</span>
            {SHOW_CATALOG ? (
              <>
                <h1>Honest picks, <span>sorted by your budget.</span></h1>
                <p>Value Verdict hand-picks the best-value appliances in India and sorts them by price band, energy rating and capacity, so you can decide in minutes and check today&apos;s price on {STORES}.</p>
                <div className="trust">
                  <div><b>{db.prods.length}</b>hand-picked products</div>
                  <div><b>{brands}</b>trusted brands</div>
                  <div><b>{db.cats.length}</b>categories</div>
                </div>
              </>
            ) : (
              <>
                <h1>Today&apos;s best deals, <span>sorted by your budget.</span></h1>
                <p>Value Verdict brings you live Amazon.in deals on appliances, TVs and laptops, filtered to well-rated products with real discounts and sorted by price band, so you can decide in minutes.</p>
                <div className="trust">
                  <div><b>Live</b>Amazon.in prices</div>
                  {/* "picked by AI" wording is switched off for now; to show it again: <div><b>2× daily</b>AI-picked deals</div> */}
                  <div><b>2× daily</b>fresh top picks</div>
                  <div><b>{db.cats.length}</b>categories</div>
                </div>
              </>
            )}
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="hero-logo" src="/hero-logo.jpg" alt="Value Verdict" />
        </div>
      </div>
      <section>
        <div className="wrap">
          <div className="hero-card how">
            <h3>How it works</h3>
            <div className="step"><i>1</i><div><strong>Pick a category &amp; budget</strong>Washing machines, home appliances and more, sorted by price band.</div></div>
            <div className="step"><i>2</i><div><strong>{SHOW_CATALOG ? "Compare and sort" : "Compare live deals"}</strong>{SHOW_CATALOG ? "By type, energy rating or brand." : "Price, discount and product side by side."}</div></div>
            <div className="step"><i>3</i><div><strong>Check today&apos;s price</strong>On {STORES}, with bank offers.</div></div>
          </div>
          {topDeals.length > 0 && (
            <>
              <div className="picks-head" style={{ marginTop: 36 }}>
                <div><h2 style={{ margin: 0 }}>🔥 Today&apos;s top deals</h2></div>
                <Link href="/top-deals">See all 100 →</Link>
              </div>
              <PickGrid items={topDeals} />
            </>
          )}
          <div className="sec-head" style={{ marginTop: 36 }}><div><h2>All categories</h2><p>Choose a category, then a budget.</p></div></div>
          <div className="cats">
            {db.cats.map((c) => {
              const n = prodsOfCat(db, c.category_id).length;
              return (
                <CategoryCard key={c.slug} href={`/${c.slug}`}>
                  <Link className="cat-top" href={`/${c.slug}`}>
                    <div className="cat-icon"><CatIcon cat={c} /></div>
                    <div><h3>{c.name}</h3><div className="count">{!n && isYes(c.amazon_deals) ? "Live deals" : `${n} products`}</div></div>
                  </Link>
                  <p>{c.description}</p>
                  <div className="chips">
                    {subsOf(db, c.category_id).map((s) => (
                      <Link key={s.slug} className="chip" href={`/${c.slug}/${s.slug}`}>{s.name}{SHOW_CATALOG && <small>{prodsOfSub(db, s.subcategory_id).length}</small>}</Link>
                    ))}
                  </div>
                </CategoryCard>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}

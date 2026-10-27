import Link from "next/link";
import { getCatalog, isYes, prodsOfCat, prodsOfSub, subsOf } from "@/lib/catalog";
import { SHOW_CATALOG, STORES } from "@/lib/config";
import { GuideArt, themeFor } from "@/components/GuideArt";
import { SiteIcon } from "@/components/SiteIcons";
import CategoryCard from "@/components/CategoryCard";
import { PickGrid } from "@/components/LiveDeals";
import { getPicks, picksIn } from "@/lib/picks";
import { JsonLd, pageMeta, siteData } from "@/lib/seo";

export const metadata = pageMeta(
  "Value Verdict – Best Amazon Deals in India Today, Sorted by Budget",
  "Today's best Amazon.in deals on fridges, washing machines, TVs, ACs, laptops and more: top picks for every budget with real discounts, with new picks every day at 6 AM and prices re-checked through the day.",
  "/");

const HOW_STEPS = [
  { icon: "book", color: "#7c3aed", title: "Learn what matters", text: "Our buying guides explain each spec in plain words: what it means and what suits your home.", href: "/guides", link: "Buying guides" },
  { icon: "wallet", color: "#1e90ff", title: "Pick a category & budget", text: "TVs, fridges, ACs, laptops and more, each sorted into clear price bands.", href: "#categories", link: "All categories" },
  { icon: "compare", color: "#0d9488", title: "Compare the top picks", text: "Key specs, pros and cons for each pick; compare up to 3 side by side.", href: "/top-deals", link: "Today's Top 100" },
  { icon: "cart", color: "#ea580c", title: "Buy on Amazon", text: `Check today's price and bank offers on ${STORES}. You pay the same price.`, href: "/how-we-pick", link: "How we pick" },
];

const catTheme = (slug: string) => {
  const t = themeFor(slug);
  return { "--g-from": t.from, "--g-to": t.to } as React.CSSProperties;
};

export default async function Home() {
  const [db, { picks }] = await Promise.all([getCatalog(), getPicks()]);
  const topDeals = picksIn(picks, "top-100").slice(0, 8);
  const brands = new Set(db.prods.map((p) => p.brand).filter(Boolean)).size;
  /* today's picks per category, for the category cards */
  const todays = new Map<string, number>();
  for (const p of picks) if (p.group !== "top-100") todays.set(p.category, (todays.get(p.category) ?? 0) + 1);
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
                <p>Value Verdict brings you live Amazon.in deals on appliances, TVs and laptops, filtered to products rated above 3 stars and priced below Amazon&apos;s listed price, and sorted by price band, so you can decide in minutes.</p>
                <div className="trust">
                  <div><b>Live</b>Amazon.in prices</div>
                  {/* "picked by AI" wording is switched off for now; to show it again: <div><b>2× daily</b>AI-picked deals</div> */}
                  <div><b>Daily</b>fresh top picks</div>
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
          <div className="how2">
            <div className="how2-head">
              <h2>How Value Verdict works</h2>
              <p>From &ldquo;which one should I buy?&rdquo; to the right deal in four steps.</p>
            </div>
            <ol className="how2-steps">
              {HOW_STEPS.map((s, i) => (
                <li key={s.title} className="how2-step" style={{ "--c": s.color } as React.CSSProperties}>
                  <span className="how2-icon"><SiteIcon name={s.icon} /></span>
                  <span className="how2-num">Step {i + 1}</span>
                  <strong>{s.title}</strong>
                  <span className="how2-text">{s.text}</span>
                  <Link className="how2-link" href={s.href}>{s.link} →</Link>
                </li>
              ))}
            </ol>
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
          <div className="sec-head" id="categories" style={{ marginTop: 36, scrollMarginTop: 90 }}><div><h2>All categories</h2><p>Choose a category, then a budget.</p></div></div>
          <div className="cats">
            {db.cats.map((c) => {
              const n = prodsOfCat(db, c.category_id).length;
              return (
                <CategoryCard key={c.slug} href={`/${c.slug}`}>
                  <Link className="cat-banner" href={`/${c.slug}`} style={catTheme(c.slug)}>
                    <div className="cat-banner-text">
                      <h3>{c.name}</h3>
                      <div className="count">
                        {!n && isYes(c.amazon_deals) ? (todays.get(c.slug) ? `${todays.get(c.slug)} picks today` : "Live deals") : `${n} products`}
                      </div>
                    </div>
                    <GuideArt category={c.slug} className="cat-banner-svg" />
                  </Link>
                  <div className="cat-body">
                    <p>{c.description}</p>
                    {/* a budget opens the category page at that budget's top picks */}
                    <div className="chips">
                      {subsOf(db, c.category_id).map((s) => (
                        <Link key={s.slug} className="chip budget-chip" href={`/${c.slug}#${s.slug}`}>{s.name}{SHOW_CATALOG && <small>{prodsOfSub(db, s.subcategory_id).length}</small>}</Link>
                      ))}
                    </div>
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

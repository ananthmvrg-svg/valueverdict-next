import Link from "next/link";
import type { Metadata } from "next";
import { getCatalog } from "@/lib/catalog";
import { OFFERS_BANNER } from "@/lib/config";
import { getPicks, pickedAt, picksIn } from "@/lib/picks";
import PromiseBox from "@/components/PromiseBox";
import TopDeals from "@/components/TopDeals";
import { getGuides } from "@/lib/guides";
import { breadcrumbs, dealList, JsonLd, monthYear, pageMeta } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return pageMeta(
    `Today's Top 100 Amazon.in Deals in India (${await monthYear()})`,
    "Today's highest-value Amazon.in deals across TVs, fridges, washing machines, ACs, laptops and more, ranked on specs for the price. Prices checked every 3 hours.",
    "/top-deals");
}

/* /top-deals: the AI's 100 best deals across the site, picked every day at 6 AM India time */
export default async function TopDealsPage() {
  const [{ cats }, { picks, at }, { guides }] = await Promise.all([getCatalog(), getPicks(), getGuides()]);
  const top = picksIn(picks, "top-100");
  return (
    <section>
      <div className="wrap">
        <div className="crumbs"><Link href="/">Home</Link> / Top 100</div>
        <JsonLd data={breadcrumbs([["Home", "/"], ["Top 100 Deals", "/top-deals"]])} />
        {top.length > 0 && <JsonLd data={dealList("Today's Top 100 Deals", top)} />}
        <div className="sec-head"><div><h1><span aria-hidden="true">🔥 </span>Today&apos;s Top 100 Amazon.in Deals</h1><p>The highest-value deals across every category, ranked. New picks every day at 6 AM; prices re-checked every 3 hours.</p></div></div>
        <PromiseBox n={top.length} catName="deals" deals updated={at ? pickedAt(at) : undefined}
          custom="The {n} highest-value deals on Amazon.in today, picked from every category on Value Verdict and ranked on specs for the price, brand and discount against Amazon's listed price."
          customPoints="🏆 Ranked by value | 🏷️ Below Amazon's listed price | 🔄 Prices checked every 3 hours" />
        {top.length ? (
          <>
            <div className="offers-banner">{OFFERS_BANNER}</div>
            <TopDeals items={top} cats={cats.map((c) => ({ slug: c.slug, name: c.name }))} />
            {/* "picked by AI" wording is switched off for now; to show it again, use this note instead:
                Picked by AI from Amazon.in deals on {pickedAt(at)} IST, judging specs, brand, price and discount. Prices change often; the price on Amazon at checkout applies. */}
            <p className="picks-note">Deals from Amazon.in as of {pickedAt(at)} IST. Prices change often; the price on Amazon at checkout applies.</p>
          </>
        ) : (
          <div className="empty">Today&apos;s Top 100 is being prepared. Please check back after 6 AM.</div>
        )}
        {/* plain links, so shoppers (and search engines) can go from the Top 100 to every category and guide */}
        <div className="link-hub">
          <nav aria-labelledby="hub-cats">
            <h2 id="hub-cats">Browse today&apos;s picks by category</h2>
            <ul>{cats.map((c) => <li key={c.slug}><Link href={`/${c.slug}`}>{c.name}</Link></li>)}</ul>
          </nav>
          {guides.length > 0 && (
            <nav aria-labelledby="hub-guides">
              <h2 id="hub-guides">Not sure what to buy? Read a buying guide</h2>
              <ul>{guides.map((g) => <li key={g.slug}><Link href={`/guides/${g.slug}`}>{g.title.split(":")[0]}</Link></li>)}</ul>
            </nav>
          )}
        </div>
      </div>
    </section>
  );
}

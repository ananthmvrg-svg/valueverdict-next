import Link from "next/link";
import type { Metadata } from "next";
import { getCatalog } from "@/lib/catalog";
import { OFFERS_BANNER } from "@/lib/config";
import { getPicks, pickedAt, picksIn } from "@/lib/picks";
import PromiseBox from "@/components/PromiseBox";
import TopDeals from "@/components/TopDeals";
import { breadcrumbs, dealList, JsonLd, monthYear, pageMeta } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return pageMeta(
    `Top 100 Amazon Deals Today in India (${await monthYear()}) | Value Verdict`,
    "The 100 best Amazon.in deals right now across fridges, washing machines, TVs, laptops, ACs, gadgets and more, ranked by value and updated every day at 5 AM and 5 PM.",
    "/top-deals");
}

/* /top-deals: the AI's 100 best deals across the site, refreshed at 5 AM and 5 PM India time */
export default async function TopDealsPage() {
  const [{ cats }, { picks, at }] = await Promise.all([getCatalog(), getPicks()]);
  const top = picksIn(picks, "top-100");
  return (
    <section>
      <div className="wrap">
        <div className="crumbs"><Link href="/">Home</Link> / Top 100</div>
        <JsonLd data={breadcrumbs([["Home", "/"], ["Top 100 Deals", "/top-deals"]])} />
        {top.length > 0 && <JsonLd data={dealList("Today's Top 100 Deals", top)} />}
        <div className="sec-head"><div><h1>🔥 Today&apos;s Top 100 Deals</h1><p>The best deals across every category, ranked. Updated at 5 AM and 5 PM.</p></div></div>
        <PromiseBox n={top.length} catName="deals" deals
          custom="The {n} best deals on Amazon.in right now, picked from every category on Value Verdict and ranked by value: brand, specs, price and real discount."
          customPoints="🏆 Ranked by value | 🔥 Real discounts only | 🔄 Updated twice a day" />
        {top.length ? (
          <>
            <div className="offers-banner">{OFFERS_BANNER}</div>
            <TopDeals items={top} cats={cats.map((c) => ({ slug: c.slug, name: c.name }))} />
            {/* "picked by AI" wording is switched off for now; to show it again, use this note instead:
                Picked by AI from Amazon.in deals on {pickedAt(at)} IST, judging specs, brand, price and discount. Prices change often; the price on Amazon at checkout applies. */}
            <p className="picks-note">Deals from Amazon.in as of {pickedAt(at)} IST. Prices change often; the price on Amazon at checkout applies.</p>
          </>
        ) : (
          <div className="empty">Today&apos;s Top 100 is being prepared. Please check back after 5 AM or 5 PM.</div>
        )}
      </div>
    </section>
  );
}

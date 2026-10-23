import Link from "next/link";
import type { Metadata } from "next";
import { getCatalog } from "@/lib/catalog";
import { OFFERS_BANNER } from "@/lib/config";
import { getPicks, pickedAt, picksIn } from "@/lib/picks";
import PromiseBox from "@/components/PromiseBox";
import TopDeals from "@/components/TopDeals";

export const metadata: Metadata = {
  title: "Today's Top 100 Deals on Amazon.in – Value Verdict",
  description: "The 100 best Amazon.in deals today across fridges, washing machines, TVs, laptops, ACs and more, picked twice a day.",
  alternates: { canonical: "/top-deals" },
};

/* /top-deals: the AI's 100 best deals across the site, refreshed at 5 AM and 5 PM India time */
export default async function TopDealsPage() {
  const [{ cats }, { picks, at }] = await Promise.all([getCatalog(), getPicks()]);
  const top = picksIn(picks, "top-100");
  return (
    <section>
      <div className="wrap">
        <div className="crumbs"><Link href="/">Home</Link> / Top 100</div>
        <div className="sec-head"><div><h2>🔥 Today&apos;s Top 100 Deals</h2><p>The best deals across every category, ranked. Updated at 5 AM and 5 PM.</p></div></div>
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

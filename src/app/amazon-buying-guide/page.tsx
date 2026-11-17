import Link from "next/link";
import { AMAZON_GUIDE as G } from "@/lib/amazon-guide";
import { getGuides, longDate, readMinutes } from "@/lib/guides";
import { getCatalog } from "@/lib/catalog";
import { getPicks, pickedAt, picksIn } from "@/lib/picks";
import { article, breadcrumbs, JsonLd, pageMeta } from "@/lib/seo";
import { Faqs, GuideSections, KeyPoints, sectionId } from "@/components/Guide";
import { GuideArt, themeFor } from "@/components/GuideArt";
import CompactDeals from "@/components/CompactDeals";
import { JoinButtons } from "@/components/Social";

export const metadata = pageMeta(
  "How to Buy on Amazon India at the Right Price (Sales, Bank Offers, EMI)",
  G.description, "/amazon-buying-guide");

const PATH = "/amazon-buying-guide";
/* Amazon-orange, the guide cards' look (guide-hero uses these variables) */
const THEME = { "--g-from": "#c2410c", "--g-to": "#f59e0b", "--g-ink": "#ffedd5" } as React.CSSProperties;

/* /amazon-buying-guide: the general "right discount, right time" guide (text in lib/amazon-guide.ts), built as a
   funnel to today's deals: a nudge to the category pages after step 2, then after the FAQs today's top 6 deals,
   the Top 100 and every category; joining our channels is the second choice ("not buying today?").
   Clicks: store_click where = amazon-guide; category and Top 100 links are page views. */
export default async function AmazonGuidePage() {
  const [{ guides }, { cats }, { picks, at }] = await Promise.all([getGuides(), getCatalog(), getPicks()]);
  const top = picksIn(picks, "top-100").slice(0, 6);
  const catChips = (
    <div className="cat-chips">
      {cats.map((c) => {
        const t = themeFor(c.slug);
        return (
          <Link key={c.slug} className="cat-chip" href={`/${c.slug}`} style={{ "--g-from": t.from, "--g-to": t.to } as React.CSSProperties}>
            <span className="cat-chip-art" aria-hidden="true"><GuideArt category={c.slug} /></span>{c.name}
          </Link>
        );
      })}
    </div>
  );
  const g = { ...G, published_at: G.updated, created_at: G.updated };
  return (
    <section>
      <div className="wrap">
        <JsonLd data={breadcrumbs([["Home", "/"], ["Buying guides", "/guides"], [G.title, PATH]])} />
        <JsonLd data={article(g, PATH)} />
        <div className="crumbs"><Link href="/">Home</Link> / <Link href="/guides">Buying guides</Link> / Buying on Amazon</div>
        <header className="guide-hero" style={THEME}>
          <div className="guide-hero-text">
            <span className="guide-card-label">Shopping smart · {readMinutes(G)} min read</span>
            <h1>{G.title}</h1>
            <p>{G.description}</p>
            <p className="guide-byline">By the Value Verdict team · Updated {longDate(G.updated)}</p>
          </div>
          <GuideArt category="amazon-finds" className="guide-hero-svg" />
        </header>
        <div className="info-layout">
          <article className="prose guide">
            <KeyPoints points={G.summary} title="In short" />
            <GuideSections sections={G.sections.slice(0, 2)} />
            {/* mid-guide nudge: the comparing is already done on our pages */}
            <div className="guide-nudge">
              <h2>Today&apos;s prices, already compared</h2>
              <p>Every category below has today&apos;s best-value Amazon.in deals, sorted by budget and ranked on specs for the price. Prices re-checked every 3 hours.</p>
              {catChips}
            </div>
            <GuideSections sections={G.sections.slice(2)} />
            <Faqs faqs={G.faqs} />
            {/* the end of the funnel: today's deals */}
            <div className="guide-deals" id="todays-deals">
              <h2>You know what to look for. Here are today&apos;s best deals</h2>
              <p>The top picks from today&apos;s Top 100, below Amazon&apos;s listed price and rated 3★+.{at ? ` Prices as of ${pickedAt(at)} IST.` : ""}</p>
              <CompactDeals items={top} where="amazon-guide" />
              <Link className="guide-deals-cta" href="/top-deals">See all of today&apos;s Top 100 deals →</Link>
              <h3>Or shop by category and budget</h3>
              {catChips}
            </div>
            <div className="guide-join">
              <h2>Not buying today? Get told when the price is right</h2>
              <p>We post the day&apos;s best deals and sale alerts on Telegram, Instagram and YouTube. Free, and you can leave anytime.</p>
              <JoinButtons where="amazon-guide" />
            </div>
            {guides.length > 0 && (
              <nav className="guide-next" aria-labelledby="guide-next-guides">
                <h2 id="guide-next-guides">Choosing a product? Read its buying guide</h2>
                <ul>{guides.map((x) => <li key={x.slug}><Link href={`/guides/${x.slug}`}>{x.title.split(":")[0]}</Link></li>)}</ul>
              </nav>
            )}
          </article>
          <aside className="info-side" aria-label="In this guide">
            <div className="info-card guide-side-deals">
              <h2>Shop today&apos;s deals</h2>
              <p className="info-join-text">{top.length ? "The best-value Amazon.in deals, picked every morning." : "New picks every day at 6 AM."}</p>
              <Link className="guide-deals-cta" href="/top-deals">Today&apos;s Top 100 →</Link>
              <a className="guide-side-link" href="#todays-deals">See today&apos;s top 6 ↓</a>
            </div>
            <nav className="info-card" aria-label="In this guide">
              <h2>In this guide</h2>
              <ul className="info-nav">
                {G.sections.map((s) => <li key={s.heading}><a href={`#${sectionId(s.heading)}`}>{s.heading.replace(/^Step \d: /, "")}</a></li>)}
                <li><a href="#faqs">FAQs</a></li>
                <li><a href="#todays-deals">Today&apos;s deals</a></li>
              </ul>
            </nav>
            <div className="info-card">
              <h2>Never miss a sale</h2>
              <p className="info-join-text">Deal alerts and the day&apos;s top picks, free.</p>
              <JoinButtons where="amazon-guide-side" compact />
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

import Link from "next/link";
import { AMAZON_GUIDE as G } from "@/lib/amazon-guide";
import { getGuides, longDate, readMinutes } from "@/lib/guides";
import { article, breadcrumbs, JsonLd, pageMeta } from "@/lib/seo";
import { Faqs, GuideSections, KeyPoints, sectionId } from "@/components/Guide";
import { GuideArt } from "@/components/GuideArt";
import { JoinButtons } from "@/components/Social";

export const metadata = pageMeta(
  "How to Buy on Amazon India at the Right Price (Sales, Bank Offers, EMI)",
  G.description, "/amazon-buying-guide");

const PATH = "/amazon-buying-guide";
/* Amazon-orange, the guide cards' look (guide-hero uses these variables) */
const THEME = { "--g-from": "#c2410c", "--g-to": "#f59e0b", "--g-ink": "#ffedd5" } as React.CSSProperties;

/* /amazon-buying-guide: the general "right discount, right time" guide (text in lib/amazon-guide.ts) */
export default async function AmazonGuidePage() {
  const { guides } = await getGuides();
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
            <GuideSections sections={G.sections} />
            <div className="guide-join">
              <h2>Get told when the price is right</h2>
              <p>We post the day&apos;s best deals and sale alerts on Telegram, Instagram and YouTube. Free, and you can leave anytime.</p>
              <JoinButtons where="amazon-guide" />
            </div>
            <Faqs faqs={G.faqs} />
            <nav className="guide-next" aria-labelledby="guide-next-deals">
              <h2 id="guide-next-deals">Ready to shop? Today&apos;s deals</h2>
              <ul>
                <li><Link href="/top-deals">Today&apos;s Top 100</Link></li>
                <li><Link href="/amazon-finds">Amazon Finds</Link></li>
              </ul>
            </nav>
            {guides.length > 0 && (
              <nav className="guide-next" aria-labelledby="guide-next-guides">
                <h2 id="guide-next-guides">Choosing a product? Read its buying guide</h2>
                <ul>{guides.map((x) => <li key={x.slug}><Link href={`/guides/${x.slug}`}>{x.title.split(":")[0]}</Link></li>)}</ul>
              </nav>
            )}
          </article>
          <aside className="info-side" aria-label="In this guide">
            <nav className="info-card" aria-label="In this guide">
              <h2>In this guide</h2>
              <ul className="info-nav">
                {G.sections.map((s) => <li key={s.heading}><a href={`#${sectionId(s.heading)}`}>{s.heading.replace(/^Step \d: /, "")}</a></li>)}
                <li><a href="#faqs">FAQs</a></li>
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

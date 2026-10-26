import Link from "next/link";
import { getGuides, GUIDE_CATEGORIES, readMinutes, splitTitle } from "@/lib/guides";
import { breadcrumbs, JsonLd, pageMeta } from "@/lib/seo";
import { PreviewBanner } from "@/components/Guide";
import { GuideArt, themeFor } from "@/components/GuideArt";

export const metadata = pageMeta(
  "Buying Guides – How to Choose TVs, Fridges, ACs & More | Value Verdict",
  "Plain-English buying guides for Indian shoppers: which specifications matter, what they mean and how to choose the right product for your home and budget.",
  "/guides");

/* a section heading as a short topic chip: before any ":" or "(", at most about 32 characters, cut at a word */
const chip = (heading: string) => {
  const t = heading.split(/[:(?]/)[0].trim();
  return t.length <= 32 ? t : t.slice(0, 32).replace(/\s+\S*$/, "").replace(/\s+(and|or|for|the|a|to|of|your)$/i, "") + "…";
};

const order = (c: string) => { const i = (GUIDE_CATEGORIES as readonly string[]).indexOf(c); return i < 0 ? 99 : i; };

export default async function GuidesPage() {
  const { guides, preview } = await getGuides();
  const sorted = [...guides].sort((a, b) => order(a.category) - order(b.category));
  return (
    <section>
      <div className="wrap">
        {preview && <PreviewBanner />}
        <JsonLd data={breadcrumbs([["Home", "/"], ["Buying guides", "/guides"]])} />
        <div className="crumbs"><Link href="/">Home</Link> / Buying guides</div>
        <div className="sec-head"><div><h1>Buying guides</h1><p>What the specifications mean and how to choose, before you look at today&apos;s deals.</p></div></div>
        {sorted.length === 0
          ? <div className="empty">Our first buying guides are being written. Check back soon.</div>
          : (
            <div className="guide-list">
              {sorted.map((g) => {
                const t = themeFor(g.category), [name, sub] = splitTitle(g.title);
                return (
                  <Link key={g.slug} className="guide-card" href={`/guides/${g.slug}`}
                    style={{ "--g-from": t.from, "--g-to": t.to, "--g-ink": t.ink } as React.CSSProperties}>
                    <div className="guide-card-art">
                      <span className="guide-card-label">{t.label}</span>
                      <GuideArt category={g.category} className="guide-card-svg" />
                    </div>
                    <div className="guide-card-body">
                      <h2>{name}</h2>
                      {sub && <p className="guide-card-sub">{sub.charAt(0).toUpperCase() + sub.slice(1)}</p>}
                      <p className="guide-card-desc">{g.description}</p>
                      <ul className="guide-card-topics">
                        {g.sections.slice(0, 3).map((s) => <li key={s.heading}>{chip(s.heading)}</li>)}
                      </ul>
                      <div className="guide-card-foot">
                        <span>⏱ {readMinutes(g)} min read · {g.faqs.length} FAQs</span>
                        <b>Read guide →</b>
                      </div>
                      {preview && <small>v{g.version} · {g.status}</small>}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
      </div>
    </section>
  );
}

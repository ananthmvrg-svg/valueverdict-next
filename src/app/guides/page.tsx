import Link from "next/link";
import { getGuides } from "@/lib/guides";
import { breadcrumbs, JsonLd, pageMeta } from "@/lib/seo";
import { PreviewBanner } from "@/components/Guide";

export const metadata = pageMeta(
  "Buying Guides – How to Choose TVs, Fridges, ACs & More | Value Verdict",
  "Plain-English buying guides for Indian shoppers: which specifications matter, what they mean and how to choose the right product for your home and budget.",
  "/guides");

export default async function GuidesPage() {
  const { guides, preview } = await getGuides();
  return (
    <section>
      <div className="wrap">
        {preview && <PreviewBanner />}
        <JsonLd data={breadcrumbs([["Home", "/"], ["Buying guides", "/guides"]])} />
        <div className="crumbs"><Link href="/">Home</Link> / Buying guides</div>
        <div className="sec-head"><div><h1>Buying guides</h1><p>What the specifications mean and how to choose, before you look at today&apos;s deals.</p></div></div>
        {guides.length === 0
          ? <div className="empty">Our first buying guides are being written. Check back soon.</div>
          : (
            <div className="guide-list">
              {guides.map((g) => (
                <Link key={g.slug} className="guide-card" href={`/guides/${g.slug}`}>
                  <h2>{g.title}</h2>
                  <p>{g.description}</p>
                  {preview && <small>v{g.version} · {g.status}</small>}
                </Link>
              ))}
            </div>
          )}
      </div>
    </section>
  );
}

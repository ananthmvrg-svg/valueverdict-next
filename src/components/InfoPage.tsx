import Link from "next/link";
import { CONTACT_EMAIL } from "@/lib/config";
import { breadcrumbs, JsonLd } from "@/lib/seo";

const PAGES: [string, string][] = [
  ["/about", "About us"], ["/how-we-pick", "How we pick"], ["/affiliate-disclosure", "Affiliate disclosure"], ["/contact", "Corrections & contact"],
];

/* Shared layout for the trust pages (About, How we pick, Affiliate disclosure, Contact):
   the text at a readable width, with an "At a glance" panel beside it (below it on phones). */
export default function InfoPage({ path, title, intro, children }: { path: string; title: string; intro: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="wrap">
        <JsonLd data={breadcrumbs([["Home", "/"], [title, path]])} />
        <div className="crumbs"><Link href="/">Home</Link> / {title}</div>
        <div className="sec-head"><div><h1>{title}</h1><p>{intro}</p></div></div>
        <div className="info-layout">
          <article className="prose">{children}</article>
          <aside className="info-side" aria-label="Value Verdict at a glance">
            <div className="info-card">
              <h2>At a glance</h2>
              <ul className="info-facts">
                <li><b>Data</b><span>Amazon.in, official Associates data</span></li>
                <li><b>New picks</b><span>Every day at 6 AM</span></li>
                <li><b>Prices checked</b><span>About every 3 hours</span></li>
                <li><b>Where you buy</b><span>On Amazon.in, same price</span></li>
                <li><b>Paid placements</b><span>None, brands can&apos;t pay to be listed</span></li>
              </ul>
            </div>
            {CONTACT_EMAIL && (
              <div className="info-card">
                <h2>Support</h2>
                <p>Spotted a wrong price or spec? Write to us:</p>
                <a className="info-mail" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
              </div>
            )}
            <nav className="info-card" aria-label="About Value Verdict">
              <h2>More</h2>
              <ul className="info-nav">
                {PAGES.map(([href, label]) => (
                  <li key={href}>{href === path ? <span aria-current="page">{label}</span> : <Link href={href}>{label}</Link>}</li>
                ))}
                <li><Link href="/top-deals">🔥 Today&apos;s Top 100 deals</Link></li>
              </ul>
            </nav>
          </aside>
        </div>
      </div>
    </section>
  );
}

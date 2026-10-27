import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import Link from "next/link";
import { cacheLife } from "next/cache";
import { getCatalog } from "@/lib/catalog";
import { SHOW_CATALOG, SITE_URL } from "@/lib/config";
import Nav from "@/components/Nav";
import Tracking from "@/components/Tracking";
import LegacyHashRedirect from "@/components/LegacyHashRedirect";
import CompareBar from "@/components/CompareBar";
import { SiteIcon } from "@/components/SiteIcons";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-jakarta" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Value Verdict – Best Appliance Deals in India, Sorted by Budget",
  description: SHOW_CATALOG
    ? "Hand-picked washing machines and home appliances sorted by budget. Compare type, energy rating and brand, then check today's price on Amazon."
    : "Today's best Amazon.in deals on fridges, washing machines, TVs, ACs and laptops, filtered to products rated above 3 stars and sorted by budget.",
  icons: { icon: "/favicon.png" },
  openGraph: {
    title: "Value Verdict – Best Deals Sorted by Budget",
    description: SHOW_CATALOG ? "Hand-picked appliances sorted by budget. Compare and check today's price on Amazon." : "Live Amazon.in deals on appliances and laptops, sorted by budget.",
    images: ["/hero-logo.jpg"],
    siteName: "Value Verdict",
    type: "website",
    locale: "en_IN",
    url: "/",
  },
  twitter: { card: "summary_large_image" },
  /* Google Search Console: the code from its "HTML tag" verification method, set as GOOGLE_SITE_VERIFICATION on Netlify */
  ...(process.env.GOOGLE_SITE_VERIFICATION ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } } : {}),
};

const PROMISES = [
  SHOW_CATALOG
    ? { icon: "filter", color: "#1e90ff", title: "Hand-picked, not dumped", text: "We shortlist appliances by energy rating, capacity and brand so you don't scroll through hundreds of listings." }
    : { icon: "filter", color: "#1e90ff", title: "Filtered, not dumped", text: "Only products rated above 3 stars on Amazon and discounted against Amazon's listed price make it in, so you don't scroll through hundreds of listings." },
  { icon: "rupee", color: "#16a34a", title: "Sorted by budget", text: `Every ${SHOW_CATALOG ? "pick" : "deal"} sits in a clear price band, so you only see what fits your wallet.` },
  { icon: "clock", color: "#7c3aed", title: "Fresh every day", text: "New picks every day at 6 AM, with prices re-checked about every 3 hours." },
  { icon: "shield", color: "#ea580c", title: "Buy where you trust", text: "Check today's price and offers on Amazon. You pay the same price; we may earn a small commission." },
];

async function Year() {
  "use cache";
  cacheLife("days");
  return <>{new Date().getFullYear()}</>;
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const { cats } = await getCatalog();
  return (
    <html lang="en-IN" className={jakarta.variable}>
      <body>
        <header className="top">
          <div className="wrap nav">
            <Link className="logo" href="/">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="logo-mark" src="/logo-mark.jpg" alt="Value Verdict" width={40} height={40} />
              <span>Value <b>Verdict</b></span>
            </Link>
            <Nav cats={cats.map((c) => ({ name: c.name, slug: c.slug }))} />
          </div>
        </header>
        <main>{children}</main>
        <section className="pledges" id="about">
          <div className="wrap">
            {PROMISES.map((p) => (
              <div key={p.title} className="pledge" style={{ "--c": p.color } as React.CSSProperties}>
                <span className="pledge-icon"><SiteIcon name={p.icon} /></span>
                <div><h4>{p.title}</h4><p>{p.text}</p></div>
              </div>
            ))}
          </div>
        </section>
        <footer className="site-footer">
          <div className="wrap">
            <div className="footer-grid">
              <div className="footer-brand">
                <Link className="logo" href="/">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="logo-mark" src="/logo-mark.jpg" alt="" width={40} height={40} />
                  <span>Value <b>Verdict</b></span>
                </Link>
                <p>Today&apos;s best Amazon.in deals, filtered and sorted by budget, with plain-English buying guides so you can decide with confidence.</p>
              </div>
              <nav className="footer-col" aria-label="Categories">
                <h5>Categories</h5>
                {cats.map((c) => <Link key={c.slug} href={`/${c.slug}`}>{c.name}</Link>)}
              </nav>
              <nav className="footer-col" aria-label="Buying guides">
                <h5>Buying guides</h5>
                <Link href="/guides">All guides</Link>
                <Link href="/top-deals">🔥 Today&apos;s Top 100</Link>
                <Link href="/how-we-pick">How we pick deals</Link>
              </nav>
              <nav className="footer-col" aria-label="Company">
                <h5>Company</h5>
                <Link href="/about">About us</Link>
                <Link href="/affiliate-disclosure">Affiliate disclosure</Link>
                <Link href="/contact">Corrections &amp; contact</Link>
              </nav>
            </div>
            <div className="footer-bottom">
              <p className="footer-note">Prices and offers change often. Always check the latest price and offers on Amazon. As an Amazon Associate, we earn from qualifying purchases.</p>
              <div>© <Year /> Value Verdict</div>
            </div>
          </div>
        </footer>
        <CompareBar />
        <Tracking />
        <LegacyHashRedirect />
      </body>
    </html>
  );
}

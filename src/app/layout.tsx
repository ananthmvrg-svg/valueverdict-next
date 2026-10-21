import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import Link from "next/link";
import { cacheLife } from "next/cache";
import { getCatalog } from "@/lib/catalog";
import { SITE_URL } from "@/lib/config";
import Nav from "@/components/Nav";
import Tracking from "@/components/Tracking";
import LegacyHashRedirect from "@/components/LegacyHashRedirect";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-jakarta" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Value Verdict – Best Appliance Deals in India, Sorted by Budget",
  description: "Hand-picked washing machines and home appliances sorted by budget. Compare type, energy rating and brand, then check today's price on Amazon.",
  icons: { icon: "/favicon.png" },
  openGraph: {
    title: "Value Verdict – Best Deals Sorted by Budget",
    description: "Hand-picked appliances sorted by budget. Compare and check today's price on Amazon.",
    images: ["/hero-logo.jpg"],
    siteName: "Value Verdict",
    type: "website",
  },
};

async function Year() {
  "use cache";
  cacheLife("days");
  return <>{new Date().getFullYear()}</>;
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const { cats } = await getCatalog();
  return (
    <html lang="en" className={jakarta.variable}>
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
        <section className="about" id="about">
          <div className="wrap">
            <div><h4>🔎 Hand-picked, not dumped</h4><p>We shortlist appliances by energy rating, capacity and brand reliability so you don&apos;t scroll through hundreds of listings.</p></div>
            <div><h4>💰 Sorted by budget</h4><p>Every pick sits in a clear price band, so you only see what fits your wallet.</p></div>
            <div><h4>🛒 Buy where you trust</h4><p>Check today&apos;s price and offers on Amazon. You pay the same price; we may earn a small commission.</p></div>
          </div>
        </section>
        <footer>
          <div className="wrap">
            <p className="footer-note">Prices and offers change often. Always check the latest price and offers on Amazon. As an Amazon Associate, we earn from qualifying purchases.</p>
            <div>© <Year /> Value Verdict · <Link href="/">Home</Link></div>
          </div>
        </footer>
        <Tracking />
        <LegacyHashRedirect />
      </body>
    </html>
  );
}

import { cacheLife } from "next/cache";
import type { Metadata } from "next";
import { SITE_URL } from "./config";
import type { DealPick } from "./picks";

/* Search engine helpers: share tags, structured data (JSON-LD) and the month shown in titles. */

const SITE_NAME = "Value Verdict";
const SHARE_IMAGE = "/hero-logo.jpg";

/* "October 2026", India time; cached for a day so pages stay static */
export async function monthYear() {
  "use cache";
  cacheLife("days");
  return new Date().toLocaleString("en-IN", { month: "long", year: "numeric", timeZone: "Asia/Kolkata" });
}

/* title, description, canonical address and share tags (Open Graph, X/Twitter) for one page */
export function pageMeta(title: string, description: string, path: string): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: path, siteName: SITE_NAME, images: [SHARE_IMAGE], type: "website", locale: "en_IN" },
    twitter: { card: "summary_large_image", title, description, images: [SHARE_IMAGE] },
  };
}

/* one <script type="application/ld+json">; "<" escaped so text can't close the tag */
export function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

export const breadcrumbs = (trail: [name: string, path: string][]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: trail.map(([name, path], i) => ({ "@type": "ListItem", position: i + 1, name, item: SITE_URL + path })),
});

/* Google allows product names up to 150 characters; Amazon titles are often longer, so cut at a word */
const shortName = (t: string) => (t.length <= 150 ? t : t.slice(0, 149).replace(/[\s,|(\-–]+\S*$/, "") + "…");

/* the deals shown on a page, as a ranked list of products with their Amazon.in offer.
   No review, rating, shipping or return-policy fields: we don't have that data and won't make it up
   (Google lists those as optional, "non-critical" suggestions). */
export function dealList(name: string, items: DealPick[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    numberOfItems: items.length,
    itemListElement: items.map((x, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Product",
        name: shortName(x.title),
        ...(x.image ? { image: x.image } : {}),
        ...(x.brand ? { brand: { "@type": "Brand", name: x.brand } } : {}),
        ...(x.reason || x.features[0] ? { description: x.reason || x.features[0] } : {}),
        offers: {
          "@type": "Offer",
          url: x.url,
          priceCurrency: "INR",
          price: x.price,
          availability: "https://schema.org/InStock",
          seller: { "@type": "Organization", name: "Amazon.in" },
        },
      },
    })),
  };
}

export const siteData = () => [
  { "@context": "https://schema.org", "@type": "Organization", name: SITE_NAME, url: SITE_URL, logo: `${SITE_URL}/logo-mark.jpg` },
  { "@context": "https://schema.org", "@type": "WebSite", name: SITE_NAME, url: SITE_URL, inLanguage: "en-IN" },
];

/* Site-wide settings. Text you may want to edit lives here. */

export const SITE_URL = "https://valueverdict.in";

/* Supabase database the catalog is read from (edit products in the Supabase table editor).
   This key is the public "publishable" key: the tables only allow reading with it, never changes. */
export const SUPABASE_URL = process.env.SUPABASE_URL || "https://ntgvnmkehpoexthqzasl.supabase.co";
export const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || "sb_publishable_t1ldjRuClUY7mZ1nd0ZFPg_F9aDtxpC";

/* Catalog switch. false = the site shows only live Amazon deals from the API; the products in the
   Supabase "products" table (from the old Google Sheet) stay saved but are hidden everywhere. */
export const SHOW_CATALOG = false;

/* Flipkart switch. false = Amazon-only site: no Flipkart buttons, Flipkart-only products hidden. */
export const SHOW_FLIPKART = false;
export const STORES = SHOW_FLIPKART ? "Amazon or Flipkart" : "Amazon";

/* Tracking IDs; an empty one is simply not loaded. */
export const TRACK = {
  ga4: "G-F3PS67TXM8", // Google Analytics 4
  meta: "", // Meta (Facebook) Pixel ID
  x: "rgwrd", // X (Twitter) Pixel ID
};

/* "why trust these picks" box on every category page; {n} = number of products, {cat} = category name.
   A category can replace the text with its own "promise" column (same placeholders);
   its tags then come from "promise_points", separated by | (empty = no tags). */
export const PICK_PROMISE = {
  title: "Hand-picked by Value Verdict",
  text: "We researched specs, energy ratings, buyer reviews and brand service to shortlist {n} best-value {cat} at every budget, so you don't have to scroll through hundreds of listings.",
  points: ["🔬 Specs & energy ratings compared", "⭐ Buyer reviews checked", "🛠️ Brand service & warranty considered", "💰 Sorted by budget"],
};

/* same box when the site shows only live Amazon deals (SHOW_CATALOG = false); {cat} = category name */
export const DEALS_PROMISE = {
  title: "Today's deals, filtered for you",
  /* "picked by AI" wording is switched off for now; to show it again, use these two lines instead:
  text: "Today's best deals on {cat} from Amazon.in: well-rated products with a real discount, with the top picks chosen by AI from specs, brand, price and discount. Updated at 5 AM and 5 PM.",
  points: ["🔥 Real discounts only", "⭐ Well-rated products", "🏆 Top picks by AI", "🔄 Updated twice a day"], */
  text: "Today's best deals on {cat} from Amazon.in: well-rated products with a real discount, with our top picks for every budget. Updated at 5 AM and 5 PM.",
  points: ["🔥 Real discounts only", "⭐ Well-rated products", "🏆 Top picks for every budget", "🔄 Updated twice a day"],
};

/* one banner per category page, above the product grid */
export const OFFERS_BANNER = "🏦 Bank card offers, no-cost EMI & exchange deals are live on most products — tap a store to see today's price.";

/* Site-wide settings. Text you may want to edit lives here. */

export const SITE_URL = "https://valueverdict.in";

/* Supabase database the catalog is read from (edit products in the Supabase table editor).
   This key is the public "publishable" key: the tables only allow reading with it, never changes. */
export const SUPABASE_URL = process.env.SUPABASE_URL || "https://ntgvnmkehpoexthqzasl.supabase.co";
export const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || "sb_publishable_t1ldjRuClUY7mZ1nd0ZFPg_F9aDtxpC";

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

/* one banner per category page, above the product grid */
export const OFFERS_BANNER = "🏦 Bank card offers, no-cost EMI & exchange deals are live on most products — tap a store to see today's price.";

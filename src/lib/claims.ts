/* Keeps a pick's text true at the moment it's shown, not just when the AI wrote it in the morning.
   Prices are re-checked every 3 hours, and picks are also shown away from the page they were picked for
   (Top 100, home page), so before display:
   1. a sentence or claim whose ₹ price or discount % no longer matches the card is dropped;
   2. page-relative claims ("lowest price on this page", "the only Mini LED here") are dropped outside their
      own list, and price/discount superlatives are re-checked against the other picks in that list;
   3. when a pro and a con are about the same thing ("3 HDMI ports with eARC" / "Only 3 HDMI ports",
      "Lowest price here" / "Higher price than the Haier"), the pro is dropped and the con kept. */

export type Priced = { price: number | null; was: number | null; off: number | null };

const sentences = (t: string) => t.split(/(?<=[.!?])\s+/).filter(Boolean);
const near = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol;

/* ₹27,489 / ₹27k / ₹1.2 lakh → rupees */
function rupeeValues(t: string): { value: number; before: string; rounded: boolean }[] {
  return [...t.matchAll(/₹\s?(\d[\d,]*(?:\.\d+)?)\s*(k\b|lakh\b|l\b)?/gi)].map((m) => {
    const n = Number(m[1].replace(/,/g, "")), unit = (m[2] ?? "").toLowerCase();
    return {
      value: Math.round(n * (unit === "k" ? 1e3 : unit === "lakh" || unit === "l" ? 1e5 : 1)),
      before: t.slice(Math.max(0, m.index! - 14), m.index).toLowerCase(),
      rounded: Boolean(unit),
    };
  });
}

const offOf = (x: Priced) => x.off ?? (x.price && x.was && x.was > x.price ? Math.round((1 - x.price / x.was) * 100) : null);

/* every ₹ and discount figure in the text agrees with the product's current price */
export function pricesAgree(t: string, x: Priced): boolean {
  const price = x.price ?? null, was = x.was ?? null;
  const known = [price, was, price != null && was != null && was > price ? was - price : null].filter((v): v is number => v != null);
  for (const r of rupeeValues(t)) {
    const tol = (v: number) => (r.rounded ? Math.max(1000, v * 0.02) : Math.max(2, v * 0.005));
    if (known.some((v) => near(r.value, v, tol(v)))) continue;
    /* a budget limit: "under ₹25,000" is fine while the price is under it */
    if (price != null && /(under|below|within|less than|up ?to|upto)\s*$/.test(r.before) && price <= r.value) continue;
    if (price != null && /(above|over|more than)\s*$/.test(r.before) && price >= r.value) continue;
    return false;
  }
  const off = offOf(x);
  for (const m of t.matchAll(/(\d{1,2}(?:\.\d)?)\s?%/g)) {
    const around = t.slice(m.index!, m.index! + m[0].length + 24).toLowerCase() + " " + t.slice(Math.max(0, m.index! - 12), m.index).toLowerCase();
    if (!/off|discount|saving|cheaper|reference|listed|list price|mrp/.test(around)) continue; /* "100% copper" */
    if (off == null || !near(Number(m[1]), off, 1)) return false;
  }
  return true;
}

const RELATIVE = /\b(on this page|on the page|here|among (?:these|the|our|today's) picks|than (?:most|the|other|any|similar|budget|cheaper|pricier)\b|the only|only (?:one|model|pick)|lowest|cheapest|least expensive|most affordable|highest[\s-]priced?|highest price|priciest|costliest|most expensive|(?:biggest|deepest|largest|highest|steepest|smallest|lowest) discount|best value|largest|biggest|smallest)\b/i;
const CHEAPEST = /\b(lowest[\s-]pric|cheapest|least expensive|most affordable|lowest price)/i;
const PRICIEST = /\b(highest[\s-]pric|priciest|costliest|most expensive)/i;
const MOST_OFF = /\b(biggest|deepest|largest|highest|steepest) discount|\bmost (?:off|discount)/i;
const LEAST_OFF = /\b(smallest|lowest|least) discount/i;
const PRICE_VS = /\b(cheaper|costlier|pricier|more expensive|less expensive|higher price|lower price|priced (?:above|below))\b[^.]*\bthan\b/i;

/* is a page-relative claim still true among `peers` (the other picks in the same list)? null = shown outside its list */
export function relativeOk(t: string, x: Priced, peers: Priced[] | null): boolean {
  if (!RELATIVE.test(t) && !PRICE_VS.test(t)) return true;
  if (!peers || !peers.length) return false;
  const prices = peers.map((p) => p.price).filter((v): v is number => v != null);
  const offs = peers.map(offOf).filter((v): v is number => v != null);
  const price = x.price, off = offOf(x);
  if (CHEAPEST.test(t) && (price == null || price > Math.min(...prices))) return false;
  if (PRICIEST.test(t) && (price == null || price < Math.max(...prices))) return false;
  if (MOST_OFF.test(t) && (off == null || off < Math.max(...offs))) return false;
  if (LEAST_OFF.test(t) && (off == null || off > Math.min(...offs))) return false;
  if (PRICE_VS.test(t)) {
    /* "than most picks" can be checked against the middle price; "than the Haier model" can't be re-checked */
    if (!/than (?:most|other|the other)\b/i.test(t) || price == null) return false;
    const mid = [...prices].sort((a, b) => a - b)[Math.floor(prices.length / 2)];
    if (/cheaper|less expensive|lower price|priced below/i.test(t) ? price >= mid : price <= mid) return false;
  }
  return true;
}

/* what a short claim is about, so a pro and a con about the same thing can be spotted */
const TOPICS: [string, RegExp][] = [
  ["refresh", /\b\d{2,3}\s?hz\b|refresh/i], ["hdmi", /hdmi/i], ["usb", /\busb\b/i], ["ports", /\bports?\b/i],
  ["price", /\b(price[ds]?|cheap\w*|costl\w*|expensive|afford\w*|pricier|budget)\b/i],
  ["discount", /\bdiscount|% off\b/i], ["stars", /\bstar\b|\bbee\b/i], ["capacity", /\bcapacity\b|\b\d+(?:\.\d)?\s?(?:kg|l|litres?|liters?)\b/i],
  ["storage", /\b(ssd|storage|emmc)\b/i], ["ram", /\bram\b/i], ["battery", /\bbattery\b/i], ["warranty", /\bwarranty\b/i],
];
/* "43% off listed price" is about the discount, not the price */
const topicsOf = (t: string) => new Set(TOPICS.filter(([, re]) => re.test(t.replace(/\b(listed|reference|list|mrp|original)\s+price\b/gi, ""))).map(([k]) => k));

/* a con that speaks against its topic ("Only 3 HDMI ports", "Highest price here"), not one that just states a fact
   ("5 kg spin tub capacity" next to the pro "8 kg wash capacity") */
const AGAINST = /\b(only|just|limited|lacks?|missing|no|not|without|smaller|lower|less|fewer|capped|basic|weak|short(?:er)?|higher[\s-]pric\w*|highest[\s-]pric\w*|costl\w*|pricier|priciest|expensive|smallest|60\s?hz)\b/i;

export function withoutContradictions(pros: string[], cons: string[]): string[] {
  const against = new Set(cons.filter((c) => AGAINST.test(c)).flatMap((c) => [...topicsOf(c)]));
  return pros.filter((p) => ![...topicsOf(p)].some((k) => against.has(k)));
}

/* the pick's texts, checked against its current price and its list (peers; null when shown outside it) */
export function freshClaims<T extends Priced & { reason: string; bestFor: string; strengths: string[]; limitations: string[] }>(x: T, peers: Priced[] | null): T {
  const ok = (t: string) => pricesAgree(t, x) && relativeOk(t, x, peers);
  const limitations = x.limitations.filter(ok);
  return {
    ...x,
    reason: sentences(x.reason).filter(ok).join(" "),
    bestFor: ok(x.bestFor) ? x.bestFor : "",
    limitations,
    strengths: withoutContradictions(x.strengths.filter(ok), limitations),
  };
}

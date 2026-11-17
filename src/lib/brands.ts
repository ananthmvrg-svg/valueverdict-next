/* After-sales service, the second thing Indian buyers of big appliances check. This is an editorial list kept by
   Value Verdict (edit it as you learn): brands that run their own service network across India, with technicians
   in most cities. The AI uses it only to rank (a ranking signal, like price or specs); it never writes about a
   brand's reputation. Brands not listed are "unknown", not bad. Keys are lower case. */
export const NATIONWIDE_SERVICE = new Set([
  /* appliances */
  "lg", "samsung", "whirlpool", "godrej", "haier", "panasonic", "bosch", "ifb", "voltas", "blue star", "daikin",
  "hitachi", "carrier", "lloyd", "sony", "philips", "xiaomi", "mi", "tcl", "bajaj", "havells", "crompton", "v-guard",
  "ao smith", "a. o. smith", "racold", "usha", "orient", "kent", "aquaguard", "eureka forbes", "prestige", "elica",
  "faber", "glen", "hindware", "kutchina", "sunflame", "pigeon", "morphy richards", "liebherr", "toshiba", "sharp",
  "onida", "videocon", "kelvinator",
  /* laptops */
  "hp", "dell", "lenovo", "asus", "acer", "apple", "msi",
]);

export function serviceOf(brand?: string | null): "nationwide" | "unknown" {
  const b = String(brand || "").trim().toLowerCase().replace(/\s+/g, " ");
  return NATIONWIDE_SERVICE.has(b) || [...NATIONWIDE_SERVICE].some((n) => b.startsWith(n + " ")) ? "nationwide" : "unknown";
}

/* Brand, the first thing Indian buyers check: the brands most buyers already trust for each product type (market
   leaders with a long record in India). Editorial, like the service list; used only to rank, never written about.
   "top" = these; "known" = a brand with a nationwide service network (above); anything else "other" (not bad,
   just less known). Keys are category slugs and lower-case brands. */
export const TOP_BRANDS: Record<string, string[]> = {
  refrigerators: ["lg", "samsung", "whirlpool", "godrej", "haier", "bosch", "panasonic", "liebherr"],
  "washing-machines": ["lg", "samsung", "ifb", "bosch", "whirlpool", "panasonic", "godrej", "haier"],
  tvs: ["sony", "samsung", "lg", "tcl", "xiaomi", "mi", "hisense", "oneplus", "panasonic"],
  "air-conditioners": ["daikin", "voltas", "blue star", "lg", "samsung", "hitachi", "carrier", "panasonic", "lloyd"],
  laptops: ["hp", "dell", "lenovo", "asus", "apple", "acer", "msi"],
  "soundbars-speakers": ["sony", "jbl", "bose", "samsung", "lg", "philips", "boat", "zebronics"],
  "home-appliances": ["philips", "bajaj", "prestige", "havells", "panasonic", "morphy richards", "kent", "aquaguard", "eureka forbes", "lg", "samsung", "ifb", "dyson"],
  geysers: ["ao smith", "a. o. smith", "racold", "bajaj", "havells", "v-guard", "crompton", "venus", "usha"],
  "fridge-accessories": ["v-guard", "microtek", "luminous", "everest", "bluebird", "havells"],
};

export function brandTier(category: string, brand?: string | null): "top" | "known" | "other" {
  const b = String(brand || "").trim().toLowerCase().replace(/\s+/g, " ");
  const top = TOP_BRANDS[category] || [];
  if (top.some((t) => b === t || b.startsWith(t + " "))) return "top";
  return serviceOf(brand) === "nationwide" ? "known" : "other";
}

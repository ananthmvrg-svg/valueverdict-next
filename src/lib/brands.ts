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

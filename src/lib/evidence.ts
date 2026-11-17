import type { Deal } from "./amazon";

/* Checks that a short AI claim about a product is backed by the data the AI was given.
   1. Claims about things the AI cannot know from a listing (reliability, durability, reviews, ratings,
      popularity, price history) are rejected outright.
   2. Every number in the claim must appear in the product's own data (title, features, specs, price),
      e.g. "8 kg drum" needs an 8, "₹27,489" or "₹27k" needs that price.
   3. Feature words (inverter, steam, frost free, 4K, QLED, RTX, Dolby Atmos…) must appear in that data too.
   4. A refresh rate in the claim must match the native rate we read from the listing, so a boosted
      "120Hz DLG" figure can't be passed off as the panel's real 60 Hz. */

const UNKNOWABLE = /\b(reliab\w*|durab\w*|long[\s-]*lasting|trusted|trustworthy|customers?|reviews?|reviewed|rated|ratings?\s+of|best[\s-]*sell\w*|top[\s-]*sell\w*|popular\w*|satisf\w*|lowest[\s-]*ever|all[\s-]*time|historic\w*|never\s+been\s+cheaper|genuine\s+discount|real\s+discount\s+of|guaranteed?|lifetime|track\s+record|(?:well|less|lesser|little)[\s-]*known|known\s+brand|established|reputed|reputation)\b/i;

const FEATURES: RegExp[] = [
  /\binverter\b/i, /\bsteam\b/i, /\bwi-?fi\b/i, /\bfrost[\s-]*free\b/i, /\bdirect[\s-]*cool\b/i, /\bconvertible\b/i,
  /\bfront[\s-]*load/i, /\btop[\s-]*load/i, /\bsemi[\s-]*automatic\b/i, /\bfully[\s-]*automatic\b/i, /\bheater\b/i, /\bcopper\b/i,
  /\bsplit\b/i, /\bwindow\b/i, /\b4k\b/i, /\b8k\b/i, /\bfull\s*hd\b/i, /\bfhd\b/i, /\bqled\b/i, /\boled\b/i, /\bmini[\s-]*led\b/i,
  /\bnano\s*cell\b/i, /\bgoogle\s*tv\b/i, /\bandroid\s*tv\b/i, /\bweb\s*os\b/i, /\btizen\b/i, /\bfire\s*tv\b/i, /\bdolby\s*atmos\b/i,
  /\bdolby\s*vision\b/i, /\bhdr10\+?/i, /\brtx\b/i, /\bgtx\b/i, /\bssd\b/i, /\bddr5\b/i, /\btouch\s*screen\b/i, /\bbacklit\b/i,
  /\bfingerprint\b/i, /\bsubwoofer\b/i, /\bbluetooth\b/i, /\banc\b/i, /\bnoise[\s-]*cancell\w*/i, /\bamoled\b/i, /\bip6\d\b/i,
  /\bfast\s*charg\w*/i, /\bdual[\s-]*band\b/i, /\bside[\s-]*by[\s-]*side\b/i,
];

const sourceText = (x: Deal) => [x.title, x.brand, x.deal, ...(x.features || []), ...Object.entries(x.specs || {}).map(([k, v]) => `${k} ${v}`)].join(" ").replace(/_/g, " ");

/* all numbers in the product's own data, plus its prices in thousands ("27k") and lakhs */
function knownNumbers(x: Deal): Set<string> {
  const src = [x.title, x.brand, x.deal, ...(x.features || []), ...Object.values(x.specs || {}).map(String)].join(" ");
  const nums = new Set<string>();
  for (const m of src.replace(/(\d),(?=\d)/g, "$1").matchAll(/\d+(?:\.\d+)?/g)) nums.add(String(Number(m[0])));
  for (const v of [x.price, x.was, x.off]) {
    if (v == null) continue;
    const n = Math.round(Number(v));
    nums.add(String(n));
    nums.add(String(Math.round(n / 1000))); nums.add(String(Math.floor(n / 1000)));
    nums.add(String(Math.round(n / 100) / 10)); nums.add(String(Math.round(n / 1e5 * 100) / 100));
  }
  if (x.price != null && x.was != null && x.was > x.price) {
    const save = Math.round(x.was - x.price);
    nums.add(String(save)); nums.add(String(Math.round(save / 1000))); nums.add(String(Math.floor(save / 1000)));
  }
  return nums;
}

export function supported(claim: string, x: Deal): boolean {
  const c = (claim || "").trim();
  if (!c || UNKNOWABLE.test(c)) return false;
  const src = sourceText(x);
  if (FEATURES.some((re) => re.test(c) && !re.test(src))) return false;
  const native = Number(x.specs?.refresh_hz);
  if (native && [...c.matchAll(/\b(\d{2,3})\s*(?:Hz|Hertz)\b/gi)].some((m) => Number(m[1]) !== native)) return false;
  const known = knownNumbers(x);
  for (const m of c.replace(/(\d),(?=\d)/g, "$1").matchAll(/\d+(?:\.\d+)?/g)) {
    if (!known.has(String(Number(m[0])))) return false;
  }
  return true;
}

/* keeps only supported claims, trimmed, at most `max` */
export const keepSupported = (claims: unknown, x: Deal, max: number) =>
  (Array.isArray(claims) ? claims : []).map((c) => String(c ?? "").trim().slice(0, 120)).filter((c) => supported(c, x)).slice(0, max);

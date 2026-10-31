/* Helpers shared by the reel kit (generate.mjs) and the Telegram channel poster (channel.mjs). */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

/* site URL and the public read-only Supabase key come from the website config: one source of truth */
const config = readFileSync(join(here, "..", "src", "lib", "config.ts"), "utf8");
const pick = (re) => config.match(re)?.[1];
export const SITE_URL = (pick(/SITE_URL\s*=\s*"([^"]+)"/) || "https://valueverdict.in").replace(/\/$/, "");
export const SUPABASE_URL = process.env.SUPABASE_URL || pick(/SUPABASE_URL\s*=.*?"(https:[^"]+)"/);
export const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || pick(/SUPABASE_KEY\s*=.*?"(sb_[^"]+)"/);


export async function select(table, query) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, { headers: { apikey: SUPABASE_KEY } });
  if (!r.ok) throw new Error(`Supabase ${table}: HTTP ${r.status} ${await r.text()}`);
  return r.json();
}

/* "Haier 258 L 3 Star Inverter … (HEF-25TDS, Dazzle Steel)" → "258 L 3 Star Inverter …" */
export function shortName(title, brand) {
  const parts = String(title || "").replace(/\s*[(\[][^)\]]*[)\]]/g, "").split(/\s\|\s?|\s[-–]\s/)[0].split(/,\s/);
  let t = parts.shift().trim();
  while (t.length < 28 && parts.length) t += ", " + parts.shift().trim(); /* "LG 276 L, 2 Star, Smart Inverter" */
  if (brand && t.toLowerCase().startsWith(brand.toLowerCase() + " ")) t = t.slice(brand.length + 1);
  /* too little left (e.g. "PUMA" from "PUMA, Men's Running Shoe"): use more of the title */
  if (t.length < 12 || (brand && t.toLowerCase() === brand.toLowerCase())) {
    t = String(title || "").replace(/\s*[(\[][^)\]]*[)\]]/g, "").replace(/\s*[|,]\s*/g, " ").trim();
    if (brand && t.toLowerCase().startsWith(brand.toLowerCase())) t = t.slice(brand.length).trim();
  }
  if (t.length > 70) t = t.slice(0, 70).replace(/\s+\S*$/, "") + "…";
  return t;
}
/* no prices or discounts on a reel: they go stale (and Amazon requires shown prices to be current) */
export const PRICEY = /₹|%|\boff\b|price|cheap|discount|deal\b/i;
export const clean = (xs) => (xs || []).map((s) => String(s).trim()).filter((s) => s && !PRICEY.test(s));
export const brandCase = (b) => (b && b === b.toLowerCase() || b === b.toUpperCase() && b.length > 3 ? b.charAt(0).toUpperCase() + b.slice(1).toLowerCase() : b);


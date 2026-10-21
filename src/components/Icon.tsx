/* Product/category icons, picked from the category name / product type (door_type) / product name.
   The sheet's "icon" column can override: an image URL, an emoji, or one of the keys below. */
import type { Category, Product } from "@/lib/products";

const PATHS: Record<string, string> = {
  "front-load": `<rect x="10" y="5" width="44" height="54" rx="7"/><path d="M10 17h44"/><circle cx="17" cy="11" r="1.6" fill="currentColor"/><circle cx="23" cy="11" r="1.6" fill="currentColor"/><rect x="36" y="9" width="12" height="4" rx="2"/><circle cx="32" cy="38" r="14"/><circle cx="32" cy="38" r="9" opacity=".5"/><path d="M24 41c2.5-2.5 5 2.5 8 0s5.5 2.5 8 0" opacity=".8"/>`,
  "top-load": `<path d="M13 15V9a3 3 0 0 1 3-3h32a3 3 0 0 1 3 3v6"/><rect x="10" y="15" width="44" height="44" rx="6"/><path d="M10 25h44"/><circle cx="18" cy="20" r="1.6" fill="currentColor"/><circle cx="24" cy="20" r="1.6" fill="currentColor"/><rect x="36" y="18" width="12" height="4" rx="2"/><ellipse cx="32" cy="42" rx="13" ry="10"/><path d="M24 43c2.5-2.5 5 2.5 8 0s5.5 2.5 8 0" opacity=".8"/>`,
  fridge: `<rect x="16" y="4" width="32" height="54" rx="5"/><path d="M16 24h32"/><path d="M22 11v7M22 30v12"/><path d="M20 58v3M44 58v3"/>`,
  mixer: `<path d="M20 8h24l-3 26H23z"/><path d="M44 12h5a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3h-6"/><path d="M18 8h28"/><rect x="16" y="38" width="32" height="20" rx="5"/><circle cx="32" cy="48" r="4"/><path d="M27 34h10"/>`,
  "water-purifier": `<rect x="14" y="4" width="36" height="56" rx="6"/><path d="M32 15c-5 7-7 10-7 13a7 7 0 0 0 14 0c0-3-2-6-7-13z"/><path d="M14 44h36"/><path d="M36 44v5h6"/><circle cx="22" cy="52" r="1.6" fill="currentColor"/>`,
  "air-purifier": `<rect x="16" y="4" width="32" height="56" rx="10"/><circle cx="32" cy="16" r="5"/><path d="M23 30h18M23 36h18M23 42h18M23 48h18"/>`,
  dishwasher: `<rect x="10" y="5" width="44" height="54" rx="6"/><path d="M10 17h44"/><path d="M24 11h16"/><circle cx="16" cy="11" r="1.6" fill="currentColor"/><path d="M18 30h28M18 42h28"/><path d="M22 30v-5M28 30v-6M34 30v-5M40 30v-6"/><path d="M22 42v-5M28 42v-5M34 42v-5M40 42v-5"/>`,
  "air-fryer": `<path d="M14 18c0-7 6-12 18-12s18 5 18 12v32a8 8 0 0 1-8 8H22a8 8 0 0 1-8-8z"/><rect x="20" y="30" width="24" height="20" rx="4"/><path d="M28 40h8"/><circle cx="32" cy="18" r="4"/>`,
  cooktop: `<rect x="4" y="22" width="56" height="26" rx="5"/><ellipse cx="17" cy="32" rx="7" ry="4"/><ellipse cx="47" cy="32" rx="7" ry="4"/><ellipse cx="32" cy="38" rx="6" ry="3.5"/><circle cx="12" cy="44" r="1.6" fill="currentColor"/><circle cx="52" cy="44" r="1.6" fill="currentColor"/>`,
  chimney: `<rect x="24" y="4" width="16" height="22"/><path d="M24 26h16l18 20H6z"/><path d="M6 46h52v6H6z"/>`,
  geyser: `<rect x="18" y="4" width="28" height="46" rx="12"/><path d="M26 50v8M38 50v8"/><path d="M28 17c-3 4 3 6 0 10M36 17c-3 4 3 6 0 10"/><circle cx="32" cy="39" r="3"/>`,
  stabilizer: `<rect x="8" y="12" width="48" height="40" rx="6"/><path d="M35 18l-9 15h9l-6 13 13-18h-9l5-10z"/><circle cx="16" cy="46" r="1.6" fill="currentColor"/>`,
  home: `<path d="M8 30L32 8l24 22"/><path d="M14 25v31h36V25"/><rect x="26" y="38" width="12" height="18"/>`,
  generic: `<path d="M12 20h40l-3 36H15z"/><path d="M23 24v-8a9 9 0 0 1 18 0v8"/>`,
};
PATHS["washing-machine"] = PATHS["front-load"];

function iconKey(t?: string) {
  t = String(t || "").toLowerCase();
  if (/dish ?wash/.test(t)) return "dishwasher";
  if (/top[\s-]*load|semi[\s-]*auto/.test(t)) return "top-load";
  if (/front[\s-]*load|washing|washer/.test(t)) return "front-load";
  if (/mixer|grinder|juicer|blender/.test(t)) return "mixer";
  if (/air ?fryer/.test(t)) return "air-fryer";
  if (/air purifier/.test(t)) return "air-purifier";
  if (/purifier|\bro\b/.test(t)) return "water-purifier";
  if (/chimney/.test(t)) return "chimney";
  if (/cooktop|stove|burner|\bhob\b/.test(t)) return "cooktop";
  if (/geyser|water heater/.test(t)) return "geyser";
  if (/stabili[sz]er/.test(t)) return "stabilizer";
  if (/fridge|refrigerator|single door|double door|triple door|convertible|side by side/.test(t)) return "fridge";
  if (/home|appliance|kitchen/.test(t)) return "home";
  return "";
}

/* explicit URL or key wins; otherwise detect from the given texts; emoji only as last resort */
function Icon({ icon, texts }: { icon?: string; texts: (string | undefined)[] }) {
  const ic = String(icon || "").trim();
  // eslint-disable-next-line @next/next/no-img-element
  if (/^https?:/.test(ic)) return <img src={ic} alt="" />;
  const key = PATHS[ic.toLowerCase()] ? ic.toLowerCase() : texts.map(iconKey).find(Boolean);
  if (!key && ic) return <>{ic}</>;
  return (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: PATHS[key || "generic"] }} />
  );
}

export const CatIcon = ({ cat }: { cat?: Category }) => <Icon icon={cat?.icon} texts={[cat?.name, cat?.slug]} />;

export function ProdIcon({ p, cat }: { p: Product; cat?: Category }) {
  const ic = String(p.icon || "").trim();
  const explicit = /^https?:/.test(ic) || PATHS[ic.toLowerCase()];
  return <Icon icon={explicit ? ic : ""} texts={[p.door_type, p.name, cat?.name]} />;
}

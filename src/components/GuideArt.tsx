/* Flat illustrations and colour themes per category, for buying guides and the home page category cards
   (inline SVG, no image files). */

export const GUIDE_THEME: Record<string, { from: string; to: string; ink: string; label: string }> = {
  tvs: { from: "#1e3a8a", to: "#7c3aed", ink: "#c7d2fe", label: "TVs" },
  refrigerators: { from: "#0e7490", to: "#22d3ee", ink: "#cffafe", label: "Refrigerators" },
  "washing-machines": { from: "#1d4ed8", to: "#38bdf8", ink: "#dbeafe", label: "Washing machines" },
  "air-conditioners": { from: "#0f766e", to: "#5eead4", ink: "#ccfbf1", label: "Air conditioners" },
  laptops: { from: "#334155", to: "#64748b", ink: "#e2e8f0", label: "Laptops" },
  "soundbars-speakers": { from: "#9a3412", to: "#f59e0b", ink: "#ffedd5", label: "Soundbars & speakers" },
  "amazon-finds": { from: "#be185d", to: "#fb7185", ink: "#ffe4e6", label: "Amazon Finds" },
  "fridge-accessories": { from: "#155e75", to: "#67e8f9", ink: "#cffafe", label: "Fridge accessories" },
  "home-appliances": { from: "#b45309", to: "#fbbf24", ink: "#fef3c7", label: "Home appliances" },
};
const FALLBACK = { from: "#0b1530", to: "#1e90ff", ink: "#dbeafe", label: "Guide" };
export const themeFor = (category: string) => GUIDE_THEME[category] ?? FALLBACK;

const W = "#ffffff";

function Tv() {
  return (
    <>
      <rect x="10" y="10" width="100" height="60" rx="5" fill="#0f172a" />
      <rect x="15" y="15" width="90" height="50" rx="2" fill="url(#vv-tv-screen)" />
      <path d="M15 52 L40 34 L58 48 L72 38 L105 58 L105 65 L15 65 Z" fill={W} opacity=".25" />
      <circle cx="88" cy="26" r="6" fill={W} opacity=".5" />
      <rect x="54" y="70" width="12" height="7" fill="#0f172a" />
      <rect x="38" y="77" width="44" height="4" rx="2" fill="#0f172a" />
      <defs><linearGradient id="vv-tv-screen"x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#60a5fa" /><stop offset="1" stopColor="#c084fc" /></linearGradient></defs>
    </>
  );
}
function Fridge() {
  return (
    <>
      <rect x="35" y="4" width="50" height="82" rx="6" fill={W} />
      <rect x="35" y="4" width="50" height="30" rx="6" fill="#e0f2fe" />
      <line x1="35" y1="34" x2="85" y2="34" stroke="#94a3b8" strokeWidth="2" />
      <rect x="75" y="12" width="4" height="14" rx="2" fill="#64748b" />
      <rect x="75" y="42" width="4" height="22" rx="2" fill="#64748b" />
      <path d="M45 16 l4 4 l-4 4 M49 20 h-8" stroke="#38bdf8" strokeWidth="2" fill="none" strokeLinecap="round" />
      <rect x="40" y="86" width="6" height="3" fill="#475569" /><rect x="74" y="86" width="6" height="3" fill="#475569" />
    </>
  );
}
function Washer() {
  return (
    <>
      <rect x="25" y="6" width="70" height="80" rx="7" fill={W} />
      <rect x="25" y="6" width="70" height="16" rx="7" fill="#e2e8f0" />
      <circle cx="37" cy="14" r="3" fill="#38bdf8" /><circle cx="47" cy="14" r="3" fill="#94a3b8" />
      <rect x="66" y="11" width="22" height="6" rx="3" fill="#94a3b8" />
      <circle cx="60" cy="53" r="24" fill="#cbd5e1" />
      <circle cx="60" cy="53" r="18" fill="#7dd3fc" />
      <path d="M44 56 q8 -8 16 0 t16 0 v10 a18 18 0 0 1 -32 0 Z" fill="#0284c7" opacity=".7" />
    </>
  );
}
function Ac() {
  return (
    <>
      <rect x="8" y="14" width="104" height="34" rx="9" fill={W} />
      <rect x="16" y="38" width="88" height="5" rx="2.5" fill="#cbd5e1" />
      <circle cx="98" cy="24" r="3" fill="#22c55e" />
      <text x="20" y="30" fontSize="11" fontFamily="sans-serif" fontWeight="700" fill="#0f766e">24°</text>
      {[30, 50, 70, 90].map((x) => (
        <path key={x} d={`M${x} 54 q-5 8 0 16 q5 8 0 16`} stroke={W} strokeWidth="2.5" fill="none" opacity=".75" strokeLinecap="round" />
      ))}
    </>
  );
}
function Laptop() {
  return (
    <>
      <rect x="22" y="10" width="76" height="50" rx="4" fill="#0f172a" />
      <rect x="27" y="15" width="66" height="40" rx="2" fill="#38bdf8" />
      <rect x="33" y="22" width="30" height="4" rx="2" fill={W} opacity=".8" />
      <rect x="33" y="30" width="44" height="3" rx="1.5" fill={W} opacity=".5" />
      <rect x="33" y="36" width="38" height="3" rx="1.5" fill={W} opacity=".5" />
      <rect x="33" y="42" width="24" height="3" rx="1.5" fill={W} opacity=".5" />
      <path d="M10 62 h100 l-6 10 h-88 Z" fill="#e2e8f0" />
      <rect x="50" y="63" width="20" height="3" rx="1.5" fill="#94a3b8" />
    </>
  );
}
function Soundbar() {
  return (
    <>
      <rect x="6" y="30" width="80" height="20" rx="10" fill="#1f2937" />
      {[16, 26, 36, 46, 56, 66, 76].map((x) => <circle key={x} cx={x} cy="40" r="2.5" fill="#6b7280" />)}
      <rect x="90" y="24" width="24" height="56" rx="6" fill="#1f2937" />
      <circle cx="102" cy="58" r="9" fill="#374151" /><circle cx="102" cy="58" r="4" fill="#6b7280" />
      <circle cx="102" cy="36" r="4" fill="#374151" />
      {[0, 1, 2].map((i) => (
        <path key={i} d={`M${36 + i * 10} ${24 - i * 6} q10 -8 20 0`} stroke={W} strokeWidth="2.5" fill="none" opacity={0.85 - i * 0.2} strokeLinecap="round" />
      ))}
    </>
  );
}
function Bag() {
  return (
    <>
      <path d="M44 30 v-6 a16 16 0 0 1 32 0 v6" stroke={W} strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M28 30 h64 l-5 54 h-54 Z" fill={W} />
      <path d="M28 30 h64 l-1 10 h-62 Z" fill="#fecdd3" />
      <path d="M60 50 l4 8 l9 1 l-7 6 l2 9 l-8 -5 l-8 5 l2 -9 l-7 -6 l9 -1 Z" fill="#f43f5e" />
    </>
  );
}
function Stabilizer() {
  return (
    <>
      <rect x="22" y="14" width="76" height="62" rx="8" fill={W} />
      <circle cx="48" cy="44" r="18" fill="#e0f2fe" />
      <path d="M34 48 a14 14 0 0 1 28 0" stroke="#0891b2" strokeWidth="4" fill="none" strokeLinecap="round" />
      <line x1="48" y1="48" x2="56" y2="36" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
      <rect x="72" y="28" width="16" height="8" rx="3" fill="#22c55e" />
      <rect x="72" y="42" width="16" height="8" rx="3" fill="#cbd5e1" />
      <path d="M80 56 l-5 9 h5 l-3 8 l9 -11 h-6 l3 -6 Z" fill="#f59e0b" />
    </>
  );
}
function AirFryer() {
  return (
    <>
      <path d="M34 12 h52 a8 8 0 0 1 8 8 v58 a8 8 0 0 1 -8 8 h-52 a8 8 0 0 1 -8 -8 v-58 a8 8 0 0 1 8 -8 Z" fill="#1f2937" />
      <rect x="40" y="20" width="40" height="12" rx="4" fill="#111827" />
      <text x="47" y="29.5" fontSize="9" fontFamily="sans-serif" fontWeight="700" fill="#fbbf24">180°</text>
      <rect x="32" y="44" width="56" height="34" rx="6" fill="#374151" />
      <rect x="50" y="56" width="20" height="6" rx="3" fill="#9ca3af" />
      {[48, 60, 72].map((x) => <path key={x} d={`M${x} 10 q-4 -5 0 -10`} stroke={W} strokeWidth="2" fill="none" opacity=".7" strokeLinecap="round" />)}
    </>
  );
}
function Book() {
  return <path d="M20 15 h35 a5 5 0 0 1 5 5 v60 a5 5 0 0 0 -5 -5 h-35 Z M100 15 h-35 a5 5 0 0 0 -5 5 v60 a5 5 0 0 1 5 -5 h35 Z" fill={W} />;
}

const ART: Record<string, () => React.ReactElement> = {
  tvs: Tv, refrigerators: Fridge, "washing-machines": Washer, "air-conditioners": Ac, laptops: Laptop, "soundbars-speakers": Soundbar,
  "amazon-finds": Bag, "fridge-accessories": Stabilizer, "home-appliances": AirFryer,
};

export function GuideArt({ category, className }: { category: string; className?: string }) {
  const Art = ART[category] ?? Book;
  return <svg className={className} viewBox="0 0 120 90" aria-hidden="true" focusable="false"><Art /></svg>;
}

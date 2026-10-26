/* Small line icons for the home page steps and the promises above the footer (inline SVG, currentColor). */

const P = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;

const PATHS: Record<string, React.ReactElement> = {
  book: <><path {...P} d="M4 5a2 2 0 0 1 2-2h5v17H6a2 2 0 0 0-2 2Z" /><path {...P} d="M20 5a2 2 0 0 0-2-2h-5v17h5a2 2 0 0 1 2 2Z" /></>,
  wallet: <><rect {...P} x="3" y="6" width="18" height="14" rx="3" /><path {...P} d="M3 10h18M16 15h2" /><path {...P} d="M6 6l9-3 2 3" /></>,
  compare: <><rect {...P} x="3" y="4" width="7" height="16" rx="2" /><rect {...P} x="14" y="4" width="7" height="16" rx="2" /><path {...P} d="M6 9h1M17 9h1M6 13h1M17 13h1" /></>,
  cart: <><path {...P} d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6" /><circle {...P} cx="10" cy="20" r="1" /><circle {...P} cx="17" cy="20" r="1" /></>,
  filter: <><path {...P} d="M3 5h18l-7 8v6l-4 2v-8Z" /></>,
  rupee: <><path {...P} d="M6 4h12M6 9h12M6 4c7 0 7 10 0 10l8 7" /></>,
  shield: <><path {...P} d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6Z" /><path {...P} d="M8.5 12l2.5 2.5 4.5-5" /></>,
  clock: <><circle {...P} cx="12" cy="12" r="9" /><path {...P} d="M12 7v5l3 2" /></>,
};

export function SiteIcon({ name, className }: { name: string; className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">{PATHS[name]}</svg>;
}

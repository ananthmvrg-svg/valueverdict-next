/* Festival decorations (inline SVG, no image files); shown only while a festival runs (lib/festival.ts). */

function Diya({ x, delay }: { x: number; delay: number }) {
  return (
    <g transform={`translate(${x} 0)`}>
      <ellipse cx="30" cy="20" rx="14" ry="18" fill="url(#vv-glow)" />
      <path className="diya-flame" style={{ animationDelay: `${delay}s` }} d="M30 6c4 6 6 10 6 14a6 6 0 0 1-12 0c0-4 2-8 6-14Z" fill="url(#vv-flame)" />
      <path d="M8 30h44c-2 10-11 16-22 16S10 40 8 30Z" fill="#c2410c" />
      <path d="M8 30h44c-1 3-3 5-5 7H13c-2-2-4-4-5-7Z" fill="#ea580c" />
      <circle cx="18" cy="38" r="1.6" fill="#fde68a" /><circle cx="30" cy="40" r="1.6" fill="#fde68a" /><circle cx="42" cy="38" r="1.6" fill="#fde68a" />
    </g>
  );
}

/* a row of lit diyas along the bottom of the home page hero */
export function DiyaRow() {
  return (
    <svg className="diya-row" viewBox="0 0 300 50" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="vv-glow"><stop offset="0" stopColor="#fde68a" stopOpacity=".7" /><stop offset="1" stopColor="#f59e0b" stopOpacity="0" /></radialGradient>
        <linearGradient id="vv-flame" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="#f97316" /><stop offset=".6" stopColor="#fbbf24" /><stop offset="1" stopColor="#fef3c7" /></linearGradient>
      </defs>
      <Diya x={0} delay={0} /><Diya x={80} delay={0.4} /><Diya x={160} delay={0.8} /><Diya x={240} delay={0.2} />
    </svg>
  );
}

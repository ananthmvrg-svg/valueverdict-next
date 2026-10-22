import { DEALS_PROMISE, PICK_PROMISE } from "@/lib/config";

/* "Hand-picked by Value Verdict" box under each category heading; deals = the page shows only live Amazon deals */
export default function PromiseBox({ n, catName, custom, customPoints, deals }: { n: number | string; catName: string; custom?: string; customPoints?: string; deals?: boolean }) {
  const base = deals ? DEALS_PROMISE : PICK_PROMISE;
  const points = custom ? String(customPoints || "").split("|").map((t) => t.trim()).filter(Boolean) : base.points;
  const text = (custom || base.text).replace("{n}", String(n)).replace("{cat}", catName.toLowerCase());
  return (
    <div className="promise">
      <span className="promise-mark">✓</span>
      <div>
        <h3>{base.title}</h3>
        <p>{text}</p>
        {points.length > 0 && <div className="promise-points">{points.map((t) => <span key={t}>{t}</span>)}</div>}
      </div>
    </div>
  );
}

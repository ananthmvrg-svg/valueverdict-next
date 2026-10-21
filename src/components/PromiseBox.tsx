import { PICK_PROMISE } from "@/lib/config";

/* "Hand-picked by Value Verdict" box under each category heading */
export default function PromiseBox({ n, catName, custom, customPoints }: { n: number | string; catName: string; custom?: string; customPoints?: string }) {
  const points = custom ? String(customPoints || "").split("|").map((t) => t.trim()).filter(Boolean) : PICK_PROMISE.points;
  const text = (custom || PICK_PROMISE.text).replace("{n}", String(n)).replace("{cat}", catName.toLowerCase());
  return (
    <div className="promise">
      <span className="promise-mark">✓</span>
      <div>
        <h3>{PICK_PROMISE.title}</h3>
        <p>{text}</p>
        {points.length > 0 && <div className="promise-points">{points.map((t) => <span key={t}>{t}</span>)}</div>}
      </div>
    </div>
  );
}

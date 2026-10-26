import { DEALS_PROMISE, PICK_PROMISE } from "@/lib/config";
import { GuideArt } from "./GuideArt";

/* "Today's deals, filtered for you" box under each category heading; deals = the page shows only live Amazon deals.
   category: shows that category's drawing in its colours (set on the page as --g-from / --g-to); updated: "26 Oct, 6:00 am". */
export default function PromiseBox({ n, catName, custom, customPoints, deals, category, updated }: {
  n: number | string; catName: string; custom?: string; customPoints?: string; deals?: boolean; category?: string; updated?: string;
}) {
  const base = deals ? DEALS_PROMISE : PICK_PROMISE;
  const points = custom ? String(customPoints || "").split("|").map((t) => t.trim()).filter(Boolean) : base.points;
  /* lower case for the sentence, but keep short forms as written: "TVs", "ACs" */
  const lower = catName.split(" ").map((w) => (/[A-Z].*[A-Z]/.test(w) ? w : w.toLowerCase())).join(" ");
  const text = (custom || base.text).replace("{n}", String(n)).replace("{cat}", lower);
  return (
    <div className="promise">
      <div className="promise-head">
        <span className="promise-art" aria-hidden="true">{category ? <GuideArt category={category} /> : "✓"}</span>
        <div className="promise-main">
          <div className="promise-top">
            <h3>{base.title}</h3>
            {updated && <span className="promise-updated"><i aria-hidden="true" />Updated {updated} IST</span>}
          </div>
          <p>{text}</p>
        </div>
      </div>
      {/* the points span the whole box, below the drawing and the text */}
      {points.length > 0 && (
        <ul className="promise-points">
          {points.map((t) => {
            /* "🔥 Real discounts only" → icon + text */
            const m = t.match(/^(\p{Extended_Pictographic}️?)\s*(.*)$/u);
            return <li key={t}>{m && <span className="promise-emoji" aria-hidden="true">{m[1]}</span>}<span>{m ? m[2] : t}</span></li>;
          })}
        </ul>
      )}
    </div>
  );
}

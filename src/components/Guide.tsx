import Link from "next/link";
import type { Faq, Guide, GuideSection } from "@/lib/guides";
import { JsonLd, faqPage } from "@/lib/seo";

/* Pieces of a buying guide (lib/guides.ts). All text is rendered as plain text, never as HTML. */

export const sectionId = (heading: string) => heading.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function GuideSections({ sections }: { sections: GuideSection[] }) {
  return sections.map((s) => (
    <section key={s.heading} id={sectionId(s.heading)} className="guide-sec">
      <h2>{s.heading}</h2>
      {s.paragraphs.map((p) => <p key={p}>{p}</p>)}
      {s.bullets.length > 0 && <ul>{s.bullets.map((b) => <li key={b}>{b}</li>)}</ul>}
      {s.table && s.table.rows.length > 0 && (
        <div className="guide-table">
          <table>
            <thead><tr>{s.table.head.map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
            <tbody>{s.table.rows.map((r) => <tr key={r.join("|")}>{r.map((c, i) => (i === 0 ? <th key={i} scope="row">{c}</th> : <td key={i}>{c}</td>))}</tr>)}</tbody>
          </table>
        </div>
      )}
    </section>
  ));
}

export function KeyPoints({ points, title = "Key points" }: { points: string[]; title?: string }) {
  if (!points.length) return null;
  return (
    <div className="key-points">
      <h2>{title}</h2>
      <ul>{points.map((p) => <li key={p}>{p}</li>)}</ul>
    </div>
  );
}

/* questions as expandable answers, plus FAQ structured data for search engines */
export function Faqs({ faqs, heading = "Frequently asked questions" }: { faqs: Faq[]; heading?: string }) {
  if (!faqs.length) return null;
  return (
    <section className="faqs" id="faqs">
      <JsonLd data={faqPage(faqs)} />
      <h2>{heading}</h2>
      {faqs.map((f) => (
        <details key={f.q}>
          <summary>{f.q}</summary>
          <p>{f.a}</p>
        </details>
      ))}
    </section>
  );
}

/* shown only in preview (Draft Mode): which version this is and the reviewer notes */
export function PreviewBanner({ guide }: { guide?: Guide }) {
  return (
    <div className="preview-banner" role="status">
      <span><b>Preview</b>{guide ? ` · ${guide.slug} v${guide.version} · ${guide.status}` : ""}. Only you see unpublished drafts.</span>
      <form action="/api/preview" method="post"><button type="submit">Exit preview</button></form>
    </div>
  );
}

/* on category pages: the guide's key points and a link to the full guide */
export function GuideTeaser({ guide, catName }: { guide: Guide; catName: string }) {
  return (
    <aside className="guide-teaser" aria-label={`${catName} buying tips`}>
      <KeyPoints points={guide.summary} title={`Before you buy ${catName}: what matters`} />
      <Link className="guide-link" href={`/guides/${guide.slug}`}>Read the full buying guide: {guide.title} →</Link>
    </aside>
  );
}

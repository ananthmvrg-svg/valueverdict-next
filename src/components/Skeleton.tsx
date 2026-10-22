/* Grey shimmering placeholders shaped like the real page, shown while a page or live deals load. */

export function CardSkeleton() {
  return (
    <div className="card sk-card" aria-hidden="true">
      <div className="sk-row"><span className="sk sk-circle" /><span className="sk" style={{ width: 70 }} /><span className="sk sk-pill" style={{ marginLeft: "auto" }} /></div>
      <span className="sk sk-title" />
      <span className="sk sk-title" style={{ width: "60%" }} />
      <span className="sk" style={{ width: "95%" }} />
      <span className="sk" style={{ width: "75%" }} />
      <div className="sk-row"><span className="sk sk-pill" /><span className="sk sk-pill" /></div>
      <span className="sk sk-btn" />
    </div>
  );
}

export function GridSkeleton({ n = 6 }: { n?: number }) {
  return <div className="grid">{Array.from({ length: n }, (_, i) => <CardSkeleton key={i} />)}</div>;
}

/* whole category / budget page: title, promise box, budget chips, filter bar, product grid */
export function CategorySkeleton() {
  return (
    <section role="status" aria-label="Loading products">
      <div className="wrap">
        <span className="sk" style={{ width: 160, marginBottom: 14 }} />
        <span className="sk sk-h2" />
        <span className="sk" style={{ width: "min(420px, 90%)", marginBottom: 20 }} />
        <div className="sk-box"><span className="sk sk-circle" /><div style={{ flex: 1 }}><span className="sk" style={{ width: 200, marginBottom: 10 }} /><span className="sk" style={{ width: "90%" }} /></div></div>
        <div className="chips">{[48, 120, 120, 120, 120].map((w, i) => <span key={i} className="sk sk-chip" style={{ width: w }} />)}</div>
        <div className="toolbar"><span className="sk sk-input" /><span className="sk sk-select" /><span className="sk sk-select" /></div>
        <GridSkeleton />
      </div>
    </section>
  );
}

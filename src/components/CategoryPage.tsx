import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCatalog, isYes, prodsOfCat, prodsOfSub, subsOf } from "@/lib/catalog";
import { OFFERS_BANNER, SHOW_CATALOG } from "@/lib/config";
import PromiseBox from "./PromiseBox";
import CategoryListing from "./CategoryListing";
import LiveDeals from "./LiveDeals";

async function find(catSlug: string, subSlug?: string) {
  const db = await getCatalog();
  const cat = db.cats.find((c) => c.slug === catSlug);
  if (!cat) notFound();
  const subs = subsOf(db, cat.category_id);
  const sub = subSlug ? subs.find((s) => s.slug === subSlug) : undefined;
  if (subSlug && !sub) notFound();
  return { db, cat, subs, sub };
}

export async function categoryMetadata(catSlug: string, subSlug?: string): Promise<Metadata> {
  const { cat, sub } = await find(catSlug, subSlug);
  return {
    title: sub ? `Best ${cat.name} ${sub.name} – Value Verdict` : `Best ${cat.name} Deals by Budget – Value Verdict`,
    description: (sub?.description || cat.description) || undefined,
    alternates: { canonical: sub ? `/${cat.slug}/${sub.slug}` : `/${cat.slug}` },
  };
}

/* /refrigerators (all budgets, grouped) and /refrigerators/under-25k (one budget) */
export default async function CategoryPage({ catSlug, subSlug }: { catSlug: string; subSlug?: string }) {
  const { db, cat, subs, sub } = await find(catSlug, subSlug);
  const base = sub ? prodsOfSub(db, sub.subcategory_id) : prodsOfCat(db, cat.category_id);
  /* Categories column "amazon_deals" = TRUE: live Amazon deals; with hand-picked products they follow them.
     SHOW_CATALOG = false hides the products, so the page shows only live deals. */
  const live = isYes(cat.amazon_deals), showSheet = SHOW_CATALOG && (base.length > 0 || !live);
  const title = sub ? `${cat.name} ${sub.name}` : cat.name;
  const groups = (sub ? [sub] : subs).map((s) => ({ sub: s, items: prodsOfSub(db, s.subcategory_id) }));

  /* budget chips; product counts only when the hand-picked catalog is shown */
  const count = (n: number) => (SHOW_CATALOG ? <small>{n}</small> : null);
  const chips = subs.length > 0 && (
    <div className="chips">
      <Link className={`chip ${!sub ? "on" : ""}`} href={`/${cat.slug}`}>All{count(prodsOfCat(db, cat.category_id).length)}</Link>
      {subs.map((s) => (
        <Link key={s.slug} className={`chip ${sub?.slug === s.slug ? "on" : ""}`} href={`/${cat.slug}/${s.slug}`}>{s.name}{count(prodsOfSub(db, s.subcategory_id).length)}</Link>
      ))}
    </div>
  );

  return (
    <section>
      <div className="wrap">
        <div className="crumbs"><Link href="/">Home</Link> / <Link href={`/${cat.slug}`}>{cat.name}</Link>{sub && ` / ${sub.name}`}</div>
        <div className="sec-head"><div><h2>{title}</h2><p>{sub ? sub.description : cat.description}</p></div></div>
        {showSheet
          ? <PromiseBox n={base.length} catName={title} custom={cat.promise} customPoints={cat.promise_points} />
          : <PromiseBox n="today's" catName={title} custom={cat.promise} customPoints={cat.promise_points} deals />}
        {showSheet ? (
          <>
            {chips}
            <CategoryListing key={`${cat.slug}/${sub?.slug ?? ""}`} groups={groups} cat={cat} groupTitles={!sub} offersBanner={OFFERS_BANNER} />
            {/* hand-picked products come first; live Amazon deals for the category follow on its main page */}
            {live && !sub && <LiveDeals category={cat.slug} only={false} heading={`Today's ${cat.name} deals on Amazon`} />}
          </>
        ) : (
          /* live Amazon deals only: the category's searches, limited to the budget on a budget page */
          <>
            {chips}
            {live ? <LiveDeals key={`${cat.slug}/${sub?.slug ?? ""}`} category={cat.slug} sub={sub?.slug} only banner={OFFERS_BANNER} /> : <div className="empty">Deals for this category are coming soon.</div>}
          </>
        )}
      </div>
    </section>
  );
}

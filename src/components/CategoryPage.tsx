import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCatalog, isYes, prodsOfCat, prodsOfSub, subsOf } from "@/lib/catalog";
import { OFFERS_BANNER } from "@/lib/config";
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
  /* Categories column "amazon_deals" = TRUE: also show live Amazon deals; sheet products (if any) still show below */
  const live = isYes(cat.amazon_deals), showSheet = base.length > 0 || !live;
  const title = sub ? `${cat.name} ${sub.name}` : cat.name;
  const groups = (sub ? [sub] : subs).map((s) => ({ sub: s, items: prodsOfSub(db, s.subcategory_id) }));

  return (
    <section>
      <div className="wrap">
        <div className="crumbs"><Link href="/">Home</Link> / <Link href={`/${cat.slug}`}>{cat.name}</Link>{sub && ` / ${sub.name}`}</div>
        <div className="sec-head"><div><h2>{title}</h2><p>{sub ? sub.description : cat.description}</p></div></div>
        <PromiseBox n={base.length || (live ? "today's" : 0)} catName={title} custom={cat.promise} customPoints={cat.promise_points} />
        {live && !sub && <LiveDeals only={!showSheet} />}
        {showSheet && (
          <>
            <div className="chips">
              <Link className={`chip ${!sub ? "on" : ""}`} href={`/${cat.slug}`}>All<small>{prodsOfCat(db, cat.category_id).length}</small></Link>
              {subs.map((s) => (
                <Link key={s.slug} className={`chip ${sub?.slug === s.slug ? "on" : ""}`} href={`/${cat.slug}/${s.slug}`}>{s.name}<small>{prodsOfSub(db, s.subcategory_id).length}</small></Link>
              ))}
            </div>
            <CategoryListing key={`${cat.slug}/${sub?.slug ?? ""}`} groups={groups} cat={cat} groupTitles={!sub} offersBanner={OFFERS_BANNER} />
          </>
        )}
      </div>
    </section>
  );
}

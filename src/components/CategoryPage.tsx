import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCatalog, isYes, prodsOfCat, prodsOfSub, subsOf } from "@/lib/catalog";
import { OFFERS_BANNER, SHOW_CATALOG } from "@/lib/config";
import PromiseBox from "./PromiseBox";
import CategoryListing from "./CategoryListing";
import LiveDeals, { PickGrid, SeeAllDeals } from "./LiveDeals";
import { getPicks, pickedAt, picksIn, type DealPick } from "@/lib/picks";
import { breadcrumbs, dealList, JsonLd, monthYear, pageMeta } from "@/lib/seo";

async function find(catSlug: string, subSlug?: string) {
  const db = await getCatalog();
  const cat = db.cats.find((c) => c.slug === catSlug);
  if (!cat) notFound();
  const subs = subsOf(db, cat.category_id);
  const sub = subSlug ? subs.find((s) => s.slug === subSlug) : undefined;
  if (subSlug && !sub) notFound();
  return { db, cat, subs, sub };
}

/* search titles and descriptions: what the page is, the month, and why to click (top picks, updated twice a day) */
export async function categoryMetadata(catSlug: string, subSlug?: string): Promise<Metadata> {
  const [{ cat, sub }, month] = await Promise.all([find(catSlug, subSlug), monthYear()]);
  const finds = !sub && !subsOf((await getCatalog()), cat.category_id).length;
  const lower = cat.name.toLowerCase();
  if (sub) return pageMeta(
    `Best ${cat.name} ${sub.name} in India (${month}) – Top 5 Deals | Value Verdict`,
    `${sub.description ? sub.description.replace(/\.?$/, ". ") : ""}Today's top 5 ${lower} ${sub.name.toLowerCase()} from Amazon.in with real discounts, updated every day at 5 AM and 5 PM.`,
    `/${cat.slug}/${sub.slug}`);
  if (finds) return pageMeta(
    `${cat.name}: Best Amazon.in Deals Today (${month}) | Value Verdict`,
    `${cat.description ? cat.description.replace(/\.?$/, ". ") : ""}50+ of today's best Amazon.in deals with real discounts, updated twice a day.`,
    `/${cat.slug}`);
  return pageMeta(
    `Best ${cat.name} in India (${month}) – Top Deals by Budget | Value Verdict`,
    `${cat.description ? cat.description.replace(/\.?$/, ". ") : ""}Top 5 ${lower} for every budget from today's Amazon.in deals, updated every day at 5 AM and 5 PM.`,
    `/${cat.slug}`);
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
        <JsonLd data={breadcrumbs([["Home", "/"], [cat.name, `/${cat.slug}`], ...(sub ? [[sub.name, `/${cat.slug}/${sub.slug}`] as [string, string]] : [])])} />
        <div className="sec-head"><div><h1>{title}</h1><p>{sub ? sub.description : cat.description}</p></div></div>
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
          <>
            {chips}
            {!live
              ? <div className="empty">Deals for this category are coming soon.</div>
              : <DealsWithPicks catSlug={cat.slug} subs={subs.map((s) => ({ slug: s.slug, name: s.name }))} sub={sub && { slug: sub.slug, name: sub.name }} />}
          </>
        )}
      </div>
    </section>
  );
}

/* Deals-only pages: today's AI picks first (server-rendered, so search engines see them), then "See all deals".
   Budget page: its top 5. Category page: each budget's top 5. A category without budgets (Amazon Finds): its picks
   by section. Before the first AI run there are no picks, and the page shows all saved deals as before. */
async function DealsWithPicks({ catSlug, subs, sub }: { catSlug: string; subs: { slug: string; name: string }[]; sub?: { slug: string; name: string } }) {
  const { picks, at } = await getPicks();
  /* "picked by AI" wording is switched off for now; to show it again, use this note instead:
     Picked by AI from Amazon.in deals on {pickedAt(at)} IST, judging specs, brand, price and discount. Prices change often; the price on Amazon at checkout applies. */
  const note = <p className="picks-note">Deals from Amazon.in as of {pickedAt(at)} IST. Prices change often; the price on Amazon at checkout applies.</p>;
  const all = <LiveDeals key={`${catSlug}/${sub?.slug ?? ""}`} category={catSlug} sub={sub?.slug} only banner={OFFERS_BANNER} />;

  if (sub) {
    const top = picksIn(picks, `${catSlug}/${sub.slug}`);
    if (!top.length) return all;
    return (
      <>
        <div className="offers-banner">{OFFERS_BANNER}</div>
        <JsonLd data={dealList(`Top ${top.length} ${sub.name} deals`, top)} />
        <div className="picks-head"><h2>Top {top.length} picks · {sub.name}</h2></div>
        <PickGrid items={top} />
        {note}
        <SeeAllDeals category={catSlug} sub={sub.slug} label={`See all deals ${sub.name.toLowerCase().startsWith("under") || sub.name.toLowerCase().startsWith("above") ? sub.name.toLowerCase() : `in ${sub.name}`}`} />
      </>
    );
  }

  if (subs.length) {
    const groups = subs.map((s) => ({ ...s, top: picksIn(picks, `${catSlug}/${s.slug}`) })).filter((g) => g.top.length);
    if (!groups.length) return all;
    return (
      <>
        <div className="offers-banner">{OFFERS_BANNER}</div>
        <JsonLd data={dealList("Top picks by budget", groups.flatMap((g) => g.top))} />
        {groups.map((g) => (
          <div key={g.slug}>
            <div className="picks-head"><h2>{g.name} · top {g.top.length}</h2><Link href={`/${catSlug}/${g.slug}`}>See all {g.name} →</Link></div>
            <PickGrid items={g.top} />
          </div>
        ))}
        {note}
      </>
    );
  }

  const top = picksIn(picks, catSlug);
  if (!top.length) return all;
  /* group by section, sections in the order of their best pick */
  const sections: { name: string; items: DealPick[] }[] = [];
  for (const p of top) {
    const s = sections.find((x) => x.name === p.section) || sections[sections.push({ name: p.section, items: [] }) - 1];
    s.items.push(p);
  }
  return (
    <>
      <div className="offers-banner">{OFFERS_BANNER}</div>
      <JsonLd data={dealList("Today's top deals", top)} />
      {sections.map((s) => (
        <div key={s.name}>
          <div className="picks-head"><h2>{s.name || "Picks"} · {s.items.length}</h2></div>
          <PickGrid items={s.items} />
        </div>
      ))}
      {note}
      <SeeAllDeals category={catSlug} label="See all deals" />
    </>
  );
}

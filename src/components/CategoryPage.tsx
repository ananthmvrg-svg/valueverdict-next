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
import { getGuides, guideFor, readMinutes } from "@/lib/guides";
import { Faqs, GuideTeaser, PreviewBanner } from "./Guide";
import ScrollToHash from "./ScrollToHash";
import JourneyBar from "./JourneyBar";
import { themeFor } from "./GuideArt";

async function find(catSlug: string, subSlug?: string) {
  const db = await getCatalog();
  const cat = db.cats.find((c) => c.slug === catSlug);
  if (!cat) notFound();
  const subs = subsOf(db, cat.category_id);
  const sub = subSlug ? subs.find((s) => s.slug === subSlug) : undefined;
  if (subSlug && !sub) notFound();
  return { db, cat, subs, sub };
}

/* a budget page's name: "Refrigerators Under ₹25,000", but "55″ TVs" (not "TVs 55″ TVs") when the budget already names the category */
const pageName = (cat: string, sub: string) => (sub.toLowerCase().includes(cat.toLowerCase()) ? sub : `${cat} ${sub}`);

/* search titles and descriptions: what the page is, the month, and why to click (top picks, with new picks every day) */
export async function categoryMetadata(catSlug: string, subSlug?: string): Promise<Metadata> {
  const [{ cat, sub }, month] = await Promise.all([find(catSlug, subSlug), monthYear()]);
  const finds = !sub && !subsOf((await getCatalog()), cat.category_id).length;
  const lower = cat.name.toLowerCase();
  if (sub) return pageMeta(
    `Best ${pageName(cat.name, sub.name)} in India (${month}) – Top 5 Deals | Value Verdict`,
    `${sub.description ? sub.description.replace(/\.?$/, ". ") : ""}Today's top 5 ${pageName(cat.name, sub.name)} from Amazon.in with real discounts, with new picks every day at 6 AM and prices re-checked through the day.`,
    `/${cat.slug}/${sub.slug}`);
  if (finds) return pageMeta(
    `${cat.name}: Best Amazon.in Deals Today (${month}) | Value Verdict`,
    `${cat.description ? cat.description.replace(/\.?$/, ". ") : ""}50+ of today's best Amazon.in deals with real discounts, with new picks every day.`,
    `/${cat.slug}`);
  return pageMeta(
    `Best ${cat.name} in India (${month}) – Top Deals by Budget | Value Verdict`,
    `${cat.description ? cat.description.replace(/\.?$/, ". ") : ""}Top 5 ${lower} for every budget from today's Amazon.in deals, with new picks every day at 6 AM and prices re-checked through the day.`,
    `/${cat.slug}`);
}

/* /refrigerators (all budgets, grouped) and /refrigerators/under-25k (one budget) */
export default async function CategoryPage({ catSlug, subSlug }: { catSlug: string; subSlug?: string }) {
  const { db, cat, subs, sub } = await find(catSlug, subSlug);
  const base = sub ? prodsOfSub(db, sub.subcategory_id) : prodsOfCat(db, cat.category_id);
  /* Categories column "amazon_deals" = TRUE: live Amazon deals; with hand-picked products they follow them.
     SHOW_CATALOG = false hides the products, so the page shows only live deals. */
  const live = isYes(cat.amazon_deals), showSheet = SHOW_CATALOG && (base.length > 0 || !live);
  const title = sub ? pageName(cat.name, sub.name) : cat.name;
  const groups = (sub ? [sub] : subs).map((s) => ({ sub: s, items: prodsOfSub(db, s.subcategory_id) }));

  /* budget chips: hand-picked product counts when the catalog is shown, otherwise today's top picks per budget */
  const { picks, at } = await getPicks();
  const count = (n: number, s?: { slug: string; subcategory_id: string }) =>
    SHOW_CATALOG ? <small>{n}</small> : s ? <small>{picksIn(picks, `${cat.slug}/${s.slug}`).length || ""}</small> : null;
  const chips = subs.length > 0 && (
    <div className="budget-bar budget-group" id="budgets">
      <span className="budget-bar-label">Your budget</span>
      <div className="chips">
        <Link className={`chip ${!sub ? "on" : ""}`} href={`/${cat.slug}`}>All budgets{SHOW_CATALOG && count(prodsOfCat(db, cat.category_id).length)}</Link>
        {subs.map((s) => (
          <Link key={s.slug} className={`chip ${sub?.slug === s.slug ? "on" : ""}`} href={`/${cat.slug}/${s.slug}`}
            title={SHOW_CATALOG ? undefined : `Today's top picks ${s.name.toLowerCase()}`}>{s.name}{count(prodsOfSub(db, s.subcategory_id).length, s)}</Link>
        ))}
      </div>
    </div>
  );
  const t = themeFor(cat.slug);

  return (
    <section style={{ "--g-from": t.from, "--g-to": t.to } as React.CSSProperties}>
      <div className="wrap">
        <div className="crumbs"><Link href="/">Home</Link> / <Link href={`/${cat.slug}`}>{cat.name}</Link>{sub && ` / ${sub.name}`}</div>
        <JsonLd data={breadcrumbs([["Home", "/"], [cat.name, `/${cat.slug}`], ...(sub ? [[sub.name, `/${cat.slug}/${sub.slug}`] as [string, string]] : [])])} />
        <div className="sec-head"><div><h1>{title}</h1><p>{sub ? sub.description : cat.description}</p></div></div>
        {subs.length > 0 && <CategoryJourney catSlug={cat.slug} catName={cat.name} onBudget={Boolean(sub)} />}
        {showSheet
          ? <PromiseBox n={base.length} catName={title} custom={cat.promise} customPoints={cat.promise_points} />
          : <PromiseBox n="today's" catName={title} custom={cat.promise} customPoints={cat.promise_points} deals category={cat.slug} updated={live && at ? pickedAt(at) : undefined} />}
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
              : (
                <div id="picks" className="budget-group">
                  <DealsWithPicks catSlug={cat.slug} subs={subs.map((s) => ({ slug: s.slug, name: s.name }))} sub={sub && { slug: sub.slug, name: sub.name }} />
                </div>
              )}
          </>
        )}
        <CategoryGuide catSlug={cat.slug} catName={cat.name} main={!sub} />
      </div>
    </section>
  );
}

/* under the page title: the four steps (learn → budget → compare → buy), "pick a budget" highlighted on the
   category page and "compare picks" on a budget page; "learn" opens the category's buying guide when there is one */
async function CategoryJourney({ catSlug, catName, onBudget }: { catSlug: string; catName: string; onBudget: boolean }) {
  const guide = guideFor((await getGuides()).guides, catSlug);
  return <JourneyBar catSlug={catSlug} catName={catName} current={onBudget ? 3 : 2} guideSlug={guide?.slug} guideMinutes={guide && readMinutes(guide)} />;
}

/* below the deals: the category's buying guide in brief (key points + link), and on the main category page its FAQs */
async function CategoryGuide({ catSlug, catName, main }: { catSlug: string; catName: string; main: boolean }) {
  const { guides, preview } = await getGuides();
  const guide = guideFor(guides, catSlug);
  if (!guide) return null;
  return (
    <div className="category-guide">
      {preview && <PreviewBanner guide={guide} />}
      <GuideTeaser guide={guide} catName={catName} />
      {main && <Faqs faqs={guide.faqs} heading={`${catName}: common questions`} />}
    </div>
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
        {/* id = budget slug, so /tvs#55-inch-tvs (home page budget chips) scrolls to that budget's picks */}
        {groups.map((g) => (
          <div key={g.slug} id={g.slug} className="budget-group">
            <div className="picks-head"><h2>{g.name} · top {g.top.length}</h2><Link href={`/${catSlug}/${g.slug}`}>See all {g.name} →</Link></div>
            <PickGrid items={g.top} />
          </div>
        ))}
        <ScrollToHash />
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

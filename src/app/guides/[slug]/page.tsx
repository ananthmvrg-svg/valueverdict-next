import Link from "next/link";
import { notFound } from "next/navigation";
import { getCatalog, subsOf } from "@/lib/catalog";
import { getGuides, GUIDE_CATEGORIES, guideSlug, longDate } from "@/lib/guides";
import { article, breadcrumbs, JsonLd, pageMeta } from "@/lib/seo";
import { Faqs, GuideSections, KeyPoints, PreviewBanner, sectionId } from "@/components/Guide";

/* every planned guide is built at deploy time; one that isn't published yet is a 404 (or the draft, in preview) */
export async function generateStaticParams() {
  return GUIDE_CATEGORIES.map((c) => ({ slug: guideSlug(c) }));
}

async function find(slug: string) {
  const { guides, preview } = await getGuides();
  const guide = guides.find((g) => g.slug === slug);
  if (!guide) notFound();
  return { guide, preview };
}

export async function generateMetadata({ params }: PageProps<"/guides/[slug]">) {
  const { slug } = await params;
  const { guide } = await find(slug);
  return pageMeta(`${guide.title} | Value Verdict`, guide.description, `/guides/${guide.slug}`);
}

export default async function GuidePage({ params }: PageProps<"/guides/[slug]">) {
  const { slug } = await params;
  const [{ guide, preview }, db] = await Promise.all([find(slug), getCatalog()]);
  const cat = db.cats.find((c) => c.slug === guide.category);
  const budgets = cat ? subsOf(db, cat.category_id) : [];
  return (
    <section>
      <div className="wrap">
        {preview && <PreviewBanner guide={guide} />}
        <JsonLd data={breadcrumbs([["Home", "/"], ["Buying guides", "/guides"], [guide.title, `/guides/${guide.slug}`]])} />
        <JsonLd data={article(guide)} />
        <div className="crumbs"><Link href="/">Home</Link> / <Link href="/guides">Buying guides</Link> / {cat?.name ?? guide.title}</div>
        <div className="sec-head">
          <div>
            <h1>{guide.title}</h1>
            <p>{guide.description}</p>
            <p className="guide-byline">
              By the Value Verdict team{guide.published_at ? ` · Updated ${longDate(guide.published_at)}` : " · Not published yet"} · Drafted with AI help and checked by a person
            </p>
          </div>
        </div>
        <div className="info-layout">
          <article className="prose guide">
            <KeyPoints points={guide.summary} />
            <GuideSections sections={guide.sections} />
            <Faqs faqs={guide.faqs} />
            {preview && guide.status !== "published" && (
              <p className="guide-note">Reviewer: publish this version in Supabase (table <b>guides</b>, row {guide.slug} v{guide.version}, set status to <b>published</b>).</p>
            )}
          </article>
          <aside className="info-side" aria-label="In this guide">
            <nav className="info-card" aria-label="In this guide">
              <h2>In this guide</h2>
              <ul className="info-nav">
                {guide.sections.map((s) => <li key={s.heading}><a href={`#${sectionId(s.heading)}`}>{s.heading}</a></li>)}
                {guide.faqs.length > 0 && <li><a href="#faqs">FAQs</a></li>}
              </ul>
            </nav>
            {cat && (
              <nav className="info-card" aria-label={`${cat.name} deals`}>
                <h2>Today&apos;s {cat.name.toLowerCase()} deals</h2>
                <ul className="info-nav">
                  <li><Link href={`/${cat.slug}`}>All budgets →</Link></li>
                  {budgets.map((s) => <li key={s.slug}><Link href={`/${cat.slug}/${s.slug}`}>{s.name}</Link></li>)}
                </ul>
              </nav>
            )}
          </aside>
        </div>
      </div>
    </section>
  );
}

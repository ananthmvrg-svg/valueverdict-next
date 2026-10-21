import { getCatalog, subsOf } from "@/lib/catalog";
import CategoryPage, { categoryMetadata } from "@/components/CategoryPage";

/* every budget page is built at deploy time; one added later is built on its first visit */
export async function generateStaticParams() {
  const db = await getCatalog();
  return db.cats.flatMap((c) => subsOf(db, c.category_id).map((s) => ({ category: c.slug, sub: s.slug })));
}

export async function generateMetadata({ params }: PageProps<"/[category]/[sub]">) {
  const { category, sub } = await params;
  return categoryMetadata(category, sub);
}

export default async function Page({ params }: PageProps<"/[category]/[sub]">) {
  const { category, sub } = await params;
  return <CategoryPage catSlug={category} subSlug={sub} />;
}

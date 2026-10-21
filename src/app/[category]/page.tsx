import { getCatalog } from "@/lib/catalog";
import CategoryPage, { categoryMetadata } from "@/components/CategoryPage";

/* every category is built at deploy time; one added later is built on its first visit */
export async function generateStaticParams() {
  const { cats } = await getCatalog();
  return cats.map((c) => ({ category: c.slug }));
}

export async function generateMetadata({ params }: PageProps<"/[category]">) {
  const { category } = await params;
  return categoryMetadata(category);
}

export default async function Page({ params }: PageProps<"/[category]">) {
  const { category } = await params;
  return <CategoryPage catSlug={category} />;
}

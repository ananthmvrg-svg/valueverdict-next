import type { MetadataRoute } from "next";
import { getCatalog, subsOf } from "@/lib/catalog";
import { SITE_URL } from "@/lib/config";
import { getPicks } from "@/lib/picks";

/* sitemap.xml: home, Top 100, every category and budget page; "last modified" = the latest deal picks */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [db, { at }] = await Promise.all([getCatalog(), getPicks()]);
  const lastModified = at ? new Date(at) : undefined;
  const page = (path: string, priority: number) => ({ url: SITE_URL + path, lastModified, changeFrequency: "daily" as const, priority });
  return [
    page("", 1),
    page("/top-deals", 0.9),
    ...["/how-we-pick", "/about", "/affiliate-disclosure", "/contact"].map((p) => ({ url: SITE_URL + p, changeFrequency: "monthly" as const, priority: 0.3 })),
    ...db.cats.flatMap((c) => [page(`/${c.slug}`, 0.8), ...subsOf(db, c.category_id).map((s) => page(`/${c.slug}/${s.slug}`, 0.7))]),
  ];
}

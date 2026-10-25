import { cacheLife, cacheTag } from "next/cache";
import { draftMode } from "next/headers";
import { admin, canWrite, selectJson } from "./db";

/* Buying guides and FAQs, stored in Supabase table "guides". Every edit is a new version (draft → approved →
   published); publishing a version archives the previous one, and publishing an older version rolls back.
   Visitors only ever get published versions (the table's row security allows nothing else). In preview
   (Draft Mode, see app/api/preview) the newest version of each guide is shown instead, read with the secret key. */

export type GuideSection = { heading: string; paragraphs: string[]; bullets: string[]; table: { head: string[]; rows: string[][] } | null };
export type Faq = { q: string; a: string };
export type Guide = {
  slug: string; version: number; category: string; title: string; description: string;
  summary: string[]; sections: GuideSection[]; faqs: Faq[]; status: string; author: string;
  published_at: string | null; created_at: string;
};

const FIELDS = "slug,version,category,title,description,summary,sections,faqs,status,author,published_at,created_at";

/* categories that have a buying guide (what each covers: lib/guides-draft.ts) */
export const GUIDE_CATEGORIES = ["tvs", "refrigerators", "washing-machines", "air-conditioners", "laptops", "soundbars-speakers"] as const;

/* the guide slug for a category page, e.g. tvs → tvs-buying-guide */
export const guideSlug = (category: string) => `${category}-buying-guide`;

/* all live guides (cached for an hour, tag "guides"); in preview, each guide's newest version */
export async function getGuides(): Promise<{ guides: Guide[]; preview: boolean }> {
  "use cache";
  cacheLife("hours");
  cacheTag("guides");
  const preview = (await draftMode()).isEnabled && canWrite();
  if (preview) {
    const rows = await admin<Guide[]>("GET", `guides?select=${FIELDS}&status=neq.archived&order=slug.asc,version.desc`).catch(() => [] as Guide[]);
    return { preview, guides: rows.filter((g, i) => i === 0 || rows[i - 1].slug !== g.slug) };
  }
  const guides = await selectJson<Guide>("guides", `select=${FIELDS}&status=eq.published&order=slug.asc`)
    .catch((e) => { console.error("guides", e); return [] as Guide[]; });
  return { preview, guides };
}

export const guideFor = (guides: Guide[], category: string) => guides.find((g) => g.slug === guideSlug(category));

/* "25 October 2026" */
export const longDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "long", year: "numeric" }) : "";

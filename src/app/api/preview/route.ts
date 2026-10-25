import { draftMode } from "next/headers";
import { redirect } from "next/navigation";
import { admin, canWrite } from "@/lib/db";

/* Preview of unpublished guides (Next.js Draft Mode). Open
   /api/preview?secret=<PREVIEW_SECRET>&slug=<guide slug> in your browser: the guide and its category page then show
   the newest draft for you only (a cookie in your browser); everyone else still sees the published version.
   The yellow banner's "Exit preview" button (POST) switches it off. Needs PREVIEW_SECRET and SUPABASE_SECRET_KEY. */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const secret = process.env.PREVIEW_SECRET, slug = searchParams.get("slug") ?? "";
  if (!secret || !canWrite() || searchParams.get("secret") !== secret || !/^[a-z0-9-]+$/.test(slug)) return new Response("Not found", { status: 404 });
  const found = await admin<{ slug: string }[]>("GET", `guides?slug=eq.${slug}&select=slug&limit=1`);
  if (!found.length) return new Response("No such guide", { status: 404 });
  (await draftMode()).enable();
  /* the path is built from the saved slug, never from the request, so this can't redirect elsewhere */
  redirect(`/guides/${found[0].slug}`);
}

export async function POST() {
  (await draftMode()).disable();
  redirect("/guides");
}

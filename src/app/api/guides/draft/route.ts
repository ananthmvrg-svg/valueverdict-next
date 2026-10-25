import { connection } from "next/server";
import { canWrite } from "@/lib/db";
import { GUIDE_CATEGORIES } from "@/lib/guides";
import { draftGuide } from "@/lib/guides-draft";

/* Writes a new AI draft of a category's buying guide (saved as a draft, never published automatically).
   POST /api/guides/draft?category=tvs with "Authorization: Bearer <SUPABASE_SECRET_KEY>".
   A draft takes a minute or two, longer than Netlify allows, so run it from your computer (npm run dev). */
export async function POST(req: Request) {
  await connection();
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!canWrite() || req.headers.get("authorization") !== `Bearer ${key}`) return new Response("Not found", { status: 404 });
  const category = new URL(req.url).searchParams.get("category") ?? "";
  if (!(GUIDE_CATEGORIES as readonly string[]).includes(category)) return Response.json({ error: `category must be one of: ${GUIDE_CATEGORIES.join(", ")}` }, { status: 400 });
  try {
    const r = await draftGuide(category);
    return Response.json({ ...r, preview: `/api/preview?secret=<PREVIEW_SECRET>&slug=${r.slug}` }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}

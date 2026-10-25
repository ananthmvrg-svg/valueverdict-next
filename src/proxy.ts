import { NextResponse, type NextRequest } from "next/server";
import { SITE_URL, SUPABASE_KEY, SUPABASE_URL } from "@/lib/config";

/* Real "404 Not Found" for addresses that aren't a page, before Next.js renders anything.
   Category pages (/refrigerators) and budget pages (/refrigerators/under-25k) are checked against the
   Supabase catalog (remembered for 10 minutes per server instance); anything else unknown gets a 404,
   so search engines never see server errors for mistyped or old links. If Supabase can't be reached,
   the request goes through unchanged. */

const OWN = new Set([
  "top-deals", "about", "how-we-pick", "affiliate-disclosure", "contact", "guides",
  "robots.txt", "sitemap.xml", "favicon.png", "hero-logo.jpg", "logo-mark.jpg",
]);
const TTL = 10 * 60e3;

type Known = { cats: Set<string>; subs: Set<string> };
const memo = globalThis as typeof globalThis & { __vvPages?: { at: number; known: Known } };

async function knownPages(): Promise<Known> {
  if (memo.__vvPages && Date.now() - memo.__vvPages.at < TTL) return memo.__vvPages.known;
  const get = async (table: string) => {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=category_id,slug,active`, { headers: { apikey: SUPABASE_KEY }, signal: AbortSignal.timeout(3000) });
    if (!r.ok) throw new Error(`${table} ${r.status}`);
    return (await r.json()) as { category_id: string; slug: string; active: boolean }[];
  };
  const [cats, subs] = await Promise.all([get("categories"), get("subcategories")]);
  const live = cats.filter((c) => c.active), slugOf = new Map(live.map((c) => [c.category_id, c.slug]));
  const known = {
    cats: new Set(live.map((c) => c.slug)),
    subs: new Set(subs.filter((s) => s.active && slugOf.has(s.category_id)).map((s) => `${slugOf.get(s.category_id)}/${s.slug}`)),
  };
  memo.__vvPages = { at: Date.now(), known };
  return known;
}

const notFoundPage = `<!doctype html><html lang="en-IN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>Page not found – Value Verdict</title>
<style>body{margin:0;font-family:system-ui,sans-serif;background:#f6f7fb;color:#0f172a;display:grid;place-items:center;min-height:100vh;padding:16px}
main{max-width:460px;text-align:center}h1{font-size:26px;margin:0 0 8px}p{color:#64748b;margin:0 0 20px}
a{display:inline-block;margin:4px;padding:10px 18px;border-radius:999px;background:#1e90ff;color:#fff;text-decoration:none;font-weight:700}
a.alt{background:#fff;color:#0b1530;border:1px solid #e5e8f0}</style></head>
<body><main><h1>This page doesn't exist</h1><p>The link may be old or mistyped. Today's best deals are a click away.</p>
<a href="${SITE_URL}/">Browse categories</a><a class="alt" href="${SITE_URL}/top-deals">Top 100 deals</a></main></body></html>`;

const notFound = () => new NextResponse(notFoundPage, { status: 404, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=300" } });

export async function proxy(request: NextRequest) {
  const parts = request.nextUrl.pathname.split("/").filter(Boolean);
  if (!parts.length || parts[0].startsWith(".") || (parts.length === 1 && OWN.has(parts[0]))) return NextResponse.next();
  if (parts[0] === "guides" && parts.length === 2) return NextResponse.next(); /* the guide page shows its own 404 */
  if (parts.length > 2) return notFound();
  let known: Known;
  try { known = await knownPages(); } catch { return NextResponse.next(); }
  const ok = parts.length === 1 ? known.cats.has(parts[0]) : known.subs.has(`${parts[0]}/${parts[1]}`);
  return ok ? NextResponse.next() : notFound();
}

/* everything except Next.js files and the data endpoints */
export const config = { matcher: ["/((?!_next/|api/).*)"] };

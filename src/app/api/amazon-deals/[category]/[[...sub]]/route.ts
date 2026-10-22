import { connection } from "next/server";
import { amazonConfigured, getDeals } from "@/lib/amazon";

/* Live Amazon deals for one category page: /api/amazon-deals/<category slug>, or one of its budget pages:
   /api/amazon-deals/<category slug>/<budget slug>. Logic and settings: lib/amazon.ts.
   Results are cached on Netlify's CDN for an hour, so Amazon is asked at most about once an hour per page. */

const json = (data: unknown, status: number, cdnSeconds: number) => new Response(JSON.stringify(data), {
  status,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "public, max-age=300",
    /* Amazon's rules: prices shown must be refreshed within 24h, so cap staleness at ~2h */
    "Netlify-CDN-Cache-Control": `public, durable, s-maxage=${cdnSeconds}, stale-while-revalidate=${cdnSeconds}`,
  },
});

export async function GET(_req: Request, ctx: RouteContext<"/api/amazon-deals/[category]/[[...sub]]">) {
  await connection(); /* always run at request time, never at build */
  const { category, sub } = await ctx.params;
  if (sub && sub.length > 1) return json({ error: "bad_request", sections: [] }, 404, 3600);
  if (!amazonConfigured()) return json({ error: "not_configured", sections: [] }, 503, 60);
  const { sections, errors } = await getDeals(category, sub?.[0]);
  if (!sections.length) {
    /* over Amazon's rate limit: wait longer before asking again so visitors don't use up the quota */
    const limited = errors.some((e) => /429/.test(e));
    return json({ error: errors[0] || "no_results", sections: [] }, errors.length ? 502 : 200, limited ? 1800 : 300);
  }
  return json({ updated: new Date().toISOString(), sections }, 200, 3600);
}

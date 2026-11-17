import { connection } from "next/server";
import { amazonConfigured, getDealPage, MAX_PAGE } from "@/lib/amazon";

/* "Show more deals": /api/amazon-deals/more/<search id>/<page 2–10>[/<budget slug>], one Amazon call, cached an hour. */
const json = (data: unknown, status: number, cdnSeconds: number) => new Response(JSON.stringify(data), {
  status,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "public, max-age=300",
    "Netlify-CDN-Cache-Control": `public, durable, s-maxage=${cdnSeconds}, stale-while-revalidate=${cdnSeconds}`,
  },
});

export async function GET(_req: Request, ctx: RouteContext<"/api/amazon-deals/more/[id]/[page]/[[...sub]]">) {
  await connection();
  const { id, page, sub } = await ctx.params;
  const n = Number(page);
  if (!/^\d+$/.test(id) || !Number.isInteger(n) || n < 2 || n > MAX_PAGE || (sub && sub.length > 1)) return json({ error: "bad_request", items: [], more: false }, 400, 3600);
  if (!amazonConfigured()) return json({ error: "not_configured", items: [], more: false }, 503, 60);
  try {
    return json(await getDealPage(id, n, sub?.[0]), 200, 3600);
  } catch (e) {
    const msg = (e as Error).message;
    return json({ error: msg, items: [], more: false }, 502, /429/.test(msg) ? 1800 : 300);
  }
}

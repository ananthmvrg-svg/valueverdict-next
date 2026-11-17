import { connection } from "next/server";
import { canWrite } from "@/lib/db";
import { refreshDeals } from "@/lib/refresh";

/* Manual run of the scheduled deal refresh (the schedule itself is netlify/functions/refresh-deals.mts).
   Only for whoever holds Supabase's secret key: send it as "Authorization: Bearer <SUPABASE_SECRET_KEY>". */
export async function POST(req: Request) {
  await connection();
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!canWrite() || req.headers.get("authorization") !== `Bearer ${key}`) return new Response("Not found", { status: 404 });
  return Response.json(await refreshDeals({ budgetMs: 15000 }), { headers: { "Cache-Control": "no-store" } });
}

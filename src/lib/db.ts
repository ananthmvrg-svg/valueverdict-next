import { SUPABASE_KEY, SUPABASE_URL } from "./config";
import type { Row } from "./products";

/* Read a table through Supabase's REST API, e.g. select("products", "order=sort_order").
   Values come back as the same text the Google Sheet used to give ("" for empty,
   "TRUE"/"FALSE" for yes/no), so the rest of the site doesn't care where data comes from. */
export async function select(table: string, query = ""): Promise<Row[]> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*${query ? "&" + query : ""}`, {
    headers: { apikey: SUPABASE_KEY },
  });
  if (!r.ok) throw new Error(`Supabase ${table}: HTTP ${r.status} ${await r.text()}`);
  const rows = (await r.json()) as Record<string, unknown>[];
  return rows.map((x) =>
    Object.fromEntries(
      Object.entries(x).map(([k, v]) => [k, v == null ? "" : typeof v === "boolean" ? (v ? "TRUE" : "FALSE") : String(v)]),
    ),
  );
}

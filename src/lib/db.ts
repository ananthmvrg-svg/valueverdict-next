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

/* Writes (and reads of private tables) for the scheduled deal refresh only. Needs Supabase's secret key:
   Supabase → Project Settings → API Keys → Secret keys, saved as SUPABASE_SECRET_KEY in .env.local and on Netlify.
   Never used by pages, so visitors can't write anything. */
export const canWrite = () => Boolean(process.env.SUPABASE_SECRET_KEY);

export async function admin<T = unknown>(method: "GET" | "POST" | "PATCH" | "DELETE", path: string, body?: unknown, prefer?: string): Promise<T> {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error("SUPABASE_SECRET_KEY is not set");
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: { apikey: key, "Content-Type": "application/json", ...(prefer ? { Prefer: prefer } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`Supabase ${method} ${path.split("?")[0]}: HTTP ${r.status} ${await r.text()}`);
  const text = await r.text();
  return (text ? JSON.parse(text) : null) as T;
}

/* Like select(), but values keep their JSON types (for jsonb columns such as deals.data). */
export async function selectJson<T>(table: string, query = ""): Promise<T[]> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, { headers: { apikey: SUPABASE_KEY } });
  if (!r.ok) throw new Error(`Supabase ${table}: HTTP ${r.status} ${await r.text()}`);
  return (await r.json()) as T[];
}

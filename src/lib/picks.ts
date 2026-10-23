import { cacheLife, cacheTag } from "next/cache";
import { selectJson } from "./db";
import type { Deal } from "./amazon";

/* AI picks saved by lib/curate.ts (twice a day). group: "<category>/<budget>", "amazon-finds" or "top-100". */
export type DealPick = Deal & { rank: number; reason: string; section: string; category: string; group: string };

/* every current pick, cached for an hour (tag "picks"). Picks older than 24 hours are not shown,
   since their prices could be out of date (Amazon's rules). */
export async function getPicks(): Promise<{ picks: DealPick[]; at: string | null }> {
  "use cache";
  cacheLife("hours");
  cacheTag("picks");
  const since = new Date(Date.now() - 24 * 36e5).toISOString();
  type Row = { group_key: string; rank: number; reason: string | null; section: string | null; category: string | null; data: Deal; cycle: string };
  const rows = await selectJson<Row>("deal_picks",
    `select=group_key,rank,reason,section,category,data,cycle&picked_at=gte.${encodeURIComponent(since)}&order=group_key.asc,rank.asc&limit=3000`)
    .catch((e) => { console.error("picks", e); return [] as Row[]; });
  const at = rows.reduce<string | null>((m, r) => (!m || r.cycle > m ? r.cycle : m), null);
  return {
    at,
    picks: rows.filter((r) => r.data?.price != null).map((r) => ({ ...r.data, rank: r.rank, reason: r.reason || "", section: r.section || "", category: r.category || "", group: r.group_key })),
  };
}

export const picksIn = (all: DealPick[], group: string) => all.filter((p) => p.group === group).sort((a, b) => a.rank - b.rank);

/* "5 AM" / "5 PM" style time of the pick run, India time */
export const pickedAt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "";

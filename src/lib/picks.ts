import { cacheLife, cacheTag } from "next/cache";
import { selectJson } from "./db";
import type { Deal } from "./amazon";
import { freshClaims } from "./claims";

/* AI picks saved by lib/curate.ts (daily at 6 AM; prices re-checked every 3 hours). group: "<category>/<budget>", "amazon-finds" or "top-100". */
export type DealPick = Deal & {
  rank: number; reason: string; section: string; category: string; group: string;
  bestFor: string; strengths: string[]; limitations: string[]; confidence: string;
};

/* every current pick, cached for an hour (tag "picks"). Picks whose price wasn't confirmed with Amazon in the
   last 24 hours are not shown (Amazon's rules); "at" is the oldest price check among those shown. */
export async function getPicks(): Promise<{ picks: DealPick[]; at: string | null }> {
  "use cache";
  cacheLife("hours");
  cacheTag("picks");
  const since = new Date(Date.now() - 24 * 36e5).toISOString();
  type Row = {
    group_key: string; rank: number; reason: string | null; section: string | null; category: string | null; data: Deal; price_checked_at: string;
    best_for: string | null; strengths: string[] | null; limitations: string[] | null; confidence: string | null;
  };
  const rows = await selectJson<Row>("deal_picks",
    `select=group_key,rank,reason,section,category,data,price_checked_at,best_for,strengths,limitations,confidence&price_checked_at=gte.${encodeURIComponent(since)}&order=group_key.asc,rank.asc&limit=3000`)
    .catch((e) => { console.error("picks", e); return [] as Row[]; });
  const at = rows.reduce<string | null>((m, r) => (!m || r.price_checked_at < m ? r.price_checked_at : m), null);
  const picks: DealPick[] = rows.filter((r) => r.data?.price != null).map((r) => ({
    ...r.data, specs: r.data.specs ?? {}, rank: r.rank, reason: r.reason || "", section: r.section || "", category: r.category || "", group: r.group_key,
    bestFor: r.best_for || "", strengths: r.strengths ?? [], limitations: r.limitations ?? [], confidence: r.confidence || "",
  }));
  /* texts re-checked against today's price and the list they're shown in (lib/claims.ts): a budget page's picks,
     an Amazon Finds section; the Top 100 mixes lists, so "lowest price here" can't stand there */
  const listOf = (p: DealPick) => `${p.group}|${p.group === "amazon-finds" ? p.section : ""}`;
  const lists = new Map<string, DealPick[]>();
  for (const p of picks) lists.set(listOf(p), [...(lists.get(listOf(p)) ?? []), p]);
  return { at, picks: picks.map((p) => freshClaims(p, p.group === "top-100" ? null : lists.get(listOf(p))!)) };
}

export const picksIn = (all: DealPick[], group: string) => all.filter((p) => p.group === group).sort((a, b) => a.rank - b.rank);

/* "25 Oct, 9:00 am" style time, India time */
export const pickedAt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "";

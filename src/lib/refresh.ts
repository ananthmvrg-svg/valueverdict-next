import { admin, select } from "./db";
import { amazonConfigured, budgetFrom, getItems, limit, search, type Budget, type Deal } from "./amazon";
import { isOn, type Row } from "./products";
import { curate } from "./curate";
import { specsFor } from "./specs";

/* Scheduled deal refresh. Runs every 2 minutes from netlify/functions/refresh-deals.mts, but only has work
   after each cycle starts: 6 AM India time (CYCLE_HOURS_IST), and for the price re-checks every PRICE_CHECK_HOURS.
   1. Candidates: a "job" is one deal search × one budget page (or the whole category when it has no budgets)
      × one Amazon result page. Each run refreshes jobs not yet refreshed this cycle until its time budget is
      used (Netlify allows 30 seconds per run, Amazon 1 call per second); a cycle takes about an hour.
   2. AI picks: once every job is done, curate() asks Claude to pick the best deals (lib/curate.ts).
   3. Price re-check: every PRICE_CHECK_HOURS after the cycle starts, the displayed picks' prices and stock are
      looked up again (10 products per Amazon call); products Amazon no longer offers lose their price and are hidden.
   A lock makes sure two runs never overlap, and runs that did work are logged in job_runs.
   Pages read the saved candidates (getStoredDeals) and picks (lib/picks.ts), never Amazon. */

const CATEGORY_PAGES = 3; /* category without budget pages (Amazon Finds): up to 30 deals per search */
const BUDGET_PAGES = 3; /* each budget page: up to 30 candidates per search */
const CYCLE_HOURS_IST = [6];
const PRICE_CHECK_HOURS = 3;
const GAP_MS = 1100;
const LOCK = "refresh-deals", LOCK_SECONDS = 60;

/* start of the current cycle: the latest 6 AM India time (UTC+5:30) */
export function cycleStart(now = Date.now()) {
  const ist = 5.5 * 36e5, day = Math.floor((now + ist) / 864e5) * 864e5;
  const starts = [-1, 0].flatMap((d) => CYCLE_HOURS_IST.map((h) => day + d * 864e5 + h * 36e5 - ist));
  return new Date(Math.max(...starts.filter((t) => t <= now))).toISOString();
}

type Job = { key: string; search: Row; sub: string; page: number; budget: Budget | null; category: string };
type JobState = { job_key: string; last_run: string | null; more: boolean };

const jobKey = (searchId: string, sub: string, page: number) => `${searchId}:${sub}:${page}`;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const quoteList = (keys: string[]) => `(${keys.map((k) => `"${k.replace(/"/g, "")}"`).join(",")})`;

/* latest price re-check time: every PRICE_CHECK_HOURS after the cycle start (null in the cycle's first hours) */
export function priceCheckStart(now = Date.now()) {
  const c = Date.parse(cycleStart(now)), step = PRICE_CHECK_HOURS * 36e5, k = Math.floor((now - c) / step);
  return k >= 1 ? new Date(c + k * step).toISOString() : null;
}

/* one scheduled run: skipped if another run holds the lock; logged when it did any work */
export async function refreshDeals({ budgetMs = 15000 } = {}) {
  if (!amazonConfigured()) return { ran: 0, note: "Amazon keys are not set" };
  const holder = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const locked = await admin<boolean>("POST", "rpc/try_lock", { lock_name: LOCK, lock_holder: holder, ttl_seconds: LOCK_SECONDS });
  if (!locked) return { skipped: "another refresh run is in progress" };
  const started = new Date().toISOString();
  try {
    const result = await refreshStep(budgetMs);
    if (result.ran || result.prices.checked || !/^waiting for candidates|^AI picks done/.test(result.ai)) {
      await admin("POST", "job_runs", {
        job: "deals", started_at: started, finished_at: new Date().toISOString(),
        status: result.errors.length ? "errors" : "ok", cycle: result.cycle, summary: result,
      }, "return=minimal").catch(() => {});
    }
    return result;
  } finally {
    await admin("POST", "rpc/release_lock", { lock_name: LOCK, lock_holder: holder }).catch(() => {});
  }
}

async function refreshStep(budgetMs: number) {
  const start = Date.now(), cycle = cycleStart(start);
  const [cats, subs, searches, states] = await Promise.all([
    select("categories"),
    select("subcategories"),
    select("amazon_deal_searches", "active=eq.true"),
    admin<JobState[]>("GET", "deal_jobs?select=job_key,last_run,more"),
  ]);
  const liveCats = new Set(cats.filter((c) => isOn(c.active)).map((c) => c.category_id));
  const slugOf = new Map(cats.map((c) => [c.category_id, c.slug]));
  const state = new Map(states.map((s) => [s.job_key, s]));

  /* every job the site can show; a later Amazon page only while the previous page said there is more */
  const jobs: Job[] = [], wanted = new Set<string>();
  for (const s of searches) {
    if (!s.section || !s.keywords || !liveCats.has(s.category_id)) continue;
    const catSubs = subs.filter((x) => x.category_id === s.category_id), liveSubs = catSubs.filter((x) => isOn(x.active));
    /* budget pages each get their own candidates; the category page shows them grouped by budget */
    const targets = liveSubs.length
      ? liveSubs.map((x) => ({ sub: x.slug, budget: budgetFrom(catSubs, x.slug), pages: BUDGET_PAGES }))
      : [{ sub: "", budget: null as Budget | null, pages: CATEGORY_PAGES }];
    for (const t of targets) {
      for (let page = 1; page <= t.pages; page++) {
        const key = jobKey(s.id, t.sub, page);
        if (page > 1 && state.get(jobKey(s.id, t.sub, page - 1))?.more !== true) break;
        wanted.add(key);
        jobs.push({ key, search: s, sub: t.sub, page, budget: t.budget, category: slugOf.get(s.category_id) ?? "" });
      }
    }
  }

  /* searches or budgets that were removed or switched off, and pages Amazon no longer has: drop their deals */
  const gone = [...state.keys()].filter((k) => !wanted.has(k));
  if (gone.length) await admin("DELETE", `deal_jobs?job_key=in.${encodeURIComponent(quoteList(gone))}`);

  const age = (j: Job) => Date.parse(state.get(j.key)?.last_run || "") || 0;
  const due = jobs.filter((j) => age(j) < Date.parse(cycle)).sort((a, b) => age(a) - age(b) || a.page - b.page);

  let ran = 0, saved = 0;
  const errors: string[] = [];
  for (const j of due) {
    if (Date.now() - start > budgetMs) break;
    if (ran++) await sleep(GAP_MS);
    let items: Deal[] = [], more = false, status = "ok", rejected: Record<string, number> = {};
    try {
      const r = await search(limit(j.search, j.budget), j.page);
      items = r.items.map((x) => ({ ...x, specs: specsFor(j.category, x.title, x.features) }));
      more = r.more; rejected = r.rejected; status = items.length ? "ok" : "empty";
    } catch (e) {
      status = (e as Error).message;
      errors.push(`${j.key} ${status}`);
      /* over Amazon's limit or bad keys: stop, and leave this job due so the next run retries it */
      if (/^token|^search 429/.test(status)) break;
    }
    const now = new Date().toISOString();
    await admin("POST", "deal_jobs?on_conflict=job_key", {
      job_key: j.key, search_id: Number(j.search.id), sub_slug: j.sub, page: j.page,
      last_run: now, last_status: status.slice(0, 300), item_count: items.length, more, rejected,
    }, "resolution=merge-duplicates,return=minimal");
    state.set(j.key, { job_key: j.key, last_run: now, more });
    if (status !== "ok" && status !== "empty") continue; /* an error keeps the previous deals (hidden after 24h) */
    await admin("DELETE", `deals?job_key=eq.${encodeURIComponent(j.key)}`);
    if (items.length) {
      await admin("POST", "deals", items.map((x, i) => ({
        job_key: j.key, position: i, search_id: Number(j.search.id), sub_slug: j.sub, page: j.page,
        asin: x.asin, data: x, fetched_at: now,
      })), "return=minimal");
      saved += items.length;
    }
  }
  /* all candidates in (later pages appear only after their page 1 ran, so check again) → AI picks */
  const left = jobs.filter((j) => age(j) < Date.parse(cycle)).length;
  const nextPages = jobs.some((j) => state.get(j.key)?.more === true && !wanted.has(`${j.search.id}:${j.sub}:${j.page + 1}`) && j.page < (j.sub ? BUDGET_PAGES : CATEGORY_PAGES));
  const ai = !left && !nextPages && Date.now() - start < budgetMs ? await curate(cycle).catch((e) => `curate failed: ${(e as Error).message}`) : "waiting for candidates";
  /* prices are re-checked only once this cycle's picks are done, with the time that's left */
  const prices = ai.startsWith("AI picks done") ? await checkPrices(start, budgetMs, ran > 0, errors) : { checked: 0, hidden: 0, note: "after picks" };
  return { cycle, ran, saved, due: due.length, left, jobs: jobs.length, removed: gone.length, errors, ai, prices, ms: Date.now() - start };
}

/* price re-check of the displayed picks that weren't checked since the latest re-check time */
async function checkPrices(start: number, budgetMs: number, calledAmazon: boolean, errors: string[]) {
  const since = priceCheckStart(start);
  if (!since) return { checked: 0, hidden: 0, note: "not due yet" };
  const stale = await admin<{ asin: string; data: Deal }[]>("GET", `deal_picks?select=asin,data&price_checked_at=lt.${encodeURIComponent(since)}&limit=3000`);
  const byAsin = new Map(stale.map((r) => [r.asin, r.data]));
  const asins = [...byAsin.keys()];
  let checked = 0, hidden = 0, calls = calledAmazon ? 1 : 0;
  for (let i = 0; i < asins.length; i += 10) {
    if (Date.now() - start > budgetMs) break;
    if (calls++) await sleep(GAP_MS);
    const batch = asins.slice(i, i + 10);
    let fresh: Map<string, Deal>;
    try { fresh = await getItems(batch); } catch (e) {
      errors.push(`prices ${(e as Error).message}`);
      break; /* nothing is hidden when Amazon itself failed; the next run tries again */
    }
    const items = batch.map((asin) => {
      const d = fresh.get(asin);
      if (!d || d.price == null) hidden++;
      /* keep the specs read at discovery; the lookup only refreshes the offer */
      const old = byAsin.get(asin);
      return { asin, data: d && d.price != null ? { ...d, specs: old?.specs ?? {} } : { ...old, price: null } };
    });
    await admin("POST", "rpc/refresh_pick_prices", { items });
    checked += batch.length;
  }
  return { checked, hidden, left: asins.length - checked };
}

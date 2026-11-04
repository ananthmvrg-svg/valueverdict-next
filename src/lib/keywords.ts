/* Keyword data from Google's own exports, never invented (rule: no fabricated keyword data).
   - Keyword Planner (Google Ads → Tools → Keyword Planner → Discover new keywords, India, English):
     "Download keyword ideas" as .csv (UTF-16, tab separated) or as Google Sheets (comma separated).
     Monthly searches come as exact numbers or, on a low-spend Ads account, as ranges ("1K – 10K").
   - Google Trends (trends.google.com, India, past 12 months, up to 5 terms): the "Interest over time" download,
     multiTimeline.csv: relative interest 0–100 per week (100 = that comparison's peak), not search counts.
   Parsed here (no database), imported by scripts/keywords.ts, used by the weekly research and report.
   The Google Ads API (Keyword Planner) needs an approved developer token and the Trends API is invite-only
   (alpha), so for now the data comes from these exports; the table and the readers stay the same later. */

export type KeywordRow = {
  keyword: string; category: string | null; source: "keyword_planner" | "google_trends";
  searches_low: number | null; searches_high: number | null; competition: string | null;
  change_3m: number | null; change_yoy: number | null; trend: { period: string; value: number }[] | null; period: string | null;
};

/* seed words to paste into Keyword Planner, one category per search (it takes up to 10 seeds) */
export const KEYWORD_SEEDS: Record<string, string[]> = {
  tvs: ["smart tv", "43 inch smart tv", "55 inch 4k tv", "32 inch led tv", "best tv under 30000", "qled tv", "google tv", "oled tv"],
  "air-conditioners": ["split ac", "1.5 ton inverter ac", "window ac", "5 star ac", "best ac under 40000", "1 ton ac", "portable ac"],
  refrigerators: ["refrigerator", "double door refrigerator", "single door fridge", "side by side refrigerator", "best fridge under 25000", "frost free refrigerator", "inverter refrigerator"],
  "washing-machines": ["washing machine", "front load washing machine", "top load washing machine", "fully automatic washing machine", "semi automatic washing machine", "7 kg washing machine", "washer dryer"],
  laptops: ["laptop", "gaming laptop", "laptop under 50000", "laptop for students", "i5 laptop", "laptop under 30000", "thin and light laptop"],
  "soundbars-speakers": ["soundbar", "soundbar with subwoofer", "dolby atmos soundbar", "bluetooth speaker", "home theatre system", "party speaker"],
  "home-appliances": ["air fryer", "air purifier", "water purifier", "mixer grinder", "kitchen chimney", "dishwasher", "room heater", "vacuum cleaner"],
  geysers: ["geyser", "water heater", "instant geyser", "15 litre geyser", "25 litre geyser", "gas geyser", "best geyser for bathroom"],
  "fridge-accessories": ["stabilizer for refrigerator", "voltage stabilizer", "fridge stand", "refrigerator stabilizer 300 litre"],
  "amazon-finds": ["earbuds", "smartwatch", "power bank", "trimmer", "tablet", "trolley bag", "security camera", "headphones", "5g phone under 15000"],
};

/* which of our categories a keyword belongs to; order matters (a "stabilizer for refrigerator" is an accessory,
   an "instant geyser" is a geyser, not Amazon Finds) */
const CATEGORY_WORDS: [string, RegExp][] = [
  ["fridge-accessories", /\bstabili[sz]er\b|\bfridge stand\b|\brefrigerator stand\b/],
  ["geysers", /\bgeysers?\b|\bwater heaters?\b/],
  ["air-conditioners", /\b(ac|acs|air conditioners?)\b|\b\d(\.\d)? ?ton\b/],
  ["refrigerators", /\b(fridges?|refrigerators?)\b/],
  ["washing-machines", /\bwashing machines?\b|\bwasher\b|\bdryer\b/],
  ["tvs", /\b(tvs?|television|led tv|qled|oled|smart tv|google tv)\b/],
  ["soundbars-speakers", /\bsound ?bars?\b|\bspeakers?\b|\bhome theat(re|er)\b|\bsubwoofer\b/],
  ["laptops", /\blaptops?\b|\bnotebook\b|\bmacbook\b|\bchromebook\b/],
  ["home-appliances", /\bair fryer\b|\bair purifier\b|\bwater purifier\b|\bro purifier\b|\bmixer\b|\bgrinder\b|\bchimney\b|\bdishwasher\b|\broom heater\b|\bheater\b|\bvacuum\b|\bmicrowave\b|\bjuicer\b|\binduction\b/],
  ["amazon-finds", /\bearbuds?\b|\bsmart ?watch(es)?\b|\bpower ?bank\b|\btrimmer\b|\btablet\b|\btrolley\b|\bluggage\b|\bsecurity camera\b|\bcctv\b|\bheadphones?\b|\bneckband\b|\b(5g )?(smart)?phones?\b|\bmobile\b|\bshoes\b|\bcontroller\b/],
];

export function categoryFor(keyword: string): string | null {
  const k = keyword.toLowerCase();
  return CATEGORY_WORDS.find(([, re]) => re.test(k))?.[0] ?? null;
}

/* the file's text: Keyword Planner's .csv is UTF-16 (little-endian, with a byte-order mark) */
export function decode(buf: Buffer): string {
  if (buf[0] === 0xff && buf[1] === 0xfe) return buf.subarray(2).toString("utf16le");
  if (buf[0] === 0xfe && buf[1] === 0xff) return Buffer.from(buf.subarray(2)).swap16().toString("utf16le");
  return buf.toString("utf8").replace(/^﻿/, "");
}

/* one CSV/TSV line into cells (quotes and doubled quotes handled) */
function cells(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = "", quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') quoted = false; else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) { out.push(cur.trim()); cur = ""; } else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

/* "1K – 10K" → [1000, 10000]; "2,400" → [2400, 2400]; "" → nulls */
export function searchRange(v: string): [number | null, number | null] {
  const num = (s: string) => {
    const m = s.trim().replace(/,/g, "").match(/^([\d.]+)\s*([KkMm])?$/);
    if (!m) return null;
    return Math.round(Number(m[1]) * (m[2] ? (/k/i.test(m[2]) ? 1e3 : 1e6) : 1));
  };
  const parts = v.split(/\s*[–—-]\s*/).filter(Boolean);
  if (parts.length === 2) return [num(parts[0]), num(parts[1])];
  const n = num(v);
  return [n, n];
}
const pct = (v: string | undefined) => (v && /-?[\d.]+\s*%/.test(v) ? Number(v.replace(/[%,\s]/g, "")) : null);

export function parseKeywordPlanner(text: string): KeywordRow[] {
  const lines = text.split(/\r?\n/);
  const at = lines.findIndex((l) => /^"?keyword"?[\t,]/i.test(l) && /avg\.? monthly searches/i.test(l));
  if (at < 0) throw new Error('not a Keyword Planner export (no "Keyword … Avg. monthly searches" header)');
  const sep = lines[at].includes("\t") ? "\t" : ",";
  const head = cells(lines[at], sep).map((h) => h.toLowerCase());
  const col = (re: RegExp) => head.findIndex((h) => re.test(h));
  const iKw = 0, iAvg = col(/^avg\.? monthly searches/), iComp = col(/^competition$/), i3m = col(/three month change/), iYoy = col(/yoy change/);
  const months = head.map((h, i) => [h, i] as const).filter(([h]) => /^searches:/.test(h));
  /* the date range line above the header, e.g. "1 November 2025 - 31 October 2026" */
  const period = lines.slice(0, at).map((l) => l.replace(/"/g, "").trim()).find((l) => /\d{4}\s*[-–]\s*\d/.test(l) && !/^keyword stats/i.test(l)) ?? null;
  const out: KeywordRow[] = [];
  for (const line of lines.slice(at + 1)) {
    if (!line.trim()) continue;
    const c = cells(line, sep);
    const keyword = c[iKw]?.toLowerCase().replace(/\s+/g, " ").trim();
    if (!keyword) continue;
    const [lo, hi] = iAvg >= 0 ? searchRange(c[iAvg] ?? "") : [null, null];
    const trend = months.filter(([, i]) => (c[i] ?? "") !== "")
      .map(([h, i]) => ({ period: h.replace(/^searches:\s*/, ""), value: Number(c[i].replace(/,/g, "")) }))
      .filter((m) => Number.isFinite(m.value));
    out.push({
      keyword, category: categoryFor(keyword), source: "keyword_planner", searches_low: lo, searches_high: hi,
      competition: iComp >= 0 ? c[iComp] || null : null, change_3m: pct(c[i3m]), change_yoy: pct(c[iYoy]),
      trend: trend.length ? trend : null, period,
    });
  }
  return out;
}

/* Google Trends "Interest over time" (multiTimeline.csv): one row per term, its weekly series */
export function parseTrends(text: string): KeywordRow[] {
  const lines = text.split(/\r?\n/);
  const at = lines.findIndex((l) => /^"?(week|month|day|time)"?,/i.test(l));
  if (at < 0) throw new Error('not a Google Trends "Interest over time" export (no Week/Month/Time header)');
  const head = cells(lines[at], ",");
  const terms = head.slice(1).map((h) => h.replace(/:\s*\(.*\)\s*$/, "").toLowerCase().trim());
  const where = head[1]?.match(/\(([^)]+)\)\s*$/)?.[1] ?? "";
  const rows = lines.slice(at + 1).filter((l) => l.trim()).map((l) => cells(l, ","));
  if (!rows.length) return [];
  const period = `${rows[0][0]} – ${rows[rows.length - 1][0]}${where ? `, ${where}` : ""}`;
  return terms.map((term, j) => ({
    keyword: term, category: categoryFor(term), source: "google_trends" as const,
    searches_low: null, searches_high: null, competition: null, change_3m: null, change_yoy: null,
    /* "<1" means under 1 */
    trend: rows.map((r) => ({ period: r[0], value: r[j + 1] === "<1" ? 0.5 : Number(r[j + 1]) })).filter((p) => Number.isFinite(p.value)),
    period,
  }));
}

/* which parser a file needs */
export function parseExport(text: string): KeywordRow[] {
  return /avg\.? monthly searches/i.test(text.slice(0, 5000)) ? parseKeywordPlanner(text) : parseTrends(text);
}

/* rising or falling: the last 4 points against the 4 before (Trends weeks, or Keyword Planner months) */
export function momentum(trend: { value: number }[] | null): number | null {
  if (!trend || trend.length < 8) return null;
  const avg = (xs: { value: number }[]) => xs.reduce((s, x) => s + x.value, 0) / xs.length;
  const last = avg(trend.slice(-4)), before = avg(trend.slice(-8, -4));
  return before > 0 ? Math.round(((last - before) / before) * 100) : null;
}

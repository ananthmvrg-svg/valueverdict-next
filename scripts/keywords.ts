/* Keyword data import (Keyword Planner and Google Trends exports → Supabase "keywords").
     npm run keywords -- seeds                       the seed words to paste into Keyword Planner, per category
     npm run keywords -- import <file or folder>…    import .csv files (a folder: every .csv in it)
     npm run keywords -- import <files> --dry-run    read and show, don't save
   Uses .env.local (SUPABASE_SECRET_KEY). Re-importing a keyword replaces its older numbers from the same source. */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { admin } from "../src/lib/db";
import { decode, KEYWORD_SEEDS, momentum, parseExport, type KeywordRow } from "../src/lib/keywords";

const [cmd, ...args] = process.argv.slice(2);
const dryRun = args.includes("--dry-run");

function files(paths: string[]): string[] {
  return paths.filter((p) => !p.startsWith("--")).flatMap((p) =>
    statSync(p).isDirectory() ? readdirSync(p).filter((f) => /\.csv$/i.test(f)).map((f) => join(p, f)) : [p]);
}

const range = (r: KeywordRow) => r.searches_low == null ? "-" : r.searches_low === r.searches_high ? String(r.searches_low) : `${r.searches_low}–${r.searches_high}`;

async function main() {
  if (cmd === "seeds") {
    console.log("Keyword Planner → Discover new keywords → Start with keywords. Location: India, language: English.");
    console.log("One search per line below, then Download keyword ideas (.csv). Save the files in one folder.\n");
    for (const [cat, seeds] of Object.entries(KEYWORD_SEEDS)) console.log(`${cat}:\n  ${seeds.join(", ")}\n`);
    return;
  }
  if (cmd !== "import" || !files(args).length) {
    console.log("usage: npm run keywords -- seeds | import <file or folder>… [--dry-run]");
    process.exitCode = 1;
    return;
  }
  for (const f of files(args)) {
    let rows: KeywordRow[];
    try { rows = parseExport(decode(readFileSync(f))); } catch (e) { console.log(`✗ ${basename(f)}: ${(e as Error).message}`); process.exitCode = 1; continue; }
    /* the same keyword twice in one file: keep the first */
    const seen = new Set<string>();
    rows = rows.filter((r) => !seen.has(r.keyword) && seen.add(r.keyword));
    const byCat = rows.reduce<Record<string, number>>((m, r) => ({ ...m, [r.category ?? "(none)"]: (m[r.category ?? "(none)"] ?? 0) + 1 }), {});
    console.log(`${dryRun ? "·" : "✓"} ${basename(f)}: ${rows.length} ${rows[0]?.source ?? ""} keywords (${Object.entries(byCat).map(([k, v]) => `${k} ${v}`).join(", ")})`);
    if (dryRun) {
      for (const r of rows.slice(0, 8)) console.log(`    ${r.keyword} [${r.category ?? "-"}] searches ${range(r)}${momentum(r.trend) != null ? `, recent ${momentum(r.trend)! > 0 ? "+" : ""}${momentum(r.trend)}%` : ""}`);
      continue;
    }
    for (let i = 0; i < rows.length; i += 500) {
      await admin("POST", "keywords?on_conflict=source,keyword", rows.slice(i, i + 500).map((r) => ({ ...r, file: basename(f), imported_at: new Date().toISOString() })),
        "resolution=merge-duplicates,return=minimal");
    }
  }
}
main().catch((e) => { console.error(e); process.exitCode = 1; });

/* Weekly report (Phase 6), run on the PC every Monday at 5 AM IST (pc/run-job.ps1 report),
   or by hand: npm run report:local (uses .env.local); add -- --dry-run to write it without saving.
   Prints the report and, on GitHub, adds it to the run's summary page. Changes nothing on the site. */
import { appendFileSync } from "node:fs";
import { runReport } from "../src/lib/report";

const dryRun = process.argv.includes("--dry-run");
runReport({ dryRun }).then(({ status, markdown }) => {
  console.log(`${markdown}\n\n${status}`);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${markdown}\n`);
  if (/failed/.test(status)) process.exitCode = 1;
});

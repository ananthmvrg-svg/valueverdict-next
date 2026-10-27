/* Weekly market research (Pipeline B), run by .github/workflows/research.yml every Sunday at 4 AM IST,
   or by hand: npm run research:local (uses .env.local), add -- --dry-run to research and check without saving.
   Exits with an error code when the research fails, so the GitHub run shows red; the site keeps last week's plan. */
import { runResearch } from "../src/lib/research";

const dryRun = process.argv.includes("--dry-run");
runResearch({ dryRun }).then((result) => {
  console.log(result);
  if (/failed|no search passed/.test(result)) process.exitCode = 1;
});

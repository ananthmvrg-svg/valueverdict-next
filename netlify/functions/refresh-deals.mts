import { refreshDeals } from "../../src/lib/refresh";

/* Netlify scheduled function: every 2 minutes, refresh the oldest saved Amazon deals (see src/lib/refresh.ts).
   Runs only on the published deploy; "Run now" on Netlify's Functions page runs it once by hand.
   Needs AMAZON_CREDENTIAL_ID, AMAZON_CREDENTIAL_SECRET and SUPABASE_SECRET_KEY in the site's environment variables. */
export default async function refreshDealsJob() {
  const result = await refreshDeals({ budgetMs: 15000 });
  console.log("refresh-deals", JSON.stringify(result));
}

export const config = { schedule: "*/2 * * * *" };

import { cacheLife } from "next/cache";
import { FESTIVAL } from "./config";

/* The festival running today in India ("Diwali"), or null. Cached for an hour, so pages stay static
   and the theme switches itself on and off within the hour of its dates (lib/config.ts FESTIVAL). */
export async function festival(): Promise<string | null> {
  "use cache";
  cacheLife("hours");
  if (!FESTIVAL.name) return null;
  const today = new Date(Date.now() + 5.5 * 36e5).toISOString().slice(0, 10);
  return today >= FESTIVAL.from && today <= FESTIVAL.until ? FESTIVAL.name : null;
}

import { describe, expect, it } from "vitest";
import { getItems } from "../src/lib/amazon";
import { admin } from "../src/lib/db";

/* Talks to the real Supabase and Amazon: run with LIVE=1 and the keys from .env.local */
const live = process.env.LIVE === "1" ? describe : describe.skip;

live("live services", () => {
  it("run lock lets only one holder in at a time", { timeout: 60000 }, async () => {
    const name = `test-lock-${Date.now()}`;
    expect(await admin<boolean>("POST", "rpc/try_lock", { lock_name: name, lock_holder: "a", ttl_seconds: 30 })).toBe(true);
    expect(await admin<boolean>("POST", "rpc/try_lock", { lock_name: name, lock_holder: "b", ttl_seconds: 30 })).toBe(false);
    await admin("POST", "rpc/release_lock", { lock_name: name, lock_holder: "a" });
    expect(await admin<boolean>("POST", "rpc/try_lock", { lock_name: name, lock_holder: "b", ttl_seconds: 30 })).toBe(true);
    await admin("POST", "rpc/release_lock", { lock_name: name, lock_holder: "b" });
  });
  it("an expired lock can be taken over (a crashed run can't block forever)", { timeout: 60000 }, async () => {
    const name = `test-lock-exp-${Date.now()}`;
    expect(await admin<boolean>("POST", "rpc/try_lock", { lock_name: name, lock_holder: "a", ttl_seconds: 1 })).toBe(true);
    await new Promise((r) => setTimeout(r, 1500));
    expect(await admin<boolean>("POST", "rpc/try_lock", { lock_name: name, lock_holder: "b", ttl_seconds: 30 })).toBe(true);
    await admin("POST", "rpc/release_lock", { lock_name: name, lock_holder: "b" });
  });
  it("Amazon item lookup returns current offers with our tag", async () => {
    const [pick] = await admin<{ asin: string }[]>("GET", "deal_picks?select=asin&limit=1");
    const items = await getItems([pick.asin]);
    const d = items.get(pick.asin);
    expect(d).toBeDefined();
    expect(d!.url).toContain("valueverdic03-21");
  }, 20000);
  it("price re-check saves the fresh offer and its check time on every pick of that product", async () => {
    const [pick] = await admin<{ asin: string; price_checked_at: string }[]>("GET", "deal_picks?select=asin,price_checked_at&order=price_checked_at.asc&limit=1");
    const fresh = (await getItems([pick.asin])).get(pick.asin);
    expect(fresh).toBeDefined();
    const n = await admin<number>("POST", "rpc/refresh_pick_prices", { items: [{ asin: pick.asin, data: fresh }] });
    expect(n).toBeGreaterThanOrEqual(1);
    const [after] = await admin<{ price_checked_at: string; data: { price: number } }[]>("GET", `deal_picks?select=price_checked_at,data&asin=eq.${pick.asin}&limit=1`);
    expect(Date.parse(after.price_checked_at)).toBeGreaterThan(Date.parse(pick.price_checked_at));
    expect(after.data.price).toBe(fresh!.price);
  }, 30000);
});

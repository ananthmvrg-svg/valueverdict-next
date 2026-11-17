import { describe, expect, it } from "vitest";
import { budgetFrom, limit, titleOk } from "../src/lib/amazon";

const FRIDGE = "refrigerator|!for refrigerator|!for fridge|!stabilizer|!stabiliser|!power saver|!visi cooler|!mats";
const WASHER = "washing machine|washer|!for washing machine|!pressure washer|!high pressure|!car washer|!jet washer|!stand|!trolley|!cover|!descaler|!detergent";
const GAMING = "rtx|gtx|geforce|gaming|radeon rx|!for laptop|!laptop bag|!backpack|!sleeve|!laptop stand|!cooling pad|!table|!gaming mouse|!mouse pad|!headset|!headphone|!chair|!controller|!monitor|!desk";

describe("title rules (category matching, accessories)", () => {
  it("keeps real fridges and drops fridge accessories", () => {
    expect(titleOk("Samsung 183 L, 2 Star, Digital Inverter, Direct-Cool Single Door Refrigerator", FRIDGE)).toBe(true);
    expect(titleOk("V-Guard Voltage Stabilizer for Refrigerator up to 300 L", FRIDGE)).toBe(false);
    expect(titleOk("MD Proelectra Power Saver for Refrigerator, AC", FRIDGE)).toBe(false);
  });
  it("drops a pressure washer from washing machines but keeps 'washer' machines", () => {
    expect(titleOk("KÄRCHER K5 Power Control High Pressure Washer, 2100W", WASHER)).toBe(false);
    expect(titleOk("Haier 8 kg 5 Star Front Load Washer with PuriSteam", WASHER)).toBe(true);
  });
  it("gaming laptops need gaming hardware in the title", () => {
    expect(titleOk("Lenovo LOQ AMD Ryzen 7 250 | NVIDIA RTX 5060 8GB Gaming Laptop", GAMING)).toBe(true);
    expect(titleOk("Lenovo V14 Intel Core i3 13th Gen 14\" FHD Laptop", GAMING)).toBe(false);
    expect(titleOk("Redgear Pro Wireless Gaming Mouse", GAMING)).toBe(false);
  });
  it("matches whole words only and ignores case", () => {
    expect(titleOk("Smart TV 43 inch", "tv")).toBe(true);
    expect(titleOk("TWS earbuds", "tv")).toBe(false);
  });
  it("no rule keeps everything", () => {
    expect(titleOk("anything", "")).toBe(true);
  });
});

const subs = [
  { slug: "under-15k", name: "Under ₹15,000", max_price: "15000", active: "TRUE" },
  { slug: "under-20k", name: "Under ₹20,000", max_price: "20000", active: "TRUE" },
  { slug: "under-25k", name: "Under ₹25,000", max_price: "25000", active: "TRUE" },
  { slug: "above-1-lakh", name: "Above ₹1 Lakh", max_price: "", active: "TRUE" },
  { slug: "32-inch-tvs", name: "32″ TVs", max_price: "", active: "TRUE" },
];

describe("budget pages", () => {
  it("price band runs from 70% of the next lower budget to this budget", () => {
    expect(budgetFrom(subs, "under-25k")).toEqual({ lo: 14000, hi: 25000, words: "" });
    expect(budgetFrom(subs, "under-15k")).toEqual({ lo: null, hi: 15000, words: "" });
  });
  it("'Above ₹1 Lakh' starts at ₹1,00,000", () => {
    expect(budgetFrom(subs, "above-1-lakh")).toEqual({ lo: 100000, hi: null, words: "" });
  });
  it("size pages add the size to the search and require it in the title", () => {
    const b = budgetFrom(subs, "32-inch-tvs")!;
    expect(b.words).toBe("32 inch");
    const row = limit({ keywords: "smart tv", min_price: "8000", max_price: "" }, b);
    expect(row.keywords).toBe("smart tv 32 inch");
    expect(row.title_has).toBe("32");
  });
  it("a search's own minimum price wins when it is higher than the band", () => {
    const row = limit({ keywords: "dishwasher", min_price: "15000", max_price: "" }, budgetFrom(subs, "under-25k"));
    expect(row.min_price).toBe("15000");
    expect(row.max_price).toBe("25000");
  });
  it("unknown budget slug gives no budget", () => {
    expect(budgetFrom(subs, "under-999k")).toBeNull();
  });
});

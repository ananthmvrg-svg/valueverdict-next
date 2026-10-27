import { describe, expect, it } from "vitest";
import { checkPlan, filtersFor, type Inputs, type Plan } from "../src/lib/research";

const inputs: Inputs = {
  date: "2026-11-01", brands: ["Samsung", "LG"], searchConsole: null, searchConsoleError: "", topSellers: {}, thinSearches: [],
  cats: [
    { id: "9", slug: "tvs", name: "TVs", subs: 6, sections: ["Smart TV deals"], keywords: ["smart tv"] },
    { id: "11", slug: "air-conditioners", name: "Air Conditioners", subs: 3, sections: ["AC deals"], keywords: ["split ac inverter"] },
    { id: "13", slug: "amazon-finds", name: "Amazon Finds", subs: 0, sections: ["Earbuds deals"], keywords: ["earbuds"] },
  ],
  baselineJobs: 60,
};
const src = ["https://example.in/winter-demand"];
const s = (o: Partial<Plan["searches"][number]>) => ({ category: "tvs", keywords: "mini led tv", section: "Smart TV deals", reason: "r", sources: src, ...o });
const plan = (searches: Plan["searches"]): Plan => ({ summary: "", searches, content_ideas: [] });

describe("weekly plan checks", () => {
  it("accepts a sourced, generic search in a known category", () => {
    const r = checkPlan(plan([s({})]), inputs, src);
    expect(r.ok).toHaveLength(1);
    expect(r.rejected).toEqual([]);
  });
  it("rejects unknown categories, brands, prices, duplicates and unsourced ideas", () => {
    const r = checkPlan(plan([
      s({ category: "bikes" }), s({ keywords: "samsung qled tv" }), s({ keywords: "tv under 30000" }),
      s({ keywords: "Smart TV" }), s({ keywords: "oled tv", sources: ["https://not-from-research.com"] }), s({ keywords: "tv" }),
    ]), inputs, src);
    expect(r.ok).toEqual([]);
    expect(r.rejected.map((x) => x.why)).toEqual([
      "unknown category", "brand names are not allowed", "prices belong to our budget pages, not the search words",
      "duplicates a current search", "no source from the research or our data", "keywords must be 2 to 6 words",
    ]);
  });
  it("TV searches leave the screen size to the size pages", () => {
    const r = checkPlan(plan([s({ keywords: "65 inch 4k smart tv" }), s({ keywords: "mini led smart tv" })]), inputs, src);
    expect(r.ok.map((x) => x.keywords)).toEqual(["mini led smart tv"]);
    expect(r.rejected[0].why).toMatch(/screen sizes/);
  });
  it("our own data counts as a source", () => {
    expect(checkPlan(plan([s({ sources: ["our-data:thin-search"] })]), inputs, []).ok).toHaveLength(1);
  });
  it("keeps budget categories in their own section; amazon-finds sections must end in deals", () => {
    const r = checkPlan(plan([s({ section: "Winter TVs" }), s({ category: "amazon-finds", keywords: "oil filled room heater", section: "Room heater deals" }),
      s({ category: "amazon-finds", keywords: "electric kettle steel", section: "Kettles" })]), inputs, src);
    expect(r.ok.map((x) => x.section)).toEqual(["Smart TV deals", "Room heater deals"]);
    expect(r.rejected[0].why).toMatch(/end in "deals"/);
  });
  it("plan searches stay within 30% of all Amazon search jobs", () => {
    /* baseline 60 jobs → plan at most 25 (30% of 85); each TV search = 6 budgets × 3 pages = 18 jobs */
    const r = checkPlan(plan([s({ keywords: "mini led tv" }), s({ keywords: "qled smart tv" })]), inputs, src);
    expect(r.ok).toHaveLength(1);
    expect(r.rejected[0].why).toMatch(/30% share/);
  });
});

describe("filters for plan searches", () => {
  const rows = [
    { category_id: "13", section: "Smartwatch deals", min_rating: "3", min_saving_percent: "40", search_index: "Electronics", must_include: "watch" },
    { category_id: "13", section: "Earbuds deals", min_rating: "3", min_saving_percent: "30", search_index: "Electronics", must_include: "" },
    { category_id: "13", section: "Trimmer deals", min_rating: "3", min_saving_percent: "25", search_index: "", must_include: "" },
  ] as unknown as import("../src/lib/products").Row[];
  const s = (section: string) => ({ category: "amazon-finds", keywords: "oil filled room heater", section, reason: "", sources: [] });
  it("an existing section keeps its own filters", () => {
    expect(filtersFor(s("Earbuds deals"), "13", rows)?.min_saving_percent).toBe("30");
  });
  it("a new section gets the rating and the typical discount, not another section's rules", () => {
    const f = filtersFor(s("Room heater deals"), "13", rows)!;
    expect([f.min_rating, f.min_saving_percent, f.search_index, f.must_include]).toEqual(["3", "30", "", ""]);
  });
});

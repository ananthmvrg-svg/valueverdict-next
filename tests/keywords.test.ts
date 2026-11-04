import { describe, expect, it } from "vitest";
import { categoryFor, decode, momentum, parseExport, parseKeywordPlanner, parseTrends, searchRange } from "../src/lib/keywords";
import { costOf, monthStart } from "../src/lib/costs";

const planner = [
  "Keyword Stats 2026-11-04 at 10_15_02",
  "1 November 2025 - 31 October 2026",
  "Keyword\tCurrency\tAvg. monthly searches\tThree month change\tYoY change\tCompetition\tCompetition (indexed value)\tSearches: Sep 2026\tSearches: Oct 2026",
  "1.5 ton inverter ac\tINR\t10K – 100K\t-90%\t0%\tHigh\t100\t9900\t8100",
  "stabilizer for refrigerator\tINR\t1K – 10K\t0%\t+22%\tMedium\t60\t\t1900",
  "Best TV Under 30000\tINR\t2,400\t\t\tLow\t20\t2400\t2900",
].join("\n");

const trends = [
  "Category: All categories", "",
  "Week,room heater: (India),geyser: (India)",
  ...Array.from({ length: 8 }, (_, i) => `2026-09-${String(6 + i).padStart(2, "0")},${i < 4 ? 10 : 30},${i === 0 ? "<1" : 50}`),
].join("\n");

describe("Keyword Planner export", () => {
  it("reads ranges, exact numbers, changes and monthly searches", () => {
    const rows = parseKeywordPlanner(planner);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({ keyword: "1.5 ton inverter ac", category: "air-conditioners", searches_low: 10000, searches_high: 100000, competition: "High", change_3m: -90, change_yoy: 0 });
    expect(rows[0].trend).toEqual([{ period: "sep 2026", value: 9900 }, { period: "oct 2026", value: 8100 }]);
    expect(rows[0].period).toBe("1 November 2025 - 31 October 2026");
    expect(rows[1]).toMatchObject({ category: "fridge-accessories", change_yoy: 22, trend: [{ period: "oct 2026", value: 1900 }] });
    expect(rows[2]).toMatchObject({ keyword: "best tv under 30000", category: "tvs", searches_low: 2400, searches_high: 2400 });
  });
  it("reads the UTF-16 file Google Ads downloads", () => {
    const buf = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(planner, "utf16le")]);
    expect(parseExport(decode(buf))).toHaveLength(3);
  });
  it("reads a comma-separated (Google Sheets) export", () => {
    expect(parseKeywordPlanner('Keyword,Avg. monthly searches,Competition\n"geyser 15 litre","1K – 10K",Low')[0]).toMatchObject({ category: "geysers", searches_high: 10000 });
  });
  it("refuses a file that isn't an export", () => {
    expect(() => parseExport("name,price\nx,1")).toThrow();
  });
});

describe("Google Trends export", () => {
  it("reads every term's weekly interest", () => {
    const rows = parseTrends(trends);
    expect(rows.map((r) => [r.keyword, r.category])).toEqual([["room heater", "home-appliances"], ["geyser", "geysers"]]);
    expect(rows[0].trend).toHaveLength(8);
    expect(rows[1].trend![0].value).toBe(0.5);
    expect(rows[0].period).toBe("2026-09-06 – 2026-09-13, India");
    expect(momentum(rows[0].trend)).toBe(200);
  });
});

describe("helpers", () => {
  it("ranges and categories", () => {
    expect(searchRange("100 – 1K")).toEqual([100, 1000]);
    expect(searchRange("")).toEqual([null, null]);
    expect(categoryFor("instant geyser 3 litre")).toBe("geysers");
    expect(categoryFor("wooden study table")).toBeNull();
  });
  it("prices a call: Opus 5.5 at $4/$20, batch at half, web search at $10 per 1,000", () => {
    expect(costOf("claude-opus-5-5", { input_tokens: 1e6, output_tokens: 1e6 })).toBeCloseTo(24);
    expect(costOf("claude-haiku-5-5", { input_tokens: 2e6, output_tokens: 2e6 }, true)).toBeCloseTo(0.6);
    expect(costOf("claude-sonnet-5-5", { cache_read_input_tokens: 1e6, server_tool_use: { web_search_requests: 10 } })).toBeCloseTo(0.3);
  });
  it("month starts at midnight India time", () => {
    expect(monthStart(new Date("2026-11-04T10:00:00Z"))).toBe("2026-10-31T18:30:00.000Z");
    expect(monthStart(new Date("2026-10-31T19:00:00Z"))).toBe("2026-10-31T18:30:00.000Z");
  });
});

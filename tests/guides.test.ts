import { describe, expect, it } from "vitest";
import { reviewNotes, rupees } from "../src/lib/guides-draft";

const draft = (text: string) => ({
  title: "Fridge buying guide", description: "How to choose a fridge.", summary: [text],
  sections: [{ heading: "Capacity", paragraphs: ["Pick by family size."], bullets: [], table: null }], faqs: [],
});
const budgets = ["Under 15K", "Under 25K", "Under 1 Lakh", "Above 1 Lakh"];

describe("guide review notes", () => {
  it("reads budget names and prices as rupees", () => {
    expect(rupees("Under 15K")).toBe(15000);
    expect(rupees("₹15,000")).toBe(15000);
    expect(rupees("₹1 Lakh")).toBe(100000);
    expect(rupees("Above 1 Lakh")).toBe(100000);
  });
  it("budget limits are fine; other prices are flagged", () => {
    expect(reviewNotes(draft("Under ₹15,000 you get single-door models; above ₹1 Lakh, side-by-side."), [], budgets)).toEqual([]);
    expect(reviewNotes(draft("Expect to pay about ₹18,500."), [], budgets)).toEqual(["Prices: ₹18,500"]);
  });
  it("flags brands as written, not ordinary words", () => {
    expect(reviewNotes(draft("Noise from the compressor is normal. Samsung makes many."), ["Noise", "Samsung"], budgets)).toEqual(["Brand names: Samsung"]);
  });
  it("flags percentages, years and unverifiable claims", () => {
    expect(reviewNotes(draft("Saves 30% power, launched in 2026, very durable."), [], budgets))
      .toEqual(["Percentages: 30%", "Years: 2026", "Unverifiable wording: durable"]);
  });
});

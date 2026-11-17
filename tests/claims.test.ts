import { describe, expect, it } from "vitest";
import { freshClaims, pricesAgree, relativeOk, withoutContradictions } from "../src/lib/claims";

const tv = { price: 38999, was: 74999, off: 48 };

describe("prices in the text must match the card", () => {
  it("accepts the current price, was price, saving and budget limits", () => {
    expect(pricesAgree("At ₹38,999 with 48% off the reference price.", tv)).toBe(true);
    expect(pricesAgree("Listed at ₹74,999, now ₹39k.", tv)).toBe(true);
    expect(pricesAgree("You save ₹36,000 against the list price.", tv)).toBe(true);
    expect(pricesAgree("A Mini LED TV under ₹40,000.", tv)).toBe(true);
    expect(pricesAgree("100% copper condenser", tv)).toBe(true);
  });
  it("rejects a stale price or discount after a price re-check", () => {
    expect(pricesAgree("At ₹36,499 it is a steal.", tv)).toBe(false);
    expect(pricesAgree("Now 52% off the listed price.", tv)).toBe(false);
    expect(pricesAgree("A Mini LED TV under ₹35,000.", tv)).toBe(false);
  });
});

describe("page-relative claims", () => {
  const peers = [tv, { price: 31999, was: 45000, off: 29 }, { price: 44999, was: 84999, off: 47 }];
  it("are dropped outside their own list (Top 100, home page)", () => {
    expect(relativeOk("The lowest price on this page.", tv, null)).toBe(false);
    expect(relativeOk("The only Mini LED model here.", tv, null)).toBe(false);
    expect(relativeOk("Full array local dimming.", tv, null)).toBe(true);
  });
  it("price and discount superlatives are re-checked against the list", () => {
    expect(relativeOk("The lowest price on this page.", tv, peers)).toBe(false);
    expect(relativeOk("The lowest price on this page.", peers[1], peers)).toBe(true);
    expect(relativeOk("The biggest discount here.", tv, peers)).toBe(true);
    expect(relativeOk("Highest price on this page", tv, peers)).toBe(false);
    expect(relativeOk("Higher price than the Haier model", tv, peers)).toBe(false);
    expect(relativeOk("The only Mini LED model here.", tv, peers)).toBe(true);
  });
});

describe("pros that a con contradicts are dropped", () => {
  it("same topic, con against it", () => {
    expect(withoutContradictions(["3 HDMI ports with eARC", "Mini LED panel"], ["Only 3 HDMI ports"])).toEqual(["Mini LED panel"]);
    expect(withoutContradictions(["Lowest price on this page", "Google TV"], ["Higher price than the Haier model"])).toEqual(["Google TV"]);
    expect(withoutContradictions(["120 Hz HSR refresh"], ["60 Hz native refresh rate"])).toEqual([]);
  });
  it("a discount pro is not about the price; a neutral con is not a contradiction", () => {
    expect(withoutContradictions(["56% off listed price"], ["Higher price than the Faber hood"])).toEqual(["56% off listed price"]);
    expect(withoutContradictions(["8 kg wash capacity"], ["5 kg spin tub capacity"])).toEqual(["8 kg wash capacity"]);
  });
});

describe("freshClaims", () => {
  it("cleans every text of a pick shown on the Top 100", () => {
    const pick = { ...tv, reason: "The only Mini LED TV here at ₹38,999. Suits bright rooms; skip it if you need 120 Hz.", bestFor: "Bright living rooms",
      strengths: ["Mini LED panel", "Lowest price on this page"], limitations: ["60 Hz native refresh"] };
    const out = freshClaims(pick, null);
    expect(out.reason).toBe("Suits bright rooms; skip it if you need 120 Hz.");
    expect(out.strengths).toEqual(["Mini LED panel"]);
    expect(out.limitations).toEqual(["60 Hz native refresh"]);
  });
});

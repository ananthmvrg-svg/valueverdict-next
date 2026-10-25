import { describe, expect, it } from "vitest";
import type { Deal } from "../src/lib/amazon";
import { keepSupported, supported } from "../src/lib/evidence";

const washer = {
  asin: "B0TEST", title: "Haier 8 kg 5 Star Fully-Automatic Front Load Washing Machine with PuriSteam, 525mm Super Drum",
  brand: "Haier", features: ["Capacity - 8 Kg Capacity with 525 mm Super Drum"], image: "", url: "",
  price: 27489, was: 53500, off: 49, deal: "Great Indian Festival", dealEnds: null, claimed: null, primeOnly: false, lowStock: "",
  specs: { capacity_kg: 8, load: "Front load", energy_stars: 5, steam: true },
} as unknown as Deal;

describe("evidence check for AI claims", () => {
  it("accepts claims whose numbers are in the listing or price", () => {
    expect(supported("8 kg front load with steam wash", washer)).toBe(true);
    expect(supported("5-star energy rating", washer)).toBe(true);
    expect(supported("49% off at ₹27,489", washer)).toBe(true);
    expect(supported("Under ₹27k with a 525 mm drum", washer)).toBe(true);
    expect(supported("Saves ₹26,011 against the list price", washer)).toBe(true);
  });
  it("rejects numbers that aren't in the data", () => {
    expect(supported("9 kg drum for big families", washer)).toBe(false);
    expect(supported("1400 RPM spin speed", washer)).toBe(false);
  });
  it("rejects claims the AI cannot know from a listing", () => {
    expect(supported("Highly reliable brand", washer)).toBe(false);
    expect(supported("Loved by customers", washer)).toBe(false);
    expect(supported("Best-selling front loader", washer)).toBe(false);
    expect(supported("Lowest ever price", washer)).toBe(false);
    expect(supported("Durable build", washer)).toBe(false);
    expect(supported("Established LG brand", washer)).toBe(false);
    expect(supported("Less-known brand name", washer)).toBe(false);
  });
  it("rejects feature words the listing doesn't mention", () => {
    expect(supported("Inverter motor saves power", washer)).toBe(false);
    expect(supported("Wi-Fi control from your phone", washer)).toBe(false);
    expect(supported("Front load with steam", washer)).toBe(true);
  });
  it("a refresh rate must match the native rate, not a boosted figure", () => {
    const tv = { ...washer, title: "Xiaomi 55 inch 4K QLED | 120Hz DLG | Fire TV", features: ["Refresh Rate : 60 Hertz"],
      specs: { refresh_hz: 60, display: "QLED", resolution: "4K" } } as unknown as Deal;
    expect(supported("120Hz refresh rate", tv)).toBe(false);
    expect(supported("The lowest-priced 120Hz 4K QLED here", tv)).toBe(false);
    expect(supported("60 Hz native panel", tv)).toBe(true);
  });
  it("keeps only supported claims, up to the limit", () => {
    expect(keepSupported(["8 kg capacity", "Very durable", "Steam wash", "5-star rating", "Inverter"], washer, 3))
      .toEqual(["8 kg capacity", "Steam wash", "5-star rating"]);
    expect(keepSupported("not a list", washer, 3)).toEqual([]);
  });
});

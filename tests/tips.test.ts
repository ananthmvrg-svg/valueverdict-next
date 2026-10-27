import { describe, expect, it } from "vitest";
import { tipsFor } from "../src/lib/tips";

describe("Good to know tips", () => {
  it("explains a Chromebook's OS and RAM first", () => {
    const t = tipsFor("laptops", { os: "ChromeOS", ram_gb: 4, storage: "64GB", gpu: null });
    expect(t[0]).toMatch(/ChromeOS runs web and Android apps/);
    expect(t[1]).toMatch(/^4 GB RAM handles browsing/);
  });
  it("gaming laptop: RAM and entry-level RTX explained", () => {
    const t = tipsFor("laptops", { os: "Windows 11", ram_gb: 16, gpu: "NVIDIA RTX 3050" }, 3);
    expect(t).toEqual([
      "16 GB RAM keeps heavy multitasking, coding and gaming smooth.",
      "Entry-level gaming graphics: most games run well at 1080p on medium settings.",
    ]);
  });
  it("TV: panel first, then native refresh rate", () => {
    const t = tipsFor("tvs", { display: "Mini LED", refresh_hz: 120, resolution: "4K", platform: "Google TV" });
    expect(t[0]).toMatch(/^Mini LED/);
    expect(t[1]).toMatch(/native 120 Hz/);
  });
  it("fridge: capacity for family size, then inverter", () => {
    expect(tipsFor("refrigerators", { capacity_l: 236, inverter: true, cooling: "Frost free", energy_stars: 5 }))
      .toEqual(["236 L suits a family of 2–4.", "An inverter compressor changes speed instead of switching on and off, so it's quieter and uses less electricity."]);
  });
  it("AC: tonnage by room size with a sunny-room note", () => {
    expect(tipsFor("air-conditioners", { tons: 1.5, inverter: true }, 1)[0]).toBe("1.5 ton suits average rooms of about 110–160 sq ft. Choose a bigger capacity for top-floor or very sunny rooms.");
  });
  it("star ratings are explained honestly for low ratings", () => {
    const t = tipsFor("refrigerators", { energy_stars: 2 }, 3);
    expect(t[0]).toMatch(/At 2 stars it costs more to run/);
  });
  it("no specs or unknown category: no tips", () => {
    expect(tipsFor("laptops", {})).toEqual([]);
    expect(tipsFor("amazon-finds", { anything: 1 })).toEqual([]);
  });
});

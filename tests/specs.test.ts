import { describe, expect, it } from "vitest";
import { specChips, specsFor } from "../src/lib/specs";

describe("TV specs", () => {
  it("reads size from cm and inches, panel, resolution and platform", () => {
    const s = specsFor("tvs", "Xiaomi (139 cm) 55 inch Smartchoice FX Pro 4K QLED Smart Google TV | HDR10+ | 34W Dolby Audio");
    expect(s).toMatchObject({ screen_inches: 55, display: "QLED", resolution: "4K", platform: "Google TV" });
  });
  it("Mini LED wins over plain LED, and size can come from cm only", () => {
    const s = specsFor("tvs", "Samsung 108 cm Mini LED 4K Smart TV");
    expect(s).toMatchObject({ screen_inches: 43, display: "Mini LED" });
  });
  it("native refresh rate is kept; 'motion rate' marketing is ignored", () => {
    expect(specsFor("tvs", "LG 55 inch 4K OLED TV, 120Hz refresh rate").refresh_hz).toBe(120);
    expect(specsFor("tvs", "TCL 43 inch 4K LED TV with Motion Rate 120Hz").refresh_hz).toBeUndefined();
    expect(specsFor("tvs", "Acme 50 inch 4K TV, MEMC 120 Hz").refresh_hz).toBeUndefined();
    expect(specsFor("tvs", "Xiaomi 55 inch 4K QD-Mini LED | HDR10+ | 120Hz DLG Game Booster | Fire TV").refresh_hz).toBeUndefined();
    expect(specsFor("tvs", "Xiaomi 55 inch 4K QLED | 120Hz DLG | Fire TV", ["Resolution : 4K Ultra HD (3840 x 2160)| Refresh Rate : 60 Hertz"]).refresh_hz).toBe(60);
  });
  it("unknown specs stay out instead of being guessed", () => {
    const s = specsFor("tvs", "Brand Smart Television");
    expect(s.screen_inches).toBeUndefined();
    expect(s.resolution).toBeUndefined();
  });
});

describe("laptop specs", () => {
  it("reads a gaming laptop's CPU, GPU, RAM, storage and OS", () => {
    const s = specsFor("laptops", "Lenovo LOQ AMD Ryzen 7 250 | NVIDIA RTX 5060 8GB (16GB RAM/512GB SSD/FHD IPS/144Hz Refresh Rate) Windows 11 Gaming Laptop");
    expect(s).toMatchObject({ cpu: "AMD Ryzen 7 250", gpu: "NVIDIA RTX 5060", ram_gb: 16, storage: "512GB", refresh_hz: 144, os: "Windows 11", gaming: true });
  });
  it("Chromebooks are ChromeOS, never Windows, and not gaming", () => {
    const s = specsFor("laptops", "ASUS Chromebook CM1405 (2026), MediaTek Kompanio 540, 4GB RAM, 64GB eMMC, 14 inch FHD", ["Operating System: Chrome OS"]);
    expect(s).toMatchObject({ os: "ChromeOS", cpu: "MediaTek Kompanio 540", ram_gb: 4, storage: "64GB", screen_inches: 14 });
    expect(s.gaming).toBeUndefined();
  });
  it("PrimeOS stays PrimeOS", () => {
    expect(specsFor("laptops", "Primebook 2 Pro 8GB/128GB Laptop", ["Android-based PrimeOS"]).os).toBe("PrimeOS");
  });
  it("Intel Core Ultra and Core i5 models are read; integrated graphics are not gaming", () => {
    expect(specsFor("laptops", "HP 14, Intel Core Ultra 5 125H, 24GB DDR5, 1TB SSD, Intel Arc Graphics").cpu).toBe("Intel Core Ultra 5 125H");
    const s = specsFor("laptops", "Dell 15, Intel Core i5-1334U, 16GB, 512GB SSD, Integrated Graphics, Windows 11");
    expect(s).toMatchObject({ cpu: "Intel Core i5-1334U", gpu: "Integrated", os: "Windows 11" });
    expect(s.gaming).toBeUndefined();
  });
});

describe("appliance specs", () => {
  it("washing machine: load type, automation, capacity, stars", () => {
    expect(specsFor("washing-machines", "Samsung 7 Kg 5 Star Fully-Automatic Front Loading Washing Machine with Hygiene Steam")).toMatchObject(
      { capacity_kg: 7, load: "Front load", automation: "Fully automatic", energy_stars: 5, steam: true });
    expect(specsFor("washing-machines", "Godrej 7.5 Kg 5 Star Fully-Automatic Top Load Washing Machine").load).toBe("Top load");
  });
  it("refrigerator: capacity, doors, cooling, stars, inverter", () => {
    expect(specsFor("refrigerators", "Samsung 183 L, 2 Star, Digital Inverter, Direct-Cool Single Door Refrigerator")).toMatchObject(
      { capacity_l: 183, doors: "Single door", cooling: "Direct cool", energy_stars: 2, inverter: true });
    expect(specsFor("refrigerators", "Haier 596L 3 Star SBS Convertible Refrigerator").doors).toBe("Side-by-side");
  });
  it("AC: tonnage, type, inverter, stars", () => {
    expect(specsFor("air-conditioners", "Midea 1 Ton 3 star Inverter Split AC (Copper, HD Filter)")).toMatchObject(
      { tons: 1, type: "Split", inverter: true, energy_stars: 3, copper: true });
    expect(specsFor("air-conditioners", "Sharp 1.37 Ton 3 star Split AC").tons).toBe(1.37);
  });
  it("home appliances: the product type comes from the title only", () => {
    expect(specsFor("home-appliances", "Faber Hood Trendy 60cm 1500 m3/hr BLDC Autoclean Slant Shape Chimney | Filterless"))
      .toEqual({ kind: "Chimney", width_cm: 60, suction_m3h: 1500, auto_clean: true, filter: "Filterless", bldc: true });
    expect(specsFor("home-appliances", "Instant Vortex Plus 6L Air Fryer, 1700W", ["Dishwasher safe basket"]))
      .toEqual({ kind: "Air fryer", capacity_l: 6, watts: 1700 });
    expect(specsFor("home-appliances", "STIEBEL ELTRON Cloud Water Filter | 5-Stage UltraFiltration | Ideal For Municipal Water Up to 300 PPM").tech).toBe("UF");
    expect(specsFor("home-appliances", "WHOLER 100 LPH Commercial RO Water Purifier Plant with TDS Adjuster").commercial).toBe(true);
    expect(specsFor("home-appliances", "Jafanda JF260S Air Purifier for Large Room, 260m3/h CADR, H13 True HEPA"))
      .toEqual({ kind: "Air purifier", cadr_m3h: 260, hepa: "H13" });
    expect(specsFor("home-appliances", "KAFF Vetra 60cm Freestanding Dishwasher, 12 Place Settings, 6 Wash Programs"))
      .toEqual({ kind: "Dishwasher", place_settings: 12, programs: 6 });
    expect(specsFor("home-appliances", "Cuisinart 11-Piece Pots and Pans Set, Cookware Set Compatible with dishwasher")).toEqual({});
  });
  it("categories without rules give no specs", () => {
    expect(specsFor("amazon-finds", "boAt Airdopes 141")).toEqual({});
  });
});

describe("spec chips", () => {
  it("shows the most useful specs first, max 5", () => {
    const s = specsFor("refrigerators", "LG 253 L 3 Star Frost Free Double Door Refrigerator, Smart Inverter");
    expect(specChips("refrigerators", s)).toEqual(["253 L", "Double door", "3★", "Frost free", "Inverter"]);
  });
  it("60 Hz TVs don't get a refresh chip; RTX names are shortened", () => {
    expect(specChips("tvs", { screen_inches: 43, display: "LED", resolution: "4K", refresh_hz: 60 })).toEqual(["43″", "LED", "4K"]);
    expect(specChips("laptops", { cpu: "AMD Ryzen 7 250", ram_gb: 16, gpu: "NVIDIA RTX 5060" })).toEqual(["AMD Ryzen 7 250", "16 GB RAM", "RTX 5060"]);
  });
});

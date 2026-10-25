/* Key specifications read from a product's own title and feature bullets, by fixed rules (no AI, no guessing).
   A value is filled in only when the listing states it; everything else stays null ("unknown").
   Which rules apply depends on the category page the product was found for. */

export type Specs = Record<string, string | number | boolean | null>;

const text = (title: string, features: string[]) => `${title} | ${features.join(" | ")}`.replace(/\s+/g, " ");
const first = (t: string, re: RegExp) => t.match(re)?.[1] ?? null;
const has = (t: string, re: RegExp) => re.test(t);
const num = (v: string | null) => (v == null ? null : Number(v));

/* "5 Star" / "5-star" energy rating (only 1–5) */
const stars = (t: string) => {
  const s = num(first(t, /\b([1-5])[\s-]*star\b/i));
  return s && s >= 1 && s <= 5 ? s : null;
};

function tv(t: string): Specs {
  /* size: "55 inch", "55-inch", '55"' or "139 cm (55 inches)" */
  let size = num(first(t, /\b(\d{2,3})(?:\.\d)?\s*(?:-\s*)?(?:inch(?:es)?|in\b|″|")/i));
  if (!size) { const cm = num(first(t, /\b(\d{2,3})\s*cm\b/i)); if (cm) size = Math.round(cm / 2.54); }
  const display =
    has(t, /\bQD[\s-]*OLED\b/i) ? "QD-OLED" : has(t, /\bOLED\b/i) ? "OLED" :
    has(t, /\b(?:QD[\s-]*)?Mini[\s-]*LED\b/i) ? "Mini LED" : has(t, /\bQLED\b/i) ? "QLED" :
    has(t, /\bNano[\s-]*Cell\b|\bNano\s*(?:4K|Series|\d)/i) ? "NanoCell" : has(t, /\bLED\b/i) ? "LED" : null;
  const resolution =
    has(t, /\b8K\b/i) ? "8K" : has(t, /\b4K\b|\bUHD\b|3840\s*x\s*2160/i) ? "4K" :
    has(t, /\bFull\s*HD\b|\bFHD\b|1920\s*x\s*1080/i) ? "Full HD" : has(t, /\bHD\s*Ready\b|1366\s*x\s*768|\bHD\b/i) ? "HD" : null;
  /* native refresh rate only: skip numbers next to "motion", "MEMC", "effective" or "rate (up to)" marketing */
  let refresh: number | null = null;
  /* the words before and after the number are checked: "120Hz DLG Game Booster" or "Motion Rate 120Hz" isn't the panel's rate */
  for (const m of t.matchAll(/(.{0,25})\b(\d{2,3})\s*(?:Hz|Hertz)\b(.{0,25})/gi)) {
    if (/motion|memc|effective|up\s*to|dynamic|clear|dlg|booster|game\s*mode|hsr/i.test(m[1] + m[3])) continue;
    const hz = Number(m[2]);
    if ([50, 60, 100, 120, 144, 165, 240].includes(hz)) { refresh = Math.max(refresh ?? 0, hz); }
  }
  const platform =
    has(t, /Google\s*TV/i) ? "Google TV" : has(t, /Android\s*TV/i) ? "Android TV" : has(t, /web\s*OS/i) ? "webOS" :
    has(t, /Tizen/i) ? "Tizen" : has(t, /Fire\s*TV/i) ? "Fire TV" : has(t, /Roku/i) ? "Roku TV" : has(t, /VIDAA/i) ? "VIDAA" :
    has(t, /Coolita/i) ? "Coolita OS" : has(t, /JioTele\s*OS/i) ? "JioTele OS" : null;
  return {
    screen_inches: size && size >= 19 && size <= 100 ? size : null,
    display, resolution, refresh_hz: refresh, platform,
    hdmi_ports: num(first(t, /\b([1-6])\s*(?:x\s*)?HDMI\b/i)),
    hdmi_2_1: has(t, /HDMI\s*2\.1/i) || null,
    dolby_vision: has(t, /Dolby\s*Vision/i) || null,
    sound_watts: num(first(t, /\b(\d{2,3})\s*W(?:atts?)?\b(?:\s*(?:sound|audio|output|speaker))?/i)),
  };
}

function laptop(t: string): Specs {
  const cpu =
    first(t, /\b(Intel\s*Core\s*Ultra\s*[3579]\s*\d{3}[A-Z]{0,2})\b/i) ?? first(t, /\b(Core\s*Ultra\s*[3579](?:\s*\d{3}[A-Z]{0,2})?)\b/i) ??
    first(t, /\b((?:Intel\s*)?Core\s*i[3579][\s-]*\d{4,5}[A-Z]{0,3})\b/i) ?? first(t, /\b((?:Intel\s*)?Core\s*i[3579])\b/i) ??
    first(t, /\b((?:Intel\s*)?Core\s*[3579]\s*\d{3}[A-Z]{0,2})\b/i) ??
    first(t, /\b((?:AMD\s*)?Ryzen\s*(?:AI\s*)?[3579](?:\s*(?:PRO\s*)?\d{3,4}[A-Z]{0,3})?)\b/i) ??
    first(t, /\b(Apple\s*M[1-9](?:\s*(?:Pro|Max))?|\bM[1-9]\s*chip)\b/i) ?? first(t, /\b(Snapdragon\s*X[\w\s-]{0,12}?)(?:\s*\||,|$)/i) ??
    first(t, /\b(MediaTek\s*Kompanio\s*\d{3,4}|Kompanio\s*\d{3,4})\b/i) ?? first(t, /\b(Helio\s*[A-Z]\d{2,3})\b/i) ??
    first(t, /\b(Intel\s*(?:Celeron|Pentium)[\w\s-]{0,10}?)(?:\s*\||,|\(|$)/i) ?? first(t, /\b(A18\s*Pro)\b/i);
  /* RAM: "16GB RAM", "16 GB DDR5", "16GB LPDDR5X" – not storage */
  const ram = num(first(t, /\b(\d{1,2})\s*GB\s*(?:RAM|DDR\d|LPDDR\d|unified\s*memory|memory)/i)) ?? num(first(t, /\bRAM[\s:]*(\d{1,2})\s*GB/i));
  const ssd = first(t, /\b(\d(?:\.\d)?\s*TB|\d{2,4}\s*GB)\s*(?:PCIe\s*)?(?:NVMe\s*)?(?:M\.2\s*)?(?:SSD|eMMC|HDD|UFS|storage)/i);
  const gpu =
    first(t, /\b((?:NVIDIA\s*)?(?:GeForce\s*)?RTX\s*\d{4}(?:\s*Ti)?)\b/i) ?? first(t, /\b((?:NVIDIA\s*)?(?:GeForce\s*)?GTX\s*\d{4}(?:\s*Ti)?)\b/i) ??
    first(t, /\b((?:AMD\s*)?Radeon\s*RX\s*\d{4}[A-Z]{0,2})\b/i) ?? first(t, /\b(Intel\s*Arc(?:\s*A\d{3}M?)?)\b/i) ??
    (has(t, /\bintegrated\s*graphics|\bIris\s*Xe|\bUHD\s*Graphics|\bRadeon\s*(?:\d{3}M|Graphics)/i) ? "Integrated" : null);
  const dedicated = gpu != null && gpu !== "Integrated" && !/Intel\s*Arc$/i.test(gpu);
  /* the OSes are kept separate: ChromeOS ≠ PrimeOS ≠ Windows ≠ macOS ≠ Linux/DOS */
  const os =
    has(t, /Windows\s*11/i) ? "Windows 11" : has(t, /Windows\s*10/i) ? "Windows 10" : has(t, /Chrome\s*OS|ChromeOS|Chromebook/i) ? "ChromeOS" :
    has(t, /Prime\s*OS/i) ? "PrimeOS" : has(t, /mac\s*OS|MacBook/i) ? "macOS" : has(t, /Ubuntu|Linux/i) ? "Linux" :
    has(t, /\bDOS\b|without\s*OS|no\s*OS/i) ? "No Windows (DOS)" : null;
  return {
    cpu: cpu ? cpu.replace(/\s+/g, " ").trim() : null,
    ram_gb: ram && ram >= 2 && ram <= 128 ? ram : null,
    storage: ssd ? ssd.replace(/\s+/g, "").toUpperCase() : null,
    gpu: gpu ? gpu.replace(/\s+/g, " ").trim() : null,
    screen_inches: num(first(t, /\b(1[0-8](?:\.\d)?)\s*(?:-\s*)?(?:inch(?:es)?|″|")/i)),
    refresh_hz: num(first(t, /\b(60|90|120|144|165|180|240)\s*(?:Hz|Hertz)\b/i)),
    os,
    /* gaming only with a dedicated gaming graphics chip */
    gaming: dedicated && /RTX|GTX|Radeon\s*RX/i.test(gpu ?? "") ? true : null,
  };
}

function washer(t: string): Specs {
  return {
    load: has(t, /front[\s-]*load/i) ? "Front load" : has(t, /top[\s-]*load/i) ? "Top load" : null,
    automation: has(t, /fully[\s-]*automatic/i) ? "Fully automatic" : has(t, /semi[\s-]*automatic/i) ? "Semi automatic" : null,
    capacity_kg: num(first(t, /\b(\d{1,2}(?:\.\d)?)\s*kg\b/i)),
    energy_stars: stars(t),
    inverter: has(t, /inverter|direct\s*drive|\bBLDC\b/i) || null,
    steam: has(t, /\bsteam\b/i) || null,
    heater: has(t, /in[\s-]*built\s*heater|\bheater\b/i) || null,
    wifi: has(t, /wi[\s-]*fi|smart\s*things|thinq/i) || null,
  };
}

function fridge(t: string): Specs {
  return {
    capacity_l: num(first(t, /\b(\d{2,3})\s*(?:L|Ltr|Litres?|Liters?)\b/i)),
    doors:
      has(t, /side[\s-]*by[\s-]*side|\bSBS\b/i) ? "Side-by-side" : has(t, /french\s*door/i) ? "French door" :
      has(t, /multi[\s-]*door|four[\s-]*door|4[\s-]*door/i) ? "Multi door" : has(t, /triple[\s-]*door|3[\s-]*door/i) ? "Triple door" :
      has(t, /double[\s-]*door|2[\s-]*door/i) ? "Double door" : has(t, /single[\s-]*door/i) ? "Single door" :
      has(t, /mini\s*(?:fridge|refrigerator)|\bmini\b/i) ? "Mini" : null,
    cooling: has(t, /frost[\s-]*free/i) ? "Frost free" : has(t, /direct[\s-]*cool/i) ? "Direct cool" : null,
    energy_stars: stars(t),
    inverter: has(t, /inverter/i) || null,
    convertible: has(t, /convertible/i) || null,
  };
}

function ac(t: string): Specs {
  return {
    tons: num(first(t, /\b(\d(?:\.\d{1,2})?)\s*Ton\b/i)),
    type: has(t, /\bsplit\b/i) ? "Split" : has(t, /\bwindow\b/i) ? "Window" : has(t, /portable/i) ? "Portable" : null,
    inverter: has(t, /\binverter\b/i) || null,
    energy_stars: stars(t),
    copper: has(t, /100\s*%\s*copper|copper\s*condenser|\bcopper\b/i) || null,
    convertible_modes: num(first(t, /\b(\d{1,2})[\s-]*in[\s-]*1\s*convertible/i)),
  };
}

function soundbar(t: string): Specs {
  return {
    channels: first(t, /\b(\d\.\d(?:\.\d)?)\s*(?:ch|channel)/i),
    watts: num(first(t, /\b(\d{2,4})\s*W(?:atts?)?\b/i)),
    subwoofer: has(t, /subwoofer/i) || null,
    dolby_atmos: has(t, /Dolby\s*Atmos/i) || null,
  };
}

const RULES: Record<string, (t: string) => Specs> = {
  "tvs": tv, "laptops": laptop, "washing-machines": washer, "refrigerators": fridge,
  "air-conditioners": ac, "soundbars-speakers": soundbar,
};

/* specs for a product found on a category page; empty for categories without rules */
export function specsFor(category: string, title: string, features: string[] = []): Specs {
  const rule = RULES[category];
  if (!rule) return {};
  const out = rule(text(title, features));
  return Object.fromEntries(Object.entries(out).filter(([, v]) => v !== null && v !== undefined));
}

/* short chips for cards, most useful first: "253 L · 3★ · Frost free · Inverter" */
export function specChips(category: string, s: Specs): string[] {
  const c: (string | null)[] = (() => {
    switch (category) {
      case "tvs": return [s.screen_inches ? `${s.screen_inches}″` : null, s.display as string, s.resolution as string,
        s.refresh_hz && Number(s.refresh_hz) > 60 ? `${s.refresh_hz} Hz` : null, s.platform as string];
      case "laptops": return [s.cpu as string, s.ram_gb ? `${s.ram_gb} GB RAM` : null, s.storage as string,
        s.gpu && s.gpu !== "Integrated" ? (s.gpu as string).replace(/NVIDIA\s*|GeForce\s*/gi, "") : null, s.os as string];
      case "washing-machines": return [s.capacity_kg ? `${s.capacity_kg} kg` : null, s.load as string,
        s.energy_stars ? `${s.energy_stars}★` : null, s.inverter ? "Inverter" : null, s.steam ? "Steam" : null];
      case "refrigerators": return [s.capacity_l ? `${s.capacity_l} L` : null, s.doors as string,
        s.energy_stars ? `${s.energy_stars}★` : null, s.cooling as string, s.inverter ? "Inverter" : null];
      case "air-conditioners": return [s.tons ? `${s.tons} Ton` : null, s.type as string,
        s.energy_stars ? `${s.energy_stars}★` : null, s.inverter ? "Inverter" : null, s.copper ? "Copper" : null];
      case "soundbars-speakers": return [s.channels ? `${s.channels} ch` : null, s.watts ? `${s.watts} W` : null,
        s.dolby_atmos ? "Dolby Atmos" : null, s.subwoofer ? "Subwoofer" : null];
      default: return [];
    }
  })();
  return c.filter((x): x is string => Boolean(x)).slice(0, 5);
}

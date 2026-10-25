import type { Specs } from "./specs";

/* "Good to know": short, plain explanations of a product's own key specs, so shoppers learn what they mean.
   Fixed text (not AI): general buying knowledge chosen by the product's specs, most useful first. */

const n = (v: unknown) => (v == null ? null : Number(v));

function tv(s: Specs): string[] {
  const t: string[] = [];
  switch (s.display) {
    case "Mini LED": t.push("Mini LED uses thousands of tiny backlights, so it gets brighter with deeper blacks than a regular LED TV. Great for bright rooms and HDR movies."); break;
    case "OLED": case "QD-OLED": t.push("OLED pixels make their own light, giving perfect blacks and wide viewing angles. Best for movies in a darker room."); break;
    case "QLED": t.push("QLED adds a quantum-dot layer for brighter, richer colours than a standard LED panel."); break;
    case "NanoCell": t.push("NanoCell is LG's colour-filter panel: colours are a step above basic LED TVs."); break;
    case "LED": t.push("A standard LED panel is fine for everyday TV. QLED or Mini LED look better in bright rooms and with HDR content."); break;
  }
  const hz = n(s.refresh_hz);
  if (hz && hz >= 100) t.push(`A native ${hz} Hz panel shows smoother motion in sports and fast games, and suits PS5 or Xbox gaming.`);
  else if (hz === 60 || hz === 50) t.push(`${hz} Hz is fine for shows and movies; sports fans and gamers benefit from a native 120 Hz panel.`);
  switch (s.resolution) {
    case "4K": t.push("4K has four times the detail of Full HD, which you notice most on screens 43 inches and bigger."); break;
    case "Full HD": t.push("Full HD is sharp on 32–40 inch screens; on larger screens 4K looks noticeably crisper."); break;
    case "HD": t.push("HD Ready suits small bedroom or kitchen TVs; for larger screens choose Full HD or 4K."); break;
  }
  switch (s.platform) {
    case "Google TV": case "Android TV": t.push(`${s.platform} gives you the Google Play Store's large app library and casting from your phone.`); break;
    case "Fire TV": t.push("Fire TV has Alexa voice control and a large app library, and pairs naturally with Prime Video."); break;
    case "webOS": case "Tizen": t.push(`${s.platform} is the brand's own smart system: smooth to use, with all major streaming apps, though fewer apps than Google TV.`); break;
  }
  return t;
}

function laptop(s: Specs): string[] {
  const t: string[] = [];
  const ram = n(s.ram_gb), gpu = String(s.gpu ?? "");
  if (s.os === "ChromeOS") t.push("ChromeOS runs web and Android apps, not Windows software or most PC games. Ideal for browsing, Google Docs and online classes.");
  else if (s.os === "PrimeOS") t.push("PrimeOS is Android-based: it runs Android apps, not Windows software. Good for online classes and basic work.");
  else if (s.os === "macOS") t.push("macOS runs Mac apps; check that any software you need has a Mac version. Most Windows-only games won't run.");
  if (ram) {
    if (ram <= 4) t.push(`${ram} GB RAM handles browsing, documents and online classes, but slows down with many tabs or heavy apps.`);
    else if (ram <= 8) t.push(`${ram} GB RAM is comfortable for studies, office work and light photo editing.`);
    else t.push(`${ram} GB RAM keeps heavy multitasking, coding and gaming smooth.`);
  }
  if (/RTX\s*(30|20)50|GTX/i.test(gpu)) t.push("Entry-level gaming graphics: most games run well at 1080p on medium settings.");
  else if (/RTX\s*\d{4}|Radeon\s*RX/i.test(gpu)) t.push("A dedicated gaming graphics chip runs modern games at 1080p and speeds up video editing and 3D work.");
  else if (gpu === "Integrated") t.push("Integrated graphics are fine for studies, office work and streaming, but not for modern games.");
  const hz = n(s.refresh_hz);
  if (hz && hz >= 120) t.push(`A ${hz} Hz screen makes scrolling and games look smoother than a standard 60 Hz display.`);
  const gb = /^(\d+)GB$/i.exec(String(s.storage ?? ""));
  if (gb && Number(gb[1]) <= 128) t.push(`${gb[1]} GB of storage fills up quickly; plan on cloud storage or a USB drive for photos and videos.`);
  return t;
}

function fridge(s: Specs): string[] {
  const t: string[] = [];
  const l = n(s.capacity_l);
  if (l) t.push(l < 200 ? `${l} L suits 1–2 people.` : l <= 300 ? `${l} L suits a family of 2–4.` : l <= 450 ? `${l} L suits a family of 4–5.` : `${l} L suits large families and bulk shopping.`);
  if (s.inverter) t.push("An inverter compressor changes speed instead of switching on and off, so it's quieter and uses less electricity.");
  if (s.cooling === "Frost free") t.push("Frost-free fridges defrost automatically, so you never have to scrape ice.");
  else if (s.cooling === "Direct cool") t.push("Direct-cool fridges are cheaper and efficient, but the freezer needs manual defrosting now and then.");
  const st = n(s.energy_stars);
  if (st) t.push(`Energy stars are BEE ratings: more stars means a lower electricity bill. ${st >= 4 ? `At ${st} stars, running costs are low.` : `At ${st} stars it costs more to run than a 4–5 star model.`}`);
  if (s.convertible) t.push("A convertible freezer can be switched to extra fridge space when you need it.");
  if (s.doors === "Single door") t.push("Single-door fridges have a small freezer inside; choose a double door if you freeze a lot.");
  return t;
}

function washer(s: Specs): string[] {
  const t: string[] = [];
  const kg = n(s.capacity_kg);
  if (kg) t.push(kg <= 6.5 ? `${kg} kg suits 1–3 people.` : kg <= 8 ? `${kg} kg suits a family of 3–5.` : `${kg} kg suits large families and washing blankets.`);
  if (s.load === "Front load") t.push("Front loaders use less water and are gentler on clothes; they cost more and each wash takes longer.");
  else if (s.load === "Top load") t.push("Top loaders are easy to load without bending and wash faster; front loaders use less water and are gentler on clothes.");
  if (s.automation === "Semi automatic") t.push("Semi-automatic machines need you to move clothes between tubs, but they're cheaper and work without a constant water supply.");
  if (s.inverter) t.push("An inverter (BLDC or direct-drive) motor is quieter and uses less electricity.");
  if (s.heater) t.push("A built-in heater warms the water for better stain removal, especially in winter.");
  if (s.steam) t.push("Steam wash helps lift stubborn stains and freshen clothes.");
  return t;
}

function ac(s: Specs): string[] {
  const t: string[] = [];
  const tons = n(s.tons);
  if (tons) t.push(tons <= 1.1 ? `${tons} ton suits rooms up to about 110 sq ft.` : tons <= 1.6 ? `${tons} ton suits rooms of about 120–180 sq ft.` : `${tons} ton suits rooms of about 180–250 sq ft.`);
  if (tons) t[t.length - 1] += " Choose a bigger capacity for top-floor or very sunny rooms.";
  if (s.inverter) t.push("An inverter AC adjusts its power instead of switching on and off, so it cuts electricity bills and keeps the temperature steady.");
  const st = n(s.energy_stars);
  if (st) t.push(`Energy stars are BEE ratings: more stars means a lower electricity bill. ${st >= 4 ? `At ${st} stars, running costs are low.` : `At ${st} stars it costs more to run than a 4–5 star model.`}`);
  if (s.copper) t.push("Copper condenser coils transfer heat well and are easier to repair than aluminium ones.");
  if (n(s.convertible_modes)) t.push("Convertible modes let you run the AC at lower capacity to save power on milder days.");
  return t;
}

function soundbar(s: Specs): string[] {
  const t: string[] = [];
  if (s.channels) t.push(`In "${s.channels}", the first number is the main speakers and the second the subwoofer; a third number means up-firing speakers for height effects.`);
  if (s.dolby_atmos) t.push("Dolby Atmos adds height to the sound for a more cinema-like feel with supported movies and shows.");
  if (s.subwoofer) t.push("A separate subwoofer gives deeper bass for movies and music.");
  return t;
}

/* Home Appliances: one set of tips per product type (specs.kind) */
function appliance(s: Specs): string[] {
  const t: string[] = [];
  switch (s.kind) {
    case "Chimney": {
      const m3 = n(s.suction_m3h), w = n(s.width_cm);
      if (m3) t.push(m3 >= 1200 ? `${m3} m³/hr is strong suction, good for daily Indian cooking with frying and tadka.` : `${m3} m³/hr suits lighter cooking; kitchens with a lot of frying and tadka benefit from about 1,200 m³/hr or more.`);
      if (w) t.push(`Match the width to your stove: a ${w} cm chimney suits ${w <= 60 ? "2–3 burner" : "3–5 burner"} stoves.`);
      if (s.filter === "Filterless") t.push("Filterless chimneys have no filter to wash; oil collects in a cup you empty now and then.");
      else if (s.filter === "Baffle filter") t.push("Baffle filters trap oil well but need washing every few weeks.");
      if (s.auto_clean) t.push("Auto-clean heats the inside to melt grease into a collector, so the chimney needs less manual cleaning.");
      break;
    }
    case "Air fryer": {
      const l = n(s.capacity_l);
      if (l) t.push(l < 4 ? `${l} L suits 1–2 people.` : l <= 6 ? `${l} L suits a family of 3–4.` : `${l} L suits larger families and whole meals.`);
      if (s.dual_zone) t.push("Two baskets let you cook two foods at once, each with its own temperature and time.");
      t.push("Air fryers cook with hot air and little or no oil; food comes out crisp, but not identical to deep frying.");
      break;
    }
    case "Water purifier":
      if (s.commercial) t.push("This is a commercial purifier (rated in litres per hour) for offices or shops, not a home kitchen purifier.");
      if (String(s.tech ?? "").includes("RO")) t.push("RO removes dissolved salts, so it suits hard water from borewells or tankers (high TDS).");
      else if (s.tech) t.push(`${s.tech} purifiers don't remove dissolved salts; they suit low-TDS municipal water. Check your water's TDS first.`);
      if (s.mineral) t.push("A TDS or mineral controller adds back some minerals after RO, so the water tastes less flat.");
      if (n(s.storage_l)) t.push(`A ${s.storage_l} L tank keeps purified water ready during power cuts.`);
      break;
    case "Air purifier":
      if (n(s.cadr_m3h)) t.push(`CADR (${s.cadr_m3h} m³/h) is how much clean air it delivers; a higher CADR cleans a room faster, so match it to your room size.`);
      if (s.hepa) t.push(`${s.hepa === "HEPA" ? "A HEPA" : `An ${s.hepa} HEPA`} filter captures fine dust and PM2.5 particles; filters need replacing, so check their price.`);
      break;
    case "Dishwasher": {
      const p = n(s.place_settings);
      if (p) t.push(p >= 12 ? `${p} place settings suits a family of 4–6, including Indian vessels like kadais and pressure cookers.` : `${p} place settings suits 2–3 people.`);
      t.push("Dishwashers use hot water and strong spray, so they clean oily Indian vessels well; scrape off food before loading.");
      break;
    }
    case "Mixer grinder": {
      const w = n(s.watts);
      if (w) t.push(w >= 750 ? `${w} W handles tough jobs like idli and dosa batter and dry masalas.` : `${w} W suits chutneys and light grinding; choose 750 W or more for regular batter grinding.`);
      if (n(s.jars)) t.push(`${s.jars} jars cover ${n(s.jars)! >= 3 ? "wet grinding, dry grinding and chutneys" : "the basics; a third jar helps if you grind batter often"}.`);
      break;
    }
  }
  return t;
}

const RULES: Record<string, (s: Specs) => string[]> = {
  "tvs": tv, "laptops": laptop, "refrigerators": fridge, "washing-machines": washer, "air-conditioners": ac, "soundbars-speakers": soundbar,
  "home-appliances": appliance,
};

/* the most useful explanations for this product, at most `max` */
export function tipsFor(category: string, specs: Specs, max = 2): string[] {
  return (RULES[category]?.(specs ?? {}) ?? []).slice(0, max);
}

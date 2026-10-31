/* Slide HTML for the reel kit. Every slide is a 1080×1920 page that Playwright screenshots.
   Keep text inside the safe zone: Instagram covers roughly the bottom 300px (caption) and the right 120px (buttons) with its own UI. */
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const req = createRequire(import.meta.url);

/* fonts and logo are inlined as data URIs so every screenshot is self-contained */
function fontFace(weight) {
  const files = join(dirname(req.resolve("@fontsource/poppins/package.json")), "files");
  return ["latin", "devanagari"]
    .map((sub) => join(files, `poppins-${sub}-${weight}-normal.woff2`))
    .filter(existsSync)
    .map((f) => `@font-face{font-family:Poppins;font-weight:${weight};src:url(data:font/woff2;base64,${readFileSync(f).toString("base64")}) format("woff2")}`)
    .join("\n");
}
const FONTS = [500, 700, 800].map(fontFace).join("\n");
const LOGO = `data:image/jpeg;base64,${readFileSync(join(here, "..", "public", "hero-logo.jpg")).toString("base64")}`;

/* same line icons as the website (src/components/Icon.tsx), plus a few for tech categories */
const ICONS = {
  "front-load": `<rect x="10" y="5" width="44" height="54" rx="7"/><path d="M10 17h44"/><circle cx="17" cy="11" r="1.6" fill="currentColor"/><circle cx="23" cy="11" r="1.6" fill="currentColor"/><rect x="36" y="9" width="12" height="4" rx="2"/><circle cx="32" cy="38" r="14"/><circle cx="32" cy="38" r="9" opacity=".5"/><path d="M24 41c2.5-2.5 5 2.5 8 0s5.5 2.5 8 0" opacity=".8"/>`,
  "top-load": `<path d="M13 15V9a3 3 0 0 1 3-3h32a3 3 0 0 1 3 3v6"/><rect x="10" y="15" width="44" height="44" rx="6"/><path d="M10 25h44"/><circle cx="18" cy="20" r="1.6" fill="currentColor"/><circle cx="24" cy="20" r="1.6" fill="currentColor"/><rect x="36" y="18" width="12" height="4" rx="2"/><ellipse cx="32" cy="42" rx="13" ry="10"/><path d="M24 43c2.5-2.5 5 2.5 8 0s5.5 2.5 8 0" opacity=".8"/>`,
  fridge: `<rect x="16" y="4" width="32" height="54" rx="5"/><path d="M16 24h32"/><path d="M22 11v7M22 30v12"/><path d="M20 58v3M44 58v3"/>`,
  mixer: `<path d="M20 8h24l-3 26H23z"/><path d="M44 12h5a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3h-6"/><path d="M18 8h28"/><rect x="16" y="38" width="32" height="20" rx="5"/><circle cx="32" cy="48" r="4"/><path d="M27 34h10"/>`,
  "water-purifier": `<rect x="14" y="4" width="36" height="56" rx="6"/><path d="M32 15c-5 7-7 10-7 13a7 7 0 0 0 14 0c0-3-2-6-7-13z"/><path d="M14 44h36"/><path d="M36 44v5h6"/><circle cx="22" cy="52" r="1.6" fill="currentColor"/>`,
  "air-purifier": `<rect x="16" y="4" width="32" height="56" rx="10"/><circle cx="32" cy="16" r="5"/><path d="M23 30h18M23 36h18M23 42h18M23 48h18"/>`,
  dishwasher: `<rect x="10" y="5" width="44" height="54" rx="6"/><path d="M10 17h44"/><path d="M24 11h16"/><circle cx="16" cy="11" r="1.6" fill="currentColor"/><path d="M18 30h28M18 42h28"/><path d="M22 30v-5M28 30v-6M34 30v-5M40 30v-6"/><path d="M22 42v-5M28 42v-5M34 42v-5M40 42v-5"/>`,
  "air-fryer": `<path d="M14 18c0-7 6-12 18-12s18 5 18 12v32a8 8 0 0 1-8 8H22a8 8 0 0 1-8-8z"/><rect x="20" y="30" width="24" height="20" rx="4"/><path d="M28 40h8"/><circle cx="32" cy="18" r="4"/>`,
  cooktop: `<rect x="4" y="22" width="56" height="26" rx="5"/><ellipse cx="17" cy="32" rx="7" ry="4"/><ellipse cx="47" cy="32" rx="7" ry="4"/><ellipse cx="32" cy="38" rx="6" ry="3.5"/><circle cx="12" cy="44" r="1.6" fill="currentColor"/><circle cx="52" cy="44" r="1.6" fill="currentColor"/>`,
  chimney: `<rect x="24" y="4" width="16" height="22"/><path d="M24 26h16l18 20H6z"/><path d="M6 46h52v6H6z"/>`,
  geyser: `<rect x="18" y="4" width="28" height="46" rx="12"/><path d="M26 50v8M38 50v8"/><path d="M28 17c-3 4 3 6 0 10M36 17c-3 4 3 6 0 10"/><circle cx="32" cy="39" r="3"/>`,
  stabilizer: `<rect x="8" y="12" width="48" height="40" rx="6"/><path d="M35 18l-9 15h9l-6 13 13-18h-9l5-10z"/><circle cx="16" cy="46" r="1.6" fill="currentColor"/>`,
  tv: `<rect x="4" y="10" width="56" height="36" rx="4"/><path d="M22 56h20M32 46v10"/>`,
  ac: `<rect x="4" y="12" width="56" height="22" rx="5"/><path d="M10 28h44"/><path d="M18 42c0 4-3 4-3 8M32 42c0 4-3 4-3 8M46 42c0 4-3 4-3 8"/>`,
  laptop: `<rect x="12" y="12" width="40" height="28" rx="3"/><path d="M4 48h56l-4 6H8z"/>`,
  mobile: `<rect x="18" y="4" width="28" height="56" rx="6"/><path d="M28 10h8"/><circle cx="32" cy="52" r="2"/>`,
  home: `<path d="M8 30L32 8l24 22"/><path d="M14 25v31h36V25"/><rect x="26" y="38" width="12" height="18"/>`,
  generic: `<path d="M12 20h40l-3 36H15z"/><path d="M23 24v-8a9 9 0 0 1 18 0v8"/>`,
};
ICONS["washing-machine"] = ICONS["front-load"];

export function iconKey(...texts) {
  for (let t of texts) {
    t = String(t || "").toLowerCase();
    if (ICONS[t.trim()]) return t.trim();
    if (/dish ?wash/.test(t)) return "dishwasher";
    if (/top[\s-]*load|semi[\s-]*auto/.test(t)) return "top-load";
    if (/front[\s-]*load|washing|washer/.test(t)) return "front-load";
    if (/mixer|grinder|juicer|blender/.test(t)) return "mixer";
    if (/air ?fryer/.test(t)) return "air-fryer";
    if (/air purifier/.test(t)) return "air-purifier";
    if (/purifier|\bro\b/.test(t)) return "water-purifier";
    if (/chimney/.test(t)) return "chimney";
    if (/cooktop|stove|burner|\bhob\b/.test(t)) return "cooktop";
    if (/geyser|water heater/.test(t)) return "geyser";
    if (/stabili[sz]er/.test(t)) return "stabilizer";
    if (/fridge|refrigerator|single door|double door|triple door|convertible|side by side/.test(t)) return "fridge";
    if (/\btv\b|television|smart tv|led|oled|qled/.test(t)) return "tv";
    if (/\bac\b|air condition|split|inverter ac/.test(t)) return "ac";
    if (/laptop|notebook|macbook/.test(t)) return "laptop";
    if (/mobile|phone|smartphone/.test(t)) return "mobile";
    if (/home|appliance|kitchen/.test(t)) return "home";
  }
  return "generic";
}
const svg = (key, size) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${ICONS[key] || ICONS.generic}</svg>`;

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

const CSS = `
${FONTS}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1920px;overflow:hidden}
body{font-family:Poppins,"Noto Sans",sans-serif;color:#fff;background:#070d1f;position:relative;-webkit-font-smoothing:antialiased}
.bg{position:absolute;inset:0;background:
  radial-gradient(900px 700px at 85% 6%,rgba(30,144,255,.40),transparent 65%),
  radial-gradient(900px 800px at 0% 96%,rgba(255,138,0,.30),transparent 65%),
  linear-gradient(170deg,#0b1530 0%,#070d1f 60%,#0a1228 100%)}
.grid{position:absolute;inset:0;opacity:.06;background-image:linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px);background-size:72px 72px;mask-image:linear-gradient(to bottom,#000,transparent 70%)}
.top{position:absolute;top:84px;left:64px;right:64px;display:flex;align-items:center;gap:26px}
.top img{width:132px;height:132px;border-radius:50%;box-shadow:0 0 0 4px rgba(255,255,255,.14),0 0 60px rgba(30,144,255,.6)}
.top .wm{font-weight:800;font-size:56px;letter-spacing:.06em;line-height:1}
.top .wm small{display:block;font-weight:500;font-size:28px;letter-spacing:.02em;color:#ffb547;margin-top:10px}
.top .step{margin-left:auto;font-weight:800;font-size:34px;color:#0b1530;background:#fff;border-radius:999px;padding:8px 24px}
.safe{position:absolute;top:262px;left:64px;right:64px;bottom:300px;display:flex;flex-direction:column}
.icon{color:#7cc4ff}
.pill{display:inline-flex;align-self:flex-start;align-items:center;background:linear-gradient(90deg,#ff8a00,#ffb547);color:#1a0e00;font-weight:800;font-size:60px;padding:16px 44px;border-radius:999px;box-shadow:0 14px 44px rgba(255,138,0,.4)}
.chip{font-weight:700;font-size:34px;padding:8px 24px;border-radius:14px;background:rgba(30,144,255,.18);border:2px solid rgba(30,144,255,.5);color:#d8ecff;white-space:nowrap}

/* hook */
.collage{position:relative;height:500px;margin:0 0 26px}
.collage .t{position:absolute;top:20px;width:380px;height:440px;background:#fff;border-radius:40px;display:flex;align-items:center;justify-content:center;padding:44px;box-shadow:0 30px 80px rgba(0,0,0,.5)}
.collage .t img{max-width:100%;max-height:100%;object-fit:contain}
.collage .t b{position:absolute;left:-16px;top:-26px;font-weight:800;font-size:56px;padding:4px 22px 8px;border-radius:20px;background:linear-gradient(180deg,#ffb547,#ff8a00);color:#1a0e00}
.collage .ico{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#7cc4ff;filter:drop-shadow(0 0 50px rgba(30,144,255,.6))}
.kicker{font-weight:800;font-size:44px;letter-spacing:.2em;color:#ffb547}
h1{font-weight:800;font-size:136px;line-height:1;letter-spacing:-.025em;margin:6px 0 30px}
h1 em{font-style:normal;background:linear-gradient(90deg,#6cc0ff,#1e90ff);-webkit-background-clip:text;color:transparent}
.hookline{margin-top:34px;font-weight:700;font-size:50px;line-height:1.25}
.hookline small{display:block;font-weight:500;font-size:36px;color:#c9d6f2;margin-top:10px}

/* product */
.photo{position:relative;height:470px;flex:none;border-radius:44px;background:#fff;display:flex;align-items:stretch;gap:20px;padding:56px 30px 26px 40px;box-shadow:0 30px 80px rgba(0,0,0,.45);color:#0f172a}
.photo .pic{flex:1;min-width:0;display:flex;align-items:center;justify-content:center}
.photo img{max-width:100%;max-height:100%;object-fit:contain}
/* price panel beside the photo: today's price, M.R.P., saving, deal facts from Amazon */
.pb{flex:none;width:400px;display:flex;flex-direction:column;justify-content:center;gap:10px;border-left:3px dashed #e2e8f0;padding-left:26px}
.pb .now{font-weight:800;font-size:76px;line-height:1;letter-spacing:-.02em}
.pb .mrp{font-weight:600;font-size:28px;color:#64748b}.pb .mrp s{color:#94a3b8}
.pb .off{align-self:flex-start;font-weight:800;font-size:34px;color:#fff;background:#16a34a;border-radius:12px;padding:4px 16px}
.pb .fact{font-weight:700;font-size:26px;line-height:1.25;border-radius:10px;padding:6px 12px;align-self:flex-start}
.pb .deal{background:#fff1e0;color:#b45309}.pb .low{background:#fee2e2;color:#b91c1c}.pb .prime{background:#e0f2fe;color:#0369a1}
.pb .at{font-weight:500;font-size:20px;color:#94a3b8}
.photo .ico{color:#9db7dc}
.rk{position:absolute;left:-12px;top:-24px;font-weight:800;font-size:104px;line-height:1;padding:10px 32px 16px;border-radius:30px;background:linear-gradient(180deg,#ffb547,#ff8a00);color:#1a0e00;box-shadow:0 14px 40px rgba(255,138,0,.5)}
.photo .tag{position:absolute;right:22px;top:22px;font-weight:800;font-size:32px;padding:10px 24px;border-radius:14px;background:#16a34a;color:#fff}
.card{margin-top:28px;flex:1;min-height:0;background:linear-gradient(160deg,rgba(255,255,255,.11),rgba(255,255,255,.04));border:2px solid rgba(255,255,255,.14);border-radius:40px;padding:34px 42px 36px;display:flex;flex-direction:column;justify-content:space-between;gap:20px;overflow:hidden}
.brand{font-weight:800;font-size:34px;letter-spacing:.16em;text-transform:uppercase;color:#7cc4ff;margin-bottom:-12px}
.card>*{flex:none}
.name b{color:#7cc4ff}
.name{font-weight:800;font-size:54px;line-height:1.13;letter-spacing:-.01em;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.chips{display:flex;flex-wrap:wrap;gap:12px}
.bestfor{font-weight:700;font-size:35px;line-height:1.3;color:#fff;background:rgba(255,181,71,.13);border-left:8px solid #ffb547;border-radius:12px;padding:12px 20px}
.bestfor span{color:#ffb547}
.pc{display:grid;grid-template-columns:1.15fr .85fr;gap:22px}
.pc h3{font-weight:800;font-size:33px;letter-spacing:.1em;text-transform:uppercase;margin-bottom:8px}
.pc .pro h3{color:#4ade80}.pc .con h3{color:#f87171}
.pc li{list-style:none;font-weight:500;font-size:33px;line-height:1.3;padding-left:46px;position:relative;margin-top:10px;color:#e2e8f0}
.pc .pro li:before{content:"✓";position:absolute;left:0;top:0;font-weight:800;color:#4ade80}
.pc .con li:before{content:"✕";position:absolute;left:2px;top:0;font-weight:800;color:#f87171}
.tip{font-weight:500;font-size:32px;line-height:1.35;color:#dbe7ff;background:rgba(30,144,255,.12);border:2px solid rgba(30,144,255,.35);border-radius:22px;padding:16px 22px}
.tip b{color:#7cc4ff}
.dots{position:absolute;left:0;right:0;bottom:250px;display:flex;justify-content:center;gap:14px}
.dots i{width:22px;height:22px;border-radius:50%;background:rgba(255,255,255,.25)}
.dots i.on{background:#ff8a00;width:60px;border-radius:12px}

/* poster (1080×1350 single-image post): #1 as a wide hero card, the rest in a 2-column grid */
.pst{position:absolute;inset:0;padding:40px 44px 36px;display:flex;flex-direction:column}
.pst .hd{display:flex;align-items:center;gap:20px}
.pst .hd img{width:84px;height:84px;border-radius:50%;box-shadow:0 0 0 3px rgba(255,255,255,.14),0 0 40px rgba(30,144,255,.6)}
.pst .hd .wm{font-weight:800;font-size:38px;letter-spacing:.06em;line-height:1}
.pst .hd .wm small{display:block;font-weight:500;font-size:21px;color:#ffb547;margin-top:8px;letter-spacing:.02em}
.pst .hd .bud{margin-left:auto;font-weight:800;font-size:32px;color:#1a0e00;background:linear-gradient(90deg,#ff8a00,#ffb547);padding:10px 26px;border-radius:999px}
.pst h1{font-size:56px;margin:12px 0 4px;line-height:1.02}
.pst h1 .amzbig{font-size:56px}
.pst .urg{font-weight:700;font-size:24px;color:#fff;margin-bottom:12px;display:flex;flex-direction:column;gap:4px}
.pst .urg>span:last-child{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pst .urg .whom{font-size:32px}
.pst .urg .amz{font-size:22px;padding:4px 14px;border-radius:10px}.pst .urg .amz img{height:34px}
.pst h1 span{color:#ffb547}
.gridp{flex:1;min-height:0;display:grid;gap:16px;grid-template-columns:1fr 1fr}
.gc{position:relative;display:flex;flex-direction:column;background:linear-gradient(160deg,rgba(255,255,255,.11),rgba(255,255,255,.04));border:2px solid rgba(255,255,255,.14);border-radius:26px;padding:12px;min-height:0;overflow:hidden}
.gc .ph{flex:1;min-height:0;background:#fff;border-radius:18px;display:flex;align-items:center;justify-content:center;padding:10px 10px 8px}
.gc .ph img{max-width:100%;max-height:100%;object-fit:contain}
.gc .ph .ico{color:#9db7dc}
.gc .rk2{position:absolute;left:12px;top:12px;font-weight:800;font-size:40px;line-height:1;padding:6px 16px 9px;border-radius:0 0 16px 0;background:linear-gradient(180deg,#ffb547,#ff8a00);color:#1a0e00;border-top-left-radius:18px}
.gc .nm{margin-top:8px;font-weight:700;font-size:25px;line-height:1.2;height:30px;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden;padding:0 4px}
.gc .nm b{color:#7cc4ff}
.gc .pr{display:flex;align-items:center;gap:12px;margin-top:6px;padding:0 4px}
.gc .pr b{font-weight:800;font-size:36px}
.gc .pr span{font-weight:800;font-size:21px;background:#16a34a;border-radius:9px;padding:2px 10px}
.gc.hero{grid-column:1 / -1;flex-direction:row;gap:22px;border-color:rgba(255,181,71,.75);background:linear-gradient(160deg,rgba(255,181,71,.2),rgba(255,255,255,.04))}
.gc.hero .ph{flex:none;width:50%}
.gc.hero .bx{flex:1;display:flex;flex-direction:column;justify-content:center;gap:10px;min-width:0}
.gc.hero .tp{align-self:flex-start;font-weight:800;font-size:24px;background:#16a34a;border-radius:10px;padding:4px 14px}
.gc.hero .nm{font-size:34px;height:auto;max-height:82px;-webkit-line-clamp:2;margin:0}
.gc.hero .bf{font-weight:500;font-size:24px;color:#c9d6f2;line-height:1.3;padding:0 4px}
.gc.hero .pr b{font-size:52px}.gc.hero .pr span{font-size:26px}
.pst .ft{margin-top:18px;display:flex;align-items:center;justify-content:space-between;gap:20px}
.pst .ft .go{font-weight:800;font-size:32px;color:#0b1530;background:linear-gradient(90deg,#ff8a00,#ffb547);padding:12px 28px;border-radius:999px;white-space:nowrap}
.pst .ft .note{font-weight:500;font-size:19px;color:#9fb3d9;line-height:1.35;text-align:right}
/* amazon mark */
.amz{display:inline-flex;align-items:center;gap:10px;font-weight:800;font-size:34px;color:#111;background:#fff;border-radius:16px;padding:10px 24px;box-shadow:0 10px 30px rgba(0,0,0,.35)}
.amz img{height:64px;display:block}
/* cover (reel thumbnail): key content inside the centre 1080×1440 that the profile grid shows */
.cv{position:absolute;left:56px;right:56px;top:240px;bottom:200px;display:flex;flex-direction:column;align-items:center;text-align:center}
.cv .tag{font-weight:800;font-size:40px;letter-spacing:.14em;color:#1a0e00;background:linear-gradient(90deg,#ff8a00,#ffb547);padding:12px 34px;border-radius:999px}
.cv .big{margin-top:20px;font-weight:800;font-size:210px;line-height:.86;letter-spacing:-.04em;background:linear-gradient(180deg,#ffd27a,#ff8a00);-webkit-background-clip:text;color:transparent}
.cv .cat{font-weight:800;font-size:112px;line-height:1;letter-spacing:-.02em;margin-top:6px}
.cv .pics{position:relative;width:100%;height:460px;margin-top:26px}
.cv .pics .t{position:absolute;top:0;width:380px;height:450px;background:#fff;border-radius:44px;display:flex;align-items:center;justify-content:center;padding:36px;box-shadow:0 30px 80px rgba(0,0,0,.55)}
.cv .pics .t img{max-width:100%;max-height:100%;object-fit:contain}
.cv .pics .ico{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#7cc4ff}
.cv .row{margin-top:34px;display:flex;gap:18px;align-items:center;justify-content:center;flex-wrap:wrap}
.cv .row .pill{font-size:58px;align-self:center}
/* diwali theme */
body.diwali .bg{background:
  radial-gradient(900px 600px at 50% 0%,rgba(255,176,0,.30),transparent 65%),
  radial-gradient(700px 600px at 100% 45%,rgba(255,77,141,.18),transparent 65%),
  radial-gradient(900px 800px at 0% 100%,rgba(255,122,0,.35),transparent 65%),
  linear-gradient(170deg,#3a0c3f 0%,#1d0830 50%,#120a2a 100%)}
.deco{position:absolute;left:0;top:0;pointer-events:none}
.toran{position:absolute;left:0;top:0}
.diyas{position:absolute;left:0;bottom:6px}
body.diwali .top{top:104px}
body.diwali .top .step{background:#ffd36b}
body.diwali .safe{top:278px}
/* headline: "Top 5 Fridges" / "on Amazon" / "for Growing Families" */
.amzbig{font-weight:800;color:#fff;line-height:1;letter-spacing:-.02em}
.amzbig u{text-decoration:none;background:linear-gradient(transparent 78%,#ff9900 78%,#ff9900 94%,transparent 94%)}
.whom{font-weight:800;color:#ffb547;line-height:1.1}
/* cta */
.cta{align-items:center;text-align:center;justify-content:center}
.cta img{width:400px;height:400px;border-radius:50%;box-shadow:0 0 0 5px rgba(255,255,255,.12),0 0 140px rgba(30,144,255,.6);margin-bottom:54px}
.cta h2{font-weight:800;font-size:88px;line-height:1.12;letter-spacing:-.01em}
.cta h2 em{font-style:normal;color:#ffb547}
.cta .ticks{margin-top:34px;display:flex;flex-wrap:wrap;justify-content:center;gap:14px}
.cta .url{margin-top:40px;font-weight:700;font-size:40px;padding:20px 40px;border-radius:24px;background:rgba(255,255,255,.08);border:2px solid rgba(255,255,255,.2);line-height:1.35}
.cta .bio{margin-top:40px;font-weight:800;font-size:62px;color:#0b1530;background:linear-gradient(90deg,#ff8a00,#ffb547);padding:14px 48px;border-radius:999px}
.cta .follow{margin-top:34px;font-weight:800;font-size:46px;line-height:1.25;color:#fff}
.cta .urg{margin-top:18px;font-weight:600;font-size:34px;color:#ffb547}
`;

/* Amazon photos come with wide white margins; crop them to the product so it fills its frame */
const TRIM = `<script>
window.__ready = (async () => {
  await Promise.all([...document.images].map((i) => i.decode().catch(() => {})));
  for (const img of document.querySelectorAll("img.trim")) {
    try {
      const w = img.naturalWidth, h = img.naturalHeight; if (!w || !h) continue;
      const s = Math.min(1, 400 / Math.max(w, h)), c = document.createElement("canvas");
      c.width = Math.round(w * s); c.height = Math.round(h * s);
      const x = c.getContext("2d"); x.drawImage(img, 0, 0, c.width, c.height);
      const d = x.getImageData(0, 0, c.width, c.height).data;
      let t = c.height, l = c.width, b = -1, r = -1;
      for (let y = 0; y < c.height; y++) for (let k = 0; k < c.width; k++) {
        const i = (y * c.width + k) * 4;
        if (d[i] < 240 || d[i + 1] < 240 || d[i + 2] < 240) { if (y < t) t = y; if (y > b) b = y; if (k < l) l = k; if (k > r) r = k; }
      }
      if (r <= l || b <= t) continue;
      const p = 3, sx = Math.max(0, (l - p) / s), sy = Math.max(0, (t - p) / s);
      const sw = Math.min(w - sx, (r - l + 2 * p) / s), sh = Math.min(h - sy, (b - t + 2 * p) / s);
      const o = document.createElement("canvas"); o.width = Math.round(sw); o.height = Math.round(sh);
      o.getContext("2d").drawImage(img, sx, sy, sw, sh, 0, 0, o.width, o.height);
      if (img.classList.contains("cutout")) {
        const g = o.getContext("2d"), W = o.width, H = o.height, im = g.getImageData(0, 0, W, H), px = im.data;
        const seen = new Uint8Array(W * H), q = [];
        const white = (i) => px[i * 4] > 232 && px[i * 4 + 1] > 232 && px[i * 4 + 2] > 232;
        for (let k = 0; k < W; k++) q.push(k, (H - 1) * W + k);
        for (let k = 0; k < H; k++) q.push(k * W, k * W + W - 1);
        while (q.length) {
          const i = q.pop();
          if (seen[i] || !white(i)) continue;
          seen[i] = 1; px[i * 4 + 3] = 0;
          const x = i % W, y = (i / W) | 0;
          if (x > 0) q.push(i - 1); if (x < W - 1) q.push(i + 1); if (y > 0) q.push(i - W); if (y < H - 1) q.push(i + W);
        }
        /* soften the edge: half-transparent light pixels next to removed ones */
        for (let i = 0; i < W * H; i++) if (!seen[i] && px[i * 4] > 200 && px[i * 4 + 1] > 200 && px[i * 4 + 2] > 200 &&
          ((i % W > 0 && seen[i - 1]) || (i % W < W - 1 && seen[i + 1]) || (i >= W && seen[i - W]) || (i < W * H - W && seen[i + W]))) px[i * 4 + 3] = 120;
        g.putImageData(im, 0, 0);
        img.src = o.toDataURL("image/png");
      } else img.src = o.toDataURL("image/jpeg", 0.92);
      await img.decode().catch(() => {});
    } catch (e) {}
  }
})();
</script>`;

/* "on Amazon.in" mark: Amazon's own "Available at Amazon" badge if reels/amazon-badge.png is there
   (download it from Associates Central; the logo itself may only be used as Amazon supplies it), else a text chip */
const BADGE_FILE = join(here, "amazon-badge.png");
const BADGE = existsSync(BADGE_FILE) ? `data:image/png;base64,${readFileSync(BADGE_FILE).toString("base64")}` : "";
const amazon = (text = "Top picks on Amazon.in") =>
  BADGE ? `<span class="amz"><img src="${BADGE}" alt="Available at Amazon"></span>` : `<span class="amz">🛒 ${text}</span>`;


/* ---------- festive theme (season.json "theme") ---------- */
let THEME = "";
export const setTheme = (name) => { THEME = String(name || "").toLowerCase(); };

/* Diwali decorations, all drawn here: marigold toran on top, gold sparkles, a faint rangoli, diyas at the bottom */
function diwaliDeco() {
  const W = 1080, swags = 4, sw = W / swags;
  let beads = "";
  for (let s = 0; s < swags; s++) {
    for (let k = 0; k <= 14; k++) {
      const u = k / 14, x = s * sw + u * sw, y = 6 + 70 * 4 * u * (1 - u);
      beads += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${k % 2 ? 11 : 13}" fill="${k % 2 ? "#ffc23a" : "#ff7a00"}"/>`;
      if (k % 3 === 0) beads += `<ellipse cx="${(x + 6).toFixed(1)}" cy="${(y + 14).toFixed(1)}" rx="5" ry="10" fill="#2f9e44" transform="rotate(30 ${x + 6} ${y + 14})"/>`;
    }
    beads += `<circle cx="${s * sw}" cy="10" r="16" fill="#ff5c00"/><path d="M${s * sw} 26 l0 40" stroke="#ffc23a" stroke-width="4"/><circle cx="${s * sw}" cy="72" r="9" fill="#ffc23a"/>`;
  }
  const spark = (x, y, r, o) => `<path transform="translate(${x} ${y})" opacity="${o}" fill="#ffd36b" d="M0 -${r} C${r * 0.15} -${r * 0.15} ${r * 0.15} -${r * 0.15} ${r} 0 C${r * 0.15} ${r * 0.15} ${r * 0.15} ${r * 0.15} 0 ${r} C-${r * 0.15} ${r * 0.15} -${r * 0.15} ${r * 0.15} -${r} 0 C-${r * 0.15} -${r * 0.15} -${r * 0.15} -${r * 0.15} 0 -${r}Z"/>`;
  const sparks = [[60, 260, 14, .7], [1010, 300, 18, .8], [980, 620, 10, .5], [40, 760, 12, .5], [1030, 980, 14, .6], [70, 1180, 10, .45],
    [1000, 1380, 12, .5], [30, 1500, 16, .55], [520, 230, 8, .4], [880, 180, 9, .5], [200, 180, 7, .45], [990, 1700, 10, .4]].map((s) => spark(...s)).join("");
  let petals = "";
  for (let i = 0; i < 16; i++) petals += `<ellipse cx="0" cy="-120" rx="34" ry="78" transform="rotate(${i * 22.5})" fill="none" stroke="#ff9a2e" stroke-width="5"/>`;
  for (let i = 0; i < 8; i++) petals += `<ellipse cx="0" cy="-60" rx="20" ry="44" transform="rotate(${i * 45 + 22.5})" fill="#ff4d8d" opacity=".7"/>`;
  const rangoli = `<g transform="translate(1040 1880)" opacity=".16">${petals}<circle r="200" fill="none" stroke="#ffd36b" stroke-width="6" stroke-dasharray="4 18"/><circle r="26" fill="#ffd36b"/></g>`;
  const diya = (x) => `<g transform="translate(${x} 0)">
      <ellipse cx="0" cy="-58" rx="40" ry="60" fill="url(#glow)"/>
      <path d="M0 -92 C14 -70 12 -52 0 -44 C-12 -52 -14 -70 0 -92Z" fill="#ffd23f"/><path d="M0 -78 C6 -66 5 -55 0 -50 C-5 -55 -6 -66 0 -78Z" fill="#fff4c2"/>
      <path d="M-62 -40 Q0 -28 62 -40 Q50 6 0 10 Q-50 6 -62 -40Z" fill="#c2410c"/><path d="M-62 -40 Q0 -28 62 -40" stroke="#ffb347" stroke-width="6" fill="none"/>
      <circle cx="-26" cy="-14" r="5" fill="#ffd36b"/><circle cx="0" cy="-10" r="5" fill="#ffd36b"/><circle cx="26" cy="-14" r="5" fill="#ffd36b"/></g>`;
  const diyas = `<svg class="diyas" viewBox="0 -110 1080 130" width="1080" height="130">${[110, 330, 540, 750, 970].map(diya).join("")}</svg>`;
  return `<svg class="deco" width="1080" height="1920" viewBox="0 0 1080 1920"><defs><radialGradient id="glow"><stop offset="0" stop-color="#ffb000" stop-opacity=".7"/><stop offset="1" stop-color="#ff7a00" stop-opacity="0"/></radialGradient></defs>${sparks}${rangoli}</svg><svg class="toran" width="1080" height="96" viewBox="0 0 1080 96">${beads}</svg>${diyas}`;
}

const page = (body) => `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body class="${THEME}"><div class="bg"></div>${THEME === "diwali" ? diwaliDeco() : `<div class="grid"></div>`}${body}${TRIM}</body></html>`;
const top = (step) => `<div class="top"><img src="${LOGO}"><div class="wm">VALUE VERDICT<small>Compare smart. Buy better.</small></div>${step ? `<div class="step">${esc(step)}</div>` : ""}</div>`;
const dots = (n, on) => `<div class="dots">${Array.from({ length: n }, (_, i) => `<i class="${i === on ? "on" : ""}"></i>`).join("")}</div>`;
const li = (xs) => xs.map((x) => `<li>${esc(x)}</li>`).join("");

const inr = (n) => "₹" + Math.round(n).toLocaleString("en-IN");
const shortCat = (n) => n.replace(/^Refrigerators$/, "Fridges").replace(/^Air Conditioners$/, "ACs").replace(/^Soundbars & Speakers$/, "Soundbars");
const titleCase = (s) => String(s || "").replace(/\b([a-z])([a-z]*)/g, (m, a, b) => (/^(for|and|of|the|a|an|to|with|on|in)$/.test(m) ? m : a.toUpperCase() + b));
const topLine = (r) => r.headline || (r.items.length > 1 ? `Top ${r.items.length} ${shortCat(r.catName)}` : `Best ${shortCat(r.catName)}`);

/* reel: { catName, subName, items:[product], icon, url, year } */
export function hookSlide(r) {
  const n = r.items.length;
  const line = n === 1 ? "Our #1 pick 👇" : n >= 4 ? `Top ${n} picks · counting down 👇` : `Top ${n} picks 👇`;
  const c = r.copy;
  /* fanned photos of the picks; the icon when no photo is available */
  const pics = r.items.filter((p) => p.image).slice(0, 3);
  const pos = [
    [[300, 0]],
    [[60, -6], [560, 6]],
    [[20, -8], [580, 8], [300, 0]],
  ][pics.length - 1] || [];
  const tiles = pics.map((p, i) => `<div class="t" style="left:${pos[i][0] - 20}px;transform:rotate(${pos[i][1]}deg);z-index:${i === 2 ? 3 : 1}"><img class="trim" src="${p.image}"></div>`).join("");
  return page(`${top()}<div class="safe">
    <div class="collage">${tiles || `<div class="ico">${svg(r.icon, 420)}</div>`}</div>
    <div class="kicker">${esc(c.season_tag).toUpperCase()}</div>
    <h1 style="font-size:${topLine(r).length <= 13 ? 124 : 104}px;margin-bottom:4px"><em>${esc(topLine(r))}</em></h1>
    <div class="amzbig" style="font-size:96px">on <u>Amazon</u></div>
    <div class="whom" style="font-size:54px;margin:14px 0 28px">${esc(titleCase(c.for_whom))}</div>
    <div class="pill">${esc(r.subName)}</div>
    <div class="hookline">${esc(c.hook_sub)}<small>⏳ ${esc(c.urgency)}</small><small>${line}</small></div>
  </div>`);
}

const dayMonth = (iso) => new Date(iso).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" });
const timeOf = (iso) => new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
function priceBox(p) {
  if (p.price == null) return "";
  const facts = [
    p.deal ? `<span class="fact deal">🏷️ ${esc(p.deal)}${p.dealEnds ? ` · ends ${dayMonth(p.dealEnds)}` : ""}</span>` : p.dealEnds ? `<span class="fact deal">⏳ Deal ends ${dayMonth(p.dealEnds)}</span>` : "",
    p.lowStock ? `<span class="fact low">⚡ ${esc(p.lowStock.replace(/\.$/, ""))}</span>` : "",
    p.primeOnly ? `<span class="fact prime">Prime deal</span>` : "",
  ].filter(Boolean).slice(0, 2).join("");
  return `<div class="pb">
    <div class="now">${inr(p.price)}</div>
    ${p.was && p.was > p.price ? `<div class="mrp">M.R.P. <s>${inr(p.was)}</s></div>` : ""}
    ${p.off ? `<span class="off">${Math.round(p.off)}% off</span>` : ""}
    ${facts}
    ${p.priceAt ? `<div class="at">Amazon.in price at ${timeOf(p.priceAt)}</div>` : ""}
  </div>`;
}

export function productSlide(r, p, rank, idx, total) {
  const chips = p.specs.slice(0, 4).map((s) => `<span class="chip">${esc(s)}</span>`).join("");
  return page(`${top(`${idx + 1}/${total}`)}<div class="safe">
    <div class="photo">
      <div class="pic">${p.image ? `<img class="trim" src="${p.image}">` : `<div class="ico">${svg(r.icon, 260)}</div>`}</div>
      ${priceBox(p)}
      <span class="rk">#${rank}</span>
      ${p.badge ? `<span class="tag">${esc(p.badge)}</span>` : ""}
    </div>
    <div class="card">
      <div class="name">${p.brand ? `<b>${esc(p.brand)}</b> ` : ""}${esc(p.name)}</div>
      ${chips ? `<div class="chips">${chips}</div>` : ""}
      ${p.bestFor ? `<div class="bestfor"><span>👍 Best for:</span> ${esc(p.bestFor)}</div>` : ""}
      ${p.pros.length || p.cons.length ? `<div class="pc">
        <div class="pro"><h3>Pros</h3><ul>${li(p.pros)}</ul></div>
        <div class="con">${p.cons.length ? `<h3>Cons</h3><ul>${li(p.cons)}</ul>` : ""}</div>
      </div>` : ""}
      ${p.tip ? `<div class="tip"><b>💡 Good to know:</b> ${esc(p.tip)}</div>` : ""}
    </div>
  </div>${dots(total, idx)}`);
}

export function ctaSlide(r) {
  return page(`<div class="safe cta">
    <img src="${LOGO}">
    <h2>${r.more ? esc(r.more) : `Compare all ${r.items.length > 1 ? r.items.length + " " : ""}picks`}<br>+ <em>today's price</em></h2>
    <div class="ticks"><span class="chip">✓ Pros & cons</span><span class="chip">✓ Specs</span><span class="chip">✓ Bank offers</span></div>
    <div class="url">${esc(r.url.replace(/^https?:\/\//, "")).split("/").join("/<wbr>")}</div>
    <div class="bio">🔗 Link in bio</div>
    <div class="follow">💛 ${esc(r.copy.follow_line)}</div>
    <div class="urg">⏳ ${esc(r.copy.urgency)}</div>
  </div>`);
}


/* 6–10 picks: #1 across the top, the rest three per row with a smaller name and price */
function posterMany(r, cards) {
  const rest = cards.length - 1, rows = Math.ceil(rest / 3);
  return page(`<style>html,body{height:1350px}.diyas{display:none}.pst{padding-top:${THEME === "diwali" ? 70 : 40}px}
    .gridp{grid-template-columns:1fr 1fr 1fr;grid-template-rows:1.25fr repeat(${rows},1fr);gap:12px}
    .gc{padding:8px;border-radius:20px}.gc .rk2{font-size:28px;padding:4px 12px 6px}.gc .nm{font-size:19px;height:24px;margin-top:6px}
    .gc .pr b{font-size:26px}.gc .pr span{font-size:16px;padding:1px 7px}.gc.hero .pr b{font-size:46px}.gc.hero .nm{font-size:30px;max-height:74px}</style>
    <div class="pst">
    <div class="hd"><img src="${LOGO}"><div class="wm">VALUE VERDICT<small>Compare smart. Buy better.</small></div><div class="bud">${esc(r.subName)}</div></div>
    <h1>${esc(topLine(r))} <span class="amzbig">on <u>Amazon</u></span></h1>
    <div class="urg"><span class="whom">${esc(titleCase(r.copy.for_whom))}</span><span>⏳ ${esc(r.copy.urgency)}</span></div>
    <div class="gridp">${cards.join("")}</div>
    <div class="ft"><div class="go">🔗 ${esc(r.more || "Link in bio")}: link in bio</div>
      <div class="note">Amazon.in prices as of<br>${esc(r.priceAt || "today")} IST · may change</div></div>
  </div>`);
}

/* one image with every pick: #1 hero card, the rest as a 2-column grid; price as Amazon confirmed it */
export function posterSlide(r) {
  const n = r.items.length;
  const price = (p) => (p.price != null ? `<div class="pr"><b>${inr(p.price)}</b>${p.off ? `<span>${Math.round(p.off)}% off</span>` : ""}</div>` : "");
  const name = (p) => `<div class="nm">${p.brand ? `<b>${esc(p.brand)}</b> ` : ""}${esc(p.name)}</div>`;
  const photo = (p) => `<div class="ph">${p.image ? `<img class="trim" src="${p.image}">` : `<div class="ico">${svg(r.icon, 120)}</div>`}</div>`;
  /* 2 picks: side by side; 1, 3, 4, 5: #1 across the top, the rest two per row */
  const cards = r.items.map((p, i) => {
    if (i === 0 && n !== 2) return `<div class="gc hero">${photo(p)}<span class="rk2">#1</span>
      <div class="bx"><span class="tp">🏆 Top pick</span>${name(p)}${p.bestFor ? `<div class="bf">👍 ${esc(p.bestFor)}</div>` : ""}${price(p)}</div></div>`;
    return `<div class="gc">${photo(p)}<span class="rk2">#${i + 1}</span>${name(p)}${price(p)}</div>`;
  });
  if (n > 5) return posterMany(r, cards);
  /* an odd card left over (#4 of 4) spans both columns */
  if (n === 4) cards[3] = cards[3].replace('<div class="gc">', '<div class="gc" style="grid-column:1 / -1">');
  const rows = n === 2 ? "1fr" : n === 1 ? "1fr" : n === 3 ? "1.1fr 1fr" : n === 4 ? "1.1fr 1fr 1fr" : "1fr 1fr 1fr";
  return page(`<style>html,body{height:1350px}.diyas{display:none}.pst{padding-top:${THEME === "diwali" ? 70 : 40}px}</style><div class="pst">
    <div class="hd"><img src="${LOGO}"><div class="wm">VALUE VERDICT<small>Compare smart. Buy better.</small></div><div class="bud">${esc(r.subName)}</div></div>
    <h1>${esc(topLine(r))} <span class="amzbig">on <u>Amazon</u></span></h1>
    <div class="urg"><span class="whom">${esc(titleCase(r.copy.for_whom))}</span><span>⏳ ${esc(r.copy.urgency)}</span></div>
    <div class="gridp" style="grid-template-rows:${rows}">${cards.join("")}</div>
    <div class="ft"><div class="go">${r.more ? `🔗 ${esc(r.more)}: link in bio` : "🔗 Link in bio · 💛 Follow for more"}</div>
      <div class="note">Amazon.in prices as of<br>${esc(r.priceAt || "today")} IST · may change</div></div>
  </div>`);
}

/* reel cover / thumbnail: "TOP 5" + product type + big product photos + budget + Amazon mark */
/* Photo-style thumbnail: a festive photo background (reels/backgrounds/<theme>.jpg, an empty stage with no product),
   glossy 3D headline "TOP FRIDGE DEALS / ON AMAZON", budget pill, and the #1 pick cut out of its white background,
   standing on the stage with a glow. Used whenever that background file exists; otherwise the drawn cover below. */
const bgFile = (theme) => [join(here, "backgrounds", `${theme}.jpg`), join(here, "backgrounds", `${theme}.png`)].find(existsSync);
const ONE = { Refrigerators: "Fridge", TVs: "TV", "Washing Machines": "Washer", "Air Conditioners": "AC", Laptops: "Laptop",
  "Soundbars & Speakers": "Soundbar", "Home Appliances": "Appliance", "Fridge Accessories": "Stabilizer" };
const COVER_CSS = `
.stage{position:absolute;left:0;top:0}
.pc-bg{position:absolute;inset:0;background-size:cover;background-position:center}
.pc-shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(10,6,30,.55) 0%,rgba(10,6,30,.15) 40%,rgba(10,6,30,0) 60%,rgba(10,6,30,.35) 100%)}
.pc-top{position:absolute;top:70px;left:0;right:0;display:flex;align-items:center;justify-content:center;gap:24px}
.pc-top img{width:150px;height:150px;border-radius:50%;box-shadow:0 0 0 4px rgba(255,255,255,.15),0 0 50px rgba(30,144,255,.6)}
.pc-top .wm{font-weight:800;font-size:64px;line-height:1;text-shadow:0 4px 20px rgba(0,0,0,.6)}
.pc-top .wm small{display:block;font-weight:600;font-size:32px;color:#ffc94a;margin-top:10px}
.pc-head{position:absolute;top:290px;left:30px;right:30px;text-align:center}
.g3d{position:relative;display:block;font-weight:800;text-transform:uppercase;line-height:.98;letter-spacing:-.01em}
.g3d .b{position:absolute;inset:0;color:#7c2d12;-webkit-text-stroke:14px #5a1a05;
  text-shadow:0 2px 0 #92400e,0 4px 0 #92400e,0 6px 0 #7c2d12,0 8px 0 #7c2d12,0 10px 0 #6b2108,0 12px 0 #5a1a05,0 22px 40px rgba(0,0,0,.6)}
.g3d .f{position:relative;background:linear-gradient(180deg,#fff7d1 0%,#ffd75a 38%,#ffa41b 62%,#e8700a 100%);-webkit-background-clip:text;color:transparent;-webkit-text-stroke:2px #fff3c4}
.g3d.w .f{background:linear-gradient(180deg,#ffffff 0%,#fff6e6 55%,#ffd9a8 100%);-webkit-background-clip:text}
.g3d.w .b{color:#c2410c;-webkit-text-stroke:14px #9a3412}
.pc-pill{display:inline-flex;align-items:center;gap:22px;margin-top:30px;font-weight:800;font-size:54px;color:#1a0e00;background:linear-gradient(180deg,#ffe08a,#ffb22e);border:4px solid #fff1c1;border-radius:999px;padding:14px 44px;box-shadow:0 0 40px rgba(255,190,60,.55),0 12px 30px rgba(0,0,0,.4)}
.pc-pill:before,.pc-pill:after{content:"✦";color:#7c2d12;font-size:36px}
.pc-prod{position:absolute;left:70px;right:70px;bottom:230px;top:930px;display:flex;align-items:flex-end;justify-content:center}
.pc-prod:before{content:"";position:absolute;left:50%;bottom:-30px;width:760px;height:140px;transform:translateX(-50%);background:radial-gradient(closest-side,rgba(0,0,0,.65),transparent);z-index:0}
.pc-prod:after{content:"";position:absolute;left:50%;top:10%;width:900px;height:900px;transform:translateX(-50%);background:radial-gradient(closest-side,rgba(255,200,90,.45),transparent);z-index:0}
.pc-prod img{position:relative;z-index:1;width:100%;height:100%;object-fit:contain;object-position:50% 100%;filter:drop-shadow(0 24px 30px rgba(0,0,0,.55))}
`;
/* drawn Diwali stage when no background photo is supplied: marigold strings, lanterns, bokeh lights, rangoli floor, diyas */
function stageArt() {
  const garland = (x) => { let s = ""; for (let y = -10, k = 0; y < 1180; y += 26, k++) s += `<circle cx="${x + Math.sin(k) * 3}" cy="${y}" r="${k % 3 === 2 ? 15 : 17}" fill="${k % 2 ? "#ffb81c" : "#ff7b00"}"/>${k % 4 === 0 ? `<ellipse cx="${x + 16}" cy="${y + 8}" rx="6" ry="12" fill="#2f9e44" transform="rotate(35 ${x + 16} ${y + 8})"/>` : ""}`; return s; };
  const lantern = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})">
    <line x1="0" y1="-160" x2="0" y2="-70" stroke="#c98a2b" stroke-width="4"/>
    <circle cx="0" cy="0" r="120" fill="url(#lglow)"/>
    <path d="M-34 -70 h68 l10 18 h-88z" fill="#b7791f"/>
    <path d="M-44 -52 h88 q14 52 0 104 h-88 q-14 -52 0 -104z" fill="url(#lbody)" stroke="#c98a2b" stroke-width="4"/>
    <path d="M-30 -52 v104 M0 -52 v104 M30 -52 v104 M-46 0 h92" stroke="#7c4a0a" stroke-width="3" opacity=".55"/>
    <path d="M-44 52 h88 l-10 16 h-68z" fill="#b7791f"/><path d="M0 68 v40" stroke="#ff9a1f" stroke-width="5"/><circle cx="0" cy="112" r="8" fill="#ff9a1f"/></g>`;
  let bokeh = "";
  const pts = [[150,980,26],[260,1060,18],[90,1180,22],[330,1210,14],[200,1320,30],[60,1420,16],[300,1440,20],[930,990,24],[820,1070,18],[1000,1170,26],[760,1230,14],[880,1330,30],[1020,1410,16],[790,1450,20],[470,1010,10],[610,1030,12],[400,1300,12],[680,1320,12]];
  for (const [x, y, rr] of pts) bokeh += `<circle cx="${x}" cy="${y}" r="${rr}" fill="#ffc861" opacity=".55" filter="url(#blur)"/><circle cx="${x}" cy="${y}" r="${rr * .35}" fill="#fff1c9" opacity=".8"/>`;
  let rings = "";
  const cols = ["#7a1f5c", "#d9480f", "#f59f00", "#1c3d8a", "#c2255c", "#f08c00", "#5f3dc4", "#e8590c"];
  for (let i = 0; i < 8; i++) rings += `<circle r="${520 - i * 62}" fill="${cols[i]}"/>`;
  let petals = "";
  for (let i = 0; i < 24; i++) petals += `<ellipse cx="0" cy="-330" rx="40" ry="90" fill="#ffd36b" opacity=".85" transform="rotate(${i * 15})"/>`;
  for (let i = 0; i < 16; i++) petals += `<ellipse cx="0" cy="-170" rx="30" ry="64" fill="#ff6b9a" transform="rotate(${i * 22.5 + 11})"/>`;
  const floor = `<g transform="translate(540 1720) scale(1 .34)">${rings}${petals}<circle r="60" fill="#ffd36b"/></g>`;
  const diya = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})"><ellipse cx="0" cy="-58" rx="60" ry="80" fill="url(#dglow)"/>
    <path d="M0 -96 C16 -72 13 -52 0 -44 C-13 -52 -16 -72 0 -96Z" fill="#ffd23f"/><path d="M0 -80 C6 -67 5 -55 0 -50 C-5 -55 -6 -67 0 -80Z" fill="#fff6cf"/>
    <path d="M-66 -40 Q0 -26 66 -40 Q52 8 0 12 Q-52 8 -66 -40Z" fill="#b8410b"/><path d="M-66 -40 Q0 -26 66 -40" stroke="#ffb347" stroke-width="6" fill="none"/></g>`;
  const flowers = (x, y) => [0, 1, 2, 3, 4].map((k) => `<circle cx="${x + k * 34 - 68}" cy="${y + (k % 2) * 12}" r="20" fill="${k % 2 ? "#ffb81c" : "#ff7b00"}"/>`).join("");
  return `<svg class="stage" width="1080" height="1920" viewBox="0 0 1080 1920"><defs>
    <radialGradient id="lglow"><stop offset="0" stop-color="#ffb000" stop-opacity=".55"/><stop offset="1" stop-color="#ff7a00" stop-opacity="0"/></radialGradient>
    <linearGradient id="lbody" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#ffe7a3"/><stop offset=".5" stop-color="#ffb02e"/><stop offset="1" stop-color="#e36d0a"/></linearGradient>
    <radialGradient id="dglow"><stop offset="0" stop-color="#ffb000" stop-opacity=".8"/><stop offset="1" stop-color="#ff7a00" stop-opacity="0"/></radialGradient>
    <radialGradient id="spot" cx=".5" cy=".55" r=".6"><stop offset="0" stop-color="#ffb347" stop-opacity=".35"/><stop offset="1" stop-color="#ffb347" stop-opacity="0"/></radialGradient>
    <filter id="blur"><feGaussianBlur stdDeviation="6"/></filter></defs>
    <rect width="1080" height="1920" fill="url(#spot)"/>${bokeh}${floor}
    ${garland(28)}${garland(84)}${garland(996)}${garland(1052)}
    ${lantern(150, 440, 1)}${lantern(930, 440, 1)}${lantern(70, 900, .8)}${lantern(1010, 900, .8)}
    ${flowers(130, 1800)}${flowers(950, 1800)}${diya(120, 1790, 1)}${diya(960, 1790, 1)}${diya(250, 1880, .8)}${diya(830, 1880, .8)}</svg>`;
}

function photoCover(r, bg) {
  const n = r.items.length, one = ONE[r.catName] || shortCat(r.catName).replace(/s$/, "");
  const l1 = r.coverLine || `Top ${one} Deals`, l2 = "on Amazon";
  const size = l1.length <= 14 ? 168 : l1.length <= 18 ? 140 : 118, size2 = Math.min(size, 150);
  const pill = r.pill || (/^(under|above)/i.test(r.subName) ? `Top picks ${r.subName}` : `Top ${n} picks · ${r.subName}`);
  const hero = r.items.find((p) => p.image);
  const word = (txt, cls, px) => `<span class="g3d ${cls}" style="font-size:${px}px"><span class="b">${esc(txt)}</span><span class="f">${esc(txt)}</span></span>`;
  return page(`<style>${COVER_CSS}.toran,.diyas,.deco{display:none}</style>
    ${bg ? `<div class="pc-bg" style="background-image:url(data:image/jpeg;base64,${readFileSync(bg).toString("base64")})"></div>` : `<div class="pc-bg" style="background:radial-gradient(1100px 900px at 50% 45%,#22305e,#0b1230 60%,#060a1c)"></div>${stageArt()}`}<div class="pc-shade"></div>
    <div class="pc-top"><img src="${LOGO}"><div class="wm">Value Verdict<small>Compare smart. Buy better.</small></div></div>
    <div class="pc-head">${word(l1, "", size)}${word(l2, "w", size2)}<div class="pc-pill">${esc(pill.toUpperCase())}</div></div>
    <div class="pc-prod">${hero ? `<img class="trim cutout" src="${hero.image}">` : `<div class="ico" style="color:#ffd36b">${svg(r.icon, 520)}</div>`}</div>`);
}

export function coverSlide(r) {
  const bg = bgFile(THEME || "default");
  if (bg || THEME === "diwali") return photoCover(r, bg);
  const n = r.items.length, c = r.copy;
  const pics = r.items.filter((p) => p.image).slice(0, 3);
  const pos = [[[300, 0]], [[70, -5], [530, 5]], [[0, -7], [600, 7], [300, 0]]][pics.length - 1] || [];
  const tiles = pics.map((p, i) => `<div class="t" style="left:${pos[i][0] - 20}px;transform:rotate(${pos[i][1]}deg);z-index:${i === 2 ? 3 : 1}"><img class="trim" src="${p.image}"></div>`).join("");
  const short = shortCat(r.catName);
  return page(`${top()}<div class="cv">
    <div class="tag">${esc(c.season_tag).toUpperCase()}</div>
    <div class="big">${n > 1 ? `TOP ${n}` : "#1"}</div>
    <div class="cat">${esc(short)}</div>
    <div class="amzbig" style="font-size:100px;margin-top:6px">on <u>Amazon</u></div>
    <div class="whom" style="font-size:56px;margin-top:12px">${esc(titleCase(c.for_whom))}</div>
    <div class="pics">${tiles || `<div class="ico">${svg(r.icon, 380)}</div>`}</div>
    <div class="row"><div class="pill">${esc(r.subName)}</div></div>
  </div>`);
}

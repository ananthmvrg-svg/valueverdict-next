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
.collage{position:relative;height:700px;margin:10px 0 36px}
.collage .t{position:absolute;top:40px;width:420px;height:590px;background:#fff;border-radius:40px;display:flex;align-items:center;justify-content:center;padding:44px;box-shadow:0 30px 80px rgba(0,0,0,.5)}
.collage .t img{max-width:100%;max-height:100%;object-fit:contain}
.collage .t b{position:absolute;left:-16px;top:-26px;font-weight:800;font-size:56px;padding:4px 22px 8px;border-radius:20px;background:linear-gradient(180deg,#ffb547,#ff8a00);color:#1a0e00}
.collage .ico{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#7cc4ff;filter:drop-shadow(0 0 50px rgba(30,144,255,.6))}
.kicker{font-weight:800;font-size:44px;letter-spacing:.2em;color:#ffb547}
h1{font-weight:800;font-size:136px;line-height:1;letter-spacing:-.025em;margin:6px 0 30px}
h1 em{font-style:normal;background:linear-gradient(90deg,#6cc0ff,#1e90ff);-webkit-background-clip:text;color:transparent}
.hookline{margin-top:34px;font-weight:700;font-size:50px;line-height:1.25}
.hookline small{display:block;font-weight:500;font-size:36px;color:#c9d6f2;margin-top:10px}

/* product */
.photo{position:relative;height:470px;flex:none;border-radius:44px;background:#fff;display:flex;align-items:center;justify-content:center;padding:60px 80px 36px;box-shadow:0 30px 80px rgba(0,0,0,.45)}
.photo img{max-width:100%;max-height:100%;object-fit:contain}
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
.dots{position:absolute;left:64px;bottom:250px;display:flex;gap:14px}
.dots i{width:22px;height:22px;border-radius:50%;background:rgba(255,255,255,.25)}
.dots i.on{background:#ff8a00;width:60px;border-radius:12px}

/* poster (1080×1350 single-image post) */
.pst{position:absolute;inset:0;padding:44px 48px 40px;display:flex;flex-direction:column}
.pst .hd{display:flex;align-items:center;gap:22px}
.pst .hd img{width:104px;height:104px;border-radius:50%;box-shadow:0 0 0 3px rgba(255,255,255,.14),0 0 40px rgba(30,144,255,.6)}
.pst .hd .wm{font-weight:800;font-size:40px;letter-spacing:.06em;line-height:1}
.pst .hd .wm small{display:block;font-weight:500;font-size:22px;color:#ffb547;margin-top:8px;letter-spacing:.02em}
.pst h1{font-size:70px;margin:26px 0 6px;line-height:1.02}
.pst h1 span{color:#ffb547}
.pst .sub{font-weight:600;font-size:28px;color:#c9d6f2;margin-bottom:22px}
.rows{display:flex;flex-direction:column;gap:14px;flex:1}
.row{flex:1;display:flex;align-items:center;gap:22px;background:linear-gradient(160deg,rgba(255,255,255,.10),rgba(255,255,255,.04));border:2px solid rgba(255,255,255,.13);border-radius:26px;padding:10px 22px 10px 12px;min-height:0}
.row .r{flex:none;width:72px;font-weight:800;font-size:46px;color:#ffb547;text-align:center}
.row .th{flex:none;width:138px;height:138px;background:#fff;border-radius:18px;display:flex;align-items:center;justify-content:center;padding:10px}
.row .th img{max-width:100%;max-height:100%;object-fit:contain}
.row .th .ico{color:#9db7dc}
.row .tx{flex:1;min-width:0}
.row .nm{font-weight:700;font-size:31px;line-height:1.2;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.row .nm b{color:#7cc4ff}
.row .bf{font-weight:500;font-size:24px;color:#c9d6f2;margin-top:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.row .pr{flex:none;text-align:right}
.row .pr b{display:block;font-weight:800;font-size:42px;color:#fff}
.row .pr span{display:inline-block;margin-top:4px;font-weight:800;font-size:24px;color:#fff;background:#16a34a;border-radius:10px;padding:2px 12px}
.row.first{border-color:rgba(255,181,71,.7);background:linear-gradient(160deg,rgba(255,181,71,.18),rgba(255,255,255,.04))}
.pst .ft{margin-top:22px;display:flex;align-items:center;justify-content:space-between;gap:20px}
.pst .ft .go{font-weight:800;font-size:34px;color:#0b1530;background:linear-gradient(90deg,#ff8a00,#ffb547);padding:14px 30px;border-radius:999px;white-space:nowrap}
.pst .ft .note{font-weight:500;font-size:19px;color:#9fb3d9;line-height:1.35;text-align:right}
/* cta */
.cta{align-items:center;text-align:center;justify-content:center}
.cta img{width:400px;height:400px;border-radius:50%;box-shadow:0 0 0 5px rgba(255,255,255,.12),0 0 140px rgba(30,144,255,.6);margin-bottom:54px}
.cta h2{font-weight:800;font-size:88px;line-height:1.12;letter-spacing:-.01em}
.cta h2 em{font-style:normal;color:#ffb547}
.cta .ticks{margin-top:34px;display:flex;flex-wrap:wrap;justify-content:center;gap:14px}
.cta .url{margin-top:40px;font-weight:700;font-size:40px;padding:20px 40px;border-radius:24px;background:rgba(255,255,255,.08);border:2px solid rgba(255,255,255,.2);line-height:1.35}
.cta .bio{margin-top:40px;font-weight:800;font-size:62px;color:#0b1530;background:linear-gradient(90deg,#ff8a00,#ffb547);padding:14px 48px;border-radius:999px}
.cta .follow{margin-top:26px;font-weight:700;font-size:40px;color:#fff}
`;

const page = (body) => `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body><div class="bg"></div><div class="grid"></div>${body}</body></html>`;
const top = (step) => `<div class="top"><img src="${LOGO}"><div class="wm">VALUE VERDICT<small>Compare smart. Buy better.</small></div>${step ? `<div class="step">${esc(step)}</div>` : ""}</div>`;
const dots = (n, on) => `<div class="dots">${Array.from({ length: n }, (_, i) => `<i class="${i === on ? "on" : ""}"></i>`).join("")}</div>`;
const li = (xs) => xs.map((x) => `<li>${esc(x)}</li>`).join("");

/* reel: { catName, subName, items:[product], icon, url, year } */
export function hookSlide(r) {
  const n = r.items.length;
  const line = n === 1 ? "Our #1 pick 👇" : n >= 4 ? `Top ${n} picks · counting down 👇` : `Top ${n} picks 👇`;
  /* fanned photos of the picks; the icon when no photo is available */
  const pics = r.items.filter((p) => p.image).slice(0, 3);
  const pos = [
    [[300, 0]],
    [[60, -6], [560, 6]],
    [[20, -8], [580, 8], [300, 0]],
  ][pics.length - 1] || [];
  const tiles = pics.map((p, i) => `<div class="t" style="left:${pos[i][0] - 20}px;transform:rotate(${pos[i][1]}deg);z-index:${i === 2 ? 3 : 1}"><img src="${p.image}"></div>`).join("");
  return page(`${top()}<div class="safe">
    <div class="collage">${tiles || `<div class="ico">${svg(r.icon, 420)}</div>`}</div>
    <div class="kicker">TODAY'S BEST</div>
    <h1><em>${esc(r.catName)}</em></h1>
    <div class="pill">${esc(r.subName)}</div>
    <div class="hookline">${line}<small>Pros, cons & who each one is for · ${esc(r.month)} ${r.year}</small></div>
  </div>`);
}

export function productSlide(r, p, rank, idx, total) {
  const chips = p.specs.slice(0, 4).map((s) => `<span class="chip">${esc(s)}</span>`).join("");
  return page(`${top(`${idx + 1}/${total}`)}<div class="safe">
    <div class="photo">
      ${p.image ? `<img src="${p.image}">` : `<div class="ico">${svg(r.icon, 300)}</div>`}
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
    <h2>Compare all ${r.items.length > 1 ? r.items.length + " " : ""}picks<br>+ <em>today's price</em></h2>
    <div class="ticks"><span class="chip">✓ Pros & cons</span><span class="chip">✓ Specs</span><span class="chip">✓ Bank offers</span></div>
    <div class="url">${esc(r.url.replace(/^https?:\/\//, "")).split("/").join("/<wbr>")}</div>
    <div class="bio">🔗 Link in bio</div>
    <div class="follow">Follow @ Value Verdict for daily picks</div>
  </div>`);
}

const inr = (n) => "₹" + Math.round(n).toLocaleString("en-IN");

/* one image with every pick: rank, photo, name, who it's for, price at the time Amazon confirmed it */
export function posterSlide(r) {
  const rows = r.items.map((p, i) => `<div class="row${i === 0 ? " first" : ""}">
      <div class="r">#${i + 1}</div>
      <div class="th">${p.image ? `<img src="${p.image}">` : `<div class="ico">${svg(r.icon, 100)}</div>`}</div>
      <div class="tx"><div class="nm">${p.brand ? `<b>${esc(p.brand)}</b> ` : ""}${esc(p.name)}</div>${p.bestFor ? `<div class="bf">👍 ${esc(p.bestFor)}</div>` : ""}</div>
      ${p.price != null ? `<div class="pr"><b>${inr(p.price)}</b>${p.off ? `<span>${Math.round(p.off)}% off</span>` : ""}</div>` : ""}
    </div>`).join("");
  const n = r.items.length;
  return page(`<style>html,body{height:1350px}</style><div class="pst">
    <div class="hd"><img src="${LOGO}"><div class="wm">VALUE VERDICT<small>Compare smart. Buy better.</small></div></div>
    <h1>${n > 1 ? `Top ${n} ` : "Best "}<span>${esc(r.catName)}</span></h1>
    <div class="sub">${esc(r.subName)} · Hand-picked ${esc(r.month)} ${r.year}</div>
    <div class="rows">${rows}</div>
    <div class="ft"><div class="go">🔗 Link in bio for full details</div>
      <div class="note">Amazon.in prices as of<br>${esc(r.priceAt || "today")} IST · may change</div></div>
  </div>`);
}

/* Background music made with Google's Lyria 3 (Gemini API, model lyria-3-clip-preview: 30-second instrumental
   clips, MP3, about $0.04 each). New tracks go into reels/audio/, where audio.mjs rotates them through the reels.

   node music.mjs --starter         30 tracks: 10 festive, 10 Telugu folk / mass beat, 10 upbeat everyday
   node music.mjs --weekly          5 new tracks (2 season, 1 folk, 2 upbeat); the workflow runs this every Sunday
   node music.mjs --count=N --style=festive|folk|upbeat   just these
   --dry-run                        print the prompts, call nothing
   Env: GEMINI_API_KEY (Google AI Studio key with billing on), TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID (optional:
        every new track is sent there to listen to), MUSIC_KEEP (default 40: AI tracks kept; oldest removed first)

   Files are named <style>-ai-<date>-<nn>.mp3. Festive ones play twice as often during a festival (audio.mjs).
   Don't like one? Delete it from reels/audio/ on GitHub. Tracks you upload yourself are never touched. */
import { writeFileSync, readdirSync, rmSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { themeFor, seasonFor } from "./copy.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const DIR = join(here, "audio");
const MODEL = process.env.MUSIC_MODEL || "lyria-3-clip-preview";
const KEEP = Math.max(10, parseInt(process.env.MUSIC_KEEP || "40", 10) || 40);
const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const opt = (k) => args.find((a) => a.startsWith(`--${k}=`))?.split("=")[1];
const DRY = flag("--dry-run");
const DATE = new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);

/* every prompt ends with the same brief: reels need energy from the first second and no voices */
const BRIEF = "Instrumental only, no vocals, no singing, no spoken words, no lyrics. Starts with energy in the very first second "
  + "(no slow intro), steady danceable beat all the way through, bright and positive, mixed to sit under on-screen text "
  + "in a short product showcase video for Indian shoppers. Ends cleanly.";

const STYLES = {
  festive: [
    "Joyful Indian festival of lights celebration music: dhol and dholak groove, bright shehnai melody, bells and claps, sparkling percussion",
    "Festive Indian wedding-style band music: brass, nadaswaram lead, thavil drums, celebratory and grand",
    "Modern festive Indian pop instrumental: tabla and dhol over a punchy electronic beat, sitar hook, happy and shiny",
    "South Indian temple-festival energy: nadaswaram and thavil, fast rhythmic cycles, celebratory crowd energy without voices",
    "Diwali night celebration groove: dhol, chimes, plucked santoor melody, modern bass, warm and glittering",
  ],
  folk: [
    "Telugu folk festival beat: dappu drums, energetic folk rhythm, flute melody, village celebration energy, modern mix",
    "South Indian mass beat instrumental: heavy thappu and dappu drums, punchy bass, whistling-style synth lead, high energy",
    "Telugu folk dance groove: urumi and dappu rhythm, nadaswaram phrases, upbeat and catchy, cinematic punch",
    "Andhra folk-fusion: kanjira, mridangam and electronic beat, bamboo flute hook, playful and energetic",
    "Rural South Indian harvest festival instrumental: dappu, kolattam sticks rhythm, flute and veena melody, joyful",
  ],
  upbeat: [
    "Upbeat modern Indian pop instrumental: tabla loop over a clean electronic beat, catchy synth pluck melody, confident",
    "Happy funky groove: slap bass, rhythm guitar, claps, short brass stabs, feel-good shopping vibe",
    "Energetic tech-review background beat: crisp hip-hop drums, deep bass, bright synth arpeggio, modern and clean",
    "Light tropical house: marimba hook, soft kick, uplifting chords, positive and fresh",
    "Indie-pop drive: bright electric guitar riff, driving drums, handclaps, optimistic and energetic",
  ],
};

/* which prompts to make this time */
function plan() {
  const theme = themeFor(DATE), season = seasonFor(DATE);
  const seasonal = theme ? STYLES.festive.map((p) => `${p}. Mood: ${season || theme}`) : STYLES.upbeat;
  const pick = (list, n, off = 0) => Array.from({ length: n }, (_, i) => list[(off + i) % list.length]);
  const week = Math.floor(Date.parse(DATE) / (7 * 864e5));
  if (flag("--starter")) return [
    ...pick(STYLES.festive, 10).map((p) => ["festive", p]),
    ...pick(STYLES.folk, 10).map((p) => ["folk", p]),
    ...pick(STYLES.upbeat, 10).map((p) => ["upbeat", p]),
  ];
  if (flag("--weekly")) return [
    ...pick(seasonal, 2, week * 2).map((p) => [theme ? "festive" : "upbeat", p]),
    ...pick(STYLES.folk, 1, week).map((p) => ["folk", p]),
    ...pick(STYLES.upbeat, 2, week * 2 + 1).map((p) => ["upbeat", p]),
  ];
  const style = STYLES[opt("style")] ? opt("style") : "upbeat";
  return pick(STYLES[style], Math.max(1, parseInt(opt("count") || "1", 10) || 1)).map((p) => [style, p]);
}

async function generate(prompt) {
  const body = { contents: [{ parts: [{ text: `${prompt}. ${BRIEF}` }] }] };
  for (let attempt = 1; ; attempt++) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: "POST", signal: AbortSignal.timeout(180000),
      headers: { "x-goog-api-key": process.env.GEMINI_API_KEY, "content-type": "application/json" }, body: JSON.stringify(body),
    });
    const j = await r.json().catch(() => ({}));
    if (r.ok) {
      const part = (j.candidates?.[0]?.content?.parts || []).find((p) => p.inlineData?.data);
      if (!part) throw new Error(`no audio returned (${j.candidates?.[0]?.finishReason || j.promptFeedback?.blockReason || "unknown"})`);
      return { data: Buffer.from(part.inlineData.data, "base64"), ext: /wav/i.test(part.inlineData.mimeType || "") ? "wav" : "mp3" };
    }
    /* busy or rate-limited: wait and try again, a few times */
    if ((r.status === 429 || r.status >= 500) && attempt < 4) { await new Promise((res) => setTimeout(res, attempt * 15000)); continue; }
    throw new Error(`Lyria ${r.status}: ${j.error?.message || ""}`);
  }
}

async function sendAudio(file, title) {
  const t = process.env.TELEGRAM_BOT_TOKEN, chat = process.env.TELEGRAM_CHAT_ID;
  if (!t || !chat) return;
  const fd = new FormData();
  fd.append("chat_id", chat); fd.append("title", title); fd.append("performer", "Value Verdict · Lyria");
  fd.append("audio", new Blob([readFileSync(file)]), file.split("/").pop());
  await fetch(`https://api.telegram.org/bot${t}/sendAudio`, { method: "POST", body: fd }).catch(() => {});
  await new Promise((res) => setTimeout(res, 1100));
}

/* keep the library from growing forever: only the newest KEEP AI tracks stay */
function prune() {
  const ai = readdirSync(DIR).filter((f) => /-ai-\d{4}-\d\d-\d\d-\d+\.(mp3|wav)$/.test(f))
    .sort((a, b) => a.match(/\d{4}-\d\d-\d\d-\d+/)[0].localeCompare(b.match(/\d{4}-\d\d-\d\d-\d+/)[0]));
  for (const f of ai.slice(0, Math.max(0, ai.length - KEEP))) { rmSync(join(DIR, f)); console.log(`  removed old ${f}`); }
}

const jobs = plan();
if (DRY) { jobs.forEach(([s, p], i) => console.log(`${i + 1}. [${s}] ${p}`)); process.exit(0); }
if (!process.env.GEMINI_API_KEY) { console.log("GEMINI_API_KEY not set: no music made"); process.exit(0); }
mkdirSync(DIR, { recursive: true });
const taken = new Set(readdirSync(DIR));
let made = 0, n = 0;
const intro = process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID;
if (intro) await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, { method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify({ chat_id: process.env.TELEGRAM_CHAT_ID, text: `🎵 Making ${jobs.length} new background tracks for the reels. Each one follows here; delete any you don't like from reels/audio on GitHub.` }) }).catch(() => {});
for (const [style, prompt] of jobs) {
  do n++; while ([...taken].some((f) => f.startsWith(`${style}-ai-${DATE}-${String(n).padStart(2, "0")}.`)));
  const name = `${style}-ai-${DATE}-${String(n).padStart(2, "0")}`;
  try {
    const { data, ext } = await generate(prompt);
    const file = join(DIR, `${name}.${ext}`);
    writeFileSync(file, data); made++;
    console.log(`✔ ${name}.${ext} (${(data.length / 1024).toFixed(0)} KB): ${prompt.slice(0, 70)}…`);
    await sendAudio(file, name);
  } catch (e) { console.warn(`✖ ${name}: ${e.message}`); }
}
if (existsSync(DIR)) prune();
console.log(`${made}/${jobs.length} tracks made`);
if (!made && jobs.length) process.exit(1);

/* Background music for the reels, so they can be posted automatically without picking a sound in the app.
   Put 10–20 royalty-free tracks in reels/audio/ (mp3, m4a, aac, wav or ogg), e.g. from YouTube Studio's
   Audio Library, Pixabay Music or Uppbeat. Film songs or other copyrighted music get Content ID claims on
   YouTube and are muted on Instagram, so only use tracks you're allowed to use.

   Naming: tracks whose name starts with the season theme (season.json "theme", e.g. "diwali-…") or "festive-…"
   are played twice as often while that season runs. Anything else is in the everyday rotation.

   Rotation: no state needed. The tracks go in a fixed order and every day starts at a different place in it,
   so the first reels (Top deals, Amazon Finds, the ones posted first) get a different track each day. A reel's
   two versions (Instagram and YouTube) share its track. No tracks in the folder: silent videos, as before. */
import { readdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DIR = join(dirname(fileURLToPath(import.meta.url)), "audio");
const AUDIO = /\.(mp3|m4a|aac|wav|ogg)$/i;

export function tracks() {
  if (!existsSync(DIR)) return [];
  return readdirSync(DIR).filter((f) => AUDIO.test(f)).sort().map((f) => join(DIR, f));
}

/* one track per reel, in reel order */
export function tracksFor(n, dateISO, theme = "") {
  const all = tracks();
  if (!all.length) return [];
  const name = (f) => f.split("/").pop().toLowerCase();
  const seasonal = theme ? all.filter((f) => name(f).startsWith(theme.toLowerCase()) || name(f).startsWith("festive")) : [];
  /* a fixed mixed-up order; seasonal tracks come round a second time in the second half */
  const mix = (xs, salt) => [...xs].sort((a, b) => hash(salt + name(a)) - hash(salt + name(b)));
  const pool = [...mix(all, "a"), ...mix(seasonal, "b")];
  const day = Math.floor(Date.parse(dateISO) / 864e5);
  const start = (day * 3) % pool.length;
  return Array.from({ length: n }, (_, i) => pool[(start + i) % pool.length]);
}

const hash = (s) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };

/* ffmpeg pieces for the video's sound: the track looped and cut to the video, levelled, faded in and out */
export function audioArgs(track, total, index) {
  const t = total.toFixed(2);
  if (!track) return { inputs: ["-f", "lavfi", "-t", t, "-i", "anullsrc=r=44100:cl=stereo"], filters: [], map: `${index}:a` };
  return {
    inputs: ["-stream_loop", "-1", "-i", track],
    filters: [`[${index}:a]atrim=0:${t},asetpts=N/SR/TB,loudnorm=I=-16:TP=-1.5:LRA=11,aformat=sample_rates=44100:channel_layouts=stereo,afade=t=in:d=0.4,afade=t=out:st=${Math.max(0, total - 1.2).toFixed(2)}:d=1.2[aud]`],
    map: "[aud]",
  };
}

/* Picks up "🗑 Remove this track" taps from the Telegram bot chat (buttons sent by music.mjs) and deletes those
   tracks from reels/audio/. Run daily on the PC before the reels (pc/run-job.ps1 reels), which then commits the removal.
   Only taps from TELEGRAM_CHAT_ID (your own chat with the bot) count. Env: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID. */
import { existsSync, rmSync } from "node:fs";
import { dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";

const DIR = join(dirname(fileURLToPath(import.meta.url)), "audio");
const token = process.env.TELEGRAM_BOT_TOKEN, me = String(process.env.TELEGRAM_CHAT_ID || "");
if (!token || !me) { console.log("music inbox: Telegram not set"); process.exit(0); }
const api = async (method, body) => {
  const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  return r.json().catch(() => ({}));
};

/* only button taps are asked for; reading them marks them done */
const got = await api("getUpdates", { timeout: 0, allowed_updates: ["callback_query"] });
let last = 0, removed = 0;
for (const u of got.result || []) {
  last = Math.max(last, u.update_id);
  const q = u.callback_query;
  if (!q || !String(q.data || "").startsWith("rm:")) continue;
  const ok = String(q.from?.id) === me || String(q.message?.chat?.id) === me;
  const name = basename(String(q.data).slice(3)), file = join(DIR, name);
  if (!ok || !/^[\w.-]+\.(mp3|wav)$/.test(name)) { await api("answerCallbackQuery", { callback_query_id: q.id, text: "Not allowed" }); continue; }
  if (existsSync(file)) { rmSync(file); removed++; console.log(`removed ${name}`); }
  await api("answerCallbackQuery", { callback_query_id: q.id, text: "Removed from the reels" }).catch(() => {});
  if (q.message) await api("editMessageReplyMarkup", { chat_id: q.message.chat.id, message_id: q.message.message_id,
    reply_markup: { inline_keyboard: [[{ text: "🗑 Removed", callback_data: "done" }]] } });
}
if (last) await api("getUpdates", { offset: last + 1, timeout: 0, allowed_updates: ["callback_query"] });
console.log(`music inbox: ${removed} track(s) removed`);

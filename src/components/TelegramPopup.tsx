"use client";
/* "Never miss a deal" popup inviting visitors to our Telegram channel.
   It appears 5 seconds after a page opens (sooner if a third of the page is scrolled first), as a small card
   (a bottom sheet on phones), and is easy to close (✕, Escape, tap outside). After "Join" it never returns;
   after closing, it returns 30 seconds later, on the same page or the next one, at most 3 times a day
   (India date; the count starts again the next day). Kept in this browser only (localStorage); events go to GA4. */
import { useEffect, useRef, useState } from "react";
import { track } from "@/lib/track";
import { SOCIAL } from "@/lib/config";
import { InstagramIcon, TelegramIcon, YouTubeIcon } from "./Social";

const KEY = "vv-telegram-popup", DAY_KEY = "vv-telegram-popup-day";
const DELAY_MS = 5_000, SCROLL_SHARE = 0.33, AGAIN_AFTER_MS = 30_000, PER_DAY = 3;

const today = () => new Date(Date.now() + 5.5 * 36e5).toISOString().slice(0, 10);
/* how many times it has been shown today */
function shownToday(): number {
  try {
    const d = JSON.parse(localStorage.getItem(DAY_KEY) || "null") as { day: string; n: number } | null;
    return d?.day === today() ? d.n : 0;
  } catch { return 0; }
}
const countShowing = () => { try { localStorage.setItem(DAY_KEY, JSON.stringify({ day: today(), n: shownToday() + 1 })); } catch { /* private mode */ } };

/* how long to wait before showing it: null = not now (joined, or shown 3 times today); at least 5 s after
   the page opens, and 30 s after it was last closed */
function waitMs(): number | null {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "null") as { state: "joined" | "closed"; at: number } | null;
    if (v?.state === "joined" || shownToday() >= PER_DAY) return null;
    if (!v) return DELAY_MS;
    return Math.max(DELAY_MS, AGAIN_AFTER_MS - (Date.now() - v.at));
  } catch { return DELAY_MS; }
}
const remember = (state: "joined" | "closed") => { try { localStorage.setItem(KEY, JSON.stringify({ state, at: Date.now() })); } catch { /* private mode */ } };

export default function TelegramPopup({ url, festival }: { url: string; festival: string | null }) {
  const [open, setOpen] = useState(false);
  const [closes, setCloses] = useState(0); /* each close schedules the next showing */
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const ms = url ? waitMs() : null;
    if (ms == null) return;
    let shown = false;
    const show = () => {
      if (shown) return;
      if (shownToday() >= PER_DAY) return cleanup(); /* another tab may have used today's showings */
      shown = true; countShowing(); setOpen(true); track("telegram_popup_view", { festival: festival ?? "", again: closes > 0, today: shownToday() });
      cleanup();
    };
    /* scrolling only brings the first showing forward; a closed popup waits its 30 seconds */
    const onScroll = () => { if (ms === DELAY_MS && scrollY > (document.documentElement.scrollHeight - innerHeight) * SCROLL_SHARE) show(); };
    const timer = setTimeout(show, ms);
    addEventListener("scroll", onScroll, { passive: true });
    const cleanup = () => { clearTimeout(timer); removeEventListener("scroll", onScroll); };
    return cleanup;
  }, [url, festival, closes]);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  });

  function close() { setOpen(false); remember("closed"); setCloses((n) => n + 1); track("telegram_popup_close", {}); }
  function join() { setOpen(false); remember("joined"); track("telegram_join_click", { where: "popup", which: "telegram" }); }

  if (!open) return null;
  return (
    <div className="tg-pop-backdrop" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className={`tg-pop${festival ? " festive" : ""}`} role="dialog" aria-modal="false" aria-labelledby="tg-pop-title">
        <button type="button" className="tg-pop-x" ref={closeRef} onClick={close} aria-label="Close">✕</button>
        {/* during Diwali the header shows public/diwali-popup.webp (globals.css .tg-pop.festive), text on its plain left side */}
        <div className="tg-pop-head">
          {!festival && <span className="tg-pop-icon" aria-hidden="true"><TelegramIcon /></span>}
          <p className="tg-pop-kicker">{festival ? `Happy ${festival}!` : "Value Verdict on Telegram"}</p>
          <h2 id="tg-pop-title">Never miss a deal</h2>
        </div>
        <p className="tg-pop-text">To never miss any deals, join our Telegram channel.{festival ? ` Festive ${festival} offers, every day.` : ""}</p>
        <ul className="tg-pop-points">
          <li>Today&apos;s top deals, every day</li>
          <li>Price drops and sale alerts</li>
          <li>Free, and you can leave anytime</li>
        </ul>
        <a className="tg-pop-join" href={url} target="_blank" rel="noopener" onClick={join}><TelegramIcon /> Join our Telegram channel</a>
        {/* our other channels; their clicks are counted by components/Tracking.tsx (data-track), where = popup */}
        {(SOCIAL.instagram || SOCIAL.youtube) && (
          <div className="tg-pop-more">
            <span>Also follow us on</span>
            <div>
              {SOCIAL.instagram && (
                <a className="ig" href={SOCIAL.instagram} target="_blank" rel="noopener" data-track="instagram_follow_click" data-where="popup" data-which="instagram">
                  <InstagramIcon /> Instagram
                </a>
              )}
              {SOCIAL.youtube && (
                <a className="yt" href={SOCIAL.youtube} target="_blank" rel="noopener" data-track="youtube_subscribe_click" data-where="popup" data-which="youtube">
                  <YouTubeIcon /> YouTube
                </a>
              )}
            </div>
          </div>
        )}
        <button type="button" className="tg-pop-later" onClick={close}>Maybe later</button>
      </div>
    </div>
  );
}

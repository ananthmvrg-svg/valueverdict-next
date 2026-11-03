"use client";
/* "Never miss a deal" popup inviting visitors to follow us: Telegram, Instagram and YouTube as equal choices.
   (Its GA4 names, telegram_popup_view/close, and localStorage keys are kept from when it was Telegram-only.)
   It appears 5 seconds after a page opens (sooner if a third of the page is scrolled first), as a small card
   (a bottom sheet on phones), and is easy to close (✕, Escape, tap outside). After a click on any channel it never returns;
   after closing, it returns 30 seconds later, on the same page or the next one, at most 3 times a day
   (India date; the count starts again the next day). Kept in this browser only (localStorage); events go to GA4. */
import { useEffect, useRef, useState } from "react";
import { track } from "@/lib/track";
import { SOCIAL } from "@/lib/config";
import { LINKS } from "./Social";

/* the channels that are set and have an icon (not X yet), all shown alike */
const CHANNELS = LINKS.filter((l) => l.icon && SOCIAL[l.key]);

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

export default function TelegramPopup({ festival }: { festival: string | null }) {
  const [open, setOpen] = useState(false);
  const [closes, setCloses] = useState(0); /* each close schedules the next showing */
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const ms = CHANNELS.length ? waitMs() : null;
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
  }, [festival, closes]);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  });

  function close() { setOpen(false); remember("closed"); setCloses((n) => n + 1); track("telegram_popup_close", {}); }
  /* the click itself is counted by components/Tracking.tsx (the link's data-track, where = popup) */
  function follow() { setOpen(false); remember("joined"); }

  if (!open) return null;
  return (
    <div className="tg-pop-backdrop" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className={`tg-pop${festival ? " festive" : ""}`} role="dialog" aria-modal="false" aria-labelledby="tg-pop-title">
        <button type="button" className="tg-pop-x" ref={closeRef} onClick={close} aria-label="Close">✕</button>
        {/* during Diwali the header shows public/diwali-popup.webp (globals.css .tg-pop.festive), text on its plain left side */}
        <div className="tg-pop-head">
          <p className="tg-pop-kicker">{festival ? `Happy ${festival}!` : "Value Verdict"}</p>
          <h2 id="tg-pop-title">Never miss a deal</h2>
        </div>
        <p className="tg-pop-text">Get today&apos;s best deals where you already are. Follow us on any one you like.{festival ? ` Festive ${festival} offers, every day.` : ""}</p>
        <ul className="tg-pop-points">
          <li>Today&apos;s top deals, every day</li>
          <li>Price drops and sale alerts</li>
          <li>Free, and you can leave anytime</li>
        </ul>
        <div className="tg-pop-channels">
          {CHANNELS.map((l) => {
            const Icon = l.icon!;
            return (
              <a key={l.key} className={`ch-${l.key}`} href={SOCIAL[l.key]} target="_blank" rel="noopener" onClick={follow}
                data-track={l.event} data-where="popup" data-which={l.key}>
                <Icon />{l.label}
              </a>
            );
          })}
        </div>
        <button type="button" className="tg-pop-later" onClick={close}>Maybe later</button>
      </div>
    </div>
  );
}

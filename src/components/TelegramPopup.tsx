"use client";
/* "Never miss a deal" popup inviting visitors to our Telegram channel.
   Google lowers rankings for popups that cover a page as soon as it opens (above all on phones), so it waits:
   it appears after 10 seconds or once a third of the page has been scrolled, as a small card (a bottom sheet
   on phones), and is easy to close (✕, Escape, tap outside). Once per visitor: after "Join" it never returns;
   after closing, it may return after 7 days. Kept in this browser only (localStorage); events go to GA4. */
import { useEffect, useRef, useState } from "react";
import { track } from "@/lib/track";
import { TelegramIcon } from "./Social";

const KEY = "vv-telegram-popup";
const DELAY_MS = 10_000, SCROLL_SHARE = 0.33, AGAIN_AFTER_DAYS = 7;

function due(): boolean {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "null") as { state: "joined" | "closed"; at: number } | null;
    if (!v) return true;
    return v.state === "closed" && Date.now() - v.at > AGAIN_AFTER_DAYS * 864e5;
  } catch { return true; }
}
const remember = (state: "joined" | "closed") => { try { localStorage.setItem(KEY, JSON.stringify({ state, at: Date.now() })); } catch { /* private mode */ } };

export default function TelegramPopup({ url, festival }: { url: string; festival: string | null }) {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!url || !due()) return;
    let shown = false;
    const show = () => {
      if (shown) return;
      shown = true; setOpen(true); track("telegram_popup_view", { festival: festival ?? "" });
      cleanup();
    };
    const onScroll = () => { if (scrollY > (document.documentElement.scrollHeight - innerHeight) * SCROLL_SHARE) show(); };
    const timer = setTimeout(show, DELAY_MS);
    addEventListener("scroll", onScroll, { passive: true });
    const cleanup = () => { clearTimeout(timer); removeEventListener("scroll", onScroll); };
    return cleanup;
  }, [url, festival]);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  });

  function close() { setOpen(false); remember("closed"); track("telegram_popup_close", {}); }
  function join() { setOpen(false); remember("joined"); track("social_click", { where: "popup", which: "telegram" }); }

  if (!open) return null;
  return (
    <div className="tg-pop-backdrop" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className={`tg-pop${festival ? " festive" : ""}`} role="dialog" aria-modal="false" aria-labelledby="tg-pop-title">
        <button type="button" className="tg-pop-x" ref={closeRef} onClick={close} aria-label="Close">✕</button>
        <div className="tg-pop-head">
          {festival
            ? <span className="tg-pop-diyas" aria-hidden="true">🪔 ✨ 🪔</span>
            : <span className="tg-pop-icon" aria-hidden="true"><TelegramIcon /></span>}
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
        <button type="button" className="tg-pop-later" onClick={close}>Maybe later</button>
      </div>
    </div>
  );
}

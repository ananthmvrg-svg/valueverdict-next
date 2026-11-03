import { SOCIAL } from "@/lib/config";

/* Our social channels: the join bar above the header, the header button and the footer links.
   Links carry data-track, so components/Tracking.tsx counts the clicks in GA4: Telegram joins as "telegram_join_click",
   other channels as "social_click", each with where (bar, header, popup, footer) and which. */

export function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M21.9 4.3 18.7 19.5c-.2 1.1-.9 1.4-1.8.9l-4.9-3.6-2.4 2.3c-.3.3-.5.5-1 .5l.3-5 9.1-8.2c.4-.4-.1-.6-.6-.2L6.2 13.3l-4.8-1.5c-1-.3-1.1-1 .2-1.5L20.4 3c.9-.3 1.7.2 1.5 1.3Z" />
    </svg>
  );
}

const LINKS: { key: keyof typeof SOCIAL; label: string }[] = [
  { key: "telegram", label: "Telegram" }, { key: "instagram", label: "Instagram" }, { key: "youtube", label: "YouTube" }, { key: "x", label: "X" },
];

/* thin bar above the header on every page; festive wording during a festival */
export function JoinBar({ festival }: { festival: string | null }) {
  if (!SOCIAL.telegram) return null;
  return (
    <a className="join-bar" href={SOCIAL.telegram} target="_blank" rel="noopener" data-track="telegram_join_click" data-where="bar" data-which="telegram">
      {festival
        ? <><span aria-hidden="true">🪔</span> Happy {festival}! Festive deals every day. <b>Join our Telegram</b> <span aria-hidden="true">→</span></>
        : <><span aria-hidden="true">📢</span> Never miss a deal. <b>Join our Telegram</b> <span aria-hidden="true">→</span></>}
    </a>
  );
}

/* compact button in the header (icon only on small phones) */
export function TelegramButton() {
  if (!SOCIAL.telegram) return null;
  return (
    <a className="tg-btn" href={SOCIAL.telegram} target="_blank" rel="noopener" data-track="telegram_join_click" data-where="header" data-which="telegram" aria-label="Join our Telegram channel">
      <TelegramIcon /><span>Join Telegram</span>
    </a>
  );
}

/* "Follow us" links in the footer, only the channels that are set */
export function SocialLinks() {
  const set = LINKS.filter((l) => SOCIAL[l.key]);
  if (!set.length) return null;
  return (
    <div className="social-links">
      <span className="social-title">Follow us for daily deals</span>
      <div>
        {set.map((l) => (
          <a key={l.key} href={SOCIAL[l.key]} target="_blank" rel="noopener" data-track={l.key === "telegram" ? "telegram_join_click" : "social_click"} data-where="footer" data-which={l.key}>
            {l.key === "telegram" && <TelegramIcon />}{l.label}
          </a>
        ))}
      </div>
    </div>
  );
}

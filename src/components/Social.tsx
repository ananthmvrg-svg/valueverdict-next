import { SOCIAL } from "@/lib/config";

/* Our social channels: the join bar above the header, the header button and the footer links.
   Links carry data-track, so components/Tracking.tsx counts the clicks in GA4, one event per channel
   ("telegram_join_click", "instagram_follow_click", "youtube_subscribe_click", "social_click" for X),
   each with where (bar, header, popup, footer) and which. */

export function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M21.9 4.3 18.7 19.5c-.2 1.1-.9 1.4-1.8.9l-4.9-3.6-2.4 2.3c-.3.3-.5.5-1 .5l.3-5 9.1-8.2c.4-.4-.1-.6-.6-.2L6.2 13.3l-4.8-1.5c-1-.3-1.1-1 .2-1.5L20.4 3c.9-.3 1.7.2 1.5 1.3Z" />
    </svg>
  );
}

export function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
      <rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="17.3" cy="6.7" r="1.3" fill="currentColor" />
    </svg>
  );
}

export function YouTubeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2 31 31 0 0 0 .5 12 31 31 0 0 0 1 16.8a3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .5-4.8 31 31 0 0 0-.5-4.8ZM9.8 15.1V8.9l5.4 3.1-5.4 3.1Z" />
    </svg>
  );
}

export const LINKS: { key: keyof typeof SOCIAL; label: string; event: string; icon?: (p: { className?: string }) => React.ReactElement }[] = [
  { key: "telegram", label: "Join on Telegram", event: "telegram_join_click", icon: TelegramIcon },
  { key: "instagram", label: "Follow on Instagram", event: "instagram_follow_click", icon: InstagramIcon },
  { key: "youtube", label: "Subscribe on YouTube", event: "youtube_subscribe_click", icon: YouTubeIcon },
  { key: "x", label: "Follow on X", event: "social_click" },
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

/* header: the Telegram button (icon only on small phones), then round Instagram and YouTube icon buttons */
export function HeaderSocial() {
  return (
    <div className="nav-social">
      {SOCIAL.telegram && (
        <a className="tg-btn" href={SOCIAL.telegram} target="_blank" rel="noopener" data-track="telegram_join_click" data-where="header" data-which="telegram" aria-label="Join our Telegram channel">
          <TelegramIcon /><span>Join<span className="tg-word"> Telegram</span></span>
        </a>
      )}
      {SOCIAL.instagram && (
        <a className="soc-btn ig" href={SOCIAL.instagram} target="_blank" rel="noopener" data-track="instagram_follow_click" data-where="header" data-which="instagram" aria-label="Follow us on Instagram" title="Follow us on Instagram">
          <InstagramIcon />
        </a>
      )}
      {SOCIAL.youtube && (
        <a className="soc-btn yt" href={SOCIAL.youtube} target="_blank" rel="noopener" data-track="youtube_subscribe_click" data-where="header" data-which="youtube" aria-label="Subscribe on YouTube" title="Subscribe on YouTube">
          <YouTubeIcon />
        </a>
      )}
    </div>
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
          <a key={l.key} className={`soc-${l.key}`} href={SOCIAL[l.key]} target="_blank" rel="noopener" data-track={l.event} data-where="footer" data-which={l.key}>
            {l.icon && <l.icon />}{l.label}
          </a>
        ))}
      </div>
    </div>
  );
}

import Link from "next/link";
import type { Metadata } from "next";
import { SOCIAL } from "@/lib/config";
import { getPicks, pickedAt, picksIn } from "@/lib/picks";
import { festival } from "@/lib/festival";
import { pageMeta } from "@/lib/seo";
import { JoinButtons, LINKS } from "@/components/Social";
import { safeUrl } from "@/lib/products";
import { getGuides } from "@/lib/guides";
import { AMAZON_GUIDE } from "@/lib/amazon-guide";

export async function generateMetadata(): Promise<Metadata> {
  return pageMeta(
    "Buy on Amazon at the Right Discount, at the Right Time: Join Value Verdict",
    "Free Amazon.in deal alerts and regular updates on Telegram, Instagram or YouTube, plus guides on when and how to buy. Pick the app you already use; leave anytime.",
    "/join");
}

const inr = (n: number | null) => (n == null ? "" : "₹" + Math.round(n).toLocaleString("en-IN"));

/* what each channel gives; the buttons, events and icons come from components/Social.tsx (LINKS) */
const PITCH: Record<string, { tag: string; points: string[]; cls: string }> = {
  telegram: { tag: "Fastest", points: ["Deal alerts as soon as they go live", "Today's top picks every morning"], cls: "tg" },
  instagram: { tag: "Daily reels", points: ["Best deals in 30-second reels", "Stories when prices drop"], cls: "ig" },
  youtube: { tag: "Watch & compare", points: ["Shorts on the top picks per budget", "Which one to buy, explained"], cls: "yt" },
};

/* /join: one page for the Instagram bio, Telegram posts and shares; three equal ways to follow us,
   the guides on how and when to buy, then today's top deals as a sample of what followers get. Clicks are counted
   by components/Tracking.tsx (data-track: telegram_join_click / instagram_follow_click / youtube_subscribe_click,
   where = join-top / join-bottom). */
export default async function JoinPage() {
  const [{ picks, at }, fest, { guides }] = await Promise.all([getPicks(), festival(), getGuides()]);
  const top = picksIn(picks, "top-100").slice(0, 6);
  const channels = LINKS.filter((l) => l.icon && SOCIAL[l.key] && PITCH[l.key]);
  return (
    <>
      <section className={`join-hero${fest ? " festive" : ""}`}>
        <div className="wrap">
          <p className="join-kicker">{fest ? `🪔 ${fest} deals are live` : "Free deal alerts"}</p>
          <h1>Buy on Amazon at the right discount, at the right time</h1>
          <p className="join-sub">We check Amazon.in deals every day and tell you when a price is worth it. Join for instant alerts and regular updates, free, on the app you already use.</p>
          <div className="join-cards">
            {channels.map((l) => {
              const Icon = l.icon!, p = PITCH[l.key];
              return (
                <div key={l.key} className={`join-card ${p.cls}`}>
                  <div className="join-card-top"><span className="join-icon" aria-hidden="true"><Icon /></span><span className="join-tag">{p.tag}</span></div>
                  <h2>{l.key === "telegram" ? "Telegram" : l.key === "instagram" ? "Instagram" : "YouTube"}</h2>
                  <ul>{p.points.map((x) => <li key={x}>{x}</li>)}</ul>
                  <a className={`join-btn ${p.cls}`} href={SOCIAL[l.key]} target="_blank" rel="noopener" data-track={l.event} data-where="join-top" data-which={l.key}>
                    <Icon />{l.label}
                  </a>
                </div>
              );
            })}
          </div>
          <ul className="join-trust">
            <li>✓ Free</li><li>✓ No spam</li><li>✓ Leave anytime</li><li>✓ Only Amazon.in deals rated 3★+</li>
          </ul>
        </div>
      </section>

      {/* how and when to buy: the Amazon guide first, then the product guides */}
      <section className="join-learn">
        <div className="wrap">
          <Link className="join-guide" href="/amazon-buying-guide">
            <span className="join-guide-label">Free guide · {AMAZON_GUIDE.sections.length - 1} steps</span>
            <h2>How to buy on Amazon with the right discount, at the right time</h2>
            <p>Is the discount real? When are the big sales? How do bank offers, coupons and no-cost EMI work?</p>
            <b>Read the guide →</b>
          </Link>
          {guides.length > 0 && (
            <div className="join-guides">
              <h3>Choosing a product? Read its buying guide</h3>
              <ul>{guides.map((x) => <li key={x.slug}><Link href={`/guides/${x.slug}`}>{x.title.split(":")[0]}</Link></li>)}</ul>
            </div>
          )}
        </div>
      </section>

      <section className="join-deals">
        <div className="wrap">
          <div className="sec-head"><div>
            <h2>Today&apos;s top deals, the kind you&apos;ll get</h2>
            <p>Picked from Amazon.in every morning and ranked on specs for the price.{at ? ` Updated ${pickedAt(at)} IST.` : ""}</p>
          </div></div>
          {/* compact cards: this page is for joining, the full cards (pros, cons, tips) are on the Top 100 */}
          {top.length ? (
            <div className="join-grid">
              {top.map((x) => {
                const url = safeUrl(x.url), img = safeUrl(x.image);
                return (
                  <div key={x.asin} className="join-deal">
                    {x.off ? <span className="join-off">-{Math.round(x.off)}%</span> : null}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {img && <img src={img} alt="" loading="lazy" />}
                    <span className="join-brand">{x.brand}</span>
                    <h3>{x.title}</h3>
                    {x.bestFor && <p className="join-for">Best for: {x.bestFor}</p>}
                    <p className="join-price"><b>{inr(x.price)}</b>{x.was && x.price && x.was > x.price ? <s>{inr(x.was)}</s> : null}</p>
                    {url && <a className="btn amz" href={url} target="_blank" rel="nofollow sponsored noopener"
                      data-asin={x.asin} data-category={x.category} data-price={x.price ?? ""} data-rank={x.rank} data-product={x.title.slice(0, 100)} data-where="join">View deal</a>}
                  </div>
                );
              })}
            </div>
          ) : <div className="empty">Today&apos;s deals are being prepared. Please check back after 6 AM.</div>}
          <div className="more-row"><Link className="more-btn" href="/top-deals">See all of today&apos;s Top 100 →</Link></div>
        </div>
      </section>

      <section className="join-again">
        <div className="wrap">
          <h2>Want deals like these every day?</h2>
          <p>Follow us once and they come to you. No sign-up, no email.</p>
          <JoinButtons where="join-bottom" />
        </div>
      </section>
    </>
  );
}

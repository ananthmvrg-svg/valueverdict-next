import Link from "next/link";

/* A one-line "where you are" bar for category, budget and guide pages:
   ① Learn → ② Pick a budget → ③ Compare picks → ④ Buy on Amazon, with the current step highlighted and each step
   linking to the right place for this page. The home page has the full four-card version ("How Value Verdict works").
   Away from the guide, step ① is an invitation ("Not sure which TVs to buy? Read the 9-min guide"), never a ✓,
   since we can't know whether the visitor has read it. */

type Step = { key: string; label: string; hint: string; href?: string };

/* current: 1 on a guide page, 2 on a category page, 3 on a budget page */
export default function JourneyBar({ catSlug, catName, current, guideSlug, guideMinutes }: {
  catSlug: string; catName: string; current: 1 | 2 | 3; guideSlug?: string; guideMinutes?: number;
}) {
  const learn: Step = current === 1
    ? { key: "learn", label: "Learn", hint: `${catName} guide` }
    : {
        key: "learn", label: `Not sure which ${catName} to buy?`,
        hint: guideSlug ? `Read the ${guideMinutes ? `${guideMinutes}-min ` : ""}guide →` : "Read our buying guides →",
        href: guideSlug ? `/guides/${guideSlug}` : "/guides",
      };
  const steps: Step[] = [
    learn,
    { key: "budget", label: "Pick a budget", hint: "Choose a price band", href: `/${catSlug}#budgets` },
    { key: "compare", label: "Compare picks", hint: "Specs, pros & cons", href: current === 1 ? `/${catSlug}#picks` : "#picks" },
    { key: "buy", label: "Buy on Amazon", hint: "Same price for you" },
  ];
  return (
    <nav className="journey" aria-label="Your steps">
      <ol>
        {steps.map((s, i) => {
          const n = i + 1;
          const state = n === current ? "now" : n === 1 ? "invite" : n < current ? "done" : "next";
          const body = (
            <>
              <span className="journey-n" aria-hidden="true">{state === "invite" ? "📘" : state === "done" ? "✓" : n}</span>
              <span className="journey-t"><b>{s.label}</b><small>{n === current ? "You're here" : s.hint}</small></span>
            </>
          );
          return (
            <li key={s.key} className={`journey-step ${state}`} aria-current={n === current ? "step" : undefined}>
              {s.href && n !== current ? <Link href={s.href}>{body}</Link> : <span>{body}</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

import Link from "next/link";
import InfoPage from "@/components/InfoPage";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta(
  "About Value Verdict – Amazon.in Deals Sorted by Budget",
  "Value Verdict is an independent Indian deals site that shows today's best Amazon.in deals on appliances, TVs and laptops, sorted by budget, with top picks explained.",
  "/about");

export default function AboutPage() {
  return (
    <InfoPage path="/about" title="About Value Verdict" intro="Today's best Amazon.in deals, sorted by your budget, with our top picks explained.">
      <h2>What we do</h2>
      <p>Buying a fridge, washing machine, TV, AC or laptop usually means hours of scrolling through hundreds of listings. Value Verdict narrows that down: every day we collect genuinely discounted, in-stock products from Amazon.in for each category and budget, and highlight the top picks with a short, plain explanation of why.</p>
      <h2>Who we are</h2>
      <p>Value Verdict is a small, independent website based in India. We are not owned by or affiliated with any brand, and brands cannot pay to be included in our picks.</p>
      <h2>How we make money</h2>
      <p>We take part in the Amazon Associates programme. When you buy something on Amazon after clicking a link on our site, we may earn a small commission. You pay the same price. Read our <Link href="/affiliate-disclosure">affiliate disclosure</Link>.</p>
      <h2>What we are not</h2>
      <ul>
        <li>We are not a store: every purchase happens on Amazon.in, and Amazon handles payment, delivery, warranty and returns.</li>
        <li>We do not physically test products, and our picks are recommendations, not guarantees.</li>
      </ul>
      <p>See exactly how products are chosen on <Link href="/how-we-pick">How we pick</Link>.</p>
    </InfoPage>
  );
}

import InfoPage from "@/components/InfoPage";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta(
  "Affiliate Disclosure – Value Verdict",
  "Value Verdict is a participant in the Amazon Associates programme and may earn a commission on qualifying purchases, at no extra cost to you.",
  "/affiliate-disclosure");

export default function DisclosurePage() {
  return (
    <InfoPage path="/affiliate-disclosure" title="Affiliate disclosure" intro="How Value Verdict earns money, in plain words.">
      <p><strong>As an Amazon Associate, we earn from qualifying purchases.</strong></p>
      <p>Value Verdict is a participant in the Amazon Associates programme, an affiliate advertising programme that lets websites earn fees by linking to Amazon.in. When you click a &ldquo;View deal on Amazon&rdquo; button and buy something, we may receive a small commission from Amazon.</p>
      <ul>
        <li>You pay exactly the same price as you would going to Amazon directly.</li>
        <li>Brands don&apos;t pay us, and payment can&apos;t buy a place in our picks.</li>
        <li>Clicking a link doesn&apos;t mean a purchase: you decide on Amazon, and Amazon handles the order, delivery, warranty and returns.</li>
      </ul>
      <p>Prices and availability shown on Value Verdict come from Amazon.in at the time shown on each page and can change. The price on Amazon at the time of purchase applies.</p>
    </InfoPage>
  );
}

import InfoPage from "@/components/InfoPage";
import { CONTACT_EMAIL } from "@/lib/config";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta(
  "Corrections & Contact – Value Verdict",
  "Found a wrong price, specification or product on Value Verdict? Tell us and we'll correct it.",
  "/contact");

export default function ContactPage() {
  return (
    <InfoPage path="/contact" title="Corrections & contact" intro="Found something wrong? We fix mistakes quickly.">
      <h2>Corrections policy</h2>
      <p>We want every price, specification and explanation on Value Verdict to be accurate. If you see a mistake, such as a wrong specification, a product on the wrong page, an accessory listed as a product or a misleading reason, tell us and we&apos;ll correct or remove it.</p>
      <p>Prices and stock change on Amazon throughout the day. Our prices are re-checked about every 3 hours, and the price on Amazon at checkout always applies.</p>
      <h2>Contact us</h2>
      {CONTACT_EMAIL
        ? <p>Email: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Please include the page address and what&apos;s wrong.</p>
        : <p>Our contact address is being set up. Until then, please reach us through our social channels.</p>}
      <p>For orders, delivery, returns or warranty, please contact Amazon.in directly: we don&apos;t sell products ourselves.</p>
    </InfoPage>
  );
}

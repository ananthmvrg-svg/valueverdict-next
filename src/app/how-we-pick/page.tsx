import Link from "next/link";
import InfoPage from "@/components/InfoPage";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta(
  "How We Pick Deals – Value Verdict Methodology",
  "How Value Verdict finds Amazon.in deals: official Amazon data, strict filters, budget bands and AI-assisted ranking checked against each product's own listing.",
  "/how-we-pick");

export default function HowWePickPage() {
  return (
    <InfoPage path="/how-we-pick" title="How we pick" intro="Where our products come from, how we filter them and how the top picks are ranked, including what we can't check.">
      <h2>1. Product data comes from Amazon</h2>
      <p>All products, prices, discounts, images and stock come from Amazon.in through Amazon&apos;s official product data service for Associates. We don&apos;t copy or make up product information.</p>
      <h2>2. Collecting candidates (every day at 6 AM)</h2>
      <p>For every category and budget page we search Amazon.in and keep only products that are:</p>
      <ul>
        <li>new and in stock;</li>
        <li>discounted by a minimum amount for that category;</li>
        <li>rated above 3 stars by Amazon customers (Amazon applies this filter; we don&apos;t see the exact rating);</li>
        <li>inside the page&apos;s price range, with a price shown;</li>
        <li>the right type of product: accessories and add-ons (covers, stands, stabilizers, liners, bags) are removed, TV size pages only keep that size, and gaming laptops must have gaming graphics.</li>
      </ul>
      <h2>3. Reading the key specifications</h2>
      <p>From each product&apos;s own title and feature list we read the specifications that matter for its type, such as capacity, energy rating, screen size and panel, processor, RAM and storage, or AC tonnage. If a listing doesn&apos;t state something, we show it as not stated rather than guessing.</p>
      <h2>4. Ranking the top picks</h2>
      <p>An AI model (Claude, by Anthropic) assists in ranking the candidates for each budget. It looks only at the listing data: brand, title, price and discount, Amazon&apos;s deal label, the main feature points and the specifications we read. It considers whether the product is genuine for the page, its specifications for the price, how well it uses the budget, the size of the discount and variety between picks. For each pick it gives a short reason, what it&apos;s best for, its strengths and limitations, and a value score from 1 to 100.</p>
      <p>Every claim is then checked automatically against the product&apos;s own data: numbers and features must appear in the listing, and claims about things a listing can&apos;t show, such as reliability, durability or customer satisfaction, are removed.</p>
      <h2>5. Keeping prices current</h2>
      <p>New picks are chosen every day at 6 AM, and the prices and stock of the products shown are re-checked with Amazon about every 3 hours. A product whose price couldn&apos;t be confirmed in the last 24 hours is hidden. Each page shows when prices were last checked.</p>
      <h2>What we can&apos;t check</h2>
      <ul>
        <li>We don&apos;t read customer reviews or see exact star ratings.</li>
        <li>We don&apos;t test products, and we can&apos;t judge long-term reliability.</li>
        <li>Amazon&apos;s &ldquo;was&rdquo; price is Amazon&apos;s reference price, not verified price history.</li>
        <li>Bank card offers, EMI and exchange offers are shown on Amazon, not here.</li>
        <li>Prices and stock can change at any time; the price on Amazon at checkout applies.</li>
      </ul>
      <p>Spotted a mistake? Please tell us on the <Link href="/contact">corrections &amp; contact</Link> page.</p>
    </InfoPage>
  );
}

import type { Faq, GuideSection } from "./guides";

/* "How to buy on Amazon.in at the right price, at the right time": a general guide, written and reviewed by a
   person (not AI-drafted, not in the guides table), shown at /amazon-buying-guide and linked from /join and /guides.
   Kept general on purpose: sale dates, bank fees and offer terms change every year and differ by bank, so the
   guide gives the usual pattern and says where to check the current terms, never exact figures we can't keep true.
   Checked Nov 2026: sale months from Amazon India's announcements and press coverage; no-cost EMI mechanics from
   bank and Amazon help pages. Update "updated" when the text changes. */

export const AMAZON_GUIDE = {
  slug: "amazon-buying-guide",
  title: "How to Buy on Amazon India at the Right Price, at the Right Time",
  description: "Is that Amazon discount real? When are the big sales? How do bank offers, coupons and no-cost EMI work? A plain-English guide to paying less on Amazon.in.",
  updated: "2026-11-06",
  summary: [
    "A big \"% off\" is measured against Amazon's listed (M.R.P.) price, which is not the product's price history. Compare the price you pay, not the percentage.",
    "The biggest sales usually come in January (Republic Day), around May (summer), July (Prime Day), August (Freedom Festival) and autumn (Great Indian Festival, around Navratri and Diwali).",
    "Bank card offers usually need a minimum order, have a maximum discount and work only with certain cards. Check the final price on the payment page.",
    "No-cost EMI means the interest is given back as a discount, but your bank may still charge a processing fee plus GST.",
    "Before you buy, check who sells it, the warranty and the return policy. Many large appliances can only be replaced, not returned.",
  ],
  sections: [
    {
      heading: "Step 1: Know what the discount is measured against",
      paragraphs: [
        "On Amazon.in the discount shown is usually the difference between today's price and the listed price, the M.R.P. or \"List price\". That listed price is set by the seller or brand. It is not proof that the product ever sold at that price, so two products with \"50% off\" can be very different deals.",
        "What matters is the price you pay compared with other similar models today. Compare two or three models with the same key specifications (for a TV: size, panel, refresh rate; for an AC: tonnage, star rating, inverter) at the same budget.",
      ],
      bullets: [
        "Compare the final price, not the percentage.",
        "Look at the same model across a few days. Prices on Amazon.in can change several times a week.",
        "Be careful with variants: the cheaper colour or storage option may have different specifications.",
        "On Value Verdict every deal page is sorted by budget and ranked on specifications for the price, so you compare like with like.",
      ],
      table: null,
    },
    {
      heading: "Step 2: Buy at the right time",
      paragraphs: [
        "Amazon India runs a few big sales every year. The exact dates change, and Amazon announces them a few weeks before. The months below are the usual pattern.",
      ],
      bullets: [
        "Prime members usually get early access, often a few hours to a day before everyone else.",
        "During sales, \"Lightning Deals\" and \"Deal of the Day\" run for a limited time or until a set number is sold; the timer on the product page shows how long is left.",
        "Seasonal products are in highest demand in their season: ACs and coolers before and during summer, geysers and room heaters in winter. Buying a little before the rush means more choice and stock.",
        "Prices often go back up when a sale ends. If a price you like is close to your budget during a sale, don't wait for it to fall further after the sale.",
      ],
      table: {
        head: ["Sale", "Usually held", "Good to know"],
        rows: [
          ["Great Republic Day Sale", "January", "First big sale of the year"],
          ["Great Summer Sale", "Around May", "Peak season for ACs and coolers"],
          ["Prime Day", "July", "For Prime members only"],
          ["Great Freedom Festival", "August", "Around Independence Day"],
          ["Great Indian Festival", "September or October", "The biggest sale, around Navratri and Diwali; runs for weeks, in waves"],
        ],
      },
    },
    {
      heading: "Step 3: Add the offers in the right way",
      paragraphs: [
        "The price on the product page is often not the lowest price you can pay. Offers are added on top, and each has its own conditions. Open \"Offers\" on the product page and read them before you pay.",
      ],
      bullets: [
        "Bank card offers: an instant discount for certain credit or debit cards. Most need a minimum order value and have a maximum discount, and some apply only to EMI or only to full payment.",
        "Coupons: shown as a tick box (\"Apply ₹X coupon\") on the product page. Tick it before adding to cart.",
        "Exchange offers: the value of your old product is decided when it is picked up, based on its condition, so the amount shown first is the most you can get.",
        "Cashback (for example to Amazon Pay balance) is usually credited later, not taken off the price now.",
        "The payment page shows the final price after the offers that apply. Compare that number, not the one on the product page.",
      ],
      table: null,
    },
    {
      heading: "Step 4: No-cost EMI, read the small print",
      paragraphs: [
        "No-cost EMI lets you pay in monthly instalments without paying interest. The bank still charges interest, but the seller or Amazon gives you the same amount back as a discount, so the total you pay is about the product price.",
      ],
      bullets: [
        "Your bank may charge a one-time processing fee plus GST. This is shown at the payment step and differs by bank.",
        "No-cost EMI is offered on set tenures, commonly 3, 6, 9 or 12 months, and needs a minimum order value.",
        "An instant bank discount and no-cost EMI may not both apply to the same order. Compare the final total for each option.",
        "Check the EMI plan details: the interest, the discount and the total you will pay should all be listed.",
      ],
      table: null,
    },
    {
      heading: "Step 5: Check the seller, warranty and returns",
      paragraphs: [
        "The same product can be sold by different sellers on Amazon.in at different prices. A low price from an unknown seller can cost more later if the warranty or invoice is a problem.",
      ],
      bullets: [
        "Look for \"Sold by\" and \"Ships from\" under the price. \"Fulfilled by Amazon\" means Amazon stores and delivers it.",
        "Check the warranty: who gives it (the brand or the seller) and for how long. Keep the invoice.",
        "Read the return policy on the product page. Many TVs, ACs, fridges and washing machines can only be replaced if they arrive damaged or faulty, not returned because you changed your mind.",
        "For ACs, washing machines and TVs, check whether installation is included or charged separately, and who does it.",
      ],
      table: null,
    },
    {
      heading: "Step 6: Read reviews the smart way",
      paragraphs: [
        "Reviews help, but the star rating alone can mislead.",
      ],
      bullets: [
        "Read the most recent reviews: a product can change over time.",
        "Check that a review is for your exact model and variant. Amazon often shows reviews of all variants together.",
        "Three-star reviews often explain the real limits of a product best.",
        "Look for the same problem mentioned many times (noise, heating, after-sales service), not one angry review.",
      ],
      table: null,
    },
    {
      heading: "How Value Verdict helps",
      paragraphs: [
        "Every day at 6 AM we pick the best-value Amazon.in deals in each category and budget, and we re-check prices about every 3 hours. We only list products rated above 3 stars and priced below Amazon's listed price, and our buying guides explain which specifications matter.",
        "You still buy on Amazon.in at the same price. We may earn a small commission, which doesn't change what you pay.",
      ],
      bullets: [],
      table: null,
    },
  ] satisfies GuideSection[],
  faqs: [
    { q: "Is the discount on Amazon real?", a: "The discount is real against the listed price (M.R.P.), but the listed price is set by the seller and isn't proof of an earlier selling price. Compare the price you pay with similar models today, and watch the same model for a few days if you can." },
    { q: "When is the best time to buy on Amazon India?", a: "During the big sales: usually January (Republic Day), around May (summer), July (Prime Day, for Prime members), August (Freedom Festival) and the Great Indian Festival around Navratri and Diwali. Exact dates change every year; Amazon announces them a few weeks ahead." },
    { q: "Is no-cost EMI really free?", a: "Mostly. The interest is given back to you as a discount, but your bank may charge a processing fee plus GST, and an instant bank discount may not apply with EMI. Compare the final total for each payment option on the payment page." },
    { q: "Can I use a bank offer and a coupon together?", a: "Often yes: a coupon is taken off the product price and a bank offer is applied at payment. Each offer has its own conditions, so check the final price on the payment page." },
    { q: "Why is the price on Amazon different from the price on Value Verdict?", a: "Amazon.in prices can change at any time. We re-check prices about every 3 hours and show when they were last checked. The price on Amazon at checkout is the one that applies." },
  ] satisfies Faq[],
};

import type { Metadata } from "next";
import { MarketingPricingPage } from "@/components/marketing/pricing-page";

export const metadata: Metadata = {
  title: "Pricing | PursuitIQ",
  description:
    "Explore PursuitIQ pricing for solo consultants, SMEs, and agencies using AI to qualify, draft, review, and win more tenders.",
};

export default function PricingPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "PursuitIQ",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: "Explore PursuitIQ pricing for solo consultants, SMEs, and agencies using AI to qualify, draft, review, and win more tenders.",
    url: "https://pursuitiq.com/pricing",
    offers: [
      { "@type": "Offer", name: "Solo Consultant", priceCurrency: "GBP", price: "149", url: "https://pursuitiq.com/pricing" },
      { "@type": "Offer", name: "SME", priceCurrency: "GBP", price: "399", url: "https://pursuitiq.com/pricing" },
      { "@type": "Offer", name: "Agency", priceCurrency: "GBP", price: "799", url: "https://pursuitiq.com/pricing" },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <MarketingPricingPage />
    </>
  );
}

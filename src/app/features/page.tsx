import type { Metadata } from "next";
import { MarketingFeaturesPage } from "@/components/marketing/features-page";

export const metadata: Metadata = {
  title: "Features | PursuitIQ",
  description:
    "See how PursuitIQ connects opportunity discovery, drafting, review, prediction, outcome learning, and knowledge management for procurement teams.",
};

export default function FeaturesPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "PursuitIQ",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "See how PursuitIQ connects opportunity discovery, drafting, review, prediction, outcome learning, and knowledge management for procurement teams.",
    url: "https://pursuitiq.com/features",
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <MarketingFeaturesPage />
    </>
  );
}

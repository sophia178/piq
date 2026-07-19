import type { Metadata } from "next";
import { MarketingHomePage } from "@/components/marketing/home-page";

export const metadata: Metadata = {
  title: "PursuitIQ | AI bid workflow for procurement teams.",
  description:
    "PursuitIQ is the AI bid workflow for procurement teams. Discover opportunities, build knowledge-backed responses, review submissions, export bid packs, and learn from every outcome.",
  openGraph: {
    title: "PursuitIQ | AI bid workflow for procurement teams.",
    description:
      "Discover opportunities, build knowledge-backed responses, review submissions, export bid packs, and learn from every outcome.",
  },
};

export default function HomePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "PursuitIQ",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "PursuitIQ helps bid teams discover opportunities, build knowledge-backed responses, review submissions, export bid packs, and learn from outcomes.",
    url: "https://pursuitiq.com/",
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <MarketingHomePage />
    </>
  );
}

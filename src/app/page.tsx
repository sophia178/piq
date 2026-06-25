import type { Metadata } from "next";
import { MarketingHomePage } from "@/components/marketing/home-page";

export const metadata: Metadata = {
  title: "PursuitIQ | Win more contracts with AI.",
  description:
    "PursuitIQ is the Win Intelligence Platform for procurement teams. Find the right opportunities, draft stronger bids, review submissions, predict win probability, and learn from every outcome.",
  openGraph: {
    title: "PursuitIQ | Win more contracts with AI.",
    description:
      "Find, qualify, draft, review, and predict with one enterprise-grade Win Intelligence Platform for procurement teams.",
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
      "PursuitIQ helps bid teams find opportunities, write better bids, predict win probability, and learn from every result. The AI platform for winning public sector contracts.",
    url: "https://pursuitiq.com/",
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <MarketingHomePage />
    </>
  );
}

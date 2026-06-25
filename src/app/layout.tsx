import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import "@/app/globals.css";
import { assertProductionEnv, env } from "@/lib/env";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(env.appUrl),
  title: {
    default: "PursuitIQ — Win Intelligence Platform for Procurement Teams",
    template: "%s — PursuitIQ",
  },
  description:
    "PursuitIQ helps bid teams find opportunities, write better bids, predict win probability, and learn from every result. The AI platform for winning public sector contracts.",
  applicationName: "PursuitIQ",
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "PursuitIQ — Win Intelligence Platform for Procurement Teams",
    description:
      "PursuitIQ helps bid teams find opportunities, write better bids, predict win probability, and learn from every result. The AI platform for winning public sector contracts.",
    siteName: "PursuitIQ",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "PursuitIQ — Win Intelligence Platform for Procurement Teams",
    description:
      "PursuitIQ helps bid teams find opportunities, write better bids, predict win probability, and learn from every result. The AI platform for winning public sector contracts.",
    images: ["/opengraph-image"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  assertProductionEnv();
  return (
    <html lang="en" className="bg-background">
      <body className={`${inter.variable} ${manrope.variable}`}>{children}</body>
    </html>
  );
}

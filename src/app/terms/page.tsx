import type { Metadata } from "next";
import { legalSections } from "@/lib/marketing-content";
import { SectionReveal } from "@/components/marketing/primitives";
import { MarketingSiteShell } from "@/components/marketing/site-shell";

export const metadata: Metadata = {
  title: "Terms | PursuitIQ",
  description: "Read the PursuitIQ service terms overview covering usage, support, and decision-support outputs.",
};

export default function TermsPage() {
  return (
    <MarketingSiteShell currentPath="/terms">
      <main className="mx-auto max-w-5xl px-5 pb-24 pt-24 lg:px-8 lg:pt-28">
        <SectionReveal>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-brand-subtle">Terms</p>
          <h1 className="mt-4 text-5xl font-semibold tracking-[-0.06em] text-white sm:text-6xl">Serious software for serious pursuit teams.</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
            These summary terms explain how PursuitIQ is intended to be used as an enterprise-grade Win Intelligence Platform.
          </p>
        </SectionReveal>

        <div className="mt-12 grid gap-6">
          {legalSections.terms.map((section, index) => (
            <SectionReveal key={section.heading} delay={index * 0.08}>
              <article className="rounded-[1.8rem] border border-white/10 bg-white/[0.03] p-7">
                <h2 className="text-2xl font-semibold tracking-[-0.03em] text-white">{section.heading}</h2>
                <p className="mt-4 text-sm leading-8 text-slate-300">{section.body}</p>
              </article>
            </SectionReveal>
          ))}
        </div>
      </main>
    </MarketingSiteShell>
  );
}

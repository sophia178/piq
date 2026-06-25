"use client";

import { ArrowRight, Building2, ShieldCheck, Users } from "lucide-react";
import { PricingBlock } from "@/components/marketing/pricing-block";
import { MarketingButton, SectionReveal } from "@/components/marketing/primitives";
import { MarketingSiteShell } from "@/components/marketing/site-shell";

const buyingPoints = [
  {
    icon: Users,
    title: "Built for bid teams, not solo prompts",
    description: "Give commercial, proposal, delivery, and leadership stakeholders one system of record for the pursuit.",
  },
  {
    icon: Building2,
    title: "Scales from consultant to agency",
    description: "Use PursuitIQ as an individual advisor or roll it out across a team with enterprise workflows and API access.",
  },
  {
    icon: ShieldCheck,
    title: "Enterprise-grade operating model",
    description: "Bring qualification, drafting, review, knowledge, and insight workflows into a single repeatable process.",
  },
] as const;

export function MarketingPricingPage() {
  return (
    <MarketingSiteShell currentPath="/pricing">
      <main>
        <section className="mx-auto max-w-7xl px-5 pb-12 pt-24 lg:px-8 lg:pt-28">
          <SectionReveal>
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-brand-subtle">Pricing</p>
              <h1 className="mt-4 text-5xl font-semibold tracking-[-0.06em] text-white sm:text-6xl">
                Clear pricing for serious procurement teams.
              </h1>
              <p className="mt-6 text-lg leading-8 text-slate-300">
                Choose the plan that fits your bid volume today, then scale into full pursuit intelligence as your pipeline grows.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <MarketingButton href="/signup" trailingArrow>
                  Start Free Trial
                </MarketingButton>
                <MarketingButton href="/features" variant="ghost">
                  Explore Features
                </MarketingButton>
              </div>
            </div>
          </SectionReveal>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {buyingPoints.map((point, index) => {
              const Icon = point.icon;
              return (
                <SectionReveal key={point.title} delay={index * 0.08}>
                  <article className="rounded-[1.8rem] border border-white/10 bg-white/[0.03] p-6">
                    <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-[#101522] text-brand-subtle">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h2 className="mt-6 text-2xl font-semibold tracking-[-0.03em] text-white">{point.title}</h2>
                    <p className="mt-4 text-sm leading-7 text-slate-400">{point.description}</p>
                  </article>
                </SectionReveal>
              );
            })}
          </div>
        </section>

        <section className="border-y border-white/8 bg-[rgba(255,255,255,0.02)]">
          <PricingBlock embedded />
        </section>

        <section className="mx-auto max-w-7xl px-5 py-24 lg:px-8">
          <SectionReveal>
            <div className="overflow-hidden rounded-[2.2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(37,99,235,0.18),rgba(17,22,30,0.96)_48%,rgba(10,10,15,0.98))] p-8 sm:p-10">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-2xl">
                  <p className="text-sm font-semibold uppercase tracking-[0.28em] text-brand-subtle">Need enterprise rollout?</p>
                  <h2 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-white sm:text-5xl">
                    We help procurement teams operationalise qualification, drafting, and review.
                  </h2>
                </div>
                <MarketingButton href="/signup" trailingArrow>
                  Start with SME
                </MarketingButton>
              </div>
              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {[
                  "Align discovery, review, and predict workflows.",
                  "Give every bid a shared evidence base.",
                  "Build a learning loop from every outcome.",
                ].map((item) => (
                  <div key={item} className="rounded-[1.4rem] border border-white/10 bg-white/[0.04] px-4 py-4 text-sm text-slate-200">
                    <div className="flex items-center gap-2">
                      <ArrowRight className="h-4 w-4 text-brand-subtle" />
                      <span>{item}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </SectionReveal>
        </section>
      </main>
    </MarketingSiteShell>
  );
}

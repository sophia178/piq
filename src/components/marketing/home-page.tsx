"use client";

import { CheckCircle2 } from "lucide-react";
import { howItWorks, problemPoints, productEngines } from "@/lib/marketing-content";
import { PricingBlock } from "@/components/marketing/pricing-block";
import { MarketingButton, SectionReveal } from "@/components/marketing/primitives";
import { MarketingSiteShell } from "@/components/marketing/site-shell";

export function MarketingHomePage() {
  return (
    <MarketingSiteShell currentPath="/">
      <main>
        <section className="mx-auto max-w-7xl px-5 pb-20 pt-24 lg:px-8 lg:pt-28">
          <div className="grid gap-10 lg:grid-cols-[0.55fr_0.45fr] lg:items-center">
            <SectionReveal>
              <div className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs uppercase tracking-[0.22em] text-slate-300">
                AI bid workflow for procurement teams
              </div>
              <h1 className="mt-6 text-5xl font-semibold leading-[0.95] tracking-[-0.06em] text-white sm:text-6xl lg:text-7xl">
                Build stronger bids from one connected workspace.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
                PursuitIQ brings opportunity discovery, drafting, review, prediction, export, and outcome learning into one operating system for
                teams that manage real tender submissions.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <MarketingButton href="/signup" trailingArrow>
                  Start 7-Day Free Trial
                </MarketingButton>
                <MarketingButton href="#product-tour" variant="ghost">
                  See the workflow
                </MarketingButton>
              </div>
            </SectionReveal>

            <SectionReveal delay={0.08}>
              <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(17,22,30,0.96),rgba(10,10,15,0.98))] p-6 shadow-[0_28px_120px_rgba(2,6,23,0.32)]">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">What teams manage in PursuitIQ</p>
                <div className="mt-5 grid gap-3">
                  {[
                    "Opportunity qualification with buyer, value, and deadline context",
                    "Structured workspace for requirements, responses, evidence, and tasks",
                    "Review findings with suggested fixes before submission",
                    "Explainable recommendation and export preparation",
                  ].map((item) => (
                    <div key={item} className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-slate-200">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-subtle" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </SectionReveal>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
          <SectionReveal>
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-brand-subtle">The Problem</p>
              <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">Bids fail when the workflow is fragmented.</h2>
            </div>
          </SectionReveal>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {problemPoints.map((point, index) => {
              const Icon = point.icon;
              return (
                <SectionReveal key={point.title} delay={index * 0.08}>
                  <article className="h-full rounded-[1.8rem] border border-white/10 bg-white/[0.03] p-6">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-[#101522] text-brand-subtle">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-6 text-2xl font-semibold tracking-[-0.03em] text-white">{point.title}</h3>
                    <p className="mt-4 text-sm leading-7 text-slate-400">{point.description}</p>
                  </article>
                </SectionReveal>
              );
            })}
          </div>
        </section>

        <section id="product-tour" className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
          <SectionReveal>
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-brand-subtle">Product Tour</p>
              <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
                One system for the full bid lifecycle.
              </h2>
              <p className="mt-4 text-base leading-8 text-slate-300">
                Every module below supports the same workflow: discover opportunities, build the bid, review the submission, predict readiness,
                export the pack, and learn from outcomes.
              </p>
            </div>
          </SectionReveal>
          <div className="mt-12 grid gap-6 xl:grid-cols-2">
            {productEngines.map((engine, index) => {
              const Icon = engine.icon;
              return (
                <SectionReveal key={engine.id} delay={index * 0.06}>
                  <article className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-7">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-[#101522] text-brand-subtle">
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="mt-6 text-xs font-semibold uppercase tracking-[0.24em] text-brand-subtle">{engine.label}</p>
                    <h3 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">{engine.headline}</h3>
                    <p className="mt-4 text-sm leading-7 text-slate-300">{engine.description}</p>
                    <div className="mt-6 grid gap-4 md:grid-cols-2">
                      <div className="rounded-[1.4rem] border border-white/10 bg-[#0f1219] p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">What it supports</p>
                        <div className="mt-4 space-y-3">
                          {engine.bullets.map((bullet) => (
                            <div key={bullet} className="flex gap-3 text-sm text-slate-200">
                              <span className="mt-2 h-2 w-2 rounded-full bg-brand" />
                              <span>{bullet}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-[1.4rem] border border-white/10 bg-[#0f1219] p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">What teams get back</p>
                        <div className="mt-4 space-y-3">
                          {engine.outputs.map((output) => (
                            <div key={output} className="flex gap-3 text-sm text-slate-200">
                              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-subtle" />
                              <span>{output}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </article>
                </SectionReveal>
              );
            })}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
          <SectionReveal>
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-brand-subtle">How It Works</p>
              <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
                Move from opportunity to submission in a single flow.
              </h2>
            </div>
          </SectionReveal>
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {howItWorks.map((item, index) => {
              const Icon = item.icon;
              return (
                <SectionReveal key={item.step} delay={index * 0.08}>
                  <article className="h-full rounded-[1.9rem] border border-white/10 bg-white/[0.03] p-7">
                    <div className="flex items-center justify-between">
                      <span className="text-4xl font-semibold tracking-[-0.05em] text-white">{item.step}</span>
                      <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-[#101522] text-brand-subtle">
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
                    <h3 className="mt-8 text-2xl font-semibold tracking-[-0.03em] text-white">{item.title}</h3>
                    <p className="mt-4 text-sm leading-7 text-slate-400">{item.description}</p>
                  </article>
                </SectionReveal>
              );
            })}
          </div>
        </section>

        <section id="pricing" className="border-y border-white/8 bg-[rgba(255,255,255,0.02)]">
          <PricingBlock embedded />
        </section>

        <section className="mx-auto max-w-7xl px-5 py-24 lg:px-8">
          <SectionReveal>
            <div className="overflow-hidden rounded-[2.4rem] border border-white/10 bg-[linear-gradient(135deg,rgba(37,99,235,0.22),rgba(17,22,30,0.96)_44%,rgba(10,10,15,0.98))] px-8 py-12 shadow-[0_32px_120px_rgba(2,6,23,0.34)] sm:px-12">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-brand-subtle">Ready to start?</p>
              <h2 className="mt-4 max-w-2xl text-4xl font-semibold tracking-[-0.05em] text-white sm:text-5xl">
                Put every bid in one operating system.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-200">
                Start with opportunity qualification, connect the workspace to your knowledge base, and move through review and export with a
                single team workflow.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <MarketingButton href="/signup" trailingArrow>
                  Start 7-Day Free Trial
                </MarketingButton>
                <MarketingButton href="/features" variant="ghost">
                  Explore features
                </MarketingButton>
              </div>
            </div>
          </SectionReveal>
        </section>
      </main>
    </MarketingSiteShell>
  );
}

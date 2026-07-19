"use client";

import { ArrowRight, CheckCircle2 } from "lucide-react";
import { featurePillars, featureStories, productEngines } from "@/lib/marketing-content";
import { MarketingButton, SectionReveal } from "@/components/marketing/primitives";
import { MarketingSiteShell } from "@/components/marketing/site-shell";

export function MarketingFeaturesPage() {
  return (
    <MarketingSiteShell currentPath="/features">
      <main>
        <section className="mx-auto max-w-7xl px-5 pb-12 pt-24 lg:px-8 lg:pt-28">
          <SectionReveal>
            <div className="max-w-4xl">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-brand-subtle">Features</p>
              <h1 className="mt-4 text-5xl font-semibold tracking-[-0.06em] text-white sm:text-6xl">
                Every engine your pursuit team needs, in one operating system.
              </h1>
              <p className="mt-6 text-lg leading-8 text-slate-300">
                PursuitIQ connects opportunity intelligence, knowledge-backed drafting, consultant-grade review, predictive
                qualification, and outcome learning into a single platform.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <MarketingButton href="/signup" trailingArrow>
                  Start 7-Day Free Trial
                </MarketingButton>
                <MarketingButton href="/pricing" variant="ghost">
                  View Pricing
                </MarketingButton>
              </div>
            </div>
          </SectionReveal>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {featurePillars.map((pillar, index) => {
              const Icon = pillar.icon;
              return (
                <SectionReveal key={pillar.title} delay={index * 0.05}>
                  <article className="h-full rounded-[1.8rem] border border-white/10 bg-white/[0.03] p-6 transition duration-300 hover:-translate-y-1 hover:border-brand/20">
                    <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-[#101522] text-brand-subtle">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h2 className="mt-6 text-2xl font-semibold tracking-[-0.03em] text-white">{pillar.title}</h2>
                    <p className="mt-4 text-sm leading-7 text-slate-400">{pillar.description}</p>
                  </article>
                </SectionReveal>
              );
            })}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-24 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-3">
            {featureStories.map((story, index) => {
              const Icon = story.icon;
              return (
                <SectionReveal key={story.title} delay={index * 0.08}>
                  <article className="h-full rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(37,99,235,0.14),rgba(255,255,255,0.03))] p-7">
                    <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-subtle">{story.eyebrow}</p>
                    <div className="mt-6 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-[#101522] text-brand-subtle">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h2 className="mt-6 text-3xl font-semibold tracking-[-0.04em] text-white">{story.title}</h2>
                    <p className="mt-4 text-sm leading-7 text-slate-300">{story.copy}</p>
                  </article>
                </SectionReveal>
              );
            })}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-24 lg:px-8">
          <SectionReveal>
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-brand-subtle">Workflow Modules</p>
              <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
                A connected stack, not disconnected tools.
              </h2>
            </div>
          </SectionReveal>

          <div className="mt-12 grid gap-6">
            {productEngines.map((engine, index) => {
              const Icon = engine.icon;
              return (
                <SectionReveal key={engine.id} delay={index * 0.05}>
                  <article className="grid gap-6 rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 lg:grid-cols-[0.32fr_0.68fr] lg:p-8">
                    <div>
                      <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-[#101522] text-brand-subtle">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="mt-6 text-2xl font-semibold tracking-[-0.03em] text-white">{engine.label}</h3>
                      <p className="mt-4 text-sm leading-7 text-slate-400">{engine.description}</p>
                    </div>

                    <div className="grid gap-5 lg:grid-cols-[0.45fr_0.55fr]">
                      <div className="rounded-[1.4rem] border border-white/10 bg-[#0f1219] p-5">
                        <p className="text-sm font-medium text-white">What it delivers</p>
                        <div className="mt-4 space-y-3">
                          {engine.bullets.map((bullet) => (
                            <div key={bullet} className="flex gap-3 text-sm text-slate-300">
                              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-subtle" />
                              <span>{bullet}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-[1.4rem] border border-white/10 bg-[#0f1219] p-5">
                        <p className="text-sm font-medium text-white">What teams get back</p>
                        <div className="mt-4 grid gap-3">
                          {engine.outputs.map((output) => (
                            <div key={output} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                              <p className="text-sm text-slate-200">{output}</p>
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

        <section className="mx-auto max-w-7xl px-5 py-24 lg:px-8">
          <SectionReveal>
            <div className="overflow-hidden rounded-[2.2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(37,99,235,0.2),rgba(17,22,30,0.96)_48%,rgba(10,10,15,0.98))] p-8 sm:p-10">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-2xl">
                  <p className="text-sm font-semibold uppercase tracking-[0.28em] text-brand-subtle">Ready for a closer look?</p>
                  <h2 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-white sm:text-5xl">
                    See how PursuitIQ fits your team’s pursuit workflow.
                  </h2>
                </div>
                <MarketingButton href="/pricing" trailingArrow>
                  Compare Plans
                </MarketingButton>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {[
                  "Discover the right opportunities faster.",
                  "Generate better first drafts from your knowledge base.",
                  "Review and predict before you commit more effort.",
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

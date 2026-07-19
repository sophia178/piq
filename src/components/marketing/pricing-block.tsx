"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Minus, Plus } from "lucide-react";
import { faqs, pricingPlans } from "@/lib/marketing-content";
import { MarketingButton, SectionReveal } from "@/components/marketing/primitives";

export function PricingBlock({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const [openQuestion, setOpenQuestion] = useState(0);
  const reducedMotion = useReducedMotion();

  return (
    <div className={embedded ? "" : "mx-auto max-w-7xl px-5 py-24 lg:px-8"}>
      <SectionReveal className={embedded ? "" : "mb-12"}>
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-brand-subtle">Pricing</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
            Pricing that scales with your bid operation.
          </h2>
          <p className="mt-4 text-base leading-8 text-slate-300">
            Pricing reflects the current monthly plans. Enterprise rollout and tailored onboarding remain a separate sales conversation.
          </p>
        </div>
      </SectionReveal>

      <div className="grid gap-6 xl:grid-cols-4">
        {pricingPlans.map((plan, index) => {
          const price = "customPriceLabel" in plan ? plan.customPriceLabel : `£${plan.monthlyPrice}`;

          return (
            <SectionReveal key={plan.name} delay={index * 0.08}>
              <article
                className={`group relative h-full overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03] p-7 shadow-[0_18px_80px_rgba(2,6,23,0.22)] transition duration-300 hover:-translate-y-1 hover:border-brand/25 hover:bg-white/[0.05] ${
                  plan.highlight ? "border-brand/25 bg-[linear-gradient(180deg,rgba(37,99,235,0.16),rgba(255,255,255,0.03))]" : ""
                }`}
              >
                {plan.highlight ? (
                  <span className="inline-flex rounded-full border border-brand/20 bg-brand/12 px-3 py-1 text-xs font-medium text-brand-subtle">
                    {plan.highlight}
                  </span>
                ) : null}

                <div className="mt-5">
                  <h3 className="text-2xl font-semibold tracking-[-0.03em] text-white">{plan.name}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-400">{plan.description}</p>
                </div>

                <div className="mt-8">
                  <div className="flex items-end gap-2">
                    <span className="text-5xl font-semibold tracking-[-0.05em] text-white">{price}</span>
                    <span className="pb-1 text-sm text-slate-400">{plan.name === "Enterprise" ? "starting monthly" : "per month"}</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    {plan.name === "Enterprise" ? "For tailored rollout and governance requirements." : "Includes a 7-day free trial on checkout."}
                  </p>
                </div>

                <ul className="mt-8 space-y-4">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-3 text-sm leading-6 text-slate-200">
                      <span className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-brand/20 bg-brand/10 text-brand-subtle">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <MarketingButton href="/signup" variant={plan.highlight ? "primary" : "secondary"} className="mt-8 w-full">
                  {plan.cta}
                </MarketingButton>
              </article>
            </SectionReveal>
          );
        })}
      </div>

      <SectionReveal className="mt-16" delay={0.12}>
        <div id="faq" className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-7 sm:p-10">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-brand-subtle">FAQ</p>
            <h3 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-white">Questions procurement teams ask before rollout.</h3>
          </div>

          <div className="mt-10 grid gap-4">
            {faqs.map((item, index) => {
              const open = openQuestion === index;

              return (
                <div key={item.question} className="rounded-[1.5rem] border border-white/10 bg-[#0f1219]">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left"
                    onClick={() => setOpenQuestion(open ? -1 : index)}
                  >
                    <span className="text-base font-medium text-white">{item.question}</span>
                    {open ? <Minus className="h-4 w-4 text-brand-subtle" /> : <Plus className="h-4 w-4 text-slate-400" />}
                  </button>

                  <AnimatePresence initial={false}>
                    {open ? (
                      <motion.div
                        initial={reducedMotion ? false : { height: 0, opacity: 0 }}
                        animate={reducedMotion ? undefined : { height: "auto", opacity: 1 }}
                        exit={reducedMotion ? undefined : { height: 0, opacity: 0 }}
                        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden"
                      >
                        <p className="px-5 pb-5 text-sm leading-7 text-slate-300">{item.answer}</p>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </SectionReveal>
    </div>
  );
}

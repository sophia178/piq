"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Clock3, FileCheck2, ShieldAlert, Sparkles, Star, Upload } from "lucide-react";
import {
  companyBadges,
  heroSocialProof,
  heroTickerItems,
  howItWorks,
  marketStats,
  problemPoints,
  productEngines,
  sectorBadges,
  showcasePrediction,
  socialProofMetrics,
  testimonials,
} from "@/lib/marketing-content";
import { PricingBlock } from "@/components/marketing/pricing-block";
import {
  ActivityTicker,
  CountUp,
  CircularProgress,
  CursorGlow,
  DividerGlow,
  FloatingPanel,
  MarketingButton,
  NoiseOverlay,
  ParticleField,
  PursuitIQMark,
  SectionReveal,
  TabTransition,
  WordReveal,
} from "@/components/marketing/primitives";
import { MarketingSiteShell } from "@/components/marketing/site-shell";
import { cn } from "@/lib/utils";

function useHydrationSafeReducedMotion() {
  const reducedMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted ? reducedMotion : false;
}

function HeroBackground() {
  const reducedMotion = useHydrationSafeReducedMotion();

  return (
    <>
      <ParticleField />
      <NoiseOverlay className="opacity-[0.18]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:120px_120px] opacity-20" />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute left-[8%] top-[15%] h-40 w-40 rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(37,99,235,0.16),rgba(255,255,255,0.02))] blur-[1px]"
        animate={reducedMotion ? undefined : { y: [-10, 16, -10], rotate: [0, 6, 0] }}
        transition={{ duration: 13, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute right-[8%] top-[26%] h-24 w-24 rounded-full border border-white/10 bg-brand/10"
        animate={reducedMotion ? undefined : { y: [12, -14, 12], x: [-4, 8, -4] }}
        transition={{ duration: 10, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[18%] left-[20%] h-20 w-56 rounded-full bg-[radial-gradient(circle,rgba(37,99,235,0.2),transparent_70%)] blur-3xl"
        animate={reducedMotion ? undefined : { scale: [1, 1.12, 1] }}
        transition={{ duration: 9, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
      />
    </>
  );
}

function HeroMockup() {
  return (
    <FloatingPanel className="relative mx-auto w-full max-w-[720px]" depth={14}>
      <div className="absolute inset-x-10 bottom-4 h-28 rounded-full bg-brand/30 blur-3xl" />
      <div className="relative overflow-hidden rounded-[2.2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,18,25,0.98),rgba(11,14,20,0.98))] p-4 shadow-[0_40px_140px_rgba(2,6,23,0.5)]">
        <NoiseOverlay className="opacity-[0.1]" />
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] border border-white/8 bg-white/[0.03] px-4 py-3">
          <div className="flex items-center gap-3">
            <PursuitIQMark compact />
            <div className="hidden rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-xs text-slate-300 sm:inline-flex">
              Win Intelligence Platform
            </div>
          </div>
          <div className="rounded-full border border-brand/20 bg-brand/10 px-3 py-1 text-xs text-brand-subtle">Live opportunity board</div>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[1.12fr_0.88fr]">
          <div className="rounded-[1.8rem] border border-white/8 bg-[#0d1118] p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Qualified opportunity</p>
                <h3 className="mt-2 text-[1.55rem] font-semibold tracking-[-0.04em] text-white">NHS Digital Transformation Framework</h3>
                <p className="mt-2 text-sm text-slate-400">NHS Shared Business Services • £2.4M • Deadline 14 Aug 2026</p>
              </div>
              <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-medium text-emerald-200">
                BID recommended
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-[0.42fr_0.58fr]">
              <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-4">
                <CircularProgress value={74} size={148} label="Win probability" />
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {[
                    { label: "Strategic fit", value: "81%" },
                    { label: "Risk score", value: "29" },
                  ].map((metric) => (
                    <div key={metric.label} className="rounded-2xl border border-white/8 bg-[#0b0e15] px-3 py-3">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">{metric.label}</p>
                      <p className="mt-2 text-lg font-semibold text-white">{metric.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4">
                <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-white">Score breakdown</p>
                    <span className="text-xs text-slate-400">Updated live</span>
                  </div>
                  <div className="mt-4 space-y-4">
                    {[
                      { label: "Compliance confidence", value: 81 },
                      { label: "Delivery confidence", value: 76 },
                      { label: "Commercial confidence", value: 79 },
                    ].map((item) => (
                      <div key={item.label}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-300">{item.label}</span>
                          <span className="font-medium text-white">{item.value}%</span>
                        </div>
                        <div className="mt-2 rounded-full border border-white/8 bg-[#0a0d13] p-1">
                          <div className="h-2 rounded-full bg-[linear-gradient(90deg,#2563eb,#60a5fa)]" style={{ width: `${item.value}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-white">Latest review finding</p>
                    <span className="rounded-full border border-rose-400/20 bg-rose-400/10 px-2.5 py-1 text-[11px] text-rose-200">Critical</span>
                  </div>
                  <p className="mt-3 text-sm text-slate-200">Add quantified mobilisation outcomes to the implementation plan before final submission.</p>
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {[
                "Strong healthcare delivery history",
                "Knowledge coverage mapped to key requirements",
                "Review-led uplift available before submission",
              ].map((item) => (
                <div key={item} className="rounded-[1.3rem] border border-white/8 bg-white/[0.03] px-3 py-3 text-sm text-slate-200">
                  <div className="flex gap-3">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-subtle" />
                    <span>{item}</span>
                  </div>
                </div>
              ))}
            </div>
        </div>

          <div className="grid gap-4">
            <div className="rounded-[1.7rem] border border-white/8 bg-[#0d1118] p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Pursuit activity</p>
                <span className="text-xs text-slate-400">Last 15 minutes</span>
              </div>
              <div className="mt-4 space-y-3">
                {[
                  { label: "Bid / no-bid decision", value: "BID", tone: "emerald" },
                  { label: "Knowledge coverage refreshed", value: "84%", tone: "brand" },
                  { label: "Review finding raised", value: "Critical", tone: "rose" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between rounded-[1.2rem] border border-white/8 bg-white/[0.03] px-4 py-3">
                    <div>
                      <p className="text-sm text-white">{item.label}</p>
                      <p className="mt-1 text-xs text-slate-400">Workspace synced to Predict</p>
                    </div>
                    <span
                      className={cn(
                        "rounded-full px-3 py-1 text-xs",
                        item.tone === "emerald" && "border border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
                        item.tone === "brand" && "border border-brand/20 bg-brand/10 text-brand-subtle",
                        item.tone === "rose" && "border border-rose-400/20 bg-rose-400/10 text-rose-200",
                      )}
                    >
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[1.7rem] border border-white/8 bg-[#0d1118] p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Review queue</p>
                <span className="text-xs text-slate-400">Senior consultant view</span>
              </div>
              <div className="mt-4 space-y-3">
                {[
                  { label: "Social value section below benchmark", value: "High", icon: ShieldAlert },
                  { label: "No quantified outcomes in mobilisation plan", value: "Critical", icon: AlertTriangle },
                  { label: "Add local authority case study", value: "Medium", icon: Sparkles },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-3 rounded-[1.2rem] border border-white/8 bg-white/[0.03] px-4 py-3">
                    <div className="flex min-w-0 gap-3">
                      <item.icon className="mt-0.5 h-4 w-4 shrink-0 text-brand-subtle" />
                      <span className="text-sm text-slate-300">{item.label}</span>
                    </div>
                    <span className="rounded-full border border-white/10 bg-[#0b0e15] px-2.5 py-1 text-xs text-white">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </FloatingPanel>
  );
}

function DiscoverVisual() {
  return (
    <div className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
      <div className="space-y-4">
        <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Live feed</p>
          <div className="mt-4 space-y-3">
            {[
              ["NHS Regional Data Platform Modernisation", "86 fit", "£1.8M", "14 Aug"],
              ["Local Government Estates Decarbonisation", "84 fit", "£12M", "22 Aug"],
              ["Treasury AI Readiness Services", "73 fit", "£2.5M", "19 Aug"],
            ].map(([title, fit, value, deadline]) => (
              <div key={title} className="rounded-[1.1rem] border border-white/8 bg-[#0f1219] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">{title}</p>
                    <p className="mt-1 text-xs text-slate-400">Contracts Finder + TED Europe</p>
                  </div>
                  <span className="rounded-full border border-brand/20 bg-brand/10 px-2.5 py-1 text-[11px] text-brand-subtle">{fit}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-400">
                  <span>{value}</span>
                  <span>•</span>
                  <span>Deadline {deadline}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-4">
          <p className="text-sm font-medium text-white">Discovery metrics</p>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              ["142", "new matches"],
              ["38", "high fit"],
              ["24", "worth review"],
            ].map(([value, label]) => (
              <div key={label} className="rounded-2xl border border-white/8 bg-[#0b0e15] p-3">
                <p className="text-lg font-semibold text-white">{value}</p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-slate-500">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="rounded-[1.5rem] border border-white/8 bg-[#0f1219] p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-white">Opportunity board</p>
          <span className="text-xs text-slate-400">Updated 2m ago</span>
        </div>
        <div className="mt-4 space-y-3">
          {[
            ["NHS Regional Data Platform Modernisation", "Healthcare", "Bid immediately", "14 Aug"],
            ["Treasury AI Readiness Services", "IT Consulting", "Worth investigating", "19 Aug"],
            ["MoJ Estates Compliance Services", "Facilities", "Low probability", "28 Aug"],
          ].map(([title, sector, recommendation, deadline]) => (
            <div key={title} className="rounded-[1.2rem] border border-white/8 bg-white/[0.03] px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-white">{title}</p>
                  <p className="mt-1 text-xs text-slate-400">{sector} • Deadline {deadline}</p>
                </div>
                <span className="rounded-full border border-white/10 bg-[#0b0e15] px-2.5 py-1 text-[11px] text-slate-200">{recommendation}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DraftVisual() {
  return (
    <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
      <div className="rounded-[1.5rem] border border-white/8 bg-[#0f1219] p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-white">Draft workspace</p>
          <span className="text-xs text-slate-400">Knowledge-backed</span>
        </div>
        <div className="mt-4 space-y-3">
          {[
            ["Executive Summary", "7 evidence references", "Ready"],
            ["Technical Response", "4 requirements mapped", "Editing"],
            ["Methodology", "3 case studies inserted", "Updated"],
          ].map(([title, meta, status]) => (
            <div key={title} className="rounded-[1.2rem] border border-white/8 bg-white/[0.03] px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-white">{title}</p>
                  <p className="mt-1 text-xs text-slate-400">{meta}</p>
                </div>
                <span className="rounded-full border border-brand/20 bg-brand/10 px-2.5 py-1 text-[11px] text-brand-subtle">{status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-4">
        <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Knowledge usage</p>
          <div className="mt-4 grid gap-3 md:grid-cols-3 lg:grid-cols-1">
            {[
              ["Coverage", "84%"],
              ["Source docs", "17"],
              ["Draft speed", "6x"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-white/8 bg-[#0b0e15] p-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">{label}</p>
                <p className="mt-2 text-xl font-semibold text-white">{value}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-4">
          <p className="text-sm font-medium text-white">Evidence insertions</p>
          <div className="mt-4 space-y-3">
            {[
              "Healthcare case study inserted into Experience Response",
              "ISO 27001 certification mapped to compliance question",
              "Mobilisation methodology updated from previous winning bid",
            ].map((item) => (
              <div key={item} className="flex gap-3 rounded-[1.1rem] border border-white/8 bg-[#0b0e15] px-3 py-3 text-sm text-slate-300">
                <FileCheck2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-subtle" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReviewVisual() {
  return (
    <div className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
      <div className="space-y-4">
        <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-4">
          <p className="text-sm font-medium text-white">Finding severity</p>
          <div className="mt-4 space-y-3">
            {[
              ["No quantified outcomes in mobilisation plan", "Critical", "Add metrics from the Midlands rollout case study."],
              ["Social value section below benchmark", "High", "Insert local employment and skills commitments."],
              ["Differentiation weak in methodology", "Medium", "Strengthen transition and governance narrative."],
            ].map(([title, severity, suggestion]) => (
              <div key={title} className="rounded-[1.2rem] border border-white/8 bg-[#0f1219] p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium text-white">{title}</p>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px]",
                      severity === "Critical" && "border border-rose-400/20 bg-rose-400/10 text-rose-200",
                      severity === "High" && "border border-amber-400/20 bg-amber-400/10 text-amber-200",
                      severity === "Medium" && "border border-white/10 bg-[#0b0e15] text-slate-200",
                    )}
                  >
                    {severity}
                  </span>
                </div>
                <p className="mt-3 text-sm text-slate-400">{suggestion}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="rounded-[1.5rem] border border-white/8 bg-[#0f1219] p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-white">Section scores</p>
          <span className="text-xs text-slate-400">Consultant review</span>
        </div>
        <div className="mt-4 space-y-4">
          {[
            ["Executive Summary", 82],
            ["Technical Response", 71],
            ["Methodology", 79],
            ["Risk Management", 88],
          ].map(([label, value]) => (
            <div key={label}>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-300">{label}</span>
                <span className="font-medium text-white">{value}%</span>
              </div>
              <div className="mt-2 rounded-full border border-white/8 bg-[#0a0d13] p-1">
                <div className="h-2 rounded-full bg-[linear-gradient(90deg,#2563eb,#60a5fa)]" style={{ width: `${value}%` }} />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5 rounded-[1.2rem] border border-white/8 bg-white/[0.03] p-4">
          <p className="text-sm font-medium text-white">Improvement suggestion</p>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            Strengthen the mobilisation narrative with quantified outcomes, local authority delivery proof, and named delivery leads.
          </p>
        </div>
      </div>
    </div>
  );
}

function PredictVisual() {
  return (
    <div className="grid gap-4 lg:grid-cols-[0.45fr_0.55fr]">
      <div className="space-y-4">
        <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-4">
          <CircularProgress value={68} size={164} label="Win probability" />
          <div className="mt-4 flex items-center justify-between rounded-[1.2rem] border border-white/8 bg-[#0b0e15] px-4 py-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Recommendation</p>
              <p className="mt-1 text-lg font-semibold text-white">BID</p>
            </div>
            <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[11px] text-emerald-200">Strong fit</span>
          </div>
        </div>
        <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-4">
          <p className="text-sm font-medium text-white">Breakdown</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {[
              ["Strategic fit", "74%"],
              ["Risk", "31"],
              ["Compliance", "81%"],
              ["Delivery", "72%"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-[1.1rem] border border-white/8 bg-[#0b0e15] p-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">{label}</p>
                <p className="mt-2 text-lg font-semibold text-white">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="space-y-4">
        <div className="rounded-[1.5rem] border border-white/8 bg-[#0f1219] p-4">
          <p className="text-sm font-medium text-white">SWOT grid</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              ["Strength", "Strong healthcare delivery history"],
              ["Weakness", "Mobilisation proof needs quantified outcomes"],
              ["Opportunity", "Add local authority case study"],
              ["Risk", "Buyer may favour incumbent transition certainty"],
            ].map(([title, copy]) => (
              <div key={title} className="rounded-[1.1rem] border border-white/8 bg-white/[0.03] p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-brand-subtle">{title}</p>
                <p className="mt-2 text-sm text-slate-200">{copy}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function InsightsVisual() {
  return (
    <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
      <div className="rounded-[1.5rem] border border-white/8 bg-[#0f1219] p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-white">Learning loop</p>
          <span className="text-xs text-slate-400">Outcome-linked</span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          {[
            ["Accuracy", "81%"],
            ["Buyer lift", "+11%"],
            ["Learning loops", "247"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-[1.1rem] border border-white/8 bg-white/[0.03] p-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">{label}</p>
              <p className="mt-2 text-xl font-semibold text-white">{value}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-[1.5rem] border border-white/8 bg-[#0f1219] p-4">
        <p className="text-sm font-medium text-white">Performance by dimension</p>
        <div className="mt-4 space-y-4">
          {[
            ["NHS buyers", 76],
            ["Framework bids", 69],
            ["IT consulting", 64],
            ["Healthcare case-study usage", 83],
          ].map(([label, value]) => (
            <div key={label}>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-300">{label}</span>
                <span className="font-medium text-white">{value}%</span>
              </div>
              <div className="mt-2 rounded-full border border-white/8 bg-[#0a0d13] p-1">
                <div className="h-2 rounded-full bg-[linear-gradient(90deg,#2563eb,#60a5fa)]" style={{ width: `${value}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function KnowledgeVisual() {
  return (
    <div className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
      <div className="rounded-[1.5rem] border border-white/8 bg-[#0f1219] p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-white">Document library</p>
          <span className="text-xs text-slate-400">386 files indexed</span>
        </div>
        <div className="mt-4 space-y-3">
          {[
            ["Healthcare Case Studies", "High impact", "Used in 11 winning bids"],
            ["Cyber Security Policy", "Ready", "Mapped to ISO 27001"],
            ["Mobilisation CV Pack", "Gap", "Buyer-specific fit needed"],
          ].map(([title, status, meta]) => (
            <div key={title} className="rounded-[1.2rem] border border-white/8 bg-white/[0.03] px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-white">{title}</p>
                  <p className="mt-1 text-xs text-slate-400">{meta}</p>
                </div>
                <span className="rounded-full border border-white/10 bg-[#0b0e15] px-2.5 py-1 text-[11px] text-slate-200">{status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-4">
        <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-4">
          <p className="text-sm font-medium text-white">Coverage scores</p>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              ["Coverage", "84%"],
              ["Missing areas", "3"],
              ["Upload queue", "12"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-white/8 bg-[#0b0e15] p-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">{label}</p>
                <p className="mt-2 text-lg font-semibold text-white">{value}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-4">
          <p className="text-sm font-medium text-white">Upload recommendations</p>
          <div className="mt-4 space-y-3">
            {[
              "Upload a local authority decarbonisation case study.",
              "Add mobilisation-specific CVs for named transition leads.",
              "Include recent public sector social value evidence.",
            ].map((item) => (
              <div key={item} className="flex gap-3 rounded-[1.1rem] border border-white/8 bg-[#0b0e15] px-3 py-3 text-sm text-slate-300">
                <Upload className="mt-0.5 h-4 w-4 shrink-0 text-brand-subtle" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TourVisual({ engineId }: { engineId: string }) {
  const engine = productEngines.find((item) => item.id === engineId) ?? productEngines[0];

  const renderVisual = () => {
    if (engineId === "discover") return <DiscoverVisual />;
    if (engineId === "draft") return <DraftVisual />;
    if (engineId === "review") return <ReviewVisual />;
    if (engineId === "predict") return <PredictVisual />;
    if (engineId === "insights") return <InsightsVisual />;
    return <KnowledgeVisual />;
  };

  return (
    <div className="h-full overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(14,18,25,0.98),rgba(11,13,19,0.98))] shadow-[0_24px_120px_rgba(2,6,23,0.32)]">
      <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{engine.label}</p>
          <p className="mt-2 text-lg font-semibold text-white">{engine.headline}</p>
        </div>
        <div className="rounded-full border border-brand/20 bg-brand/10 px-3 py-1 text-xs text-brand-subtle">Live workflow</div>
      </div>

      <div className="grid gap-4 p-5 lg:grid-cols-[0.34fr_0.66fr]">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {engine.metrics.map((metric) => (
              <div key={metric.label} className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{metric.label}</p>
                <p className="mt-2 text-2xl font-semibold text-white">{metric.value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Why teams use it</p>
            <div className="mt-4 space-y-3">
              {engine.bullets.map((bullet) => (
                <div key={bullet} className="flex gap-3 text-sm text-slate-300">
                  <span className="mt-1 h-2 w-2 rounded-full bg-brand" />
                  <span>{bullet}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Operational signals</p>
            <div className="mt-4 grid gap-3">
              {engine.detailRows.map((row) => (
                <div key={row.label} className="flex items-center justify-between rounded-[1.1rem] border border-white/8 bg-[#0b0e15] px-4 py-3">
                  <span className="text-sm text-slate-300">{row.label}</span>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px]",
                      row.tone === "positive" && "border border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
                      row.tone === "warning" && "border border-amber-400/20 bg-amber-400/10 text-amber-200",
                      row.tone === "negative" && "border border-rose-400/20 bg-rose-400/10 text-rose-200",
                      row.tone === "neutral" && "border border-white/10 bg-white/[0.04] text-slate-200",
                    )}
                  >
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-white/8 bg-[#0f1219] p-4">{renderVisual()}</div>
      </div>
    </div>
  );
}

function ProductTour() {
  const [activeEngineIndex, setActiveEngineIndex] = useState<number>(0);
  const activeEngine = useMemo(() => productEngines[activeEngineIndex] ?? productEngines[0], [activeEngineIndex]);

  return (
    <section id="product-tour" className="mx-auto max-w-7xl px-5 py-24 lg:px-8">
      <SectionReveal>
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-brand-subtle">Product Tour</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
            One platform. Every stage of winning.
          </h2>
          <p className="mt-4 text-base leading-8 text-slate-300">
            From opportunity discovery to outcome learning, PursuitIQ brings every engine into one connected pursuit workflow.
          </p>
        </div>
      </SectionReveal>

      <div className="mt-12 grid gap-6 xl:grid-cols-[0.38fr_0.62fr] xl:items-stretch">
        <SectionReveal className="h-full">
          <div className="h-full rounded-[2rem] border border-white/10 bg-white/[0.03] p-3">
            <div className="grid gap-2">
              {productEngines.map((engine, index) => {
                const Icon = engine.icon;
                const active = engine.id === activeEngine.id;

                return (
                  <button
                    key={engine.id}
                    type="button"
                    onClick={() => setActiveEngineIndex(index)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-[1.4rem] border px-4 py-3 text-left transition",
                      active
                        ? "border-brand/20 bg-brand/10 shadow-[0_16px_40px_rgba(37,99,235,0.12)]"
                        : "border-white/0 hover:border-white/10 hover:bg-white/[0.04]",
                    )}
                  >
                    <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-[#101522] text-brand-subtle">
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-semibold text-white">{engine.label}</p>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 rounded-[1.6rem] border border-white/10 bg-[#0f1219] p-5">
              <TabTransition tabKey={activeEngine.id}>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-subtle">{activeEngine.label}</p>
                  <p className="mt-3 text-sm leading-6 text-slate-300">{activeEngine.description}</p>
                  <div className="mt-4 space-y-2 text-sm text-slate-200">
                    {activeEngine.bullets.slice(0, 3).map((bullet) => (
                      <div key={bullet} className="flex items-center gap-3">
                        <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                        <span>{bullet}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </TabTransition>
            </div>
          </div>
        </SectionReveal>

        <SectionReveal className="h-full" delay={0.08}>
          <div className="h-full">
            <TabTransition tabKey={activeEngine.id}>
              <TourVisual engineId={activeEngine.id} />
            </TabTransition>
          </div>
        </SectionReveal>
      </div>
    </section>
  );
}

function WorkflowLine() {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true, amount: 0.45 });
  const reducedMotion = useHydrationSafeReducedMotion();

  return (
    <div ref={ref} className="pointer-events-none absolute left-0 right-0 top-10 hidden h-px lg:block">
      <div className="mx-auto max-w-5xl">
        <motion.div
          className="h-px bg-[linear-gradient(90deg,transparent,rgba(37,99,235,0.45),transparent)]"
          initial={reducedMotion ? false : { scaleX: 0, opacity: 0.3 }}
          animate={reducedMotion ? undefined : { scaleX: inView ? 1 : 0, opacity: 1 }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          style={{ transformOrigin: "center" }}
        />
      </div>
    </div>
  );
}

function StepIllustration({ step }: { step: string }) {
  if (step === "01") {
    return (
      <div className="rounded-[1.2rem] border border-white/8 bg-[#0f1219] p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-white">Tender intake</span>
          <Upload className="h-4 w-4 text-brand-subtle" />
        </div>
        <div className="mt-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3 text-xs text-slate-300">
          NHS procurement notice pasted
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-400">
          <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">41 requirements</div>
          <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">7 mandatory docs</div>
        </div>
      </div>
    );
  }
  if (step === "02") {
    return (
      <div className="rounded-[1.2rem] border border-white/8 bg-[#0f1219] p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-white">Draft workspace</span>
          <Sparkles className="h-4 w-4 text-brand-subtle" />
        </div>
        <div className="mt-3 space-y-2">
          {["Executive Summary", "Technical Response", "Methodology"].map((item) => (
            <div key={item} className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-xs text-slate-300">
              {item}
            </div>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-[1.2rem] border border-white/8 bg-[#0f1219] p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-white">Review + Predict</span>
        <Clock3 className="h-4 w-4 text-brand-subtle" />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3 text-xs text-slate-300">Win 68%</div>
        <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-3 text-xs text-emerald-200">BID</div>
      </div>
      <div className="mt-2 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-xs text-slate-300">2 critical findings to resolve</div>
    </div>
  );
}

export function MarketingHomePage() {
  return (
    <MarketingSiteShell currentPath="/">
      <main>
        <section className="relative min-h-screen overflow-hidden">
          <HeroBackground />
          <CursorGlow />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(37,99,235,0.14),transparent_35%),radial-gradient(circle_at_50%_0%,rgba(96,165,250,0.14),transparent_38%)]" />
          <div className="relative mx-auto grid min-h-screen max-w-7xl items-center gap-16 px-5 pb-20 pt-24 lg:grid-cols-[0.48fr_0.52fr] lg:px-8">
            <div>
              <SectionReveal>
                <div className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs uppercase tracking-[0.22em] text-slate-300">
                  Win Intelligence Platform for Procurement Teams
                </div>
              </SectionReveal>

              <SectionReveal delay={0.08}>
                <WordReveal
                  text="Win more contracts with AI."
                  className="mt-6 text-5xl font-semibold leading-[0.95] tracking-[-0.06em] text-white sm:text-6xl lg:text-7xl"
                />
              </SectionReveal>

              <SectionReveal delay={0.12}>
                <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
                  PursuitIQ finds the right opportunities, writes your bids, reviews your submissions, and learns from every
                  result so your win rate improves with every tender.
                </p>
              </SectionReveal>

              <SectionReveal delay={0.16}>
                <div className="mt-9 flex flex-wrap gap-3">
                  <MarketingButton href="/signup" trailingArrow>
                    Start Free Trial
                  </MarketingButton>
                  <MarketingButton href="#product-tour" variant="ghost">
                    See How It Works
                  </MarketingButton>
                </div>
              </SectionReveal>

              <SectionReveal delay={0.2}>
                <p className="mt-6 text-sm text-slate-400">{heroSocialProof}</p>
              </SectionReveal>
              <SectionReveal delay={0.24}>
                <ActivityTicker items={heroTickerItems} />
              </SectionReveal>
            </div>

            <SectionReveal delay={0.14}>
              <HeroMockup />
            </SectionReveal>
          </div>
        </section>

        <DividerGlow />

        <section className="mx-auto max-w-7xl px-5 py-24 lg:px-8">
          <SectionReveal>
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-brand-subtle">The Problem</p>
              <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">Bidding is broken.</h2>
            </div>
          </SectionReveal>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {problemPoints.map((point, index) => {
              const Icon = point.icon;
              return (
                <SectionReveal key={point.title} delay={index * 0.08}>
                  <article className="group h-full rounded-[1.8rem] border border-white/10 bg-white/[0.03] p-6 transition duration-300 hover:-translate-y-1 hover:border-brand/20 hover:shadow-[0_24px_80px_rgba(2,6,23,0.26)]">
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

        <DividerGlow />

        <ProductTour />

        <DividerGlow />

        <section className="mx-auto max-w-7xl px-5 py-24 lg:px-8">
          <div className="relative overflow-hidden rounded-[2.4rem] border border-white/10 bg-[linear-gradient(180deg,rgba(17,22,30,0.98),rgba(11,13,19,0.98))] p-8 shadow-[0_28px_120px_rgba(2,6,23,0.34)] sm:p-10">
            <motion.div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-1/4 top-10 h-24 rounded-full bg-brand/20 blur-3xl"
              animate={{ opacity: [0.55, 0.95, 0.55] }}
              transition={{ duration: 3.2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
            />
            <div className="grid gap-8 lg:grid-cols-[0.44fr_0.56fr]">
              <SectionReveal>
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-brand-subtle">Predict Engine</p>
                <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">Know before you write.</h2>
                <p className="mt-5 max-w-xl text-base leading-8 text-slate-300">
                  PursuitIQ analyses every opportunity and tells you exactly whether to bid and why.
                </p>
              </SectionReveal>

              <SectionReveal delay={0.06}>
                <div className="rounded-[1.9rem] border border-white/10 bg-[#0f1219] p-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Live qualification card</p>
                      <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white">{showcasePrediction.title}</h3>
                      <p className="mt-2 text-sm text-slate-400">
                        {showcasePrediction.buyer} • {showcasePrediction.contractValue} • Deadline {showcasePrediction.deadline}
                      </p>
                    </div>
                    <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs text-emerald-200">
                      {showcasePrediction.recommendation}
                    </div>
                  </div>

                  <div className="mt-8 grid gap-5 lg:grid-cols-[0.44fr_0.56fr]">
                    <div className="rounded-[1.6rem] border border-white/10 bg-white/[0.03] p-5">
                      <CircularProgress value={showcasePrediction.probability} label="Win probability" />
                      <div className="mt-6 rounded-[1.3rem] border border-white/10 bg-white/[0.03] p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Risk Score</p>
                        <p className="mt-2 text-3xl font-semibold text-white">
                          <CountUp value={showcasePrediction.riskScore} />
                        </p>
                        <div className="mt-3 rounded-full border border-white/10 bg-[#0a0d13] p-1">
                          <div className="h-2 rounded-full bg-[linear-gradient(90deg,#f59e0b,#ef4444)]" style={{ width: `${showcasePrediction.riskScore}%` }} />
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4">
                      <div className="rounded-[1.6rem] border border-white/10 bg-white/[0.03] p-5">
                        <p className="text-sm font-medium text-white">Strengths</p>
                        <div className="mt-4 space-y-3">
                          {showcasePrediction.strengths.map((item) => (
                            <div key={item} className="flex gap-3 text-sm text-slate-200">
                              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-subtle" />
                              <span>{item}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-[1.6rem] border border-white/10 bg-white/[0.03] p-5">
                        <p className="text-sm font-medium text-white">Weaknesses</p>
                        <div className="mt-4 space-y-3">
                          {showcasePrediction.weaknesses.map((item) => (
                            <div key={item} className="flex gap-3 text-sm text-slate-200">
                              <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-amber-400" />
                              <span>{item}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </SectionReveal>
            </div>
          </div>
        </section>

        <DividerGlow />

        <section className="mx-auto max-w-7xl px-5 py-24 lg:px-8">
          <SectionReveal>
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-brand-subtle">How It Works</p>
              <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">A cleaner way to move from tender to submission.</h2>
            </div>
          </SectionReveal>

          <div className="relative mt-12">
            <WorkflowLine />
            <div className="grid gap-6 lg:grid-cols-3">
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
                    <div className="mt-6">
                      <StepIllustration step={item.step} />
                    </div>
                  </article>
                </SectionReveal>
              );
            })}
            </div>
          </div>
        </section>

        <DividerGlow />

        <section className="mx-auto max-w-7xl px-5 py-24 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[0.48fr_0.52fr]">
            <SectionReveal>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-brand-subtle">Market Context</p>
              <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
                Built for the teams winning public sector contracts.
              </h2>
              <div className="mt-8 flex flex-wrap gap-3">
                {sectorBadges.map((sector) => (
                  <span key={sector} className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-slate-200">
                    {sector}
                  </span>
                ))}
              </div>
            </SectionReveal>

            <div className="grid gap-4 sm:grid-cols-3">
              {marketStats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <SectionReveal key={stat.label} delay={index * 0.08}>
                    <article className="h-full rounded-[1.8rem] border border-white/10 bg-white/[0.03] p-6">
                      <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-[#101522] text-brand-subtle">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="mt-8 text-4xl font-semibold tracking-[-0.05em] text-white">
                        <CountUp value={stat.value} suffix={stat.suffix} />
                      </div>
                      <p className="mt-4 text-sm leading-7 text-slate-400">{stat.label}</p>
                    </article>
                  </SectionReveal>
                );
              })}
            </div>
          </div>
        </section>

        <DividerGlow />

        <section className="mx-auto max-w-7xl px-5 py-24 lg:px-8">
          <SectionReveal>
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-brand-subtle">Testimonials</p>
              <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
                Trusted by teams that treat bidding like a growth function.
              </h2>
            </div>
          </SectionReveal>

          <SectionReveal delay={0.04}>
            <div className="mt-8 flex flex-wrap gap-3">
              {companyBadges.map((badge) => (
                <span
                  key={badge}
                  className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-slate-300"
                >
                  {badge}
                </span>
              ))}
            </div>
          </SectionReveal>

          <SectionReveal delay={0.08}>
            <div className="mt-8 grid gap-4 rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 md:grid-cols-3">
              {socialProofMetrics.map((metric) => (
                <div key={metric.label} className="rounded-[1.4rem] border border-white/8 bg-[#0f1219] p-5">
                  <div className="text-4xl font-semibold tracking-[-0.05em] text-white">
                    <CountUp value={metric.value} prefix={"prefix" in metric ? metric.prefix : ""} suffix={metric.suffix} />
                  </div>
                  <p className="mt-3 text-sm leading-7 text-slate-400">{metric.label}</p>
                </div>
              ))}
            </div>
          </SectionReveal>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {testimonials.map((testimonial, index) => (
              <SectionReveal key={testimonial.name} delay={index * 0.08}>
                <article className="group h-full rounded-[1.8rem] border border-white/10 bg-white/[0.03] p-6 transition duration-300 hover:-translate-y-1 hover:border-brand/20 hover:shadow-[0_24px_80px_rgba(2,6,23,0.26)]">
                  <div className="flex items-center gap-3">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-[linear-gradient(180deg,rgba(37,99,235,0.2),rgba(255,255,255,0.03))] text-sm font-semibold text-white">
                      {testimonial.initials}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{testimonial.name}</p>
                      <p className="mt-1 inline-flex rounded-full border border-white/10 bg-[#0f1219] px-2.5 py-1 text-[11px] uppercase tracking-[0.16em] text-brand-subtle">
                        {testimonial.sector}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1 text-amber-300">
                    {Array.from({ length: testimonial.rating }).map((_, starIndex) => (
                      <Star key={starIndex} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <p className="mt-6 text-base leading-8 text-slate-200">&ldquo;{testimonial.quote}&rdquo;</p>
                  <div className="mt-8 border-t border-white/8 pt-5">
                    <p className="text-sm font-semibold text-white">{testimonial.role}</p>
                    <p className="mt-1 text-sm text-slate-400">{testimonial.sector}</p>
                  </div>
                </article>
              </SectionReveal>
            ))}
          </div>
        </section>

        <DividerGlow />

        <section id="pricing" className="border-y border-white/8 bg-[rgba(255,255,255,0.02)]">
          <PricingBlock embedded />
        </section>

        <section className="mx-auto max-w-7xl px-5 py-24 lg:px-8">
          <SectionReveal>
            <div className="overflow-hidden rounded-[2.4rem] border border-white/10 bg-[linear-gradient(135deg,rgba(37,99,235,0.22),rgba(17,22,30,0.96)_44%,rgba(10,10,15,0.98))] px-8 py-12 shadow-[0_32px_120px_rgba(2,6,23,0.34)] sm:px-12">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-brand-subtle">Ready to start?</p>
              <h2 className="mt-4 max-w-2xl text-4xl font-semibold tracking-[-0.05em] text-white sm:text-5xl">
                Your next contract win starts here.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-200">
                Join the teams using PursuitIQ to find, write, and win more tenders.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <MarketingButton href="/signup" trailingArrow>
                  Start Your Free Trial
                </MarketingButton>
                <p className="text-sm text-slate-300">No credit card required.</p>
              </div>
            </div>
          </SectionReveal>
        </section>
      </main>
    </MarketingSiteShell>
  );
}

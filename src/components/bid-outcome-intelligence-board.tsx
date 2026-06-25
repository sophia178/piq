"use client";

import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { BidOutcomeIntelligenceSnapshot, BidOutcomeStatus, TrackableBidRecord } from "@/lib/opportunities";
import { Badge, Button, Card, Input, Textarea } from "@/components/ui";
import { formatCurrency, formatPercent } from "@/lib/utils";

function makeBidKey(bid: TrackableBidRecord) {
  return `${bid.projectId ?? "none"}:${bid.opportunityId ?? "none"}`;
}

function formatStage(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(value?: string | null) {
  if (!value) return "Pending";
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(value));
}

interface OutcomeFormState {
  bidKey: string;
  outcome: BidOutcomeStatus;
  contractValue: string;
  competitorCount: string;
  sector: string;
  tenderType: string;
  outcomeSummary: string;
  decisionFactors: string;
}

export function BidOutcomeIntelligenceBoard({
  snapshot,
  organizationId,
}: {
  snapshot: BidOutcomeIntelligenceSnapshot;
  organizationId?: string;
}) {
  const router = useRouter();
  const bidOptions = snapshot.trackableBids;
  const bidMap = useMemo(() => new Map(bidOptions.map((bid) => [makeBidKey(bid), bid])), [bidOptions]);
  const [status, setStatus] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [form, setForm] = useState<OutcomeFormState>(() => {
    const firstBid = bidOptions[0];
    return {
      bidKey: firstBid ? makeBidKey(firstBid) : "",
      outcome: firstBid?.currentStage === "won" ? "won" : firstBid?.currentStage === "lost" ? "lost" : "submitted",
      contractValue: firstBid ? String(firstBid.contractValue) : "",
      competitorCount: "",
      sector: firstBid?.sector ?? "",
      tenderType: firstBid?.tenderType ?? "tender",
      outcomeSummary: "",
      decisionFactors: "",
    };
  });

  const selectedBid = form.bidKey ? bidMap.get(form.bidKey) : undefined;

  useEffect(() => {
    if (!selectedBid && bidOptions[0]) {
      const firstBid = bidOptions[0];
      setForm({
        bidKey: makeBidKey(firstBid),
        outcome: firstBid.currentStage === "won" ? "won" : firstBid.currentStage === "lost" ? "lost" : "submitted",
        contractValue: String(firstBid.contractValue),
        competitorCount: "",
        sector: firstBid.sector,
        tenderType: firstBid.tenderType,
        outcomeSummary: "",
        decisionFactors: "",
      });
    }
  }, [selectedBid, bidOptions]);

  function handleBidChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextBid = bidMap.get(event.target.value);
    setForm({
      bidKey: event.target.value,
      outcome: nextBid?.currentStage === "won" ? "won" : nextBid?.currentStage === "lost" ? "lost" : "submitted",
      contractValue: nextBid ? String(nextBid.contractValue) : "",
      competitorCount: "",
      sector: nextBid?.sector ?? "",
      tenderType: nextBid?.tenderType ?? "tender",
      outcomeSummary: "",
      decisionFactors: "",
    });
  }

  function updateField<K extends keyof OutcomeFormState>(field: K) {
    return (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm((current: OutcomeFormState) => ({ ...current, [field]: event.target.value }));
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organizationId || !selectedBid) return;

    setIsPending(true);
    setStatus("Saving bid outcome intelligence...");

    try {
      const response = await fetch("/api/opportunities/outcomes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          projectId: selectedBid.projectId ?? null,
          opportunityId: selectedBid.opportunityId ?? null,
          title: selectedBid.title,
          clientName: selectedBid.clientName,
          contractValue: Number(form.contractValue || 0),
          outcome: form.outcome,
          competitorCount: form.competitorCount ? Number(form.competitorCount) : null,
          sector: form.sector,
          tenderType: form.tenderType,
          outcomeSummary: form.outcomeSummary || null,
          decisionFactors: form.decisionFactors
            .split(",")
            .map((item: string) => item.trim())
            .filter(Boolean),
        }),
      });

      const payload = (await response.json()) as { error?: string };
      if (payload.error) throw new Error(payload.error);

      setStatus("Bid outcome saved.");
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save bid outcome.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Win Rate</p>
          <p className="mt-3 text-3xl font-semibold text-white">{formatPercent(snapshot.metrics.winRate)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Average Contract Value</p>
          <p className="mt-3 text-3xl font-semibold text-white">{formatCurrency(snapshot.metrics.averageContractValue)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Revenue Won</p>
          <p className="mt-3 text-3xl font-semibold text-white">{formatCurrency(snapshot.metrics.revenueWon)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Revenue Lost</p>
          <p className="mt-3 text-3xl font-semibold text-white">{formatCurrency(snapshot.metrics.revenueLost)}</p>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Track Outcomes</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Record bid results</h2>
          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            <select
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
              value={form.bidKey}
              onChange={handleBidChange}
              disabled={!organizationId || bidOptions.length === 0}
            >
              {bidOptions.length > 0 ? (
                bidOptions.map((bid) => (
                  <option key={makeBidKey(bid)} value={makeBidKey(bid)} className="bg-slate-950 text-white">
                    {bid.title}
                  </option>
                ))
              ) : (
                <option value="" className="bg-slate-950 text-white">
                  No tracked bids available
                </option>
              )}
            </select>
            <div className="grid gap-3 md:grid-cols-2">
              <select
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
                value={form.outcome}
                onChange={updateField("outcome")}
                disabled={!organizationId}
              >
                <option value="submitted" className="bg-slate-950 text-white">
                  Submitted
                </option>
                <option value="won" className="bg-slate-950 text-white">
                  Won
                </option>
                <option value="shortlisted" className="bg-slate-950 text-white">
                  Shortlisted
                </option>
                <option value="lost" className="bg-slate-950 text-white">
                  Lost
                </option>
                <option value="rejected" className="bg-slate-950 text-white">
                  Rejected
                </option>
              </select>
              <Input placeholder="Contract value" inputMode="decimal" value={form.contractValue} onChange={updateField("contractValue")} disabled={!organizationId} />
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <Input placeholder="Competitor count" inputMode="numeric" value={form.competitorCount} onChange={updateField("competitorCount")} disabled={!organizationId} />
              <Input placeholder="Sector" value={form.sector} onChange={updateField("sector")} disabled={!organizationId} />
              <Input placeholder="Tender type" value={form.tenderType} onChange={updateField("tenderType")} disabled={!organizationId} />
            </div>
            <Textarea placeholder="Outcome summary" value={form.outcomeSummary} onChange={updateField("outcomeSummary")} disabled={!organizationId} />
            <Input
              placeholder="Decision factors, comma separated"
              value={form.decisionFactors}
              onChange={updateField("decisionFactors")}
              disabled={!organizationId}
            />
            <Button type="submit" disabled={isPending || !organizationId || !selectedBid}>
              Save outcome
            </Button>
          </form>
          {selectedBid ? (
            <p className="mt-4 text-sm text-slate-300">
              {selectedBid.clientName} • {formatStage(selectedBid.currentStage)} • {formatCurrency(selectedBid.contractValue)}
            </p>
          ) : null}
          {status ? <p className="mt-3 text-sm text-teal-200">{status}</p> : null}
          {!organizationId ? <p className="mt-3 text-xs text-amber-200">Demo mode shows outcome intelligence but does not persist changes.</p> : null}
        </Card>

        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Outcome Funnel</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Submitted, shortlisted, won, rejected, lost</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-5">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Submitted</p>
              <p className="mt-2 text-2xl font-semibold text-white">{snapshot.metrics.submitted}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Shortlisted</p>
              <p className="mt-2 text-2xl font-semibold text-white">{snapshot.metrics.shortlisted}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Won</p>
              <p className="mt-2 text-2xl font-semibold text-white">{snapshot.metrics.won}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Rejected</p>
              <p className="mt-2 text-2xl font-semibold text-white">{snapshot.metrics.rejected}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Lost</p>
              <p className="mt-2 text-2xl font-semibold text-white">{snapshot.metrics.lost}</p>
            </div>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-sm font-semibold text-white">Why bids are won</p>
              <div className="mt-3 space-y-3">
                {snapshot.insights.whyWon.map((item) => (
                  <p key={item} className="text-sm text-slate-300">
                    {item}
                  </p>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-sm font-semibold text-white">Why bids are lost</p>
              <div className="mt-3 space-y-3">
                {snapshot.insights.whyLost.map((item) => (
                  <p key={item} className="text-sm text-slate-300">
                    {item}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Patterns By Sector</p>
          <div className="mt-5 space-y-4">
            {snapshot.sectorPatterns.length > 0 ? (
              snapshot.sectorPatterns.map((pattern) => (
                <div key={pattern.label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-white">{pattern.label}</p>
                    <Badge className="bg-emerald-500/10 text-emerald-200">{pattern.winRate}% win rate</Badge>
                  </div>
                  <p className="mt-2 text-sm text-slate-300">
                    {pattern.bids} decided bids • Avg value {formatCurrency(pattern.averageContractValue)}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    Revenue won {formatCurrency(pattern.revenueWon)} • Revenue lost {formatCurrency(pattern.revenueLost)}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-300">Sector patterns appear here once bids are marked won or lost.</p>
            )}
          </div>
          <div className="mt-5 space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            {snapshot.insights.patternsBySector.map((item) => (
              <p key={item} className="text-sm text-slate-300">
                {item}
              </p>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Patterns By Client</p>
          <div className="mt-5 space-y-4">
            {snapshot.clientPatterns.length > 0 ? (
              snapshot.clientPatterns.map((pattern) => (
                <div key={pattern.label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-white">{pattern.label}</p>
                    <Badge className="bg-sky-500/10 text-sky-200">{pattern.winRate}% win rate</Badge>
                  </div>
                  <p className="mt-2 text-sm text-slate-300">
                    {pattern.wins} wins • {pattern.losses} losses • Avg value {formatCurrency(pattern.averageContractValue)}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-300">Client patterns appear here once you have enough historical outcomes.</p>
            )}
          </div>
          <div className="mt-5 space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            {snapshot.insights.patternsByClient.map((item) => (
              <p key={item} className="text-sm text-slate-300">
                {item}
              </p>
            ))}
          </div>
        </Card>
      </section>

      <section>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Recent Outcomes</p>
          <div className="mt-5 space-y-4">
            {snapshot.recentOutcomes.length > 0 ? (
              snapshot.recentOutcomes.map((outcome) => (
                <div key={outcome.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">{outcome.title}</p>
                      <p className="mt-1 text-sm text-slate-400">
                        {outcome.clientName} • {outcome.sector} • {outcome.tenderType}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge
                        className={
                          outcome.outcome === "won"
                            ? "bg-emerald-500/10 text-emerald-200"
                            : outcome.outcome === "shortlisted"
                              ? "bg-sky-500/10 text-sky-200"
                              : outcome.outcome === "lost" || outcome.outcome === "rejected"
                                ? "bg-rose-500/10 text-rose-200"
                                : "bg-white/8"
                        }
                      >
                        {formatStage(outcome.outcome)}
                      </Badge>
                      <Badge>{formatCurrency(outcome.contractValue)}</Badge>
                      {typeof outcome.competitorCount === "number" ? <Badge>{outcome.competitorCount} competitors</Badge> : null}
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-slate-300">{outcome.outcomeSummary ?? "No outcome summary captured yet."}</p>
                  {outcome.decisionFactors.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {outcome.decisionFactors.map((factor) => (
                        <Badge key={factor}>{factor}</Badge>
                      ))}
                    </div>
                  ) : null}
                  <p className="mt-3 text-xs text-slate-500">
                    Submitted {formatDate(outcome.submittedAt)} • Decision {formatDate(outcome.decidedAt)}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-300">No bid outcomes recorded yet. Mark submitted, shortlisted, won, rejected, or lost bids to start the learning loop.</p>
            )}
          </div>
        </Card>
      </section>
    </div>
  );
}

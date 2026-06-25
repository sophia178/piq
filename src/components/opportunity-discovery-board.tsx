"use client";

import { useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import type { DiscoverySnapshot, OpportunityAlertRule, OpportunityPipelineStage, OpportunityRecommendation, OpportunityRevenueView } from "@/lib/opportunities";
import { Badge, Button, Card, Input } from "@/components/ui";
import { formatCurrency, formatPercent } from "@/lib/utils";

function parseList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatDate(value?: string | null) {
  if (!value) return "TBC";
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(value));
}

function formatRecommendation(value?: OpportunityRecommendation) {
  if (!value) return "Review";
  return value
    .split("_")
    .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatPredictRecommendation(value?: string) {
  if (!value) return "Qualification Pending";
  return value
    .split("_")
    .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatStage(value?: OpportunityPipelineStage) {
  if (!value) return "Opportunity";
  return value
    .split("_")
    .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function OpportunityCard({
  opportunity,
  onSave,
  onDismiss,
  onImport,
  onAdvanceStage,
  isBusy,
}: {
  opportunity: OpportunityRevenueView;
  onSave: (matchId: string) => Promise<void>;
  onDismiss: (matchId: string) => Promise<void>;
  onImport: (opportunityId: string, matchId?: string) => Promise<void>;
  onAdvanceStage: (opportunityId: string, stage: "bid_created" | "submitted" | "won" | "lost") => Promise<void>;
  isBusy: boolean;
}) {
  const match = opportunity.match;
  const roi = opportunity.roi;
  const priority = opportunity.priority;
  const pipeline = opportunity.pipeline;
  const prediction = opportunity.prediction;
  const currentStage = pipeline?.currentStage ?? "opportunity";
  const recommendationTone =
    roi?.recommendation === "bid_immediately"
      ? "bg-emerald-500/10 text-emerald-200"
      : roi?.recommendation === "worth_investigating"
        ? "bg-sky-500/10 text-sky-200"
        : roi?.recommendation === "low_probability"
          ? "bg-amber-500/10 text-amber-200"
          : "bg-rose-500/10 text-rose-200";

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-base font-semibold text-white">{opportunity.title}</p>
          <p className="mt-2 text-sm text-slate-400">
            {opportunity.buyerName} • {opportunity.sourceNames.join(", ")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge>{opportunity.sourceKey.replace(/_/g, " ")}</Badge>
          {match ? <Badge className="bg-emerald-500/10 text-emerald-200">{match.combinedScore} score</Badge> : null}
          {roi ? <Badge className={recommendationTone}>{formatRecommendation(roi.recommendation)}</Badge> : null}
          {priority ? <Badge className="bg-white/8">{priority.priorityBand}</Badge> : null}
          <Badge className="bg-white/8">{formatStage(currentStage)}</Badge>
        </div>
      </div>

      <p className="mt-3 text-sm leading-7 text-slate-300">{opportunity.aiSummary ?? opportunity.description}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {opportunity.locations.slice(0, 3).map((location) => (
          <Badge key={location}>{location}</Badge>
        ))}
        {opportunity.industryTags.slice(0, 2).map((industry) => (
          <Badge key={industry}>{industry}</Badge>
        ))}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-5">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Value</p>
          <p className="mt-1 text-sm text-white">{formatCurrency(roi?.estimatedContractValue ?? opportunity.estimatedValue, opportunity.currency)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Win Probability</p>
          <p className="mt-1 text-sm text-white">{formatPercent(roi?.expectedWinProbability ?? match?.winProbability ?? 0)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Expected Revenue</p>
          <p className="mt-1 text-sm text-white">{formatCurrency(roi?.expectedRevenue ?? match?.revenuePotential, opportunity.currency)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Bid Effort</p>
          <p className="mt-1 text-sm text-white">{roi?.bidEffortScore ?? "N/A"}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">ROI Score</p>
          <p className="mt-1 text-sm text-white">{roi?.roiScore ?? "N/A"}</p>
        </div>
      </div>

      {prediction ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/30 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Predict Engine</p>
              <p className="mt-2 text-sm font-semibold text-white">
                {formatPredictRecommendation(prediction.latestPrediction.recommendation)}
              </p>
              <p className="mt-2 text-sm text-slate-300">{prediction.latestPrediction.strategistSummary}</p>
            </div>
            <div className="grid gap-2 text-sm text-slate-200">
              <p>Win {prediction.latestPrediction.winProbability}%</p>
              <p>Fit {prediction.latestPrediction.strategicFitScore}%</p>
              <p>Risk {prediction.latestPrediction.riskScore}%</p>
            </div>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Top Strengths</p>
              <p className="mt-2 text-sm text-slate-300">
                {prediction.topStrengths.length > 0
                  ? prediction.topStrengths.map((factor) => factor.title).join(", ")
                  : "No major strengths surfaced yet."}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Top Risks</p>
              <p className="mt-2 text-sm text-slate-300">
                {[...prediction.topRisks, ...prediction.topWeaknesses].length > 0
                  ? [...prediction.topRisks, ...prediction.topWeaknesses]
                      .slice(0, 2)
                      .map((factor) => factor.title)
                      .join(", ")
                  : "No major risks surfaced yet."}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-4 grid gap-2">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Deadline</p>
        <p className="text-sm text-white">{formatDate(opportunity.submissionDeadline)}</p>
        {match?.rationale ? <p className="text-sm text-teal-100">{match.rationale}</p> : null}
        {roi?.justification ? <p className="text-sm text-slate-300">{roi.justification}</p> : null}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {match?.id ? (
            <>
              <Button variant="secondary" onClick={() => onSave(match.id)} disabled={isBusy}>
                Save
              </Button>
              <Button variant="ghost" onClick={() => onDismiss(match.id)} disabled={isBusy}>
                Dismiss
              </Button>
            </>
          ) : null}
          {!pipeline?.projectId ? (
            <Button onClick={() => onImport(opportunity.id, match?.id)} disabled={isBusy}>
              Import to Workspace
            </Button>
          ) : null}
          {pipeline?.projectId && !pipeline.submittedAt ? (
            <Button variant="secondary" onClick={() => onAdvanceStage(opportunity.id, "submitted")} disabled={isBusy}>
              Mark Submitted
            </Button>
          ) : null}
          {pipeline?.submittedAt && !pipeline.wonAt && !pipeline.lostAt ? (
            <>
              <Button variant="secondary" onClick={() => onAdvanceStage(opportunity.id, "won")} disabled={isBusy}>
                Mark Won
              </Button>
              <Button variant="ghost" onClick={() => onAdvanceStage(opportunity.id, "lost")} disabled={isBusy}>
                Mark Lost
              </Button>
            </>
          ) : null}
          {currentStage === "imported" && !pipeline?.bidCreatedAt ? (
            <Button variant="secondary" onClick={() => onAdvanceStage(opportunity.id, "bid_created")} disabled={isBusy}>
              Mark Bid Created
            </Button>
          ) : null}
        </div>
        {opportunity.sourceUrl ? (
          <a
            href={opportunity.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-teal-200 transition hover:text-teal-100"
          >
            Open notice
          </a>
        ) : null}
      </div>
    </div>
  );
}

export function OpportunityDiscoveryBoard({
  initialSnapshot,
  organizationId,
}: {
  initialSnapshot: DiscoverySnapshot;
  organizationId?: string;
}) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [status, setStatus] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [alertForm, setAlertForm] = useState<{
    name: string;
    keywords: string;
    industries: string;
    locations: string;
    minimumContractValue: string;
    maximumContractValue: string;
  }>({
    name: "",
    keywords: "",
    industries: "",
    locations: "",
    minimumContractValue: "",
    maximumContractValue: "",
  });

  const alertSummary = useMemo(
    (): Array<OpportunityAlertRule & { keywordSummary: string }> =>
      snapshot.alerts.map((alert: OpportunityAlertRule) => ({
        ...alert,
        keywordSummary: alert.keywords.slice(0, 4).join(", "),
      })),
    [snapshot.alerts],
  );

  const revenueSections = useMemo(
    () => [
      {
        title: "Best Opportunities",
        subtitle: "Highest priority bid targets",
        opportunities: snapshot.bestOpportunities,
        empty: "No best opportunities yet. Run a scan to generate revenue rankings.",
      },
      {
        title: "Highest ROI",
        subtitle: "Best commercial return",
        opportunities: snapshot.highestRoiOpportunities,
        empty: "ROI rankings appear here after revenue scoring runs.",
      },
      {
        title: "Quick Wins",
        subtitle: "High probability with lower bid effort",
        opportunities: snapshot.quickWins,
        empty: "Quick wins appear when win probability stays high and effort remains low.",
      },
      {
        title: "High Value Opportunities",
        subtitle: "Largest contract upside",
        opportunities: snapshot.highValueOpportunities,
        empty: "High-value notices will show up here once opportunities are scored.",
      },
    ],
    [snapshot.bestOpportunities, snapshot.highestRoiOpportunities, snapshot.highValueOpportunities, snapshot.quickWins],
  );

  function updateAlertField(field: keyof typeof alertForm) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      setAlertForm((current: typeof alertForm) => ({
        ...current,
        [field]: event.target.value,
      }));
    };
  }

  async function refreshSnapshot() {
    const query = organizationId ? `?organizationId=${encodeURIComponent(organizationId)}` : "";
    const response = await fetch(`/api/opportunities/snapshot${query}`);
    const payload = (await response.json()) as DiscoverySnapshot | { error?: string };
    if ("metrics" in payload) {
      setSnapshot(payload);
      return;
    }

    throw new Error(payload.error ?? "Unable to refresh opportunity discovery snapshot.");
  }

  async function runScan() {
    setIsBusy(true);
    setStatus("Scanning Contracts Finder, Find a Tender, TED Europe, and SAM.gov...");
    try {
      const response = await fetch("/api/opportunities/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId, lookbackHours: 24 }),
      });
      const payload = (await response.json()) as { error?: string };
      if (payload.error) throw new Error(payload.error);
      await refreshSnapshot();
      setStatus("Opportunity scan completed.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to run opportunity scan.");
    } finally {
      setIsBusy(false);
    }
  }

  async function createAlert() {
    setIsBusy(true);
    setStatus("Saving opportunity alert...");
    try {
      const response = await fetch("/api/opportunities/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          name: alertForm.name,
          keywords: parseList(alertForm.keywords),
          industries: parseList(alertForm.industries),
          locations: parseList(alertForm.locations),
          minimumContractValue: alertForm.minimumContractValue ? Number(alertForm.minimumContractValue) : null,
          maximumContractValue: alertForm.maximumContractValue ? Number(alertForm.maximumContractValue) : null,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (payload.error) throw new Error(payload.error);
      setAlertForm({
        name: "",
        keywords: "",
        industries: "",
        locations: "",
        minimumContractValue: "",
        maximumContractValue: "",
      });
      await refreshSnapshot();
      setStatus("Opportunity alert saved.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save opportunity alert.");
    } finally {
      setIsBusy(false);
    }
  }

  async function updateMatch(matchId: string, statusValue: "saved" | "dismissed") {
    setIsBusy(true);
    setStatus(statusValue === "saved" ? "Saving opportunity..." : "Dismissing opportunity...");
    try {
      const response = await fetch("/api/opportunities/matches", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId, matchId, status: statusValue }),
      });
      const payload = (await response.json()) as { error?: string };
      if (payload.error) throw new Error(payload.error);
      await refreshSnapshot();
      setStatus(statusValue === "saved" ? "Opportunity saved." : "Opportunity dismissed.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to update opportunity.");
    } finally {
      setIsBusy(false);
    }
  }

  async function importToWorkspace(opportunityId: string, matchId?: string) {
    setIsBusy(true);
    setStatus("Importing opportunity into Bid Workspace...");
    try {
      const response = await fetch("/api/opportunities/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId, opportunityId, matchId }),
      });
      const payload = (await response.json()) as { error?: string; projectId?: string; projectTitle?: string };
      if (payload.error) throw new Error(payload.error);
      await refreshSnapshot();
      setStatus(`Imported to workspace project ${payload.projectTitle ?? payload.projectId}.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to import opportunity.");
    } finally {
      setIsBusy(false);
    }
  }

  async function updatePipeline(opportunityId: string, stage: "bid_created" | "submitted" | "won" | "lost") {
    setIsBusy(true);
    setStatus(`Updating pipeline to ${formatStage(stage)}...`);
    try {
      const selectedOpportunity =
        snapshot.bestOpportunities.find((item: OpportunityRevenueView) => item.id === opportunityId) ??
        snapshot.highestRoiOpportunities.find((item: OpportunityRevenueView) => item.id === opportunityId) ??
        snapshot.quickWins.find((item: OpportunityRevenueView) => item.id === opportunityId) ??
        snapshot.highValueOpportunities.find((item: OpportunityRevenueView) => item.id === opportunityId) ??
        snapshot.newOpportunities.find((item: OpportunityRevenueView) => item.id === opportunityId) ??
        snapshot.savedOpportunities.find((item: OpportunityRevenueView) => item.id === opportunityId) ??
        snapshot.highMatchOpportunities.find((item: OpportunityRevenueView) => item.id === opportunityId);

      const response = await fetch("/api/opportunities/pipeline", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          opportunityId,
          projectId: selectedOpportunity?.pipeline?.projectId ?? null,
          stage,
          contractValueWon:
            stage === "won" ? selectedOpportunity?.roi?.estimatedContractValue ?? selectedOpportunity?.estimatedValue ?? null : null,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (payload.error) throw new Error(payload.error);
      await refreshSnapshot();
      setStatus(`Pipeline updated to ${formatStage(stage)}.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to update pipeline stage.");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Discovery alerts</p>
              <h2 className="mt-2 text-xl font-semibold text-white">Buyer and contract filters</h2>
            </div>
            <Button onClick={runScan} disabled={isBusy}>
              Run scan
            </Button>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <Input
              placeholder="Alert name"
              value={alertForm.name}
              onChange={updateAlertField("name")}
            />
            <Input
              placeholder="Keywords: cloud, data platform"
              value={alertForm.keywords}
              onChange={updateAlertField("keywords")}
            />
            <Input
              placeholder="Industries: healthcare, software"
              value={alertForm.industries}
              onChange={updateAlertField("industries")}
            />
            <Input
              placeholder="Locations: London, UK"
              value={alertForm.locations}
              onChange={updateAlertField("locations")}
            />
            <Input
              placeholder="Minimum value"
              inputMode="numeric"
              value={alertForm.minimumContractValue}
              onChange={updateAlertField("minimumContractValue")}
            />
            <Input
              placeholder="Maximum value"
              inputMode="numeric"
              value={alertForm.maximumContractValue}
              onChange={updateAlertField("maximumContractValue")}
            />
          </div>

          <div className="mt-4">
            <Button onClick={createAlert} disabled={isBusy || !alertForm.name || !alertForm.keywords}>
              Save alert
            </Button>
          </div>
        </Card>

        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Active alerts</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Current matching profiles</h2>
          <div className="mt-5 space-y-4">
            {alertSummary.length > 0 ? (
              alertSummary.map((alert: OpportunityAlertRule & { keywordSummary: string }) => (
                <div key={alert.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-white">{alert.name}</p>
                    <Badge className="bg-white/8">{alert.keywords.length} keywords</Badge>
                  </div>
                  <p className="mt-2 text-sm text-slate-300">{alert.keywordSummary || "No keywords configured."}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    Locations: {alert.locations.join(", ") || "Any"} • Industries: {alert.industries.join(", ") || "Any"}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-300">Create your first alert to match procurement opportunities against your target sectors and locations.</p>
            )}
          </div>
          {status ? <p className="mt-4 text-sm text-teal-200">{status}</p> : null}
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">New Opportunities</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Freshly matched notices</h2>
          <div className="mt-5 space-y-4">
            {snapshot.newOpportunities.length > 0 ? (
              snapshot.newOpportunities.map((opportunity: OpportunityRevenueView) => (
                <OpportunityCard
                  key={opportunity.id}
                  opportunity={opportunity}
                  onSave={(matchId) => updateMatch(matchId, "saved")}
                  onDismiss={(matchId) => updateMatch(matchId, "dismissed")}
                  onImport={importToWorkspace}
                  onAdvanceStage={updatePipeline}
                  isBusy={isBusy}
                />
              ))
            ) : (
              <p className="text-sm text-slate-300">No new opportunities yet. Run a scan to ingest the latest notices.</p>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Saved Opportunities</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Shortlisted for pursuit</h2>
          <div className="mt-5 space-y-4">
            {snapshot.savedOpportunities.length > 0 ? (
              snapshot.savedOpportunities.map((opportunity: OpportunityRevenueView) => (
                <OpportunityCard
                  key={opportunity.id}
                  opportunity={opportunity}
                  onSave={(matchId) => updateMatch(matchId, "saved")}
                  onDismiss={(matchId) => updateMatch(matchId, "dismissed")}
                  onImport={importToWorkspace}
                  onAdvanceStage={updatePipeline}
                  isBusy={isBusy}
                />
              ))
            ) : (
              <p className="text-sm text-slate-300">Saved opportunities appear here after triage.</p>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">High Match Opportunities</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Highest priority opportunities</h2>
          <div className="mt-5 space-y-4">
            {snapshot.highMatchOpportunities.length > 0 ? (
              snapshot.highMatchOpportunities.map((opportunity: OpportunityRevenueView) => (
                <OpportunityCard
                  key={opportunity.id}
                  opportunity={opportunity}
                  onSave={(matchId) => updateMatch(matchId, "saved")}
                  onDismiss={(matchId) => updateMatch(matchId, "dismissed")}
                  onImport={importToWorkspace}
                  onAdvanceStage={updatePipeline}
                  isBusy={isBusy}
                />
              ))
            ) : (
              <p className="text-sm text-slate-300">High-fit opportunities show up here when combined score crosses the priority threshold.</p>
            )}
          </div>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        {revenueSections.map((section) => (
          <Card key={section.title} className="p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{section.title}</p>
            <h2 className="mt-2 text-xl font-semibold text-white">{section.subtitle}</h2>
            <div className="mt-5 space-y-4">
              {section.opportunities.length > 0 ? (
                section.opportunities.map((opportunity: OpportunityRevenueView) => (
                  <OpportunityCard
                    key={`${section.title}-${opportunity.id}`}
                    opportunity={opportunity}
                    onSave={(matchId) => updateMatch(matchId, "saved")}
                    onDismiss={(matchId) => updateMatch(matchId, "dismissed")}
                    onImport={importToWorkspace}
                    onAdvanceStage={updatePipeline}
                    isBusy={isBusy}
                  />
                ))
              ) : (
                <p className="text-sm text-slate-300">{section.empty}</p>
              )}
            </div>
          </Card>
        ))}
      </section>
    </div>
  );
}

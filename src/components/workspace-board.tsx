"use client";

import { useMemo, useState, useTransition } from "react";
import type { ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import type { BidReviewSnapshot } from "@/lib/bid-review";
import type { BidReadinessState, BidSectionKey, BidSectionRecord, BidTaskRecord, BidWorkspaceSnapshot } from "@/lib/bid-workspace";
import type { PredictionFactorRecord, PredictionHistoryRecord } from "@/lib/predict";
import { Badge, Button, Card, Textarea } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";

function formatReadinessState(value: BidReadinessState) {
  return value
    .split("_")
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
    .join(" ");
}

function formatSectionKey(value: BidSectionKey) {
  return value
    .split("_")
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
    .join(" ");
}

function formatDate(value?: string | null) {
  if (!value) return "TBC";
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(value));
}

function formatReviewReadiness(value: string) {
  return value
    .split("_")
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
    .join(" ");
}

function formatPredictRecommendation(value: string) {
  return value
    .split("_")
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
    .join(" ");
}

function severityClassName(value: string) {
  if (value === "critical") return "bg-rose-500/15 text-rose-200";
  if (value === "high") return "bg-orange-500/15 text-orange-200";
  if (value === "medium") return "bg-amber-500/15 text-amber-200";
  return "bg-sky-500/15 text-sky-200";
}

export function WorkspaceBoard({
  snapshot,
  reviewSnapshot,
  prediction,
}: {
  snapshot: BidWorkspaceSnapshot;
  reviewSnapshot: BidReviewSnapshot;
  prediction?: { latestPrediction: PredictionHistoryRecord; factors: PredictionFactorRecord[] } | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedSectionKey, setSelectedSectionKey] = useState<BidSectionKey>(snapshot.bidSections[0]?.sectionKey ?? "executive_summary");
  const [localDraft, setLocalDraft] = useState(snapshot.bidSections[0]?.content ?? "");

  const selectedSection = useMemo(
    () => snapshot.bidSections.find((item) => item.sectionKey === selectedSectionKey) ?? snapshot.bidSections[0],
    [selectedSectionKey, snapshot.bidSections],
  );

  const missingGroups = useMemo(
    () => [
      { title: "Missing documents", items: snapshot.compliance.missingDocuments },
      { title: "Missing certifications", items: snapshot.compliance.missingCertifications },
      { title: "Missing evidence", items: snapshot.compliance.missingEvidence },
      { title: "Missing references", items: snapshot.compliance.missingReferences },
    ],
    [snapshot.compliance],
  );

  const selectedSectionFindings = useMemo(
    () => reviewSnapshot.reviewFindings.filter((item) => item.sectionKey === selectedSectionKey),
    [reviewSnapshot.reviewFindings, selectedSectionKey],
  );

  const selectedSectionRecommendations = useMemo(
    () =>
      reviewSnapshot.reviewRecommendations.filter(
        (item) => item.sectionKey === selectedSectionKey && item.applyStatus !== "applied",
      ),
    [reviewSnapshot.reviewRecommendations, selectedSectionKey],
  );
  const predictionStrengths = useMemo(
    () => prediction?.factors.filter((item) => item.factorCategory === "strength").slice(0, 2) ?? [],
    [prediction],
  );
  const predictionRisks = useMemo(
    () => prediction?.factors.filter((item) => item.factorCategory === "risk" || item.factorCategory === "weakness").slice(0, 3) ?? [],
    [prediction],
  );
  const predictionOpportunities = useMemo(
    () => prediction?.factors.filter((item) => item.factorCategory === "opportunity").slice(0, 2) ?? [],
    [prediction],
  );

  async function runAction(input: { url: string; method: "POST" | "PATCH"; body: Record<string, unknown> }) {
    try {
      const response = await fetch(input.url, {
        method: input.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input.body),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error ?? `Request failed with status ${response.status}`);
      }

      router.refresh();
    } catch (error) {
      console.error('Operation failed:', error);
      throw error;
    }
  }

  function handleRegenerate(sectionKey: BidSectionKey) {
    startTransition(async () => {
      await runAction({
        url: "/api/workspace/automation/regenerate",
        method: "POST",
        body: {
          organizationId: snapshot.organizationId,
          projectId: snapshot.project.id,
          sectionKey,
        },
      });
    });
  }

  function handleRunReview() {
    startTransition(async () => {
      await runAction({
        url: "/api/workspace/review/run",
        method: "POST",
        body: {
          organizationId: snapshot.organizationId,
          projectId: snapshot.project.id,
        },
      });
    });
  }

  function handleApplyRecommendation(recommendationId: string) {
    startTransition(async () => {
      await runAction({
        url: "/api/workspace/review/apply",
        method: "POST",
        body: {
          organizationId: snapshot.organizationId,
          projectId: snapshot.project.id,
          recommendationId,
        },
      });
    });
  }

  function handleSectionStatus(sectionKey: BidSectionKey, status: BidSectionRecord["status"], completionPercentage?: number) {
    startTransition(async () => {
      await runAction({
        url: "/api/workspace/automation/sections",
        method: "PATCH",
        body: {
          organizationId: snapshot.organizationId,
          projectId: snapshot.project.id,
          sectionKey,
          status,
          completionPercentage,
        },
      });
    });
  }

  function handleTaskStatus(task: BidTaskRecord, status: BidTaskRecord["status"]) {
    startTransition(async () => {
      await runAction({
        url: "/api/workspace/automation/tasks",
        method: "PATCH",
        body: {
          organizationId: snapshot.organizationId,
          projectId: snapshot.project.id,
          taskId: task.id,
          status,
        },
      });
    });
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-7">
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Bid Completion Score</p>
          <p className="mt-3 text-3xl font-semibold text-white">{snapshot.compliance.completionScore}%</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Bid Readiness Score</p>
          <p className="mt-3 text-3xl font-semibold text-white">{snapshot.compliance.readinessScore}%</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Readiness State</p>
          <p className="mt-3 text-xl font-semibold text-white">{formatReadinessState(snapshot.compliance.readinessState)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Deadline</p>
          <p className="mt-3 text-xl font-semibold text-white">{formatDate(snapshot.project.submissionDeadline)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Contract Value</p>
          <p className="mt-3 text-xl font-semibold text-white">{formatCurrency(snapshot.project.estimatedContractValue)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Overall Bid Score</p>
          <p className="mt-3 text-3xl font-semibold text-white">{reviewSnapshot.latestReview?.overallBidScore ?? 0}%</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Submission Recommendation</p>
          <p className="mt-3 text-lg font-semibold text-white">{reviewSnapshot.latestReview?.submissionRecommendation ?? "Needs Review"}</p>
        </Card>
      </section>

      {prediction ? (
        <section>
          <Card className="p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Win Intelligence</p>
                <h2 className="mt-2 text-xl font-semibold text-white">
                  {formatPredictRecommendation(prediction.latestPrediction.recommendation)}
                </h2>
                <p className="mt-2 max-w-3xl text-sm text-slate-300">{prediction.latestPrediction.strategistSummary}</p>
                <p className="mt-2 text-sm text-teal-100">{prediction.latestPrediction.recommendationRationale}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-white/8">{prediction.latestPrediction.confidenceScore}% confidence</Badge>
                <Badge className="bg-emerald-500/10 text-emerald-200">{prediction.latestPrediction.winProbability}% win probability</Badge>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-5">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Win Probability</p>
                <p className="mt-2 text-2xl font-semibold text-white">{prediction.latestPrediction.winProbability}%</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Strategic Fit</p>
                <p className="mt-2 text-2xl font-semibold text-white">{prediction.latestPrediction.strategicFitScore}%</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Risk Score</p>
                <p className="mt-2 text-2xl font-semibold text-white">{prediction.latestPrediction.riskScore}%</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Review Score</p>
                <p className="mt-2 text-2xl font-semibold text-white">{prediction.latestPrediction.reviewScore}%</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Knowledge Coverage</p>
                <p className="mt-2 text-2xl font-semibold text-white">{prediction.latestPrediction.knowledgeCoverageScore}%</p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-sm font-semibold text-white">Strengths</p>
                <div className="mt-3 space-y-3">
                  {predictionStrengths.length > 0 ? (
                    predictionStrengths.map((factor) => (
                      <div key={factor.id}>
                        <p className="text-sm text-white">{factor.title}</p>
                        <p className="mt-1 text-xs text-slate-400">{factor.explanation}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-400">No major strengths have been captured yet.</p>
                  )}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-sm font-semibold text-white">Risks</p>
                <div className="mt-3 space-y-3">
                  {predictionRisks.length > 0 ? (
                    predictionRisks.map((factor) => (
                      <div key={factor.id}>
                        <p className="text-sm text-white">{factor.title}</p>
                        <p className="mt-1 text-xs text-slate-400">{factor.remediation}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-400">No material risks are currently flagged.</p>
                  )}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-sm font-semibold text-white">Opportunities</p>
                <div className="mt-3 space-y-3">
                  {predictionOpportunities.length > 0 ? (
                    predictionOpportunities.map((factor) => (
                      <div key={factor.id}>
                        <p className="text-sm text-white">{factor.title}</p>
                        <p className="mt-1 text-xs text-slate-400">{factor.remediation}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-400">No major uplift actions are currently flagged.</p>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </section>
      ) : null}

      {reviewSnapshot.latestReview ? (
        <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">AI Bid Review</p>
                <h2 className="mt-2 text-xl font-semibold text-white">{reviewSnapshot.latestReview.submissionRecommendation}</h2>
                <p className="mt-2 text-sm text-slate-300">{reviewSnapshot.latestReview.competitivePosition}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" href={{ pathname: "/exports", query: { projectId: snapshot.project.id } }}>
                  Open Exports
                </Button>
                <Button onClick={handleRunReview} disabled={isPending}>
                  Run Review
                </Button>
              </div>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Compliance</p>
                <p className="mt-2 text-2xl font-semibold text-white">{reviewSnapshot.latestReview.complianceScore}%</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Quality</p>
                <p className="mt-2 text-2xl font-semibold text-white">{reviewSnapshot.latestReview.qualityScore}%</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Evidence</p>
                <p className="mt-2 text-2xl font-semibold text-white">{reviewSnapshot.latestReview.evidenceScore}%</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Win Probability</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {reviewSnapshot.latestReview.winProbabilityAdjustment > 0 ? "+" : ""}
                  {reviewSnapshot.latestReview.winProbabilityAdjustment}
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Readiness</p>
                <p className="mt-2 text-2xl font-semibold text-white">{reviewSnapshot.latestReview.submissionReadinessScore}%</p>
                <p className="mt-2 text-xs text-slate-500">{formatReviewReadiness(reviewSnapshot.latestReview.readinessState)}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Risk Score</p>
                <p className="mt-2 text-2xl font-semibold text-white">{reviewSnapshot.latestReview.riskScore}%</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Confidence</p>
                <p className="mt-2 text-2xl font-semibold text-white">{reviewSnapshot.latestReview.confidenceScore}%</p>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Benchmarking</p>
            <div className="mt-4 space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-sm font-semibold text-white">Strengths</p>
                <ul className="mt-2 space-y-2 text-sm text-slate-300">
                  {reviewSnapshot.latestReview.strengths.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-sm font-semibold text-white">Weaknesses</p>
                <ul className="mt-2 space-y-2 text-sm text-slate-300">
                  {reviewSnapshot.latestReview.weaknesses.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        </section>
      ) : null}

      {snapshot.knowledgeCoverage ? (
        <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
          <Card className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Knowledge Coverage</p>
                <h2 className="mt-2 text-xl font-semibold text-white">{snapshot.knowledgeCoverage.coverageScore}% coverage</h2>
              </div>
              <Badge
                className={
                  snapshot.knowledgeCoverage.coverageStrength === "strong"
                    ? "bg-emerald-500/10 text-emerald-200"
                    : snapshot.knowledgeCoverage.coverageStrength === "moderate"
                      ? "bg-amber-500/10 text-amber-200"
                      : "bg-rose-500/10 text-rose-200"
                }
              >
                {snapshot.knowledgeCoverage.coverageStrength.replace("_", " ")}
              </Badge>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Missing Evidence</p>
                <p className="mt-2 text-2xl font-semibold text-white">{snapshot.knowledgeCoverage.missingEvidenceScore}%</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Missing Certification</p>
                <p className="mt-2 text-2xl font-semibold text-white">{snapshot.knowledgeCoverage.missingCertificationScore}%</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Missing Experience</p>
                <p className="mt-2 text-2xl font-semibold text-white">{snapshot.knowledgeCoverage.missingExperienceScore}%</p>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Knowledge Recommendations</p>
            <div className="mt-4 space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-sm font-semibold text-white">Missing areas</p>
                <p className="mt-2 text-sm text-slate-300">
                  {snapshot.knowledgeCoverage.missingKnowledgeAreas.length > 0
                    ? snapshot.knowledgeCoverage.missingKnowledgeAreas.join(", ")
                    : "No major missing knowledge areas detected."}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-sm font-semibold text-white">Recommended uploads</p>
                <ul className="mt-2 space-y-2 text-sm text-slate-300">
                  {snapshot.knowledgeCoverage.uploadRecommendations.length > 0 ? (
                    snapshot.knowledgeCoverage.uploadRecommendations.map((item) => <li key={item}>{item}</li>)
                  ) : (
                    <li className="text-slate-500">No upload recommendations at the moment.</li>
                  )}
                </ul>
              </div>
            </div>
          </Card>
        </section>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.35fr_0.95fr]">
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Bid Requirements</p>
          <div className="mt-4 space-y-4">
            {snapshot.bidRequirements.map((item) => (
              <div key={item.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-white">{item.heading}</p>
                  {item.mandatory ? <Badge className="bg-rose-500/10 text-rose-200">Mandatory</Badge> : <Badge>Scored</Badge>}
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-300">{item.requirement}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge className="bg-white/8">{item.checklistStatus}</Badge>
                  {item.missingInformationType ? <Badge className="bg-amber-500/10 text-amber-200">{item.missingInformationType}</Badge> : null}
                </div>
                {item.evidenceGuidance ? <p className="mt-3 text-xs text-slate-500">{item.evidenceGuidance}</p> : null}
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Bid Sections</p>
              <p className="mt-2 text-sm text-slate-400">
                {snapshot.bidSections.map((item) => item.title).join(", ")}
              </p>
            </div>
            <Button onClick={() => selectedSection && handleRegenerate(selectedSection.sectionKey)} disabled={isPending || !selectedSection}>
              Regenerate
            </Button>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {snapshot.bidSections.map((section) => (
              <button
                key={section.id}
                type="button"
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  selectedSection?.sectionKey === section.sectionKey
                    ? "border-teal-300/50 bg-teal-400/10 text-teal-100"
                    : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                }`}
                onClick={() => {
                  setSelectedSectionKey(section.sectionKey);
                  setLocalDraft(section.content);
                }}
              >
                {section.title}
              </button>
            ))}
          </div>

          {selectedSection ? (
            <>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <Badge className="bg-white/8">{selectedSection.status}</Badge>
                <Badge className="bg-emerald-500/10 text-emerald-200">{selectedSection.completionPercentage}% complete</Badge>
                {selectedSection.confidence ? <Badge className="bg-white/8">{selectedSection.confidence}% confidence</Badge> : null}
              </div>

              <p className="mt-4 text-sm text-slate-400">
                {selectedSection.guidance ?? formatSectionKey(selectedSection.sectionKey)}
              </p>

              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <Textarea value={localDraft} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setLocalDraft(event.target.value)} />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => handleSectionStatus(selectedSection.sectionKey, "in_progress", 50)} disabled={isPending}>
                  Mark In Progress
                </Button>
                <Button variant="secondary" onClick={() => handleSectionStatus(selectedSection.sectionKey, "ready_for_review", 85)} disabled={isPending}>
                  Ready For Review
                </Button>
                <Button onClick={() => handleSectionStatus(selectedSection.sectionKey, "complete", 100)} disabled={isPending}>
                  Mark Complete
                </Button>
              </div>

              {selectedSectionFindings.length > 0 ? (
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-sm font-medium text-white">Review findings</p>
                  <div className="mt-3 space-y-3">
                    {selectedSectionFindings.map((finding) => (
                      <div key={finding.id} className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-white">{finding.issue}</p>
                          <Badge className={severityClassName(finding.severity)}>{finding.severity}</Badge>
                        </div>
                        <p className="mt-2 text-sm text-slate-300">{finding.reason}</p>
                        <p className="mt-2 text-xs text-slate-500">{finding.evidence}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {selectedSectionRecommendations.length > 0 ? (
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-sm font-medium text-white">Improvement opportunities</p>
                  <div className="mt-3 space-y-3">
                    {selectedSectionRecommendations.map((recommendation) => (
                      <div key={recommendation.id} className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
                        <p className="text-sm font-semibold text-white">{recommendation.issue}</p>
                        <p className="mt-2 text-sm text-slate-300">{recommendation.suggestedFix}</p>
                        <Button className="mt-3" variant="secondary" onClick={() => handleApplyRecommendation(recommendation.id)} disabled={isPending}>
                          Apply Improvement
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {selectedSection.sourceReferences.length > 0 ? (
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-sm font-medium text-white">Source references</p>
                  <p className="mt-2 text-sm text-slate-300">{selectedSection.sourceReferences.join(", ")}</p>
                </div>
              ) : null}

              {selectedSection.supportingEvidence.length > 0 ? (
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-sm font-medium text-white">Supporting evidence</p>
                  <ul className="mt-2 space-y-2 text-sm text-slate-300">
                    {selectedSection.supportingEvidence.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          ) : null}
        </Card>

        <div className="space-y-5">
          <Card className="p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Review Findings</p>
              <Badge className="bg-white/8">{reviewSnapshot.reviewFindings.length} items</Badge>
            </div>
            <div className="mt-4 space-y-4">
              {reviewSnapshot.reviewFindings.length > 0 ? (
                reviewSnapshot.reviewFindings.slice(0, 6).map((finding) => (
                  <div key={finding.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-white">{finding.issue}</p>
                      <Badge className={severityClassName(finding.severity)}>{finding.severity}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-slate-300">{finding.reason}</p>
                    {finding.sectionKey ? <p className="mt-2 text-xs text-slate-500">{formatSectionKey(finding.sectionKey)}</p> : null}
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm text-slate-400">
                  Run the Bid Review Engine to generate consultant-style findings and recommendations.
                </div>
              )}
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Missing Information</p>
              <Badge className="bg-amber-500/10 text-amber-200">{snapshot.compliance.missingInformation.length} gaps</Badge>
            </div>
            <div className="mt-4 space-y-4">
              {missingGroups.map((group: { title: string; items: string[] }) => (
                <div key={group.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-sm font-semibold text-white">{group.title}</p>
                  <ul className="mt-3 space-y-2 text-sm text-slate-300">
                    {group.items.length > 0 ? (
                      group.items.map((item: string) => <li key={item}>{item}</li>)
                    ) : (
                      <li className="text-slate-500">No current gaps.</li>
                    )}
                  </ul>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Checklist And Tasks</p>
            <div className="mt-4 space-y-4">
              {snapshot.compliance.checklist.map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-sm font-medium text-white">{item.label}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">{item.status}</p>
                </div>
              ))}
              {snapshot.bidTasks.map((task) => (
                <div key={task.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-white">{task.title}</p>
                    <Badge className="bg-white/8">{task.priority}</Badge>
                  </div>
                  {task.description ? <p className="mt-2 text-sm text-slate-300">{task.description}</p> : null}
                  <p className="mt-2 text-xs text-slate-500">
                    {task.ownerName ?? "Unassigned"} • Due {formatDate(task.dueAt)}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button variant="ghost" onClick={() => handleTaskStatus(task, "in_progress")} disabled={isPending || task.status === "in_progress"}>
                      In Progress
                    </Button>
                    <Button variant="secondary" onClick={() => handleTaskStatus(task, "complete")} disabled={isPending || task.status === "complete"}>
                      Complete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Submission Timeline</p>
            <div className="mt-4 space-y-4">
              {snapshot.bidTimeline.map((item) => (
                <div key={item.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-white">{item.title}</p>
                    <Badge className="bg-white/8">{item.status}</Badge>
                  </div>
                  {item.details ? <p className="mt-2 text-sm text-slate-300">{item.details}</p> : null}
                  <p className="mt-2 text-xs text-slate-500">Due {formatDate(item.dueAt)}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <Card className="p-5">
        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Opportunity Context</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-sm font-semibold text-white">{snapshot.project.tenderName}</p>
            <p className="mt-2 text-sm text-slate-300">{snapshot.project.issuingBody}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-sm font-semibold text-white">
              {snapshot.opportunity?.title ?? "Imported workspace context"}
            </p>
            <p className="mt-2 text-sm text-slate-300">
              {snapshot.opportunity?.aiSummary ?? snapshot.opportunity?.description ?? "Bid workspace automation uses the imported opportunity and extracted requirements to improve bid quality and revenue scoring."}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

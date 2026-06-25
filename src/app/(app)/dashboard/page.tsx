import type { Route } from "next";
import { AppShell } from "@/components/app-shell";
import { Badge, Button, Card } from "@/components/ui";
import { getBidReviewDashboardSnapshot } from "@/lib/bid-review";
import { getKnowledgeEngineSnapshot } from "@/lib/knowledge";
import { getBidOutcomeIntelligenceSnapshot, getOpportunityDiscoverySnapshot } from "@/lib/opportunities";
import { getActiveOrganizationContext, getDashboardSnapshot } from "@/lib/platform";
import { getPredictEngineSnapshot } from "@/lib/predict";
import { getSubmissionExportDashboardSnapshot } from "@/lib/submission-export";
import { formatCurrency, formatPercent } from "@/lib/utils";

export default async function DashboardPage() {
  const organization = await getActiveOrganizationContext();
  const organizationId = organization.id === "org_demo" ? undefined : organization.id;
  const snapshot = getDashboardSnapshot();
  const opportunitySnapshot = await getOpportunityDiscoverySnapshot(organizationId);
  const outcomeSnapshot = await getBidOutcomeIntelligenceSnapshot(organizationId);
  const knowledgeSnapshot = await getKnowledgeEngineSnapshot(organizationId);
  const reviewSnapshot = await getBidReviewDashboardSnapshot(organizationId);
  const predictSnapshot = await getPredictEngineSnapshot(organizationId);
  const exportSnapshot = await getSubmissionExportDashboardSnapshot(organizationId);

  return (
    <AppShell title="Dashboard" eyebrow="Operations" organization={organization}>
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Uploads</p>
          <p className="mt-3 text-3xl font-semibold text-white">{snapshot.analytics.uploads}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Responses</p>
          <p className="mt-3 text-3xl font-semibold text-white">{snapshot.analytics.generatedResponses}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Exports</p>
          <p className="mt-3 text-3xl font-semibold text-white">{snapshot.analytics.exports}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Conversion</p>
          <p className="mt-3 text-3xl font-semibold text-white">{formatPercent(snapshot.analytics.conversionRate)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">MRR</p>
          <p className="mt-3 text-3xl font-semibold text-white">{formatCurrency(snapshot.analytics.revenue)}</p>
        </Card>
      </section>
      <section className="mt-8 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Active projects</p>
              <h2 className="mt-2 text-xl font-semibold text-white">Tender portfolio</h2>
            </div>
            <Button href={"/projects/proj_1/workspace" as Route}>Open workspace</Button>
          </div>
          <div className="mt-5 space-y-4">
            {snapshot.projects.map((project) => (
              <div key={project.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
                  <div>
                    <p className="text-base font-semibold text-white">{project.title}</p>
                    <p className="mt-1 text-sm text-slate-400">
                      {project.issuingBody} • {formatCurrency(project.estimatedContractValue)}
                    </p>
                  </div>
                  <Badge className="w-fit bg-white/8">{project.readinessScore}% ready</Badge>
                </div>
                <p className="mt-3 text-sm text-slate-300">{project.tenderName}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Knowledge base readiness</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Organisation assets</h2>
          <div className="mt-5 space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Coverage Score</p>
              <p className="mt-2 text-2xl font-semibold text-white">{knowledgeSnapshot.coverageScore}%</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Documents</p>
              <p className="mt-2 text-2xl font-semibold text-white">{knowledgeSnapshot.totalDocuments}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Most Valuable Document</p>
              <p className="mt-2 text-sm font-semibold text-white">{knowledgeSnapshot.mostValuableDocuments[0]?.title ?? "No document ranked yet"}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Top Recommendation</p>
              <p className="mt-2 text-sm text-slate-300">{knowledgeSnapshot.uploadRecommendations[0] ?? "No upload recommendation at the moment."}</p>
            </div>
          </div>
        </Card>
      </section>
      <section className="mt-8">
        <Card className="p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Predict engine</p>
              <h2 className="mt-2 text-xl font-semibold text-white">AI bid strategist</h2>
              <p className="mt-2 max-w-3xl text-sm text-slate-300">
                PursuitIQ Predict sits on top of revenue, knowledge, review, outcomes, and workspace signals to produce explainable win probability, qualification recommendations, and learning-loop accuracy metrics.
              </p>
            </div>
            <Button href="/predict">Open predict dashboard</Button>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Predicted Opportunities</p>
              <p className="mt-2 text-2xl font-semibold text-white">{predictSnapshot.metrics.opportunitiesPredicted}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Average Win Probability</p>
              <p className="mt-2 text-2xl font-semibold text-white">{predictSnapshot.metrics.averageWinProbability}%</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Strong Bid</p>
              <p className="mt-2 text-2xl font-semibold text-white">{predictSnapshot.metrics.strongBidCount}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Prediction Accuracy</p>
              <p className="mt-2 text-2xl font-semibold text-white">{predictSnapshot.metrics.averagePredictionAccuracy}%</p>
            </div>
          </div>
        </Card>
      </section>
      <section className="mt-8">
        <Card className="p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Submission and export engine</p>
              <h2 className="mt-2 text-xl font-semibold text-white">Branded submission-ready bid packs</h2>
              <p className="mt-2 max-w-3xl text-sm text-slate-300">
                Generate Word and PDF bid packs, executive summaries, compliance packs, and evidence packs directly from completed workspaces with final validation and organisation branding.
              </p>
            </div>
            <Button href="/exports">Open export dashboard</Button>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Projects Ready</p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {exportSnapshot.projects.filter((item) => item.finalSubmissionRecommendation === "Ready For Submission").length}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Templates</p>
              <p className="mt-2 text-2xl font-semibold text-white">{exportSnapshot.templates.length}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Recent Exports</p>
              <p className="mt-2 text-2xl font-semibold text-white">{exportSnapshot.recentExports.length}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Avg Export Risk</p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {exportSnapshot.projects.length > 0
                  ? Math.round(exportSnapshot.projects.reduce((sum, item) => sum + item.exportRiskScore, 0) / exportSnapshot.projects.length)
                  : 0}
              </p>
            </div>
          </div>
        </Card>
      </section>
      <section className="mt-8">
        <Card className="p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Bid review engine</p>
              <h2 className="mt-2 text-xl font-semibold text-white">Pre-submission quality control</h2>
              <p className="mt-2 max-w-3xl text-sm text-slate-300">
                Review completed bids against mandatory criteria, evaluation requirements, organisation knowledge coverage, and historical win/loss signals before submission.
              </p>
            </div>
            <Button href="/reviews">Open review dashboard</Button>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Projects Reviewed</p>
              <p className="mt-2 text-2xl font-semibold text-white">{reviewSnapshot.metrics.projectsReviewed}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Average Bid Score</p>
              <p className="mt-2 text-2xl font-semibold text-white">{reviewSnapshot.metrics.averageOverallBidScore}%</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Critical Findings</p>
              <p className="mt-2 text-2xl font-semibold text-white">{reviewSnapshot.metrics.criticalFindings}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Improvement Opportunities</p>
              <p className="mt-2 text-2xl font-semibold text-white">{reviewSnapshot.metrics.improvementOpportunities}</p>
            </div>
          </div>
        </Card>
      </section>
      <section className="mt-8">
        <Card className="p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Opportunity discovery</p>
              <h2 className="mt-2 text-xl font-semibold text-white">Tender pipeline intelligence</h2>
              <p className="mt-2 max-w-3xl text-sm text-slate-300">
                Monitor Contracts Finder, Find a Tender, TED Europe, and SAM.gov with AI scoring for relevance, win probability, and revenue potential.
              </p>
            </div>
            <Button href="/opportunities">Open discovery engine</Button>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">New Opportunities</p>
              <p className="mt-2 text-2xl font-semibold text-white">{opportunitySnapshot.metrics.newOpportunities}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Saved Opportunities</p>
              <p className="mt-2 text-2xl font-semibold text-white">{opportunitySnapshot.metrics.savedOpportunities}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">High Match Opportunities</p>
              <p className="mt-2 text-2xl font-semibold text-white">{opportunitySnapshot.metrics.highMatchOpportunities}</p>
            </div>
          </div>
        </Card>
      </section>
      <section className="mt-8">
        <Card className="p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Bid outcome intelligence</p>
              <h2 className="mt-2 text-xl font-semibold text-white">Learn from wins and losses</h2>
              <p className="mt-2 max-w-3xl text-sm text-slate-300">
                Track submitted, shortlisted, won, rejected, and lost bids with contract values, competitor counts, sector patterns, and client patterns that feed back into future win scoring.
              </p>
            </div>
            <Button href="/outcomes">Open outcome engine</Button>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-6">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Win Rate</p>
              <p className="mt-2 text-2xl font-semibold text-white">{formatPercent(outcomeSnapshot.metrics.winRate)}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Submitted</p>
              <p className="mt-2 text-2xl font-semibold text-white">{outcomeSnapshot.metrics.submitted}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Shortlisted</p>
              <p className="mt-2 text-2xl font-semibold text-white">{outcomeSnapshot.metrics.shortlisted}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Average Value</p>
              <p className="mt-2 text-2xl font-semibold text-white">{formatCurrency(outcomeSnapshot.metrics.averageContractValue)}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Revenue Won</p>
              <p className="mt-2 text-2xl font-semibold text-white">{formatCurrency(outcomeSnapshot.metrics.revenueWon)}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Revenue Lost</p>
              <p className="mt-2 text-2xl font-semibold text-white">{formatCurrency(outcomeSnapshot.metrics.revenueLost)}</p>
            </div>
          </div>
        </Card>
      </section>
    </AppShell>
  );
}

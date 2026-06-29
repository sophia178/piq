export const dynamic = 'force-dynamic';
import type { Route } from "next";
import { AppShell } from "@/components/app-shell";
import { Badge, Button, Card } from "@/components/ui";
import { getBidReviewDashboardSnapshot } from "@/lib/bid-review";
import { getActiveOrganizationContext } from "@/lib/platform";
import { formatCurrency } from "@/lib/utils";

function formatDate(value?: string | null) {
  if (!value) return "Review pending";
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(value));
}

export default async function ReviewsPage() {
  const organization = await getActiveOrganizationContext();
  const organizationId = organization.id === "org_demo" ? undefined : organization.id;
  const snapshot = await getBidReviewDashboardSnapshot(organizationId);

  return (
    <AppShell title="Reviews" eyebrow="Quality" organization={organization}>
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Projects Reviewed</p>
          <p className="mt-3 text-3xl font-semibold text-white">{snapshot.metrics.projectsReviewed}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Average Bid Score</p>
          <p className="mt-3 text-3xl font-semibold text-white">{snapshot.metrics.averageOverallBidScore}%</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Average Readiness</p>
          <p className="mt-3 text-3xl font-semibold text-white">{snapshot.metrics.averageReadinessScore}%</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Critical Findings</p>
          <p className="mt-3 text-3xl font-semibold text-white">{snapshot.metrics.criticalFindings}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Improvement Opportunities</p>
          <p className="mt-3 text-3xl font-semibold text-white">{snapshot.metrics.improvementOpportunities}</p>
        </Card>
      </section>

      <section className="mt-8 space-y-5">
        {snapshot.projects.length > 0 ? (
          snapshot.projects.map((project) => (
            <Card key={project.projectId} className="p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Bid Review Dashboard</p>
                  <h2 className="mt-2 text-xl font-semibold text-white">{project.projectTitle}</h2>
                  <p className="mt-2 text-sm text-slate-300">
                    {project.issuingBody} {project.estimatedContractValue ? `• ${formatCurrency(project.estimatedContractValue)}` : ""}
                  </p>
                  <p className="mt-3 max-w-3xl text-sm text-slate-400">{project.competitivePosition}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-white/8">{project.submissionRecommendation}</Badge>
                  <Badge className="bg-rose-500/10 text-rose-200">{project.criticalFindings} critical</Badge>
                  <Button href={`/projects/${project.projectId}/workspace` as Route}>
                    Open workspace
                  </Button>
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Overall Bid Score</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{project.overallBidScore}%</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Readiness Score</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{project.readinessScore}%</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Review Findings</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{project.totalFindings}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Improvement Opportunities</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{project.improvementOpportunities}</p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-white">Top findings</p>
                  <p className="text-xs text-slate-500">{formatDate(project.updatedAt)}</p>
                </div>
                <div className="mt-3 space-y-3">
                  {project.topFindings.length > 0 ? (
                    project.topFindings.map((finding) => (
                      <div key={finding.id} className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-white">{finding.issue}</p>
                          <Badge
                            className={
                              finding.severity === "critical"
                                ? "bg-rose-500/10 text-rose-200"
                                : finding.severity === "high"
                                  ? "bg-orange-500/10 text-orange-200"
                                  : finding.severity === "medium"
                                    ? "bg-amber-500/10 text-amber-200"
                                    : "bg-sky-500/10 text-sky-200"
                            }
                          >
                            {finding.severity}
                          </Badge>
                        </div>
                        <p className="mt-2 text-sm text-slate-300">{finding.reason}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-400">No findings recorded yet for this project.</p>
                  )}
                </div>
              </div>
            </Card>
          ))
        ) : (
          <Card className="p-5">
            <p className="text-sm text-slate-300">No project reviews are available yet. Open a workspace to run the Bid Review Engine.</p>
          </Card>
        )}
      </section>
    </AppShell>
  );
}

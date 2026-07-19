export const dynamic = 'force-dynamic';
import type { Route } from "next";
import { AppShell } from "@/components/app-shell";
import { Badge, Button, Card } from "@/components/ui";
import { getKnowledgeEngineSnapshot } from "@/lib/knowledge";
import { getBidOutcomeIntelligenceSnapshot } from "@/lib/opportunities";
import { getAuthenticatedAppContext, getDashboardSnapshot } from "@/lib/platform";

function formatDeadline(value: string | null) {
  if (!value) return "No deadline set";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatStatus(status: string) {
  return status.replace(/_/g, " ");
}

export default async function DashboardPage() {
  const { organization, organizationId } = await getAuthenticatedAppContext();
  const snapshot = await getDashboardSnapshot(organizationId);
  const outcomeSnapshot = await getBidOutcomeIntelligenceSnapshot(organizationId);
  const knowledgeSnapshot = await getKnowledgeEngineSnapshot(organizationId);
  const primaryProject = snapshot.projects[0] ?? null;
  const activeProjects = snapshot.projects.filter((project) => project.status !== "submitted" && project.status !== "archived");

  return (
    <AppShell title="Dashboard" eyebrow="Operations" organization={organization}>
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Active bids</p>
          <p className="mt-3 text-3xl font-semibold text-white">{snapshot.metrics.activeProjects}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Upcoming deadlines</p>
          <p className="mt-3 text-3xl font-semibold text-white">{snapshot.metrics.upcomingDeadlines}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Recent uploads</p>
          <p className="mt-3 text-3xl font-semibold text-white">{snapshot.metrics.recentUploads}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Attention needed</p>
          <p className="mt-3 text-3xl font-semibold text-white">{snapshot.metrics.tasksRequiringAttention}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Organisation readiness</p>
          <p className="mt-3 text-3xl font-semibold text-white">{snapshot.metrics.organizationReadiness}%</p>
        </Card>
      </section>
      <section className="mt-8 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Priority actions</p>
              <h2 className="mt-2 text-xl font-semibold text-white">What to do next</h2>
            </div>
            <Button href={(primaryProject ? `/projects/${primaryProject.id}/workspace` : "/opportunities") as Route}>
              {primaryProject ? "Open workspace" : "Find opportunities"}
            </Button>
          </div>
          <div className="mt-5 space-y-4">
            {snapshot.recommendations.map((recommendation) => (
              <div key={recommendation.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-base font-semibold text-white">{recommendation.title}</p>
                    <p className="mt-2 text-sm leading-7 text-slate-300">{recommendation.detail}</p>
                  </div>
                  <Button href={recommendation.href as Route} variant="secondary">
                    Open
                  </Button>
                </div>
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
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Top Document</p>
              <p className="mt-2 text-sm font-semibold text-white">{knowledgeSnapshot.topDocuments[0]?.title ?? "No document ranked yet"}</p>
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
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Active workspaces</p>
              <h2 className="mt-2 text-xl font-semibold text-white">Bid progress across the portfolio</h2>
              <p className="mt-2 max-w-3xl text-sm text-slate-300">
                Every project shown here is backed by live project, requirement, and readiness records. If there is no bid activity yet, start by importing an opportunity.
              </p>
            </div>
            <Button href={primaryProject ? (`/projects/${primaryProject.id}/workspace` as Route) : ("/opportunities" as Route)}>
              {primaryProject ? "Open lead workspace" : "Import opportunity"}
            </Button>
          </div>
          <div className="mt-5 grid gap-4">
            {activeProjects.length > 0 ? (
              activeProjects.map((project) => (
                <div key={project.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-base font-semibold text-white">{project.title}</p>
                      <p className="mt-1 text-sm text-slate-400">
                        {project.issuingBody} • Deadline {formatDeadline(project.submissionDeadline)}
                      </p>
                    </div>
                    <Badge className="w-fit bg-white/8">{project.readinessScore}% ready</Badge>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-4">
                    <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Status</p>
                      <p className="mt-2 text-sm font-semibold capitalize text-white">{formatStatus(project.status)}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Requirements</p>
                      <p className="mt-2 text-sm font-semibold text-white">{project.totalRequirements}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Completed</p>
                      <p className="mt-2 text-sm font-semibold text-white">{project.completedRequirements}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Mandatory gaps</p>
                      <p className="mt-2 text-sm font-semibold text-white">{project.pendingMandatoryRequirements}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-6">
                <p className="text-lg font-semibold text-white">No live bids yet</p>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
                  Import an opportunity or upload a tender pack to create the first workspace. The dashboard will start tracking deadlines,
                  requirement completion, uploads, and export activity as soon as the first bid is active.
                </p>
              </div>
            )}
          </div>
        </Card>
      </section>
      <section className="mt-8">
        <Card className="p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Recent activity</p>
              <h2 className="mt-2 text-xl font-semibold text-white">Uploads, exports, and outcomes</h2>
              <p className="mt-2 max-w-3xl text-sm text-slate-300">
                This activity feed only shows records that already exist in your organization workspace. Nothing here is estimated or fabricated.
              </p>
            </div>
            <Button href="/exports">Open exports</Button>
          </div>
          <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_1fr_1fr]">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Recent uploads</p>
              <div className="mt-4 space-y-3">
                {snapshot.recentUploads.length > 0 ? (
                  snapshot.recentUploads.map((upload) => (
                    <div key={upload.id} className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                      <p className="text-sm font-semibold text-white">{upload.title}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">{upload.documentType}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-300">No knowledge uploads recorded yet.</p>
                )}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Recent exports</p>
              <div className="mt-4 space-y-3">
                {snapshot.recentExports.length > 0 ? (
                  snapshot.recentExports.map((exportItem) => (
                    <div key={exportItem.id} className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                      <p className="text-sm font-semibold text-white">{exportItem.fileName}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">{exportItem.exportType.replace(/_/g, " ")}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-300">No export history recorded yet.</p>
                )}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Outcome learning</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Submitted</p>
                  <p className="mt-2 text-xl font-semibold text-white">{outcomeSnapshot.metrics.submitted}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Won</p>
                  <p className="mt-2 text-xl font-semibold text-white">{outcomeSnapshot.metrics.won}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Lost</p>
                  <p className="mt-2 text-xl font-semibold text-white">{outcomeSnapshot.metrics.lost}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Shortlisted</p>
                  <p className="mt-2 text-xl font-semibold text-white">{outcomeSnapshot.metrics.shortlisted}</p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </section>
    </AppShell>
  );
}

export const dynamic = 'force-dynamic';
import type { Route } from "next";
import { AppShell } from "@/components/app-shell";
import { Button, Card } from "@/components/ui";
import { getKnowledgeEngineSnapshot } from "@/lib/knowledge";
import { getAuthenticatedAppContext, getDashboardSnapshot } from "@/lib/platform";

export default async function ResponsesPage() {
  const { organization, organizationId } = await getAuthenticatedAppContext();
  const dashboardSnapshot = await getDashboardSnapshot(organizationId);
  const knowledgeSnapshot = await getKnowledgeEngineSnapshot(organizationId);
  const primaryProject = dashboardSnapshot.projects[0] ?? null;

  return (
    <AppShell title="Response Reuse" eyebrow="Drafting" organization={organization}>
      <section className="grid gap-5">
        <Card className="p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm uppercase tracking-[0.24em] text-slate-500">How reuse works now</p>
              <h2 className="mt-3 text-2xl font-semibold text-white">Responses are generated inside each workspace from live knowledge.</h2>
              <p className="mt-4 text-sm leading-7 text-slate-300">
                This page no longer shows canned example answers. Drafting happens against the active tender workspace, and every answer should be
                grounded in indexed organization documents that can be reviewed and edited before export.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button href={primaryProject ? (`/projects/${primaryProject.id}/workspace` as Route) : ("/opportunities" as Route)}>
                {primaryProject ? "Open active workspace" : "Find an opportunity"}
              </Button>
              <Button href="/knowledge" variant="secondary">
                Open knowledge base
              </Button>
            </div>
          </div>
        </Card>

        <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <Card className="p-6">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Knowledge readiness</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Coverage score</p>
                <p className="mt-2 text-2xl font-semibold text-white">{knowledgeSnapshot.coverageScore}%</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Indexed documents</p>
                <p className="mt-2 text-2xl font-semibold text-white">{knowledgeSnapshot.totalDocuments}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Referenced documents</p>
                <p className="mt-2 text-2xl font-semibold text-white">{knowledgeSnapshot.referencedDocuments}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Open upload gaps</p>
                <p className="mt-2 text-2xl font-semibold text-white">{knowledgeSnapshot.missingKnowledgeAreas.length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">What to strengthen before drafting</p>
            <div className="mt-5 space-y-3">
              {(knowledgeSnapshot.uploadRecommendations.length > 0
                ? knowledgeSnapshot.uploadRecommendations
                : ["Upload case studies, policies, and certifications to improve evidence-backed drafting."]).map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-7 text-slate-300">
                  {item}
                </div>
              ))}
            </div>
          </Card>
        </section>

        <Card className="p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Most reusable source material</p>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {knowledgeSnapshot.topDocuments.length > 0 ? (
              knowledgeSnapshot.topDocuments.slice(0, 6).map((document) => (
                <div key={document.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-base font-semibold text-white">{document.title}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-500">{document.documentType.replace(/_/g, " ")}</p>
                  <p className="mt-3 text-sm text-slate-300">
                    Referenced {document.timesReferenced} times across active drafting and review workflows.
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-sm leading-7 text-slate-300 lg:col-span-2">
                No source documents have been ranked yet. Upload evidence and generate responses inside a workspace to start building a reusable
                response base grounded in real documents.
              </div>
            )}
          </div>
        </Card>
      </section>
    </AppShell>
  );
}

export const dynamic = 'force-dynamic';
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui";
import { getKnowledgeEngineSnapshot } from "@/lib/knowledge";
import { getAuthenticatedAppContext, getDashboardSnapshot, getUserSubscriptionStatus } from "@/lib/platform";

export default async function AdminPage() {
  const { organization, organizationId } = await getAuthenticatedAppContext();
  const [snapshot, knowledgeSnapshot, subscription] = await Promise.all([
    getDashboardSnapshot(organizationId),
    getKnowledgeEngineSnapshot(organizationId),
    getUserSubscriptionStatus(),
  ]);

  return (
    <AppShell title="Operations" eyebrow="Governance" organization={organization}>
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <Card className="p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Subscription</p>
          <p className="mt-3 text-3xl font-semibold capitalize text-white">{subscription?.status ?? "unconfigured"}</p>
        </Card>
        <Card className="p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Active projects</p>
          <p className="mt-3 text-3xl font-semibold text-white">{snapshot.metrics.activeProjects}</p>
        </Card>
        <Card className="p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Knowledge coverage</p>
          <p className="mt-3 text-3xl font-semibold text-white">{knowledgeSnapshot.coverageScore}%</p>
        </Card>
      </section>
      <section className="mt-8 grid gap-5 xl:grid-cols-2">
        <Card className="p-6">
          <p className="text-lg font-semibold text-white">Workflow readiness</p>
          <div className="mt-4 space-y-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-sm font-semibold text-white">Tasks requiring attention</p>
              <p className="mt-2 text-sm text-slate-300">{snapshot.metrics.tasksRequiringAttention} items currently need follow-up across active bids.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-sm font-semibold text-white">Recent uploads</p>
              <p className="mt-2 text-sm text-slate-300">{snapshot.metrics.recentUploads} knowledge assets were recently uploaded and indexed.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-sm font-semibold text-white">Organization readiness</p>
              <p className="mt-2 text-sm text-slate-300">{snapshot.metrics.organizationReadiness}% average readiness across the current bid portfolio.</p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <p className="text-lg font-semibold text-white">Security controls</p>
          <ul className="mt-4 space-y-3 text-sm text-slate-300">
            <li>Supabase RLS on every tenant-owned table</li>
            <li>API input validation with Zod</li>
            <li>Rate limiting middleware for route handlers</li>
            <li>Audit logs for sensitive actions and content exports</li>
            <li>Workspace, review, predict, and export routes run dynamically per authenticated organization</li>
          </ul>
        </Card>
      </section>
    </AppShell>
  );
}

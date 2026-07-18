export const dynamic = 'force-dynamic';
import type { Route } from "next";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui";
import { WorkspaceBoard } from "@/components/workspace-board";
import { getBidReviewSnapshot } from "@/lib/bid-review";
import { getBidWorkspaceSnapshot } from "@/lib/bid-workspace";
import { getProjectPredictionSummary } from "@/lib/predict";
import { getAuthenticatedAppContext } from "@/lib/platform";

export default async function WorkspacePage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { organization, organizationId } = await getAuthenticatedAppContext();
  const [snapshot, reviewSnapshot, prediction] = await Promise.all([
    getBidWorkspaceSnapshot(projectId, organizationId),
    getBidReviewSnapshot(projectId, organizationId),
    getProjectPredictionSummary(projectId, organizationId),
  ]);

  return (
    <AppShell title="Workspace" eyebrow="Submission" organization={organization} workspaceHref={`/projects/${projectId}/workspace` as Route}>
      <div className="mb-5">
        <Card className="p-5">
          <p className="text-sm text-slate-300">
            Project ID: <span className="font-semibold text-white">{projectId}</span>. This workspace automation view converts imported opportunities into structured pursuit plans, section drafts, checklist coverage, and submission readiness inside the existing PursuitIQ workspace.
          </p>
        </Card>
      </div>
      <WorkspaceBoard snapshot={snapshot} reviewSnapshot={reviewSnapshot} prediction={prediction} />
    </AppShell>
  );
}

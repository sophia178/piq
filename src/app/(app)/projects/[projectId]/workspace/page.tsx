export const dynamic = 'force-dynamic';
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui";
import { WorkspaceBoard } from "@/components/workspace-board";
import { getBidReviewSnapshot } from "@/lib/bid-review";
import { getBidWorkspaceSnapshot } from "@/lib/bid-workspace";
import { getProjectPredictionSummary } from "@/lib/predict";
import { getActiveOrganizationContext } from "@/lib/platform";

const createTimeout = (ms: number) => new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms));

export default async function WorkspacePage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const organization = await getActiveOrganizationContext();
  const organizationId = organization.id === "org_demo" ? undefined : organization.id;
  
  let snapshot: any = {};
  let reviewSnapshot: any = {};
  let prediction: any = {};
  
  try {
    const [snap, reviewSnap, pred] = await Promise.race([
      Promise.all([
        getBidWorkspaceSnapshot(projectId, organizationId),
        getBidReviewSnapshot(projectId, organizationId),
        getProjectPredictionSummary(projectId, organizationId),
      ]),
      createTimeout(10000)
    ]) as any[];
    
    if (snap) snapshot = snap;
    if (reviewSnap) reviewSnapshot = reviewSnap;
    if (pred) prediction = pred;
  } catch (error) {
    console.error('Failed to load workspace data:', error);
  }

  return (
    <AppShell title="Workspace" eyebrow="Submission" organization={organization}>
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

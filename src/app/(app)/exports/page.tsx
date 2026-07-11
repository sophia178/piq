export const dynamic = 'force-dynamic';
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui";
import { SubmissionExportBoard } from "@/components/submission-export-board";
import { getSubmissionExportDashboardSnapshot, getSubmissionExportWorkspaceSnapshot } from "@/lib/submission-export";

const createTimeout = (ms: number) => new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms));

export default async function ExportsPage({
  searchParams,
}: {
  searchParams?: Promise<{ projectId?: string; templateId?: string }>;
}) {
  const params = (await searchParams) ?? {};
  
  let dashboard: any = { organization: { id: "org_demo" }, projects: [] };
  let workspace: any = { projects: [] };
  
  try {
    dashboard = await Promise.race([
      getSubmissionExportDashboardSnapshot(),
      createTimeout(10000)
    ]);
  } catch (error) {
    console.error('Failed to load exports dashboard:', error);
  }
  
  const selectedProjectId = params.projectId ?? dashboard.projects[0]?.projectId ?? "proj_1";
  
  try {
    workspace = await Promise.race([
      getSubmissionExportWorkspaceSnapshot(
        selectedProjectId,
        dashboard.organization.id === "org_demo" ? undefined : dashboard.organization.id,
        params.templateId,
      ),
      createTimeout(10000)
    ]);
  } catch (error) {
    console.error('Failed to load exports workspace:', error);
  }

  return (
    <AppShell title="Exports" eyebrow="Submission" organization={dashboard.organization}>
      <div className="mb-5">
        <Card className="p-5">
          <p className="text-sm text-slate-300">
            Build submission-ready bid packs directly from the existing workspace, review, knowledge, and compliance data. Exports apply organisation branding, final validation, supporting evidence, and template thresholds before generation.
          </p>
        </Card>
      </div>
      <SubmissionExportBoard dashboard={dashboard} workspace={workspace} />
    </AppShell>
  );
}

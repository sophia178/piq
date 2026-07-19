export const dynamic = 'force-dynamic';
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui";
import { SubmissionExportBoard } from "@/components/submission-export-board";
import { getSubmissionExportDashboardSnapshot, getSubmissionExportWorkspaceSnapshot } from "@/lib/submission-export";
import { getAuthenticatedAppContext } from "@/lib/platform";

const createTimeout = (ms: number) => new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms));

export default async function ExportsPage({
  searchParams,
}: {
  searchParams?: Promise<{ projectId?: string; templateId?: string }>;
}) {
  const { organization, organizationId } = await getAuthenticatedAppContext();
  let dashboard: any = { organization, projects: [] };
  let workspace: any = { projects: [] };

  try {
    const params = (await searchParams) ?? {};
    
    try {
      dashboard = await Promise.race([
        getSubmissionExportDashboardSnapshot(organizationId),
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
          organizationId,
          params.templateId,
        ),
        createTimeout(10000)
      ]);
    } catch (error) {
      console.error('Failed to load exports workspace:', error);
    }
  } catch (error) {
    console.error('Failed to load exports page:', error);
  }

  return (
    <AppShell title="Exports" eyebrow="Submission" organization={dashboard?.organization || { id: undefined, companyName: "Your Organization", industry: "", website: null, employeeCount: "1-10", certifications: [], location: "" }}>
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

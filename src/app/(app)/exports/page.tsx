import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui";
import { SubmissionExportBoard } from "@/components/submission-export-board";
import { getSubmissionExportDashboardSnapshot, getSubmissionExportWorkspaceSnapshot } from "@/lib/submission-export";

export default async function ExportsPage({
  searchParams,
}: {
  searchParams?: Promise<{ projectId?: string; templateId?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const dashboard = await getSubmissionExportDashboardSnapshot();
  const selectedProjectId = params.projectId ?? dashboard.projects[0]?.projectId ?? "proj_1";
  const workspace = await getSubmissionExportWorkspaceSnapshot(
    selectedProjectId,
    dashboard.organization.id === "org_demo" ? undefined : dashboard.organization.id,
    params.templateId,
  );

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

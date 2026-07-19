"use client";

import { useMemo, useState, useTransition } from "react";
import type {
  ExportTemplateRecord,
  OrganizationBrandingSettings,
  SubmissionExportDashboardSnapshot,
  SubmissionExportType,
  SubmissionExportWorkspaceSnapshot,
  SubmissionValidationSnapshot,
} from "@/lib/submission-export";
import { Badge, Button, Card, Input, Textarea } from "@/components/ui";

function formatDate(value?: string | null) {
  if (!value) return "TBC";
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function recommendationTone(value: string) {
  if (value === "Ready For Submission") return "bg-emerald-500/10 text-emerald-200";
  if (value === "Needs Review") return "bg-amber-500/10 text-amber-200";
  return "bg-rose-500/10 text-rose-200";
}

async function downloadExport(input: {
  projectId: string;
  organizationId?: string;
  exportType: SubmissionExportType;
  templateId?: string;
}) {
  const response = await fetch("/api/export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "Unable to generate export.");
  }

  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition");
  const fileNameMatch = disposition?.match(/filename="([^"]+)"/);
  const fileName = fileNameMatch?.[1] ?? "submission-export";
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function SubmissionExportBoard({
  dashboard,
  workspace,
}: {
  dashboard: SubmissionExportDashboardSnapshot;
  workspace: SubmissionExportWorkspaceSnapshot;
}) {
  const [branding, setBranding] = useState<OrganizationBrandingSettings>(workspace.branding);
  const [validation, setValidation] = useState<SubmissionValidationSnapshot>(workspace.validation);
  const [templateForm, setTemplateForm] = useState({
    name: workspace.selectedTemplate.name,
    templateType: workspace.selectedTemplate.templateType,
    description: workspace.selectedTemplate.description,
    readinessThreshold: String(workspace.selectedTemplate.readinessThreshold),
    complianceThreshold: String(workspace.selectedTemplate.complianceThreshold),
    evidenceThreshold: String(workspace.selectedTemplate.evidenceThreshold),
    includeAppendices: workspace.selectedTemplate.includeAppendices,
    includeSupportingEvidence: workspace.selectedTemplate.includeSupportingEvidence,
  });
  const [status, setStatus] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedProject = workspace.projectSummary;
  const selectedTemplate = workspace.selectedTemplate;

  const exportActions = useMemo(
    () => [
      { key: "bid_pack_docx", label: "Bid Pack DOCX" },
      { key: "bid_pack_pdf", label: "Bid Pack PDF" },
      { key: "executive_summary_pdf", label: "Executive Summary PDF" },
      { key: "compliance_pack_pdf", label: "Compliance Pack PDF" },
      { key: "evidence_pack_pdf", label: "Evidence Pack PDF" },
    ] as Array<{ key: SubmissionExportType; label: string }>,
    [],
  );

  function handleBrandingSave() {
    startTransition(async () => {
      setStatus("Saving branding settings...");
      const response = await fetch("/api/export/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: dashboard.organization.id,
          ...branding,
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        setStatus(data?.error ?? "Unable to save branding settings.");
        return;
      }

      const next = (await response.json()) as OrganizationBrandingSettings;
      setBranding(next);
      setStatus("Branding settings saved.");
    });
  }

  function handleTemplateSave() {
    startTransition(async () => {
      setStatus("Saving export template...");
      const response = await fetch("/api/export/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: dashboard.organization.id,
          templateId: selectedTemplate.templateType === "custom" ? selectedTemplate.id : undefined,
          name: templateForm.name,
          templateType: templateForm.templateType,
          description: templateForm.description,
          readinessThreshold: Number(templateForm.readinessThreshold),
          complianceThreshold: Number(templateForm.complianceThreshold),
          evidenceThreshold: Number(templateForm.evidenceThreshold),
          includeAppendices: templateForm.includeAppendices,
          includeSupportingEvidence: templateForm.includeSupportingEvidence,
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        setStatus(data?.error ?? "Unable to save export template.");
        return;
      }

      setStatus("Export template saved. Refresh the page to load the updated template list.");
    });
  }

  function handleRunValidation() {
    startTransition(async () => {
      setStatus("Running final submission validation...");
      const response = await fetch("/api/export/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: dashboard.organization.id,
          projectId: selectedProject.projectId,
          templateId: selectedTemplate.id,
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        setStatus(data?.error ?? "Unable to run final validation.");
        return;
      }

      const next = (await response.json()) as SubmissionValidationSnapshot;
      setValidation(next);
      setStatus("Final submission validation updated.");
    });
  }

  function handleDownload(exportType: SubmissionExportType) {
    startTransition(async () => {
      setStatus(`Generating ${exportType.replace(/_/g, " ")}...`);

      try {
        await downloadExport({
          organizationId: dashboard.organization.id,
          projectId: selectedProject.projectId,
          exportType,
          templateId: selectedTemplate.id,
        });
        setStatus("Export generated successfully.");
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Unable to generate export.");
      }
    });
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Readiness Score</p>
          <p className="mt-3 text-3xl font-semibold text-white">{selectedProject.readinessScore}%</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Compliance Score</p>
          <p className="mt-3 text-3xl font-semibold text-white">{selectedProject.complianceScore}%</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Evidence Score</p>
          <p className="mt-3 text-3xl font-semibold text-white">{selectedProject.evidenceScore}%</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Export Risk Score</p>
          <p className="mt-3 text-3xl font-semibold text-white">{validation.exportRiskScore}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Submission Recommendation</p>
          <Badge className={`mt-3 ${recommendationTone(validation.finalSubmissionRecommendation)}`}>{validation.finalSubmissionRecommendation}</Badge>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Bid Pack Builder</p>
              <h2 className="mt-2 text-xl font-semibold text-white">{selectedProject.title}</h2>
              <p className="mt-2 text-sm text-slate-300">{selectedProject.issuingBody}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-white/8">{selectedTemplate.name}</Badge>
              <Button variant="secondary" onClick={handleRunValidation} disabled={isPending}>
                Run Final Validation
              </Button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {exportActions.map((item) => (
              <Button key={item.key} onClick={() => handleDownload(item.key)} disabled={isPending}>
                {item.label}
              </Button>
            ))}
          </div>

          {status ? <p className="mt-4 text-sm text-teal-100">{status}</p> : null}

          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-sm font-semibold text-white">Final readiness report</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              {validation.finalReadinessReport.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="mt-4 text-sm font-semibold text-white">Final actions</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              {validation.finalActions.length > 0 ? validation.finalActions.map((item) => <li key={item}>{item}</li>) : <li>No final actions currently required.</li>}
            </ul>
          </div>
        </Card>

        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Submission Checklist</p>
          <div className="mt-4 space-y-3">
            {validation.submissionChecklist.map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-white">{item.label}</p>
                  <Badge
                    className={
                      item.status === "complete"
                        ? "bg-emerald-500/10 text-emerald-200"
                        : item.status === "warning"
                          ? "bg-amber-500/10 text-amber-200"
                          : "bg-rose-500/10 text-rose-200"
                    }
                  >
                    {item.status}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-slate-300">{item.detail}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Organisation Branding</p>
              <h2 className="mt-2 text-xl font-semibold text-white">Document styling</h2>
            </div>
            <Button variant="secondary" onClick={handleBrandingSave} disabled={isPending}>
              Save Branding
            </Button>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-500">Company Name</p>
              <Input value={branding.companyName} onChange={(event) => setBranding((current) => ({ ...current, companyName: event.target.value }))} />
            </div>
            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-500">Logo URL</p>
              <Input value={branding.logoUrl ?? ""} onChange={(event) => setBranding((current) => ({ ...current, logoUrl: event.target.value }))} />
            </div>
            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-500">Primary Colour</p>
              <Input value={branding.primaryColor} onChange={(event) => setBranding((current) => ({ ...current, primaryColor: event.target.value }))} />
            </div>
            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-500">Secondary Colour</p>
              <Input value={branding.secondaryColor} onChange={(event) => setBranding((current) => ({ ...current, secondaryColor: event.target.value }))} />
            </div>
          </div>
          <div className="mt-4 grid gap-4">
            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-500">Header</p>
              <Input value={branding.headerText} onChange={(event) => setBranding((current) => ({ ...current, headerText: event.target.value }))} />
            </div>
            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-500">Footer</p>
              <Input value={branding.footerText} onChange={(event) => setBranding((current) => ({ ...current, footerText: event.target.value }))} />
            </div>
            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-500">Contact Information</p>
              <Textarea value={branding.contactInformation} onChange={(event) => setBranding((current) => ({ ...current, contactInformation: event.target.value }))} className="min-h-24" />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Template System</p>
              <h2 className="mt-2 text-xl font-semibold text-white">Export templates</h2>
            </div>
            <Button variant="secondary" onClick={handleTemplateSave} disabled={isPending}>
              Save Template
            </Button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {workspace.templates.map((template) => (
              <a
                key={template.id}
                href={`/exports?projectId=${selectedProject.projectId}&templateId=${template.id}`}
                className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${
                  template.id === selectedTemplate.id ? "border-teal-300/30 bg-teal-400/10 text-teal-100" : "border-white/10 bg-white/5 text-slate-300"
                }`}
              >
                {template.name}
              </a>
            ))}
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-500">Template Name</p>
              <Input value={templateForm.name} onChange={(event) => setTemplateForm((current) => ({ ...current, name: event.target.value }))} />
            </div>
            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-500">Template Type</p>
              <select
                value={templateForm.templateType}
                onChange={(event) =>
                  setTemplateForm((current) => ({
                    ...current,
                    templateType: event.target.value as ExportTemplateRecord["templateType"],
                  }))
                }
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
              >
                <option value="public_sector">Public Sector</option>
                <option value="nhs">NHS</option>
                <option value="local_government">Local Government</option>
                <option value="framework">Framework</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-500">Readiness Threshold</p>
              <Input value={templateForm.readinessThreshold} onChange={(event) => setTemplateForm((current) => ({ ...current, readinessThreshold: event.target.value }))} />
            </div>
            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-500">Compliance Threshold</p>
              <Input value={templateForm.complianceThreshold} onChange={(event) => setTemplateForm((current) => ({ ...current, complianceThreshold: event.target.value }))} />
            </div>
            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-500">Evidence Threshold</p>
              <Input value={templateForm.evidenceThreshold} onChange={(event) => setTemplateForm((current) => ({ ...current, evidenceThreshold: event.target.value }))} />
            </div>
          </div>
          <div className="mt-4">
            <p className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-500">Template Description</p>
            <Textarea value={templateForm.description} onChange={(event) => setTemplateForm((current) => ({ ...current, description: event.target.value }))} className="min-h-24" />
          </div>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Export History</p>
          <div className="mt-4 space-y-3">
            {workspace.exportHistory.length > 0 ? (
              workspace.exportHistory.map((item) => (
                <div key={item.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-white">{item.fileName}</p>
                    <Badge className={recommendationTone(item.finalSubmissionRecommendation)}>{item.finalSubmissionRecommendation}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-slate-300">{item.exportType.replace(/_/g, " ")}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    Generated {formatDate(item.generatedDate)} | Risk score {item.exportRiskScore}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm text-slate-400">
                No exports have been generated for this project yet.
              </div>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Projects</p>
          <div className="mt-4 space-y-3">
            {dashboard.projects.map((project) => (
              <a
                key={project.projectId}
                href={`/exports?projectId=${project.projectId}`}
                className="block rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:bg-white/[0.05]"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-white">{project.title}</p>
                  <Badge className={recommendationTone(project.finalSubmissionRecommendation)}>{project.finalSubmissionRecommendation}</Badge>
                </div>
                <p className="mt-2 text-sm text-slate-300">{project.issuingBody}</p>
                <p className="mt-2 text-xs text-slate-500">
                  Readiness {project.readinessScore}% | Compliance {project.complianceScore}% | Evidence {project.evidenceScore}% | Export risk {project.exportRiskScore}
                </p>
              </a>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}

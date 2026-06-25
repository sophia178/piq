"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ChangeEvent, FormEvent } from "react";
import type { KnowledgeDocumentType, KnowledgeEngineSnapshot } from "@/lib/knowledge";
import { Badge, Button, Card, Input, Textarea } from "@/components/ui";

const knowledgeOptions: Array<{ value: KnowledgeDocumentType; label: string }> = [
  { value: "case_study", label: "Case Study" },
  { value: "previous_bid", label: "Previous Tender Response" },
  { value: "certification", label: "Certification" },
  { value: "policy", label: "Policy" },
  { value: "staff_cv", label: "Staff CV" },
  { value: "method_statement", label: "Method Statement" },
  { value: "framework_agreement", label: "Framework Agreement" },
  { value: "service_description", label: "Service Description" },
  { value: "testimonial", label: "Testimonial" },
];

interface KnowledgeUploadFormState {
  title: string;
  description: string;
  documentType: KnowledgeDocumentType;
  file: File | null;
}

function formatDocumentType(value: KnowledgeDocumentType) {
  return value
    .split("_")
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
    .join(" ");
}

function formatDate(value?: string | null) {
  if (!value) return "TBC";
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(value));
}

function formatCoverageStrength(value: "strong" | "moderate" | "weak") {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function KnowledgeEngineBoard({
  snapshot,
  organizationId,
}: {
  snapshot: KnowledgeEngineSnapshot;
  organizationId?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);
  const [form, setForm] = useState<KnowledgeUploadFormState>({
    title: "",
    description: "",
    documentType: "case_study",
    file: null,
  });
  const uploadDisabled = !organizationId;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.file || !organizationId) {
      setStatus("Choose a file and ensure the organization context is available.");
      return;
    }

    const payload = new FormData();
    payload.set("organizationId", organizationId);
    payload.set("title", form.title || form.file.name.replace(/\.[^.]+$/, ""));
    payload.set("description", form.description);
    payload.set("documentType", form.documentType);
    payload.set("file", form.file);

    startTransition(async () => {
      setStatus("Indexing knowledge document...");
      const response = await fetch("/api/knowledge/upload", {
        method: "POST",
        body: payload,
      });
      const result = (await response.json()) as { error?: string; chunkCount?: number };

      if (result.error) {
        setStatus(result.error);
        return;
      }

      setForm({
        title: "",
        description: "",
        documentType: "case_study",
        file: null,
      });
      setStatus(`Knowledge document indexed into ${result.chunkCount ?? 0} chunks.`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Knowledge Upload</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Organisation evidence library</h2>
          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            <Input
              placeholder="Document title"
              value={form.title}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setForm((current: KnowledgeUploadFormState) => ({ ...current, title: event.target.value }))
              }
            />
            <Textarea
              placeholder="Short description"
              value={form.description}
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                setForm((current: KnowledgeUploadFormState) => ({ ...current, description: event.target.value }))
              }
            />
            <select
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
              value={form.documentType}
              onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                setForm((current: KnowledgeUploadFormState) => ({ ...current, documentType: event.target.value as KnowledgeDocumentType }))
              }
            >
              {knowledgeOptions.map((option) => (
                <option key={option.value} value={option.value} className="bg-slate-950">
                  {option.label}
                </option>
              ))}
            </select>
            <input
              type="file"
              accept=".pdf,.docx,.txt"
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200"
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setForm((current: KnowledgeUploadFormState) => ({ ...current, file: event.target.files?.[0] ?? null }))
              }
            />
            <Button type="submit" disabled={isPending || uploadDisabled}>
              Upload and Index
            </Button>
          </form>
          {status ? <p className="mt-4 text-sm text-teal-200">{status}</p> : null}
          {uploadDisabled ? (
            <p className="mt-3 text-xs text-amber-200">
              Connect a real organisation context to upload and index live knowledge assets. Demo mode still shows knowledge coverage and RAG behaviour.
            </p>
          ) : (
            <p className="mt-3 text-xs text-slate-500">Supported files: PDF, DOCX, TXT. Uploaded evidence is chunked, embedded, and reused automatically in future bid drafting.</p>
          )}
        </Card>

        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Coverage</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Knowledge readiness</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Coverage Score</p>
              <p className="mt-2 text-2xl font-semibold text-white">{snapshot.coverageScore}%</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Documents</p>
              <p className="mt-2 text-2xl font-semibold text-white">{snapshot.totalDocuments}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Chunks Indexed</p>
              <p className="mt-2 text-2xl font-semibold text-white">{snapshot.totalChunks}</p>
            </div>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Assets Used In Drafts</p>
              <p className="mt-2 text-2xl font-semibold text-white">{snapshot.referencedDocuments}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Impactful Assets</p>
              <p className="mt-2 text-2xl font-semibold text-white">{snapshot.impactfulDocuments}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Average Win Lift</p>
              <p className="mt-2 text-2xl font-semibold text-white">{snapshot.averageImpactLift}%</p>
            </div>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Coverage Records</p>
              <p className="mt-2 text-2xl font-semibold text-white">{snapshot.totalCoverageRecords}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Missing Evidence Score</p>
              <p className="mt-2 text-2xl font-semibold text-white">{snapshot.averageMissingEvidenceScore}%</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Missing Certification Score</p>
              <p className="mt-2 text-2xl font-semibold text-white">{snapshot.averageMissingCertificationScore}%</p>
            </div>
          </div>
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-sm font-semibold text-white">Missing knowledge areas</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {snapshot.missingKnowledgeAreas.length > 0 ? (
                snapshot.missingKnowledgeAreas.map((item) => (
                  <Badge key={item} className="bg-amber-500/10 text-amber-200">
                    {item}
                  </Badge>
                ))
              ) : (
                <Badge className="bg-emerald-500/10 text-emerald-200">All core knowledge areas covered</Badge>
              )}
            </div>
          </div>
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-sm font-semibold text-white">Covered areas</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {snapshot.coveredKnowledgeAreas.map((item) => (
                <Badge key={item}>{item}</Badge>
              ))}
            </div>
          </div>
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-sm font-semibold text-white">Coverage by asset type</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {snapshot.coverageByType.map((area) => (
                <div key={area.documentType} className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-white">{area.label}</p>
                    <Badge className={area.covered ? "bg-emerald-500/10 text-emerald-200" : "bg-amber-500/10 text-amber-200"}>
                      {area.covered ? "Covered" : "Missing"}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-slate-400">{area.count} indexed {area.count === 1 ? "document" : "documents"}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-sm font-semibold text-white">Upload recommendations</p>
            <div className="mt-3 space-y-2">
              {snapshot.uploadRecommendations.length > 0 ? (
                snapshot.uploadRecommendations.map((item) => (
                  <p key={item} className="text-sm text-slate-300">
                    {item}
                  </p>
                ))
              ) : (
                <p className="text-sm text-slate-500">No additional uploads recommended right now.</p>
              )}
            </div>
          </div>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Highest Impact Assets</p>
          <div className="mt-5 space-y-4">
            {snapshot.topDocuments.length > 0 ? (
              snapshot.topDocuments.map((document) => (
                <div key={document.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-white">{document.title}</p>
                    <Badge className="bg-emerald-500/10 text-emerald-200">{document.averageWinProbabilityLift}% lift</Badge>
                  </div>
                  <p className="mt-2 text-sm text-slate-300">{document.description ?? "Indexed organisation evidence asset."}</p>
                  <p className="mt-3 text-xs text-slate-500">
                    {formatDocumentType(document.documentType)} • Referenced {document.timesReferenced} times • Influenced {document.influencedBidsCount} bids • Revenue impact {new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(document.revenueImpact)}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm text-slate-400">
                Upload case studies, certifications, policies, and CVs to start tracking which evidence assets improve draft quality and win probability.
              </div>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Most Valuable Documents</p>
          <div className="mt-5 space-y-4">
            {snapshot.mostValuableDocuments.length > 0 ? (
              snapshot.mostValuableDocuments.map((document) => (
                <div key={document.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-white">{document.title}</p>
                    <Badge className="bg-emerald-500/10 text-emerald-200">
                      {new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(document.revenueImpact)}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-slate-300">{document.description ?? "Indexed organisation evidence asset."}</p>
                  <p className="mt-3 text-xs text-slate-500">
                    {document.generatedSectionsInfluenced} sections influenced • {document.averageWinProbabilityLift}% average win lift
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm text-slate-400">
                Knowledge value ranking appears after documents are reused in generated bid sections and revenue impact is tracked.
              </div>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Recent Knowledge Documents</p>
          <div className="mt-5 space-y-4">
            {snapshot.recentDocuments.length > 0 ? (
              snapshot.recentDocuments.map((document) => (
                <div key={document.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-white">{document.title}</p>
                    <Badge>{formatDocumentType(document.documentType)}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-slate-300">{document.description ?? "Indexed organisation evidence asset."}</p>
                  <p className="mt-3 text-xs text-slate-500">
                    {document.chunkCount} chunks • Added {formatDate(document.uploadDate ?? document.createdAt)} • Last used {formatDate(document.lastReferencedAt)} • {document.confidenceScore}% confidence
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm text-slate-400">
                No knowledge documents indexed yet. Start with a recent winning bid, a certification pack, and a strong case study to improve automatic retrieval quality.
              </div>
            )}
          </div>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Tender Coverage</p>
          <div className="mt-5 space-y-4">
            {snapshot.recentCoverage.length > 0 ? (
              snapshot.recentCoverage.map((coverage) => (
                <div key={coverage.projectId} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-white">{coverage.projectId}</p>
                    <Badge
                      className={
                        coverage.coverageStrength === "strong"
                          ? "bg-emerald-500/10 text-emerald-200"
                          : coverage.coverageStrength === "moderate"
                            ? "bg-amber-500/10 text-amber-200"
                            : "bg-rose-500/10 text-rose-200"
                      }
                    >
                      {formatCoverageStrength(coverage.coverageStrength)}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-slate-300">Coverage {coverage.coverageScore}% • Missing evidence {coverage.missingEvidenceScore}% • Missing experience {coverage.missingExperienceScore}%</p>
                  <p className="mt-3 text-xs text-slate-500">
                    {coverage.missingKnowledgeAreas.length > 0 ? coverage.missingKnowledgeAreas.join(", ") : "No critical knowledge gaps recorded."}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm text-slate-400">
                Tender-level knowledge coverage records will appear once workspaces are generated or refreshed.
              </div>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Missing Knowledge Detection</p>
          <div className="mt-5 space-y-4">
            {snapshot.missingKnowledgeAreas.length > 0 ? (
              snapshot.missingKnowledgeAreas.map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-sm font-semibold text-white">{item}</p>
                  <p className="mt-2 text-sm text-slate-300">
                    {snapshot.uploadRecommendations.find((recommendation) => recommendation.toLowerCase().includes(item.split(" ")[0]?.toLowerCase() ?? "")) ??
                      "Upload evidence to close this gap."}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm text-slate-400">
                No major missing knowledge areas detected right now.
              </div>
            )}
          </div>
        </Card>
      </section>
    </div>
  );
}

import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  AlignmentType,
  Document,
  Footer,
  Header,
  HeadingLevel,
  ImageRun,
  Packer,
  PageBreak,
  Paragraph,
  TextRun,
} from "docx";
import OpenAI from "openai";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { z } from "zod";
import { env, hasOpenAIEnv } from "@/lib/env";
import { getBidReviewSnapshot } from "@/lib/bid-review";
import { getBidWorkspaceSnapshot, type BidSectionKey, type BidSectionRecord } from "@/lib/bid-workspace";
import {
  getKnowledgeDocumentTypeLabel,
  loadKnowledgeCoverageForTender,
  loadKnowledgeDocumentsForExport,
  type KnowledgeDocumentRecord,
  type KnowledgeDocumentType,
} from "@/lib/knowledge";
import {
  createServiceSupabaseClient,
  demoOrganization,
  demoProjects,
  getActiveOrganizationContext,
  trackAuditEvent,
  type OrganizationProfile,
} from "@/lib/platform";
import { slugify } from "@/lib/utils";

export type SubmissionExportType =
  | "bid_pack_docx"
  | "bid_pack_pdf"
  | "executive_summary_pdf"
  | "compliance_pack_pdf"
  | "evidence_pack_pdf";

export type ExportTemplateType = "public_sector" | "nhs" | "local_government" | "framework" | "custom";
export type FinalSubmissionRecommendation = "Not Ready" | "Needs Review" | "Ready For Submission";

export interface OrganizationBrandingSettings {
  organizationId?: string;
  logoUrl?: string | null;
  companyName: string;
  primaryColor: string;
  secondaryColor: string;
  headerText: string;
  footerText: string;
  contactInformation: string;
  updatedAt?: string | null;
}

export interface ExportTemplateRecord {
  id: string;
  organizationId?: string | null;
  name: string;
  templateType: ExportTemplateType;
  description: string;
  readinessThreshold: number;
  complianceThreshold: number;
  evidenceThreshold: number;
  includeAppendices: boolean;
  includeSupportingEvidence: boolean;
  sectionOrder: BidSectionKey[];
  isSystem: boolean;
  createdAt?: string | null;
}

export interface SubmissionChecklistItem {
  label: string;
  status: "complete" | "warning" | "missing";
  detail: string;
}

export interface SubmissionValidationSnapshot {
  projectId: string;
  readinessThreshold: number;
  complianceThreshold: number;
  evidenceThreshold: number;
  readinessMet: boolean;
  complianceMet: boolean;
  evidenceMet: boolean;
  allMandatoryRequirementsAnswered: boolean;
  missingSections: string[];
  missingEvidence: string[];
  complianceIssues: string[];
  submissionChecklist: SubmissionChecklistItem[];
  finalReadinessReport: string[];
  exportRiskScore: number;
  finalSubmissionRecommendation: FinalSubmissionRecommendation;
  finalActions: string[];
}

export interface ExportHistoryRecord {
  id: string;
  projectId: string;
  templateId?: string | null;
  exportType: SubmissionExportType;
  generatedDate?: string | null;
  generatedBy?: string | null;
  fileName: string;
  contentType: string;
  finalSubmissionRecommendation: FinalSubmissionRecommendation;
  exportRiskScore: number;
}

export interface SubmissionExportProjectSummary {
  projectId: string;
  title: string;
  issuingBody: string;
  estimatedContractValue?: number;
  readinessScore: number;
  complianceScore: number;
  evidenceScore: number;
  exportRiskScore: number;
  finalSubmissionRecommendation: FinalSubmissionRecommendation;
}

export interface SubmissionExportWorkspaceSnapshot {
  organization: OrganizationProfile;
  branding: OrganizationBrandingSettings;
  templates: ExportTemplateRecord[];
  selectedTemplate: ExportTemplateRecord;
  validation: SubmissionValidationSnapshot;
  exportHistory: ExportHistoryRecord[];
  projectSummary: SubmissionExportProjectSummary;
}

export interface SubmissionExportDashboardSnapshot {
  organization: OrganizationProfile;
  branding: OrganizationBrandingSettings;
  templates: ExportTemplateRecord[];
  projects: SubmissionExportProjectSummary[];
  recentExports: ExportHistoryRecord[];
}

export const SubmissionExportRequestSchema = z.object({
  organizationId: z.string().min(2).optional(),
  projectId: z.string().min(2),
  exportType: z.enum(["bid_pack_docx", "bid_pack_pdf", "executive_summary_pdf", "compliance_pack_pdf", "evidence_pack_pdf"]),
  templateId: z.string().min(2).optional(),
});

export const SubmissionValidationRunSchema = z.object({
  organizationId: z.string().min(2).optional(),
  projectId: z.string().min(2),
  templateId: z.string().min(2).optional(),
});

export const BrandingSettingsSchema = z.object({
  organizationId: z.string().min(2).optional(),
  logoUrl: z.string().url().optional().or(z.literal("")).or(z.null()),
  companyName: z.string().min(2),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  headerText: z.string().min(2),
  footerText: z.string().min(2),
  contactInformation: z.string().min(8),
});

export const ExportTemplateUpsertSchema = z.object({
  organizationId: z.string().min(2).optional(),
  templateId: z.string().min(2).optional(),
  name: z.string().min(3),
  templateType: z.enum(["public_sector", "nhs", "local_government", "framework", "custom"]).default("custom"),
  description: z.string().min(8),
  readinessThreshold: z.number().int().min(50).max(100),
  complianceThreshold: z.number().int().min(50).max(100),
  evidenceThreshold: z.number().int().min(40).max(100),
  includeAppendices: z.boolean().default(true),
  includeSupportingEvidence: z.boolean().default(true),
});

const fullSectionOrder: BidSectionKey[] = [
  "executive_summary",
  "company_overview",
  "technical_response",
  "methodology",
  "risk_management",
  "social_value",
  "esg_response",
  "experience_response",
];

const sectionLabels: Record<BidSectionKey, string> = {
  executive_summary: "Executive Summary",
  company_overview: "Company Overview",
  technical_response: "Technical Response",
  methodology: "Methodology",
  risk_management: "Risk Management",
  social_value: "Social Value",
  esg_response: "ESG Response",
  experience_response: "Experience Response",
};

const demoTemplates: ExportTemplateRecord[] = [
  {
    id: "template_public_sector",
    name: "Public Sector Template",
    templateType: "public_sector",
    description: "Balanced public sector submission pack with strict compliance and evidence thresholds.",
    readinessThreshold: 82,
    complianceThreshold: 80,
    evidenceThreshold: 74,
    includeAppendices: true,
    includeSupportingEvidence: true,
    sectionOrder: fullSectionOrder,
    isSystem: true,
  },
  {
    id: "template_nhs",
    name: "NHS Template",
    templateType: "nhs",
    description: "NHS-focused template with stronger emphasis on risk, governance, and evidence-backed delivery assurance.",
    readinessThreshold: 85,
    complianceThreshold: 84,
    evidenceThreshold: 78,
    includeAppendices: true,
    includeSupportingEvidence: true,
    sectionOrder: fullSectionOrder,
    isSystem: true,
  },
  {
    id: "template_local_government",
    name: "Local Government Template",
    templateType: "local_government",
    description: "Local authority submission template with emphasis on social value, ESG, and governance.",
    readinessThreshold: 80,
    complianceThreshold: 78,
    evidenceThreshold: 72,
    includeAppendices: true,
    includeSupportingEvidence: true,
    sectionOrder: fullSectionOrder,
    isSystem: true,
  },
  {
    id: "template_framework",
    name: "Framework Template",
    templateType: "framework",
    description: "Framework submission template tuned for policy, accreditation, and reference-heavy exports.",
    readinessThreshold: 83,
    complianceThreshold: 82,
    evidenceThreshold: 76,
    includeAppendices: true,
    includeSupportingEvidence: true,
    sectionOrder: fullSectionOrder,
    isSystem: true,
  },
  {
    id: "template_custom_demo",
    name: "Custom Template",
    templateType: "custom",
    description: "Editable export template for organisation-specific thresholds and packaging preferences.",
    readinessThreshold: 81,
    complianceThreshold: 79,
    evidenceThreshold: 72,
    includeAppendices: true,
    includeSupportingEvidence: true,
    sectionOrder: fullSectionOrder,
    isSystem: false,
  },
];

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function normalizeText(value: string | null | undefined) {
  return (value ?? "").toLowerCase().replace(/\s+/g, " ").trim();
}

function hexToRgb(hex: string) {
  const sanitized = hex.replace("#", "");
  const value = Number.parseInt(sanitized, 16);
  return {
    r: ((value >> 16) & 255) / 255,
    g: ((value >> 8) & 255) / 255,
    b: (value & 255) / 255,
  };
}

function mapReadinessRecommendation(score: number, blockers: number): FinalSubmissionRecommendation {
  if (blockers > 0 || score < 78) return "Not Ready";
  if (score < 88) return "Needs Review";
  return "Ready For Submission";
}

async function readPrompt(promptFile: string) {
  return readFile(join(process.cwd(), "src", "prompts", promptFile), "utf8");
}

function buildDefaultBranding(organization: OrganizationProfile): OrganizationBrandingSettings {
  return {
    organizationId: organization.id,
    logoUrl: null,
    companyName: organization.companyName,
    primaryColor: "#2DD4BF",
    secondaryColor: "#0F172A",
    headerText: `${organization.companyName} | Bid Submission Pack`,
    footerText: `${organization.companyName} | Confidential Submission Material`,
    contactInformation: `${organization.companyName} | ${organization.website} | ${organization.location}`,
  };
}

function getTemplateForProject(projectName: string, templates: ExportTemplateRecord[]) {
  const normalized = normalizeText(projectName);
  if (normalized.includes("nhs")) {
    return templates.find((item) => item.templateType === "nhs") ?? templates[0];
  }
  if (normalized.includes("framework")) {
    return templates.find((item) => item.templateType === "framework") ?? templates[0];
  }
  if (normalized.includes("authority") || normalized.includes("council") || normalized.includes("local")) {
    return templates.find((item) => item.templateType === "local_government") ?? templates[0];
  }
  return templates.find((item) => item.templateType === "public_sector") ?? templates[0];
}

async function ensureExportTemplates(organizationId: string) {
  const supabase = createServiceSupabaseClient();
  if (!supabase) return;

  const { data: existing } = await supabase
    .from("export_templates")
    .select("id")
    .eq("organization_id", organizationId)
    .limit(1);

  if ((existing ?? []).length > 0) return;

  await supabase.from("export_templates").insert(
    demoTemplates.map((item) => ({
      organization_id: organizationId,
      name: item.name,
      template_type: item.templateType,
      description: item.description,
      readiness_threshold: item.readinessThreshold,
      compliance_threshold: item.complianceThreshold,
      evidence_threshold: item.evidenceThreshold,
      include_appendices: item.includeAppendices,
      include_supporting_evidence: item.includeSupportingEvidence,
      section_order: item.sectionOrder,
      is_system: item.isSystem,
    })),
  );
}

function mapTemplateRow(row: any): ExportTemplateRecord {
  return {
    id: row.id as string,
    organizationId: (row.organization_id as string | null) ?? null,
    name: row.name as string,
    templateType: row.template_type as ExportTemplateType,
    description: row.description as string,
    readinessThreshold: Number(row.readiness_threshold ?? 0),
    complianceThreshold: Number(row.compliance_threshold ?? 0),
    evidenceThreshold: Number(row.evidence_threshold ?? 0),
    includeAppendices: Boolean(row.include_appendices),
    includeSupportingEvidence: Boolean(row.include_supporting_evidence),
    sectionOrder: ((row.section_order ?? fullSectionOrder) as BidSectionKey[]).filter(Boolean),
    isSystem: Boolean(row.is_system),
    createdAt: (row.created_at as string | null) ?? null,
  };
}

function mapExportHistoryRow(row: any): ExportHistoryRecord {
  return {
    id: row.id as string,
    projectId: row.project_id as string,
    templateId: (row.template_id as string | null) ?? null,
    exportType: row.export_type as SubmissionExportType,
    generatedDate: (row.generated_at as string | null) ?? null,
    generatedBy: (row.generated_by as string | null) ?? null,
    fileName: (row.file_name as string | null) ?? "submission-export",
    contentType: (row.content_type as string | null) ?? "application/pdf",
    finalSubmissionRecommendation: (row.final_submission_recommendation as FinalSubmissionRecommendation | null) ?? "Needs Review",
    exportRiskScore: Number(row.export_risk_score ?? 0),
  };
}

export async function getOrganizationBrandingSettings(organizationId?: string, organization?: OrganizationProfile) {
  const activeOrganization = organization ?? (await getActiveOrganizationContext());
  const fallback = buildDefaultBranding(activeOrganization);
  const supabase = createServiceSupabaseClient();
  if (!supabase || !organizationId) return fallback;

  const { data } = await supabase
    .from("organization_branding_settings")
    .select("organization_id, logo_url, company_name, primary_color, secondary_color, header_text, footer_text, contact_information, updated_at")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!data) {
    await supabase.from("organization_branding_settings").upsert(
      {
        organization_id: organizationId,
        logo_url: fallback.logoUrl,
        company_name: fallback.companyName,
        primary_color: fallback.primaryColor,
        secondary_color: fallback.secondaryColor,
        header_text: fallback.headerText,
        footer_text: fallback.footerText,
        contact_information: fallback.contactInformation,
      },
      { onConflict: "organization_id" },
    );
    return fallback;
  }

  return {
    organizationId,
    logoUrl: (data.logo_url as string | null) ?? null,
    companyName: (data.company_name as string | null) ?? fallback.companyName,
    primaryColor: (data.primary_color as string | null) ?? fallback.primaryColor,
    secondaryColor: (data.secondary_color as string | null) ?? fallback.secondaryColor,
    headerText: (data.header_text as string | null) ?? fallback.headerText,
    footerText: (data.footer_text as string | null) ?? fallback.footerText,
    contactInformation: (data.contact_information as string | null) ?? fallback.contactInformation,
    updatedAt: (data.updated_at as string | null) ?? null,
  };
}

export async function saveOrganizationBrandingSettings(input: z.infer<typeof BrandingSettingsSchema>) {
  const organization = await getActiveOrganizationContext();
  const organizationId = input.organizationId ?? (organization.id === "org_demo" ? undefined : organization.id);
  if (!organizationId) return { ...input, logoUrl: input.logoUrl || null };

  const supabase = createServiceSupabaseClient();
  if (!supabase) return { ...input, logoUrl: input.logoUrl || null };

  await supabase.from("organization_branding_settings").upsert(
    {
      organization_id: organizationId,
      logo_url: input.logoUrl || null,
      company_name: input.companyName,
      primary_color: input.primaryColor,
      secondary_color: input.secondaryColor,
      header_text: input.headerText,
      footer_text: input.footerText,
      contact_information: input.contactInformation,
    },
    { onConflict: "organization_id" },
  );

  await trackAuditEvent({
    action: "submission_export.branding_updated",
    entityType: "organization_branding",
    entityId: organizationId,
    organizationId,
    metadata: {
      companyName: input.companyName,
      primaryColor: input.primaryColor,
      secondaryColor: input.secondaryColor,
    },
  });

  return getOrganizationBrandingSettings(organizationId, organization);
}

export async function getExportTemplates(organizationId?: string) {
  const supabase = createServiceSupabaseClient();
  if (!supabase || !organizationId) return demoTemplates;

  await ensureExportTemplates(organizationId);

  const { data } = await supabase
    .from("export_templates")
    .select("id, organization_id, name, template_type, description, readiness_threshold, compliance_threshold, evidence_threshold, include_appendices, include_supporting_evidence, section_order, is_system, created_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true });

  return (data ?? []).map((row: any) => mapTemplateRow(row));
}

export async function saveExportTemplate(input: z.infer<typeof ExportTemplateUpsertSchema>) {
  const organization = await getActiveOrganizationContext();
  const organizationId = input.organizationId ?? (organization.id === "org_demo" ? undefined : organization.id);
  if (!organizationId) {
    return {
      id: input.templateId ?? randomUUID(),
      organizationId,
      name: input.name,
      templateType: input.templateType,
      description: input.description,
      readinessThreshold: input.readinessThreshold,
      complianceThreshold: input.complianceThreshold,
      evidenceThreshold: input.evidenceThreshold,
      includeAppendices: input.includeAppendices,
      includeSupportingEvidence: input.includeSupportingEvidence,
      sectionOrder: fullSectionOrder,
      isSystem: false,
    } satisfies ExportTemplateRecord;
  }

  const supabase = createServiceSupabaseClient();
  if (!supabase) throw new Error("Supabase service client is unavailable.");

  const row = {
    organization_id: organizationId,
    name: input.name,
    template_type: input.templateType,
    description: input.description,
    readiness_threshold: input.readinessThreshold,
    compliance_threshold: input.complianceThreshold,
    evidence_threshold: input.evidenceThreshold,
    include_appendices: input.includeAppendices,
    include_supporting_evidence: input.includeSupportingEvidence,
    section_order: fullSectionOrder,
    is_system: false,
  };

  const query = input.templateId
    ? supabase.from("export_templates").update(row).eq("organization_id", organizationId).eq("id", input.templateId)
    : supabase.from("export_templates").insert(row);

  const { data } = await query
    .select(
      "id, organization_id, name, template_type, description, readiness_threshold, compliance_threshold, evidence_threshold, include_appendices, include_supporting_evidence, section_order, is_system, created_at",
    )
    .single();

  await trackAuditEvent({
    action: "submission_export.template_saved",
    entityType: "export_template",
    entityId: data?.id as string | undefined,
    organizationId,
    metadata: {
      name: input.name,
      templateType: input.templateType,
    },
  });

  return mapTemplateRow(data);
}

async function getTemplateById(organizationId: string | undefined, templateId: string | undefined, projectName: string) {
  const templates = await getExportTemplates(organizationId);
  const selected = templateId ? templates.find((item) => item.id === templateId) : getTemplateForProject(projectName, templates);
  return {
    templates,
    selectedTemplate: selected ?? templates[0] ?? demoTemplates[0],
  };
}

async function maybeEnhanceValidationWithAI(input: {
  validation: SubmissionValidationSnapshot;
  projectTitle: string;
  reviewSummary: string;
}) {
  if (!hasOpenAIEnv()) return input.validation;

  try {
    const prompt = await readPrompt("submission-readiness-review.md");
    const client = new OpenAI({ apiKey: env.openAiApiKey });
    const response = await client.responses.create({
      model: "gpt-4.1",
      input: [
        { role: "system", content: prompt },
        {
          role: "user",
          content: JSON.stringify({
            projectTitle: input.projectTitle,
            currentValidation: input.validation,
            reviewSummary: input.reviewSummary,
            responseFormat: {
              exportRiskScore: 0,
              finalSubmissionRecommendation: "Not Ready | Needs Review | Ready For Submission",
              finalReadinessReport: ["string"],
              finalActions: ["string"],
            },
          }),
        },
      ],
    });

    const match = response.output_text.match(/\{[\s\S]*\}/);
    if (!match) return input.validation;
    const parsed = JSON.parse(match[0]) as {
      exportRiskScore?: number;
      finalSubmissionRecommendation?: FinalSubmissionRecommendation;
      finalReadinessReport?: string[];
      finalActions?: string[];
    };

    return {
      ...input.validation,
      exportRiskScore:
        typeof parsed.exportRiskScore === "number"
          ? clamp(Math.round(parsed.exportRiskScore), 0, 100)
          : input.validation.exportRiskScore,
      finalSubmissionRecommendation:
        parsed.finalSubmissionRecommendation ?? input.validation.finalSubmissionRecommendation,
      finalReadinessReport:
        Array.isArray(parsed.finalReadinessReport) && parsed.finalReadinessReport.length > 0
          ? parsed.finalReadinessReport
          : input.validation.finalReadinessReport,
      finalActions:
        Array.isArray(parsed.finalActions) && parsed.finalActions.length > 0
          ? parsed.finalActions
          : input.validation.finalActions,
    };
  } catch {
    return input.validation;
  }
}

export async function runSubmissionValidation(input: z.infer<typeof SubmissionValidationRunSchema>) {
  const workspace = await getBidWorkspaceSnapshot(input.projectId, input.organizationId);
  const review = await getBidReviewSnapshot(input.projectId, input.organizationId);
  const { selectedTemplate } = await getTemplateById(input.organizationId, input.templateId, workspace.project.tenderName);

  const sectionMap = new Map<BidSectionKey, BidSectionRecord>(workspace.bidSections.map((section) => [section.sectionKey, section]));
  const missingSections = selectedTemplate.sectionOrder
    .filter((sectionKey) => {
      const section = sectionMap.get(sectionKey);
      return !section || !section.content?.trim() || section.completionPercentage < 60;
    })
    .map((sectionKey) => sectionLabels[sectionKey]);

  const mandatoryRequirements = workspace.bidRequirements.filter((item) => item.mandatory);
  const unansweredMandatory = mandatoryRequirements.filter((item) => item.checklistStatus !== "complete" && item.checklistStatus !== "drafted");
  const missingEvidence = Array.from(
    new Set([
      ...workspace.compliance.missingEvidence,
      ...workspace.compliance.missingReferences,
      ...review.reviewFindings
        .filter((item) => item.findingType === "missing_evidence" || item.findingType === "unsupported_claim")
        .map((item) => item.issue),
    ]),
  ).slice(0, 8);
  const complianceIssues = Array.from(
    new Set([
      ...workspace.compliance.missingDocuments,
      ...workspace.compliance.missingCertifications,
      ...review.reviewFindings
        .filter((item) => item.findingType === "compliance_gap" || item.findingType === "missing_response")
        .map((item) => item.issue),
      ...unansweredMandatory.slice(0, 6).map((item) => `${item.heading} is not fully answered.`),
    ]),
  ).slice(0, 8);

  const latestReview = review.latestReview;
  const complianceScore = latestReview?.complianceScore ?? workspace.compliance.readinessScore;
  const evidenceScore = latestReview?.evidenceScore ?? (workspace.knowledgeCoverage?.coverageScore ?? 0);
  const readinessScore = latestReview?.submissionReadinessScore ?? workspace.compliance.readinessScore;
  const readinessMet = readinessScore >= selectedTemplate.readinessThreshold;
  const complianceMet = complianceScore >= selectedTemplate.complianceThreshold;
  const evidenceMet = evidenceScore >= selectedTemplate.evidenceThreshold;
  const allMandatoryRequirementsAnswered = unansweredMandatory.length === 0;
  const blockingFindings = review.reviewFindings.filter((item) => item.severity === "critical").length;

  const submissionChecklist: SubmissionChecklistItem[] = [
    {
      label: "All mandatory requirements answered",
      status: allMandatoryRequirementsAnswered ? "complete" : "missing",
      detail: allMandatoryRequirementsAnswered
        ? "Mandatory checklist items have responses in the workspace."
        : `${unansweredMandatory.length} mandatory requirement(s) still need a complete answer.`,
    },
    {
      label: "Readiness score threshold met",
      status: readinessMet ? "complete" : "warning",
      detail: `Current readiness score is ${readinessScore}% against a threshold of ${selectedTemplate.readinessThreshold}%.`,
    },
    {
      label: "Compliance score threshold met",
      status: complianceMet ? "complete" : "warning",
      detail: `Current compliance score is ${complianceScore}% against a threshold of ${selectedTemplate.complianceThreshold}%.`,
    },
    {
      label: "Evidence score threshold met",
      status: evidenceMet ? "complete" : "warning",
      detail: `Current evidence score is ${evidenceScore}% against a threshold of ${selectedTemplate.evidenceThreshold}%.`,
    },
    {
      label: "Required sections are present",
      status: missingSections.length === 0 ? "complete" : "missing",
      detail: missingSections.length === 0 ? "All required submission sections are present." : `Missing or underdeveloped sections: ${missingSections.join(", ")}.`,
    },
    {
      label: "Final AI review blockers addressed",
      status: blockingFindings === 0 ? "complete" : "warning",
      detail: blockingFindings === 0 ? "No critical review findings remain." : `${blockingFindings} critical review finding(s) remain open.`,
    },
  ];

  const exportRiskScore = clamp(
    Math.round(
      100 -
        (readinessScore * 0.34 + complianceScore * 0.34 + evidenceScore * 0.2) +
        missingSections.length * 8 +
        missingEvidence.length * 3 +
        complianceIssues.length * 5 +
        blockingFindings * 8,
    ),
    0,
    100,
  );
  const finalSubmissionRecommendation = mapReadinessRecommendation(
    Math.round((readinessScore + complianceScore + evidenceScore) / 3),
    missingSections.length + complianceIssues.length + blockingFindings,
  );

  const initialValidation: SubmissionValidationSnapshot = {
    projectId: input.projectId,
    readinessThreshold: selectedTemplate.readinessThreshold,
    complianceThreshold: selectedTemplate.complianceThreshold,
    evidenceThreshold: selectedTemplate.evidenceThreshold,
    readinessMet,
    complianceMet,
    evidenceMet,
    allMandatoryRequirementsAnswered,
    missingSections,
    missingEvidence,
    complianceIssues,
    submissionChecklist,
    finalReadinessReport: [
      `Submission readiness is ${readinessScore}% with a final export risk score of ${exportRiskScore}.`,
      `Compliance score is ${complianceScore}% and evidence score is ${evidenceScore}%.`,
      workspace.knowledgeCoverage
        ? `Knowledge coverage is ${workspace.knowledgeCoverage.coverageScore}% with ${workspace.knowledgeCoverage.coverageStrength} coverage.`
        : "Knowledge coverage data is not yet available for this workspace.",
    ],
    exportRiskScore,
    finalSubmissionRecommendation,
    finalActions: [
      ...missingSections.slice(0, 2).map((item) => `Complete the ${item} section before export.`),
      ...missingEvidence.slice(0, 2).map((item) => `Attach or reference evidence for: ${item}`),
      ...complianceIssues.slice(0, 2).map((item) => `Resolve compliance issue: ${item}`),
    ].slice(0, 6),
  };

  const aiAdjusted = await maybeEnhanceValidationWithAI({
    validation: initialValidation,
    projectTitle: workspace.project.title,
    reviewSummary: latestReview?.competitivePosition ?? "",
  });

  return aiAdjusted;
}

function collectSectionEvidence(section: BidSectionRecord) {
  return Array.from(new Set([...section.sourceReferences, ...section.supportingEvidence]));
}

function buildAppendixEntries(sections: BidSectionRecord[], knowledgeDocuments: KnowledgeDocumentRecord[]) {
  const evidenceBySection = sections.flatMap((section) =>
    collectSectionEvidence(section).slice(0, 4).map((evidence) => `${section.title}: ${evidence}`),
  );

  const knowledgeAppendices = knowledgeDocuments.slice(0, 8).map(
    (document) =>
      `${document.title} (${getKnowledgeDocumentTypeLabel(document.documentType)}): ${document.extractedText.slice(0, 180)}${
        document.extractedText.length > 180 ? "..." : ""
      }`,
  );

  return Array.from(new Set([...evidenceBySection, ...knowledgeAppendices]));
}

function buildCompliancePackEntries(documents: KnowledgeDocumentRecord[]) {
  const includedTypes: KnowledgeDocumentType[] = ["certification", "policy", "framework_agreement", "testimonial", "case_study"];
  return documents
    .filter((document) => includedTypes.includes(document.documentType))
    .map((document) => ({
      title: document.title,
      typeLabel: getKnowledgeDocumentTypeLabel(document.documentType),
      summary: document.extractedText.slice(0, 260),
      sourceFile: document.sourceFile ?? "Knowledge Engine",
    }));
}

function buildEvidencePackEntries(sections: BidSectionRecord[], documents: KnowledgeDocumentRecord[]) {
  const sectionEvidence = sections.map((section) => ({
    title: section.title,
    entries: collectSectionEvidence(section),
  }));

  const documentEvidence = documents.slice(0, 10).map((document) => `${document.title}: ${document.extractedText.slice(0, 220)}`);
  return { sectionEvidence, documentEvidence };
}

function buildExportFileName(projectTitle: string, exportType: SubmissionExportType) {
  const suffixMap: Record<SubmissionExportType, string> = {
    bid_pack_docx: "bid-pack",
    bid_pack_pdf: "bid-pack",
    executive_summary_pdf: "executive-summary",
    compliance_pack_pdf: "compliance-pack",
    evidence_pack_pdf: "evidence-pack",
  };

  return `${slugify(projectTitle)}-${suffixMap[exportType]}`;
}

async function fetchLogoBytes(url?: string | null) {
  if (!url) return null;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    const extension: "png" | "jpg" | null =
      url.toLowerCase().endsWith(".png") ? "png" : url.toLowerCase().endsWith(".jpg") || url.toLowerCase().endsWith(".jpeg") ? "jpg" : null;
    if (!extension) return null;
    return { buffer: Buffer.from(arrayBuffer), extension };
  } catch {
    return null;
  }
}

function sectionParagraphs(title: string, content: string, primaryColor: string) {
  return [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 280, after: 120 },
      children: [new TextRun({ text: title, color: primaryColor.replace("#", ""), bold: true })],
    }),
    ...content
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map(
        (line) =>
          new Paragraph({
            spacing: { after: 140 },
            children: [new TextRun({ text: line })],
          }),
      ),
  ];
}

async function buildBidPackDocx(params: {
  branding: OrganizationBrandingSettings;
  projectTitle: string;
  issuingBody: string;
  template: ExportTemplateRecord;
  validation: SubmissionValidationSnapshot;
  sections: BidSectionRecord[];
  appendixEntries: string[];
  knowledgeDocuments: KnowledgeDocumentRecord[];
}) {
  const logo = await fetchLogoBytes(params.branding.logoUrl);

  const children = [
    ...(logo
      ? [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new ImageRun({ data: logo.buffer, type: logo.extension, transformation: { width: 120, height: 60 } })],
          }),
        ]
      : []),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 240, after: 120 },
      children: [new TextRun({ text: params.branding.companyName, bold: true, size: 32, color: params.branding.primaryColor.replace("#", "") })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [new TextRun({ text: params.projectTitle, bold: true, size: 42 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [new TextRun({ text: `Issuing body: ${params.issuingBody}` })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [new TextRun({ text: `Template: ${params.template.name}` })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 220 },
      children: [new TextRun({ text: `Submission recommendation: ${params.validation.finalSubmissionRecommendation}` })],
    }),
    new Paragraph({ children: [new PageBreak()] }),
    ...sectionParagraphs("Submission Checklist", params.validation.submissionChecklist.map((item) => `${item.label}: ${item.detail}`).join("\n"), params.branding.primaryColor),
    ...params.sections.flatMap((section) => sectionParagraphs(section.title, section.content, params.branding.primaryColor)),
    ...sectionParagraphs(
      "Supporting Evidence",
      params.sections.flatMap((section) => collectSectionEvidence(section).map((item) => `${section.title}: ${item}`)).join("\n"),
      params.branding.primaryColor,
    ),
    ...sectionParagraphs("Appendices", params.appendixEntries.join("\n"), params.branding.primaryColor),
    ...sectionParagraphs(
      "Knowledge Engine Citations",
      params.knowledgeDocuments
        .slice(0, 10)
        .map((document) => `${document.title} (${getKnowledgeDocumentTypeLabel(document.documentType)}): ${document.extractedText.slice(0, 180)}`)
        .join("\n"),
      params.branding.primaryColor,
    ),
  ];

  const document = new Document({
    sections: [
      {
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [new TextRun({ text: params.branding.headerText, color: params.branding.secondaryColor.replace("#", "") })],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: `${params.branding.footerText} | ${params.branding.contactInformation}` })],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  return Buffer.from(await Packer.toBuffer(document));
}

function splitIntoWrappedLines(text: string, maxCharacters = 92) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxCharacters) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = next;
    }
  });

  if (current) lines.push(current);
  return lines;
}

async function buildPdfDocument(params: {
  branding: OrganizationBrandingSettings;
  title: string;
  sections: Array<{ heading: string; body: string[] }>;
}) {
  const pdf = await PDFDocument.create();
  const pageWidth = 595;
  const pageHeight = 842;
  const margin = 48;
  const primary = hexToRgb(params.branding.primaryColor);
  const secondary = hexToRgb(params.branding.secondaryColor);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page = pdf.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const logo = await fetchLogoBytes(params.branding.logoUrl);
  if (logo) {
    const image = logo.extension === "png" ? await pdf.embedPng(logo.buffer) : await pdf.embedJpg(logo.buffer);
    const scaled = image.scale(0.22);
    page.drawImage(image, { x: margin, y: y - scaled.height, width: scaled.width, height: scaled.height });
  }

  page.drawText(params.title, {
    x: margin,
    y: y - 70,
    size: 24,
    font: boldFont,
    color: rgb(primary.r, primary.g, primary.b),
  });
  page.drawText(params.branding.contactInformation, {
    x: margin,
    y: y - 92,
    size: 10,
    font,
    color: rgb(secondary.r, secondary.g, secondary.b),
  });
  y -= 120;

  const addPage = () => {
    page = pdf.addPage([pageWidth, pageHeight]);
    y = pageHeight - margin;
    page.drawText(params.branding.headerText, {
      x: margin,
      y: y,
      size: 10,
      font: boldFont,
      color: rgb(secondary.r, secondary.g, secondary.b),
    });
    y -= 28;
  };

  const drawLine = (text: string, size = 11, isHeading = false) => {
    if (y < 70) addPage();
    page.drawText(text, {
      x: margin,
      y,
      size,
      font: isHeading ? boldFont : font,
      color: isHeading ? rgb(primary.r, primary.g, primary.b) : rgb(0.2, 0.24, 0.31),
    });
    y -= isHeading ? 18 : 14;
  };

  params.sections.forEach((section) => {
    if (y < 110) addPage();
    drawLine(section.heading, 16, true);
    y -= 4;
    section.body.forEach((paragraph) => {
      splitIntoWrappedLines(paragraph).forEach((line) => drawLine(line, 11, false));
      y -= 6;
    });
    y -= 8;
  });

  pdf.getPages().forEach((currentPage, index) => {
    currentPage.drawText(params.branding.footerText, {
      x: margin,
      y: 28,
      size: 9,
      font,
      color: rgb(secondary.r, secondary.g, secondary.b),
    });
    currentPage.drawText(`Page ${index + 1}`, {
      x: pageWidth - 90,
      y: 28,
      size: 9,
      font,
      color: rgb(secondary.r, secondary.g, secondary.b),
    });
  });

  return Buffer.from(await pdf.save());
}

async function persistExportHistory(input: {
  organizationId?: string;
  projectId: string;
  templateId?: string;
  exportType: SubmissionExportType;
  fileName: string;
  contentType: string;
  validation: SubmissionValidationSnapshot;
}) {
  const supabase = createServiceSupabaseClient();
  if (!supabase || !input.organizationId) {
    return {
      id: randomUUID(),
      projectId: input.projectId,
      templateId: input.templateId ?? null,
      exportType: input.exportType,
      generatedDate: new Date().toISOString(),
      fileName: input.fileName,
      contentType: input.contentType,
      finalSubmissionRecommendation: input.validation.finalSubmissionRecommendation,
      exportRiskScore: input.validation.exportRiskScore,
    } satisfies ExportHistoryRecord;
  }

  const { data } = await supabase
    .from("export_history")
    .insert({
      organization_id: input.organizationId,
      project_id: input.projectId,
      template_id: input.templateId ?? null,
      export_type: input.exportType,
      file_name: input.fileName,
      content_type: input.contentType,
      generated_by: null,
      final_submission_recommendation: input.validation.finalSubmissionRecommendation,
      export_risk_score: input.validation.exportRiskScore,
      validation_snapshot: input.validation,
    })
    .select("id, project_id, template_id, export_type, generated_at, generated_by, file_name, content_type, final_submission_recommendation, export_risk_score")
    .single();

  return mapExportHistoryRow(data);
}

export async function getExportHistory(projectId: string, organizationId?: string) {
  const supabase = createServiceSupabaseClient();
  if (!supabase || !organizationId) return [] as ExportHistoryRecord[];

  const { data } = await supabase
    .from("export_history")
    .select("id, project_id, template_id, export_type, generated_at, generated_by, file_name, content_type, final_submission_recommendation, export_risk_score")
    .eq("organization_id", organizationId)
    .eq("project_id", projectId)
    .order("generated_at", { ascending: false })
    .limit(10);

  return (data ?? []).map((row: any) => mapExportHistoryRow(row));
}

async function buildExportArtifacts(input: z.infer<typeof SubmissionExportRequestSchema>) {
  const organization = await getActiveOrganizationContext();
  const organizationId = input.organizationId ?? (organization.id === "org_demo" ? undefined : organization.id);
  const workspace = await getBidWorkspaceSnapshot(input.projectId, organizationId);
  const review = await getBidReviewSnapshot(input.projectId, organizationId);
  const validation = await runSubmissionValidation({
    organizationId,
    projectId: input.projectId,
    templateId: input.templateId,
  });
  const { selectedTemplate } = await getTemplateById(organizationId, input.templateId, workspace.project.tenderName);
  const branding = await getOrganizationBrandingSettings(organizationId, organization);
  const knowledgeCoverage = await loadKnowledgeCoverageForTender(input.projectId, organizationId);
  const knowledgeDocuments = await loadKnowledgeDocumentsForExport({
    organizationId,
    documentIds: knowledgeCoverage?.supportingDocumentIds ?? [],
    documentTypes: ["certification", "policy", "case_study", "framework_agreement", "service_description", "testimonial", "method_statement"],
    limit: 12,
  });

  const orderedSections = selectedTemplate.sectionOrder
    .map((sectionKey) => workspace.bidSections.find((section) => section.sectionKey === sectionKey))
    .filter((section): section is BidSectionRecord => Boolean(section));

  const appendixEntries = buildAppendixEntries(orderedSections, knowledgeDocuments);
  const complianceEntries = buildCompliancePackEntries(knowledgeDocuments);
  const evidenceEntries = buildEvidencePackEntries(orderedSections, knowledgeDocuments);
  const reviewSummary = review.latestReview;
  const titleBase = workspace.project.title;

  if (input.exportType === "bid_pack_docx") {
    const buffer = await buildBidPackDocx({
      branding,
      projectTitle: titleBase,
      issuingBody: workspace.project.issuingBody,
      template: selectedTemplate,
      validation,
      sections: orderedSections,
      appendixEntries,
      knowledgeDocuments,
    });

    return {
      buffer,
      contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      extension: "docx",
      fileName: buildExportFileName(titleBase, input.exportType),
      organizationId,
      templateId: selectedTemplate.id,
      validation,
      projectId: input.projectId,
    };
  }

  let pdfSections: Array<{ heading: string; body: string[] }> = [];

  if (input.exportType === "bid_pack_pdf") {
    pdfSections = [
      {
        heading: "Final Readiness Report",
        body: [
          ...validation.finalReadinessReport,
          `Final submission recommendation: ${validation.finalSubmissionRecommendation}`,
          `Export risk score: ${validation.exportRiskScore}`,
          reviewSummary?.competitivePosition ?? "No competitive position summary available.",
        ],
      },
      {
        heading: "Submission Checklist",
        body: validation.submissionChecklist.map((item) => `${item.label}: ${item.detail}`),
      },
      ...orderedSections.map((section) => ({
        heading: section.title,
        body: section.content.split(/\n+/).filter(Boolean),
      })),
      {
        heading: "Supporting Evidence",
        body: orderedSections.flatMap((section) => collectSectionEvidence(section).map((item) => `${section.title}: ${item}`)),
      },
      {
        heading: "Appendices",
        body: appendixEntries,
      },
    ];
  }

  if (input.exportType === "executive_summary_pdf") {
    const executiveSummary = orderedSections.find((section) => section.sectionKey === "executive_summary");
    pdfSections = [
      {
        heading: "Executive Summary",
        body: executiveSummary?.content.split(/\n+/).filter(Boolean) ?? ["No executive summary content is currently available."],
      },
      {
        heading: "Submission Position",
        body: [
          `Overall bid score: ${reviewSummary?.overallBidScore ?? 0}%`,
          `Submission readiness score: ${reviewSummary?.submissionReadinessScore ?? validation.readinessThreshold}%`,
          `Final submission recommendation: ${validation.finalSubmissionRecommendation}`,
          reviewSummary?.competitivePosition ?? "No competitive position analysis available.",
        ],
      },
    ];
  }

  if (input.exportType === "compliance_pack_pdf") {
    pdfSections = [
      {
        heading: "Compliance Summary",
        body: [
          `Compliance score: ${reviewSummary?.complianceScore ?? 0}%`,
          `Evidence score: ${reviewSummary?.evidenceScore ?? 0}%`,
          ...validation.complianceIssues.map((item) => `Issue: ${item}`),
        ],
      },
      {
        heading: "Mandatory Requirement Coverage",
        body: workspace.bidRequirements
          .filter((item) => item.mandatory)
          .map((item) => `${item.heading}: ${item.checklistStatus === "complete" ? "Answered" : item.checklistStatus === "drafted" ? "Drafted" : "Outstanding"}`),
      },
      {
        heading: "Compliance Pack Documents",
        body: complianceEntries.map((item) => `${item.title} | ${item.typeLabel} | ${item.summary} | Source: ${item.sourceFile}`),
      },
    ];
  }

  if (input.exportType === "evidence_pack_pdf") {
    pdfSections = [
      {
        heading: "Evidence Pack Summary",
        body: [
          `Evidence score: ${reviewSummary?.evidenceScore ?? 0}%`,
          `Knowledge coverage score: ${knowledgeCoverage?.coverageScore ?? 0}%`,
          ...validation.missingEvidence.map((item) => `Gap: ${item}`),
        ],
      },
      ...evidenceEntries.sectionEvidence.map((section) => ({
        heading: section.title,
        body: section.entries.length > 0 ? section.entries : ["No evidence attached to this section."],
      })),
      {
        heading: "Knowledge Engine Supporting Documents",
        body: evidenceEntries.documentEvidence,
      },
    ];
  }

  const buffer = await buildPdfDocument({
    branding,
    title: `${titleBase} | ${input.exportType.replace(/_/g, " ")}`,
    sections: pdfSections,
  });

  return {
    buffer,
    contentType: "application/pdf",
    extension: "pdf",
    fileName: buildExportFileName(titleBase, input.exportType),
    organizationId,
    templateId: selectedTemplate.id,
    validation,
    projectId: input.projectId,
  };
}

export async function generateSubmissionExport(input: z.infer<typeof SubmissionExportRequestSchema>) {
  const artifact = await buildExportArtifacts(input);
  const history = await persistExportHistory({
    organizationId: artifact.organizationId,
    projectId: artifact.projectId,
    templateId: artifact.templateId,
    exportType: input.exportType,
    fileName: `${artifact.fileName}.${artifact.extension}`,
    contentType: artifact.contentType,
    validation: artifact.validation,
  });

  await trackAuditEvent({
    action: "submission_export.generated",
    entityType: "project_export",
    entityId: history.id,
    organizationId: artifact.organizationId,
    metadata: {
      projectId: input.projectId,
      exportType: input.exportType,
      templateId: artifact.templateId,
      finalSubmissionRecommendation: artifact.validation.finalSubmissionRecommendation,
      exportRiskScore: artifact.validation.exportRiskScore,
    },
  });

  return {
    buffer: artifact.buffer,
    contentType: artifact.contentType,
    extension: artifact.extension,
    fileName: artifact.fileName,
    validation: artifact.validation,
    history,
  };
}

export async function getSubmissionExportWorkspaceSnapshot(
  projectId: string,
  organizationId?: string,
  templateId?: string,
): Promise<SubmissionExportWorkspaceSnapshot> {
  const organization = await getActiveOrganizationContext();
  const activeOrganizationId = organizationId ?? (organization.id === "org_demo" ? undefined : organization.id);
  const workspace = await getBidWorkspaceSnapshot(projectId, activeOrganizationId);
  const review = await getBidReviewSnapshot(projectId, activeOrganizationId);
  const { templates, selectedTemplate } = await getTemplateById(activeOrganizationId, templateId, workspace.project.tenderName);
  const validation = await runSubmissionValidation({
    organizationId: activeOrganizationId,
    projectId,
    templateId: selectedTemplate.id,
  });
  const branding = await getOrganizationBrandingSettings(activeOrganizationId, organization);
  const exportHistory = await getExportHistory(projectId, activeOrganizationId);

  return {
    organization,
    branding,
    templates,
    selectedTemplate,
    validation,
    exportHistory,
    projectSummary: {
      projectId,
      title: workspace.project.title,
      issuingBody: workspace.project.issuingBody,
      estimatedContractValue: workspace.project.estimatedContractValue,
      readinessScore: review.latestReview?.submissionReadinessScore ?? workspace.compliance.readinessScore,
      complianceScore: review.latestReview?.complianceScore ?? workspace.compliance.readinessScore,
      evidenceScore: review.latestReview?.evidenceScore ?? (workspace.knowledgeCoverage?.coverageScore ?? 0),
      exportRiskScore: validation.exportRiskScore,
      finalSubmissionRecommendation: validation.finalSubmissionRecommendation,
    },
  };
}

export async function getSubmissionExportDashboardSnapshot(organizationId?: string): Promise<SubmissionExportDashboardSnapshot> {
  let organization: OrganizationProfile = demoOrganization;
  let branding: OrganizationBrandingSettings = { companyName: "Demo", primaryColor: "#000", secondaryColor: "#000", headerText: "", footerText: "", contactInformation: "" };
  let templates: ExportTemplateRecord[] = [];
  let projects: any[] = [];
  let projectSummaries: any[] = [];
  let recentExports: ExportHistoryRecord[] = [];

  try {
    organization = await getActiveOrganizationContext();
  } catch (error) {
    console.error('Failed to get organization context:', error);
  }

  const activeOrganizationId = organizationId ?? (organization.id === "org_demo" ? undefined : organization.id);

  try {
    branding = await getOrganizationBrandingSettings(activeOrganizationId, organization);
  } catch (error) {
    console.error('Failed to get branding settings:', error);
  }

  try {
    templates = await getExportTemplates(activeOrganizationId);
  } catch (error) {
    console.error('Failed to get export templates:', error);
    templates = [];
  }

  const supabase = createServiceSupabaseClient();

  try {
    const result = supabase && activeOrganizationId
      ? await supabase
          .from("projects")
          .select("id, title, issuing_body, estimated_contract_value, tender_name")
          .eq("organization_id", activeOrganizationId)
          .order("updated_at", { ascending: false })
          .limit(8)
      : null;
    projects = result?.data ?? [];
  } catch (error) {
    console.error('Failed to load projects:', error);
    projects = [];
  }

  if (projects.length === 0) {
    projects = demoProjects.map((item) => ({
      id: item.id,
      title: item.title,
      issuing_body: item.issuingBody,
      estimated_contract_value: item.estimatedContractValue,
      tender_name: item.tenderName,
    }));
  }

  try {
    projectSummaries = await Promise.all(
      (projects as any[]).map(async (project) => {
        try {
          const snapshot = await getSubmissionExportWorkspaceSnapshot(project.id as string, activeOrganizationId);
          return snapshot.projectSummary;
        } catch (error) {
          console.error(`Failed to get workspace snapshot for project ${project.id}:`, error);
          return { projectId: project.id, title: project.title, finalSubmissionRecommendation: "Not Ready", exportRiskScore: 0 };
        }
      }),
    );
  } catch (error) {
    console.error('Failed to load project summaries:', error);
    projectSummaries = [];
  }

  try {
    if (supabase && activeOrganizationId) {
      const result = await supabase
        .from("export_history")
        .select("id, project_id, template_id, export_type, generated_at, generated_by, file_name, content_type, final_submission_recommendation, export_risk_score")
        .eq("organization_id", activeOrganizationId)
        .order("generated_at", { ascending: false })
        .limit(10);
      recentExports = result.data?.map((row: any) => mapExportHistoryRow(row)) ?? [];
    }
  } catch (error) {
    console.error('Failed to load export history:', error);
    recentExports = [];
  }

  return {
    organization,
    branding,
    templates,
    projects: projectSummaries,
    recentExports,
  };
}

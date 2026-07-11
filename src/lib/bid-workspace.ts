import OpenAI from "openai";
import { z } from "zod";
import { syncBidReviewForProject } from "@/lib/bid-review";
import { env, hasOpenAIEnv } from "@/lib/env";
import {
  loadKnowledgeCoverageForTender,
  recordKnowledgeUsage,
  retrieveRelevantKnowledge,
  syncKnowledgeCoverageForTender,
  syncKnowledgeImpactFromBidQuality,
  type KnowledgeCoverageRecord,
  type KnowledgeDocumentType,
} from "@/lib/knowledge";
import type { OpportunityRecord } from "@/lib/opportunities";
import { syncOpportunityRevenueFromBidQuality } from "@/lib/opportunities";
import {
  buildComplianceSnapshot,
  createServiceSupabaseClient,
  demoCompliance,
  demoOrganization,
  demoProjects,
  demoRequirements,
  demoResponses,
  runTenderAnalysis,
  trackAuditEvent,
  type ComplianceSnapshot,
  type ProjectSummary,
  type RequirementItem,
} from "@/lib/platform";

export type BidSectionKey =
  | "executive_summary"
  | "company_overview"
  | "technical_response"
  | "methodology"
  | "risk_management"
  | "social_value"
  | "esg_response"
  | "experience_response";

export type BidChecklistStatus = "todo" | "drafted" | "complete";
export type BidSectionStatus = "not_started" | "in_progress" | "ready_for_review" | "complete";
export type BidTaskStatus = "todo" | "in_progress" | "complete";
export type BidReadinessState = "not_started" | "in_progress" | "ready_for_review" | "ready_for_submission";

export interface BidRequirementRecord {
  id: string;
  requirementId?: string | null;
  heading: string;
  requirement: string;
  category: string;
  mandatory: boolean;
  checklistStatus: BidChecklistStatus;
  missingInformationType?: "document" | "certification" | "evidence" | "reference" | null;
  evidenceGuidance?: string | null;
  sourceExcerpt?: string | null;
  sortOrder: number;
}

export interface BidSectionRecord {
  id: string;
  sectionKey: BidSectionKey;
  title: string;
  status: BidSectionStatus;
  completionPercentage: number;
  sectionOrder: number;
  guidance?: string | null;
  latestDraftId?: string | null;
  latestWorkspaceDocumentId?: string | null;
  lastGeneratedAt?: string | null;
  content: string;
  confidence?: number | null;
  sourceReferences: string[];
  supportingEvidence: string[];
}

export interface BidTaskRecord {
  id: string;
  title: string;
  description?: string | null;
  ownerName?: string | null;
  taskType: "task" | "document" | "review" | "approval";
  status: BidTaskStatus;
  priority: "high" | "medium" | "low";
  dueAt?: string | null;
}

export interface BidTimelineRecord {
  id: string;
  milestoneKey: string;
  title: string;
  details?: string | null;
  dueAt?: string | null;
  status: "pending" | "active" | "complete";
  sortOrder: number;
}

export interface BidWorkspaceSnapshot {
  organizationId?: string;
  project: ProjectSummary;
  opportunity?: OpportunityRecord;
  knowledgeCoverage: KnowledgeCoverageRecord | null;
  requirements: RequirementItem[];
  compliance: ComplianceSnapshot & {
    completionScore: number;
    readinessState: BidReadinessState;
    missingDocuments: string[];
    missingCertifications: string[];
    missingEvidence: string[];
    missingReferences: string[];
  };
  bidRequirements: BidRequirementRecord[];
  bidSections: BidSectionRecord[];
  bidTasks: BidTaskRecord[];
  bidTimeline: BidTimelineRecord[];
}

export const BidSectionRegenerationSchema = z.object({
  organizationId: z.string().min(2).optional(),
  projectId: z.string().min(2),
  sectionKey: z.enum([
    "executive_summary",
    "company_overview",
    "technical_response",
    "methodology",
    "risk_management",
    "social_value",
    "esg_response",
    "experience_response",
  ]),
});

export const BidSectionStatusSchema = z.object({
  organizationId: z.string().min(2).optional(),
  projectId: z.string().min(2),
  sectionKey: z.enum([
    "executive_summary",
    "company_overview",
    "technical_response",
    "methodology",
    "risk_management",
    "social_value",
    "esg_response",
    "experience_response",
  ]),
  status: z.enum(["not_started", "in_progress", "ready_for_review", "complete"]),
  completionPercentage: z.number().int().min(0).max(100).optional(),
});

export const BidTaskStatusSchema = z.object({
  organizationId: z.string().min(2).optional(),
  projectId: z.string().min(2),
  taskId: z.string().min(2),
  status: z.enum(["todo", "in_progress", "complete"]),
});

const sectionCatalog: Array<{
  key: BidSectionKey;
  title: string;
  documentType:
    | "executive_summary"
    | "company_overview"
    | "technical_response"
    | "methodology"
    | "risk_management"
    | "social_value"
    | "esg_response"
    | "experience_response";
  guidance: string;
  order: number;
}> = [
  {
    key: "executive_summary",
    title: "Executive Summary",
    documentType: "executive_summary",
    guidance: "Summarize buyer priorities, delivery confidence, differentiators, and measurable outcomes.",
    order: 1,
  },
  {
    key: "company_overview",
    title: "Company Overview",
    documentType: "company_overview",
    guidance: "Present the organization profile, certifications, scale, and relevant credentials.",
    order: 2,
  },
  {
    key: "technical_response",
    title: "Technical Response",
    documentType: "technical_response",
    guidance: "Address technical requirements, architecture, delivery controls, and compliance approach.",
    order: 3,
  },
  {
    key: "methodology",
    title: "Methodology",
    documentType: "methodology",
    guidance: "Explain mobilisation, governance, workstreams, QA, reporting, and transition.",
    order: 4,
  },
  {
    key: "risk_management",
    title: "Risk Management",
    documentType: "risk_management",
    guidance: "Describe RAID management, mitigations, escalations, and assurance processes.",
    order: 5,
  },
  {
    key: "social_value",
    title: "Social Value",
    documentType: "social_value",
    guidance: "Cover local impact, apprenticeships, community benefit, and measurable social value delivery.",
    order: 6,
  },
  {
    key: "esg_response",
    title: "ESG Response",
    documentType: "esg_response",
    guidance: "Respond on sustainability, carbon reduction, governance, and ethical delivery standards.",
    order: 7,
  },
  {
    key: "experience_response",
    title: "Experience Response",
    documentType: "experience_response",
    guidance: "Demonstrate relevant case studies, quantified outcomes, and named delivery experience.",
    order: 8,
  },
];

function buildSourceText(opportunity: OpportunityRecord) {
  return [
    `Title: ${opportunity.title}`,
    `Buyer: ${opportunity.buyerName}`,
    `Summary: ${opportunity.aiSummary ?? ""}`,
    `Description: ${opportunity.description}`,
    `Locations: ${opportunity.locations.join(", ")}`,
    `Industries: ${opportunity.industryTags.join(", ")}`,
    `CPV Codes: ${opportunity.cpvCodes.join(", ")}`,
    `Deadline: ${opportunity.submissionDeadline ?? "TBC"}`,
  ].join("\n");
}

function classifyMissingInformation(requirement: RequirementItem, organization: typeof demoOrganization) {
  const text = `${requirement.heading} ${requirement.requirement}`.toLowerCase();
  const certifications = organization.certifications.map((item) => item.toLowerCase());

  if (/iso|cyber essentials|certification|accreditation|certified/.test(text)) {
    const certificationMentioned = certifications.some((item) => text.includes(item.toLowerCase()));
    return {
      type: certificationMentioned ? null : "certification",
      guidance: certificationMentioned
        ? "Certification appears covered, but verify the latest certificate date before submission."
        : "Upload the required certification or provide an equivalent accreditation explanation.",
    } as const;
  }

  if (/pricing|insurance|policy|attachment|appendix|schedule|document|form|declaration/.test(text)) {
    return {
      type: "document",
      guidance: "Attach the referenced schedule, declaration, or supporting document to avoid submission gaps.",
    } as const;
  }

  if (/case study|evidence|demonstrate|proof|outcome|experience|track record|example/.test(text)) {
    return {
      type: "evidence",
      guidance: "Add quantified case study evidence with outcomes, scope, and buyer relevance.",
    } as const;
  }

  if (/reference|referee|client contact|testimonial/.test(text)) {
    return {
      type: "reference",
      guidance: "Provide named client references or equivalent delivery referees for validation.",
    } as const;
  }

  return {
    type: null,
    guidance: requirement.mandatory ? "Confirm this mandatory point is supported by a named owner and evidence source." : null,
  } as const;
}

function buildBidRequirements(requirements: RequirementItem[], organization: typeof demoOrganization): BidRequirementRecord[] {
  return requirements.map((item, index) => {
    const classification = classifyMissingInformation(item, organization);
    return {
      id: `bid_req_${index + 1}`,
      requirementId: item.id,
      heading: item.heading,
      requirement: item.requirement,
      category: item.mandatory ? "mandatory" : "scored",
      mandatory: item.mandatory,
      checklistStatus: item.responseStatus,
      missingInformationType: classification.type,
      evidenceGuidance: classification.guidance,
      sourceExcerpt: item.requirement.slice(0, 240),
      sortOrder: index + 1,
    };
  });
}

function daysBetween(start: Date, end: Date) {
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

function dateOffsetFromDeadline(deadline: Date, days: number) {
  return new Date(deadline.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

function buildTimeline(deadline?: string | null): BidTimelineRecord[] {
  const target = deadline ? new Date(deadline) : new Date(Date.now() + 21 * 24 * 60 * 60 * 1000);
  const now = new Date();
  const totalDays = Math.max(daysBetween(now, target), 5);

  const milestones = [
    { milestoneKey: "kickoff", title: "Bid kickoff", details: "Confirm bid/no-bid decision and assign owners.", offset: totalDays },
    { milestoneKey: "evidence_pack", title: "Evidence pack complete", details: "Collect certificates, references, policies, and case studies.", offset: Math.max(5, Math.round(totalDays * 0.65)) },
    { milestoneKey: "first_draft", title: "First draft complete", details: "Complete initial section drafts for internal review.", offset: Math.max(3, Math.round(totalDays * 0.4)) },
    { milestoneKey: "review", title: "Internal review", details: "Run QA, compliance review, and executive review.", offset: Math.max(2, Math.round(totalDays * 0.2)) },
    { milestoneKey: "signoff", title: "Final sign-off", details: "Approve final submission package and attachments.", offset: 1 },
    { milestoneKey: "submission", title: "Submit bid", details: "Complete the final portal submission before the deadline.", offset: 0 },
  ];

  return milestones.map((item, index) => ({
    id: `timeline_${item.milestoneKey}`,
    milestoneKey: item.milestoneKey,
    title: item.title,
    details: item.details,
    dueAt: item.offset === 0 ? target.toISOString() : dateOffsetFromDeadline(target, item.offset),
    status: index === 0 ? "active" : "pending",
    sortOrder: index + 1,
  }));
}

function buildBidTasks(requirements: BidRequirementRecord[], timeline: BidTimelineRecord[]): BidTaskRecord[] {
  const requirementTasks: BidTaskRecord[] = requirements.slice(0, 10).map((item, index) => ({
    id: `task_req_${index + 1}`,
    title: item.mandatory ? `Complete mandatory response for ${item.heading}` : `Refine response for ${item.heading}`,
    description: item.evidenceGuidance ?? `Address ${item.heading} with clear evidence and ownership.`,
    ownerName: item.mandatory ? "Bid Manager" : "SME",
    taskType: item.missingInformationType === "document" ? "document" : "task",
    status: item.checklistStatus === "complete" ? "complete" : item.checklistStatus === "drafted" ? "in_progress" : "todo",
    priority: item.mandatory ? "high" : "medium",
    dueAt: timeline[1]?.dueAt ?? null,
  }));

  const reviewTasks: BidTaskRecord[] = [
    {
      id: "task_review_1",
      title: "Run compliance review",
      description: "Confirm mandatory requirements, attachments, and evidence coverage.",
      ownerName: "Compliance Lead",
      taskType: "review",
      status: "todo",
      priority: "high",
      dueAt: timeline[3]?.dueAt ?? null,
    },
    {
      id: "task_review_2",
      title: "Obtain executive approval",
      description: "Collect final leadership sign-off before submission.",
      ownerName: "Executive Sponsor",
      taskType: "approval",
      status: "todo",
      priority: "high",
      dueAt: timeline[4]?.dueAt ?? null,
    },
  ];

  return [...requirementTasks, ...reviewTasks];
}

function sectionFallbackContent(params: {
  sectionKey: BidSectionKey;
  title: string;
  opportunity: OpportunityRecord;
  requirements: RequirementItem[];
  organization: typeof demoOrganization;
}) {
  const mandatory = params.requirements.filter((item) => item.mandatory).slice(0, 4);

  const templates: Record<BidSectionKey, string> = {
    executive_summary: `${params.organization.companyName} proposes a delivery approach for ${params.opportunity.title} that aligns with ${params.opportunity.buyerName}'s objectives, combines sector-relevant experience, and reduces delivery risk through clear governance, measurable outcomes, and named accountability.`,
    company_overview: `${params.organization.companyName} is a ${params.organization.industry} organization based in ${params.organization.location}. The business operates with certifications including ${params.organization.certifications.join(", ")} and brings relevant capability for this procurement.`,
    technical_response: `Our technical response addresses the opportunity scope through structured mobilisation, delivery governance, secure controls, and evidence-backed execution. Priority requirements include ${mandatory.map((item) => item.heading).join(", ")}.`,
    methodology: `The methodology covers discovery, mobilisation, design, implementation, assurance, and transition. Each stage is governed through workstream ownership, reporting cadence, and benefits tracking tied to buyer outcomes.`,
    risk_management: `Risk management is handled through a live RAID process, early escalation paths, weekly governance, and quantified mitigation actions linked to delivery milestones and supplier dependencies.`,
    social_value: `The social value response focuses on local employment, apprenticeships, SME participation, and measurable community outcomes aligned to the buyer's geography and procurement goals.`,
    esg_response: `The ESG response covers environmental performance, carbon reduction, governance controls, and ethical supply chain management with auditable delivery commitments.`,
    experience_response: `Relevant delivery experience includes comparable public sector and regulated-sector programmes where the organization delivered measurable outcomes, controlled risk, and met complex buyer requirements.`,
  };

  return templates[params.sectionKey];
}

function getSectionKnowledgeTypes(sectionKey: BidSectionKey): KnowledgeDocumentType[] {
  switch (sectionKey) {
    case "executive_summary":
      return ["case_study", "testimonial", "service_description", "previous_bid"];
    case "company_overview":
      return ["certification", "policy", "staff_cv", "framework_agreement"];
    case "technical_response":
      return ["service_description", "method_statement", "certification", "policy"];
    case "methodology":
      return ["method_statement", "service_description", "previous_bid"];
    case "risk_management":
      return ["policy", "certification", "method_statement"];
    case "social_value":
      return ["case_study", "testimonial", "previous_bid"];
    case "esg_response":
      return ["policy", "case_study", "service_description"];
    case "experience_response":
      return ["case_study", "testimonial", "staff_cv", "framework_agreement"];
    default:
      return ["case_study", "certification", "policy"];
  }
}

async function readPrompt(promptFile: string) {
  const { readFile } = await import("node:fs/promises");
  const { join } = await import("node:path");
  return readFile(join(process.cwd(), "src", "prompts", promptFile), "utf8");
}

async function generateSectionDraft(params: {
  organizationId?: string;
  projectId?: string;
  sectionKey: BidSectionKey;
  title: string;
  opportunity: OpportunityRecord;
  requirements: RequirementItem[];
  organization: typeof demoOrganization;
  bidRequirements: BidRequirementRecord[];
}) {
  const knowledgeHits = await retrieveRelevantKnowledge({
    organizationId: params.organizationId,
    query: `${params.title}\n${params.opportunity.title}\n${params.opportunity.description}\n${params.requirements
      .map((item) => `${item.heading}: ${item.requirement}`)
      .join("\n")}`,
    topK: 5,
    allowedDocumentTypes: getSectionKnowledgeTypes(params.sectionKey),
  });
  const knowledgeEvidence = knowledgeHits.map((item) => `- ${item.sourceLabel}: ${item.content.slice(0, 280)}`).join("\n");
  const knowledgeCitations = knowledgeHits.map((item) => item.sourceLabel);
  const supportingEvidence = knowledgeHits.map((item) => item.supportingEvidence);

  const fallback = {
    content: `${sectionFallbackContent(params)}\n\nEvidence basis: ${knowledgeCitations.join(", ") || "Organization profile and requirement checklist"}.`,
    sourceReferences: knowledgeCitations.length > 0 ? knowledgeCitations : ["Opportunity summary", "Organization profile", "Requirement checklist"],
    supportingEvidence,
    confidence: 74,
    knowledgeDocumentIds: knowledgeHits.map((item) => item.knowledgeDocumentId),
    knowledgeHits,
  };

  if (!hasOpenAIEnv()) {
    return fallback;
  }

  try {
    const prompt = await readPrompt("bid-workspace-automation.md");
    const client = new OpenAI({ apiKey: env.openAiApiKey });
    const response = await client.responses.create({
      model: "gpt-4.1",
      input: [
        { role: "system", content: prompt },
        {
          role: "user",
          content: JSON.stringify({
            sectionKey: params.sectionKey,
            sectionTitle: params.title,
            opportunity: params.opportunity,
            organization: params.organization,
            requirements: params.requirements,
            bidRequirements: params.bidRequirements,
            knowledgeEvidence,
          }),
        },
      ],
    });

    return {
      content: response.output_text || fallback.content,
      sourceReferences: knowledgeCitations.length > 0 ? knowledgeCitations : ["Opportunity notice", "Organization profile", "Requirement map"],
      supportingEvidence,
      confidence: 88,
      knowledgeDocumentIds: knowledgeHits.map((item) => item.knowledgeDocumentId),
      knowledgeHits,
    };
  } catch {
    return fallback;
  }
}

function mapCompliance(params: {
  requirements: RequirementItem[];
  bidRequirements: BidRequirementRecord[];
  sections: Array<Pick<BidSectionRecord, "status" | "completionPercentage">>;
  tasks: BidTaskRecord[];
}) {
  const base = buildComplianceSnapshot(params.requirements);
  const missingDocuments = params.bidRequirements.filter((item) => item.missingInformationType === "document").map((item) => `${item.heading}: ${item.evidenceGuidance}`);
  const missingCertifications = params.bidRequirements.filter((item) => item.missingInformationType === "certification").map((item) => `${item.heading}: ${item.evidenceGuidance}`);
  const missingEvidence = params.bidRequirements.filter((item) => item.missingInformationType === "evidence").map((item) => `${item.heading}: ${item.evidenceGuidance}`);
  const missingReferences = params.bidRequirements.filter((item) => item.missingInformationType === "reference").map((item) => `${item.heading}: ${item.evidenceGuidance}`);

  const sectionAverage =
    params.sections.length > 0 ? Math.round(params.sections.reduce((sum, item) => sum + item.completionPercentage, 0) / params.sections.length) : 0;
  const taskCompletion =
    params.tasks.length > 0 ? Math.round((params.tasks.filter((item) => item.status === "complete").length / params.tasks.length) * 100) : 0;
  const completionScore = Math.round(sectionAverage * 0.7 + taskCompletion * 0.3);

  const missingPenalty = Math.min(
    45,
    missingDocuments.length * 6 + missingCertifications.length * 8 + missingEvidence.length * 4 + missingReferences.length * 5,
  );
  const readinessScore = Math.max(0, Math.min(99, Math.round(completionScore * 0.65 + base.readinessScore * 0.35 - missingPenalty)));
  const readinessState: BidReadinessState =
    readinessScore >= 85 && missingPenalty <= 8
      ? "ready_for_submission"
      : readinessScore >= 68
        ? "ready_for_review"
        : readinessScore >= 30
          ? "in_progress"
          : "not_started";

  return {
    ...base,
    readinessScore,
    completionScore,
    readinessState,
    missingDocuments,
    missingCertifications,
    missingEvidence,
    missingReferences,
    missingInformation: [...missingDocuments, ...missingCertifications, ...missingEvidence, ...missingReferences],
    checklist: [
      { label: "Requirement extraction complete", status: "complete" as const },
      {
        label: "Section drafts generated",
        status: sectionAverage >= 65 ? ("complete" as const) : sectionAverage >= 25 ? ("warning" as const) : ("missing" as const),
      },
      {
        label: "Missing information resolved",
        status: missingPenalty === 0 ? ("complete" as const) : missingPenalty < 18 ? ("warning" as const) : ("missing" as const),
      },
      {
        label: "Submission timeline active",
        status: params.tasks.length > 0 ? ("complete" as const) : ("missing" as const),
      },
    ],
  };
}

function normalizeProjectSummary(project: any): ProjectSummary {
  return {
    id: project.id as string,
    title: project.title as string,
    tenderName: project.tender_name as string,
    issuingBody: project.issuing_body as string,
    submissionDeadline: (project.submission_deadline as string | null) ?? new Date().toISOString(),
    estimatedContractValue: (project.estimated_contract_value as number | null) ?? undefined,
    status: project.status as ProjectSummary["status"],
    readinessScore: Number(project.readiness_score ?? 0),
  };
}

async function loadOrganizationProfile(organizationId: string) {
  const supabase = createServiceSupabaseClient();
  if (!supabase) return demoOrganization;

  const { data } = await supabase
    .from("organizations")
    .select("id, company_name, industry, website, employee_count, certifications, location")
    .eq("id", organizationId)
    .maybeSingle();

  if (!data) return demoOrganization;

  return {
    id: data.id as string,
    companyName: data.company_name as string,
    industry: data.industry as string,
    website: (data.website as string | null) ?? demoOrganization.website,
    employeeCount: (data.employee_count as string | null) ?? demoOrganization.employeeCount,
    certifications: (data.certifications ?? []) as string[],
    location: (data.location as string | null) ?? demoOrganization.location,
  };
}

async function trackAnalyticsEvent(event: { organizationId: string; projectId: string; eventName: string; metadata?: Record<string, unknown> }) {
  const supabase = createServiceSupabaseClient();
  if (!supabase) return;

  await supabase.from("analytics_events").insert({
    organization_id: event.organizationId,
    project_id: event.projectId,
    event_name: event.eventName,
    metadata: event.metadata ?? {},
  });
}

export async function bootstrapBidWorkspaceAutomation(input: {
  organizationId?: string;
  projectId: string;
  opportunityId?: string;
}) {
  const supabase = createServiceSupabaseClient();
  if (!supabase || !input.organizationId) {
    return getBidWorkspaceSnapshot(input.projectId);
  }

  const { count } = await supabase
    .from("bid_sections")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", input.organizationId)
    .eq("project_id", input.projectId);
  if ((count ?? 0) > 0) {
    return getBidWorkspaceSnapshot(input.projectId, input.organizationId);
  }

  const [{ data: project }, organization] = await Promise.all([
    supabase
      .from("projects")
      .select("id, title, tender_name, issuing_body, submission_deadline, estimated_contract_value, status, readiness_score")
      .eq("organization_id", input.organizationId)
      .eq("id", input.projectId)
      .single(),
    loadOrganizationProfile(input.organizationId),
  ]);

  if (!project) {
    throw new Error("Project not found for workspace automation.");
  }

  let opportunity: OpportunityRecord | undefined;
  if (input.opportunityId) {
    const { data: opportunityRow } = await supabase
      .from("opportunities")
      .select("id, source_key, source_names, external_id, dedupe_key, title, description, buyer_name, buyer_identifier, source_url, source_notice_number, locations, industry_tags, cpv_codes, currency, minimum_value, maximum_value, estimated_value, published_at, submission_deadline, opportunity_status, ai_summary")
      .eq("organization_id", input.organizationId)
      .eq("id", input.opportunityId)
      .maybeSingle();

    if (opportunityRow) {
      opportunity = {
        id: opportunityRow.id as string,
        sourceKey: opportunityRow.source_key as OpportunityRecord["sourceKey"],
        sourceNames: (opportunityRow.source_names ?? []) as string[],
        externalId: opportunityRow.external_id as string,
        dedupeKey: opportunityRow.dedupe_key as string,
        title: opportunityRow.title as string,
        description: opportunityRow.description as string,
        buyerName: opportunityRow.buyer_name as string,
        buyerIdentifier: (opportunityRow.buyer_identifier as string | null) ?? undefined,
        sourceUrl: (opportunityRow.source_url as string | null) ?? undefined,
        sourceNoticeNumber: (opportunityRow.source_notice_number as string | null) ?? undefined,
        locations: (opportunityRow.locations ?? []) as string[],
        industryTags: (opportunityRow.industry_tags ?? []) as string[],
        cpvCodes: (opportunityRow.cpv_codes ?? []) as string[],
        currency: (opportunityRow.currency as string) ?? "GBP",
        minimumValue: (opportunityRow.minimum_value as number | null) ?? null,
        maximumValue: (opportunityRow.maximum_value as number | null) ?? null,
        estimatedValue: (opportunityRow.estimated_value as number | null) ?? null,
        publishedAt: (opportunityRow.published_at as string | null) ?? null,
        submissionDeadline: (opportunityRow.submission_deadline as string | null) ?? null,
        opportunityStatus: opportunityRow.opportunity_status as string,
        aiSummary: (opportunityRow.ai_summary as string | null) ?? undefined,
      };
    }
  }

  const analysisText = opportunity ? buildSourceText(opportunity) : `${project.tender_name}\n${project.issuing_body}`;
  const analysis = await runTenderAnalysis(analysisText);
  const bidRequirements = buildBidRequirements(analysis.requirements, organization);
  const timeline = buildTimeline(opportunity?.submissionDeadline ?? (project.submission_deadline as string | null));
  const tasks = buildBidTasks(bidRequirements, timeline);

  const draftOutputs = await Promise.all(
    sectionCatalog.map(async (section) => ({
      section,
      draft: await generateSectionDraft({
        sectionKey: section.key,
        title: section.title,
        opportunity:
          opportunity ??
          ({
            id: input.projectId,
            sourceKey: "contracts_finder",
            sourceNames: ["Imported Workspace"],
            externalId: input.projectId,
            dedupeKey: input.projectId,
            title: project.tender_name as string,
            description: analysisText,
            buyerName: project.issuing_body as string,
            locations: [],
            industryTags: [],
            cpvCodes: [],
            currency: "GBP",
            estimatedValue: (project.estimated_contract_value as number | null) ?? null,
            publishedAt: null,
            submissionDeadline: (project.submission_deadline as string | null) ?? null,
            opportunityStatus: "active",
          } as OpportunityRecord),
        requirements: analysis.requirements,
        organizationId: input.organizationId,
        projectId: input.projectId,
        organization,
        bidRequirements,
      }),
    })),
  );

  await syncKnowledgeCoverageForTender({
    organizationId: input.organizationId,
    projectId: input.projectId,
    requirements: analysis.requirements.map((item) => `${item.heading}: ${item.requirement}`),
    supportingDocumentIds: draftOutputs.flatMap(({ draft }) => draft.knowledgeDocumentIds ?? []),
  });

  const initialSectionsForScoring = draftOutputs.map(({ section }) => ({
    status: "ready_for_review" as BidSectionStatus,
    completionPercentage: section.key === "executive_summary" || section.key === "technical_response" ? 70 : 60,
  }));

  const compliance = mapCompliance({
    requirements: analysis.requirements,
    bidRequirements,
    sections: initialSectionsForScoring,
    tasks,
  });

  const { data: tenderAnalysis } = await supabase
    .from("tender_analyses")
    .insert({
      organization_id: input.organizationId,
      project_id: input.projectId,
      analysis_summary: analysis.summary,
      executive_summary: draftOutputs.find((item) => item.section.key === "executive_summary")?.draft.content ?? null,
      deadlines: timeline.map((item) => ({ title: item.title, dueAt: item.dueAt })),
      mandatory_documents: bidRequirements
        .filter((item) => item.missingInformationType === "document")
        .map((item) => ({ heading: item.heading, guidance: item.evidenceGuidance })),
    })
    .select("id")
    .single();

  const { data: insertedRequirements } = await supabase
    .from("requirements")
    .insert(
      analysis.requirements.map((item) => ({
        organization_id: input.organizationId,
        project_id: input.projectId,
        tender_analysis_id: tenderAnalysis?.id ?? null,
        heading: item.heading,
        requirement: item.requirement,
        category: item.mandatory ? "mandatory" : "scored",
        mandatory: item.mandatory,
        owner_name: item.owner ?? null,
        response_status: item.responseStatus,
      })),
    )
    .select("id, heading");

  const requirementIdByHeading = new Map((insertedRequirements ?? []).map((row: any) => [row.heading as string, row.id as string]));

  await supabase.from("bid_requirements").insert(
    bidRequirements.map((item) => ({
      organization_id: input.organizationId,
      project_id: input.projectId,
      requirement_id: item.requirementId ? requirementIdByHeading.get(item.heading) ?? null : null,
      heading: item.heading,
      requirement: item.requirement,
      category: item.category,
      mandatory: item.mandatory,
      checklist_status: item.checklistStatus,
      missing_information_type: item.missingInformationType ?? null,
      evidence_guidance: item.evidenceGuidance ?? null,
      source_excerpt: item.sourceExcerpt ?? null,
      sort_order: item.sortOrder,
    })),
  );

  const responseRows = await supabase
    .from("response_library")
    .insert(
      draftOutputs.map(({ section, draft }) => ({
        organization_id: input.organizationId,
        project_id: input.projectId,
        section_name: section.title,
        content: draft.content,
        source_references: draft.sourceReferences,
        supporting_evidence: draft.supportingEvidence,
        confidence_score: draft.confidence,
      })),
    )
    .select("id, section_name, content, source_references, supporting_evidence, confidence_score");

  const responseBySection = new Map<
    string,
    { id: string; section_name: string; content: string; source_references: string[]; supporting_evidence: string[]; confidence_score: number | null }
  >(
    ((responseRows.data ?? []) as any[]).map((row: any) => [
      row.section_name as string,
      {
        id: row.id as string,
        section_name: row.section_name as string,
        content: row.content as string,
        source_references: (row.source_references ?? []) as string[],
        supporting_evidence: (row.supporting_evidence ?? []) as string[],
        confidence_score: (row.confidence_score as number | null) ?? null,
      },
    ]),
  );

  const sectionDocs = await supabase
    .from("workspace_documents")
    .insert(
      draftOutputs.flatMap(({ section, draft }) => [
        {
          organization_id: input.organizationId,
          project_id: input.projectId,
          title: section.title,
          document_type: section.documentType,
          content: draft.content,
        },
        {
          organization_id: input.organizationId,
          project_id: input.projectId,
          title: `${section.title} Draft 1`,
          document_type: "bid_draft",
          content: draft.content,
        },
      ]),
    )
    .select("id, title, document_type, content");

  const latestDocumentByTitle = new Map(
    (sectionDocs.data ?? [])
      .filter((row: any) => row.document_type !== "bid_draft")
      .map((row: any) => [row.title as string, row.id as string]),
  );

  await supabase.from("bid_sections").insert(
    draftOutputs.map(({ section }) => ({
      organization_id: input.organizationId,
      project_id: input.projectId,
      section_key: section.key,
      title: section.title,
      status: "ready_for_review",
      completion_percentage: section.key === "executive_summary" || section.key === "technical_response" ? 70 : 60,
      section_order: section.order,
      guidance: section.guidance,
      latest_draft_id: responseBySection.get(section.title)?.id ?? null,
      latest_workspace_document_id: latestDocumentByTitle.get(section.title) ?? null,
      last_generated_at: new Date().toISOString(),
    })),
  );

  await supabase.from("bid_tasks").insert(
    tasks.map((item) => ({
      organization_id: input.organizationId,
      project_id: input.projectId,
      title: item.title,
      description: item.description ?? null,
      owner_name: item.ownerName ?? null,
      task_type: item.taskType,
      status: item.status,
      priority: item.priority,
      due_at: item.dueAt ?? null,
    })),
  );

  await supabase.from("bid_timeline").insert(
    timeline.map((item) => ({
      organization_id: input.organizationId,
      project_id: input.projectId,
      milestone_key: item.milestoneKey,
      title: item.title,
      details: item.details ?? null,
      due_at: item.dueAt ?? null,
      status: item.status,
      sort_order: item.sortOrder,
    })),
  );

  await supabase.from("workspace_documents").insert([
    {
      organization_id: input.organizationId,
      project_id: input.projectId,
      title: "Requirement Checklist",
      document_type: "requirement_checklist",
      content: bidRequirements.map((item) => `- [${item.checklistStatus === "complete" ? "x" : " "}] ${item.heading}`).join("\n"),
    },
    {
      organization_id: input.organizationId,
      project_id: input.projectId,
      title: "Submission Timeline",
      document_type: "submission_timeline",
      content: timeline.map((item) => `- ${item.title}: ${item.dueAt ?? "TBC"}`).join("\n"),
    },
  ]);

  await supabase.from("compliance_checks").upsert(
    {
      organization_id: input.organizationId,
      project_id: input.projectId,
      readiness_score: compliance.readinessScore,
      completion_score: compliance.completionScore,
      readiness_state: compliance.readinessState,
      missing_information: compliance.missingInformation,
      missing_documents: compliance.missingDocuments,
      missing_certifications: compliance.missingCertifications,
      missing_evidence: compliance.missingEvidence,
      missing_references: compliance.missingReferences,
      risk_warnings: compliance.riskWarnings,
      checklist: compliance.checklist,
    },
    { onConflict: "project_id" },
  );

  await supabase
    .from("projects")
    .update({
      status: compliance.readinessState === "ready_for_submission" ? "review" : "in_progress",
      readiness_score: compliance.readinessScore,
    })
    .eq("organization_id", input.organizationId)
    .eq("id", input.projectId);

  await syncOpportunityRevenueFromBidQuality({
    organizationId: input.organizationId,
    projectId: input.projectId,
    completionScore: compliance.completionScore,
    readinessScore: compliance.readinessScore,
  });
  await syncKnowledgeImpactFromBidQuality({
    organizationId: input.organizationId,
    projectId: input.projectId,
    completionScore: compliance.completionScore,
    readinessScore: compliance.readinessScore,
  });

  for (const { section, draft } of draftOutputs) {
    await recordKnowledgeUsage({
      organizationId: input.organizationId,
      projectId: input.projectId,
      documentIds: draft.knowledgeDocumentIds ?? [],
      sectionName: section.title,
      generationType: "bid_section_generation",
      chunkHits: draft.knowledgeHits ?? [],
      confidenceScore: draft.confidence,
    });
  }

  await trackAuditEvent({
    action: "workspace.automation_bootstrapped",
    entityType: "project",
    entityId: input.projectId,
    organizationId: input.organizationId,
    metadata: {
      opportunityId: input.opportunityId ?? null,
      requirementCount: analysis.requirements.length,
      sectionCount: sectionCatalog.length,
      taskCount: tasks.length,
      timelineCount: timeline.length,
    },
  });

  await trackAnalyticsEvent({
    organizationId: input.organizationId,
    projectId: input.projectId,
    eventName: "workspace.automation_bootstrapped",
    metadata: {
      opportunityId: input.opportunityId ?? null,
      completionScore: compliance.completionScore,
      readinessScore: compliance.readinessScore,
    },
  });

  await syncBidReviewForProject({
    organizationId: input.organizationId,
    projectId: input.projectId,
  });

  return getBidWorkspaceSnapshot(input.projectId, input.organizationId);
}

export async function regenerateBidSection(input: z.infer<typeof BidSectionRegenerationSchema>) {
  const supabase = createServiceSupabaseClient();
  if (!supabase || !input.organizationId) {
    return { ok: true };
  }

  const snapshot = await getBidWorkspaceSnapshot(input.projectId, input.organizationId);
  const section = sectionCatalog.find((item) => item.key === input.sectionKey);
  if (!section) throw new Error("Unknown bid section.");

  const organization = await loadOrganizationProfile(input.organizationId);
  const draft = await generateSectionDraft({
    sectionKey: section.key,
    title: section.title,
    opportunity:
      snapshot.opportunity ??
      ({
        id: input.projectId,
        sourceKey: "contracts_finder",
        sourceNames: ["Workspace"],
        externalId: input.projectId,
        dedupeKey: input.projectId,
        title: snapshot.project.tenderName,
        description: snapshot.bidRequirements.map((item) => item.requirement).join("\n"),
        buyerName: snapshot.project.issuingBody,
        locations: [],
        industryTags: [],
        cpvCodes: [],
        currency: "GBP",
        estimatedValue: snapshot.project.estimatedContractValue ?? null,
        publishedAt: null,
        submissionDeadline: snapshot.project.submissionDeadline,
        opportunityStatus: "active",
      } as OpportunityRecord),
    requirements: snapshot.requirements,
    organizationId: input.organizationId,
    projectId: input.projectId,
    organization,
    bidRequirements: snapshot.bidRequirements,
  });

  const { data: responseRow } = await supabase
    .from("response_library")
    .insert({
      organization_id: input.organizationId,
      project_id: input.projectId,
      section_name: section.title,
      content: draft.content,
      source_references: draft.sourceReferences,
      supporting_evidence: draft.supportingEvidence,
      confidence_score: draft.confidence,
    })
    .select("id")
    .single();

  await supabase.from("workspace_documents").insert({
    organization_id: input.organizationId,
    project_id: input.projectId,
    title: `${section.title} Draft ${new Date().toISOString()}`,
    document_type: "bid_draft",
    content: draft.content,
  });

  const { data: existingDoc } = await supabase
    .from("workspace_documents")
    .select("id")
    .eq("organization_id", input.organizationId)
    .eq("project_id", input.projectId)
    .eq("document_type", section.documentType)
    .maybeSingle();

  let workspaceDocumentId = existingDoc?.id as string | undefined;
  if (workspaceDocumentId) {
    await supabase
      .from("workspace_documents")
      .update({ title: section.title, content: draft.content })
      .eq("id", workspaceDocumentId);
  } else {
    const { data: insertedDoc } = await supabase
      .from("workspace_documents")
      .insert({
        organization_id: input.organizationId,
        project_id: input.projectId,
        title: section.title,
        document_type: section.documentType,
        content: draft.content,
      })
      .select("id")
      .single();
    workspaceDocumentId = insertedDoc?.id as string;
  }

  await supabase
    .from("bid_sections")
    .update({
      status: "ready_for_review",
      completion_percentage: 70,
      latest_draft_id: responseRow?.id ?? null,
      latest_workspace_document_id: workspaceDocumentId ?? null,
      last_generated_at: new Date().toISOString(),
    })
    .eq("organization_id", input.organizationId)
    .eq("project_id", input.projectId)
    .eq("section_key", input.sectionKey);

  await recalculateBidWorkspaceScores(input.projectId, input.organizationId);
  await syncKnowledgeCoverageForTender({
    organizationId: input.organizationId,
    projectId: input.projectId,
    requirements: snapshot.requirements.map((item) => `${item.heading}: ${item.requirement}`),
    supportingDocumentIds: [...(snapshot.knowledgeCoverage?.supportingDocumentIds ?? []), ...(draft.knowledgeDocumentIds ?? [])],
  });
  await recordKnowledgeUsage({
    organizationId: input.organizationId,
    projectId: input.projectId,
    documentIds: draft.knowledgeDocumentIds ?? [],
    sectionName: section.title,
    generationType: "bid_section_generation",
    chunkHits: draft.knowledgeHits ?? [],
    confidenceScore: draft.confidence,
  });
  await syncBidReviewForProject({
    organizationId: input.organizationId,
    projectId: input.projectId,
  });

  await trackAuditEvent({
    action: "workspace.section_regenerated",
    entityType: "bid_section",
    entityId: input.sectionKey,
    organizationId: input.organizationId,
    metadata: { projectId: input.projectId },
  });

  await trackAnalyticsEvent({
    organizationId: input.organizationId,
    projectId: input.projectId,
    eventName: "workspace.section_regenerated",
    metadata: { sectionKey: input.sectionKey },
  });

  return { ok: true };
}

export async function updateBidSectionStatus(input: z.infer<typeof BidSectionStatusSchema>) {
  const supabase = createServiceSupabaseClient();
  if (!supabase || !input.organizationId) {
    return { ok: true };
  }

  const completionPercentage =
    typeof input.completionPercentage === "number"
      ? input.completionPercentage
      : input.status === "complete"
        ? 100
        : input.status === "ready_for_review"
          ? 85
          : input.status === "in_progress"
            ? 50
            : 0;

  await supabase
    .from("bid_sections")
    .update({
      status: input.status,
      completion_percentage: completionPercentage,
    })
    .eq("organization_id", input.organizationId)
    .eq("project_id", input.projectId)
    .eq("section_key", input.sectionKey);

  await recalculateBidWorkspaceScores(input.projectId, input.organizationId);
  return { ok: true };
}

export async function updateBidTaskStatus(input: z.infer<typeof BidTaskStatusSchema>) {
  const supabase = createServiceSupabaseClient();
  if (!supabase || !input.organizationId) {
    return { ok: true };
  }

  await supabase
    .from("bid_tasks")
    .update({ status: input.status })
    .eq("organization_id", input.organizationId)
    .eq("project_id", input.projectId)
    .eq("id", input.taskId);

  await recalculateBidWorkspaceScores(input.projectId, input.organizationId);
  return { ok: true };
}

export async function recalculateBidWorkspaceScores(projectId: string, organizationId: string) {
  const supabase = createServiceSupabaseClient();
  if (!supabase) return;

  const [requirementsResponse, sectionsResponse, tasksResponse] = await Promise.all([
    supabase
      .from("requirements")
      .select("id, heading, requirement, mandatory, owner_name, response_status")
      .eq("organization_id", organizationId)
      .eq("project_id", projectId),
    supabase
      .from("bid_sections")
      .select("status, completion_percentage")
      .eq("organization_id", organizationId)
      .eq("project_id", projectId),
    supabase
      .from("bid_tasks")
      .select("status")
      .eq("organization_id", organizationId)
      .eq("project_id", projectId),
  ]);

  const organization = await loadOrganizationProfile(organizationId);
  const requirements: RequirementItem[] = (requirementsResponse.data ?? []).map((row: any) => ({
    id: row.id as string,
    heading: row.heading as string,
    requirement: row.requirement as string,
    mandatory: Boolean(row.mandatory),
    owner: (row.owner_name as string | null) ?? undefined,
    responseStatus: row.response_status as RequirementItem["responseStatus"],
  }));
  const bidRequirements = buildBidRequirements(requirements, organization);
  const sections = (sectionsResponse.data ?? []).map((row: any) => ({
    status: row.status as BidSectionStatus,
    completionPercentage: Number(row.completion_percentage ?? 0),
  }));
  const tasks: BidTaskRecord[] = (tasksResponse.data ?? []).map((row: any, index: number) => ({
    id: `task_${index}`,
    title: "",
    taskType: "task",
    status: row.status as BidTaskStatus,
    priority: "medium",
  }));

  const compliance = mapCompliance({ requirements, bidRequirements, sections, tasks });

  await supabase
    .from("compliance_checks")
    .update({
      readiness_score: compliance.readinessScore,
      completion_score: compliance.completionScore,
      readiness_state: compliance.readinessState,
      missing_information: compliance.missingInformation,
      missing_documents: compliance.missingDocuments,
      missing_certifications: compliance.missingCertifications,
      missing_evidence: compliance.missingEvidence,
      missing_references: compliance.missingReferences,
      risk_warnings: compliance.riskWarnings,
      checklist: compliance.checklist,
    })
    .eq("organization_id", organizationId)
    .eq("project_id", projectId);

  await supabase
    .from("projects")
    .update({
      readiness_score: compliance.readinessScore,
      status: compliance.readinessState === "ready_for_submission" ? "review" : compliance.readinessState === "not_started" ? "draft" : "in_progress",
    })
    .eq("organization_id", organizationId)
    .eq("id", projectId);

  await syncOpportunityRevenueFromBidQuality({
    organizationId,
    projectId,
    completionScore: compliance.completionScore,
    readinessScore: compliance.readinessScore,
  });
  await syncKnowledgeImpactFromBidQuality({
    organizationId,
    projectId,
    completionScore: compliance.completionScore,
    readinessScore: compliance.readinessScore,
  });
  await syncKnowledgeCoverageForTender({
    organizationId,
    projectId,
    requirements: requirements.map((item) => `${item.heading}: ${item.requirement}`),
  });
  await syncBidReviewForProject({
    organizationId,
    projectId,
  });
}

export async function getBidWorkspaceSnapshot(projectId: string, organizationId?: string): Promise<BidWorkspaceSnapshot> {
  const supabase = createServiceSupabaseClient();
  if (!supabase || !organizationId) {
    return {
      organizationId,
      project: demoProjects[0],
      knowledgeCoverage: await loadKnowledgeCoverageForTender(projectId, organizationId),
      requirements: demoRequirements,
      compliance: {
        ...demoCompliance,
        completionScore: 78,
        readinessState: "ready_for_review",
        missingDocuments: ["Professional indemnity insurance schedule"],
        missingCertifications: [],
        missingEvidence: ["Quantified transformation case study for healthcare buyer"],
        missingReferences: ["Named client reference for comparable programme"],
      },
      bidRequirements: buildBidRequirements(demoRequirements, demoOrganization),
      bidSections: sectionCatalog.map((section, index) => ({
        id: `section_${section.key}`,
        sectionKey: section.key,
        title: section.title,
        status: index < 3 ? "ready_for_review" : "in_progress",
        completionPercentage: index < 2 ? 85 : index < 5 ? 60 : 40,
        sectionOrder: section.order,
        guidance: section.guidance,
        latestDraftId: `draft_${section.key}`,
        latestWorkspaceDocumentId: `doc_${section.key}`,
        lastGeneratedAt: new Date().toISOString(),
        content:
          demoResponses.find((item) => item.section.toLowerCase().includes(section.title.split(" ")[0].toLowerCase()))?.content ??
          sectionFallbackContent({
            sectionKey: section.key,
            title: section.title,
            opportunity: {
              id: "opp_demo",
              sourceKey: "contracts_finder",
              sourceNames: ["Imported Workspace"],
              externalId: "opp_demo",
              dedupeKey: "opp_demo",
              title: demoProjects[0].tenderName,
              description: demoResponses.map((item) => item.content).join("\n"),
              buyerName: demoProjects[0].issuingBody,
              locations: ["United Kingdom"],
              industryTags: ["consulting"],
              cpvCodes: [],
              currency: "GBP",
              estimatedValue: demoProjects[0].estimatedContractValue ?? null,
              publishedAt: null,
              submissionDeadline: demoProjects[0].submissionDeadline,
              opportunityStatus: "active",
            },
            requirements: demoRequirements,
            organization: demoOrganization,
          }),
        confidence: demoResponses[0]?.confidence ?? 80,
        sourceReferences: ["Organization profile", "Requirement checklist"],
        supportingEvidence: demoResponses[0]?.supportingEvidence ?? ["Quantified case study evidence", "Current certification evidence"],
      })),
      bidTasks: buildBidTasks(buildBidRequirements(demoRequirements, demoOrganization), buildTimeline(demoProjects[0].submissionDeadline)),
      bidTimeline: buildTimeline(demoProjects[0].submissionDeadline),
    };
  }

  let projectResponse: any = { data: null };
  let pipelineResponse: any = { data: null };
  let requirementResponse: any = { data: null };
  let bidRequirementResponse: any = { data: null };
  let complianceResponse: any = { data: null };
  let sectionResponse: any = { data: null };
  let responseLibraryResponse: any = { data: null };
  let workspaceDocResponse: any = { data: null };
  let taskResponse: any = { data: null };
  let timelineResponse: any = { data: null };
  let knowledgeCoverage: any = [];

  try {
    projectResponse = await supabase
      .from("projects")
      .select("id, organization_id, title, tender_name, issuing_body, submission_deadline, estimated_contract_value, status, readiness_score")
      .eq("organization_id", organizationId)
      .eq("id", projectId)
      .single();
  } catch (error) {
    console.error('Failed to load project:', error);
  }

  if (!projectResponse.data) {
    return getBidWorkspaceSnapshot(projectId);
  }

  try {
    pipelineResponse = await supabase
      .from("opportunity_pipeline")
      .select("opportunity_id")
      .eq("organization_id", organizationId)
      .eq("project_id", projectId)
      .maybeSingle();
  } catch (error) {
    console.error('Failed to load opportunity pipeline:', error);
  }

  try {
    requirementResponse = await supabase
      .from("requirements")
      .select("id, heading, requirement, mandatory, owner_name, response_status")
      .eq("organization_id", organizationId)
      .eq("project_id", projectId)
      .order("created_at", { ascending: true });
  } catch (error) {
    console.error('Failed to load requirements:', error);
  }

  try {
    bidRequirementResponse = await supabase
      .from("bid_requirements")
      .select("id, requirement_id, heading, requirement, category, mandatory, checklist_status, missing_information_type, evidence_guidance, source_excerpt, sort_order")
      .eq("organization_id", organizationId)
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true });
  } catch (error) {
    console.error('Failed to load bid requirements:', error);
  }

  try {
    complianceResponse = await supabase
      .from("compliance_checks")
      .select("readiness_score, completion_score, readiness_state, missing_information, missing_documents, missing_certifications, missing_evidence, missing_references, risk_warnings, checklist")
      .eq("organization_id", organizationId)
      .eq("project_id", projectId)
      .maybeSingle();
  } catch (error) {
    console.error('Failed to load compliance checks:', error);
  }

  try {
    sectionResponse = await supabase
      .from("bid_sections")
      .select("id, section_key, title, status, completion_percentage, section_order, guidance, latest_draft_id, latest_workspace_document_id, last_generated_at")
      .eq("organization_id", organizationId)
      .eq("project_id", projectId)
      .order("section_order", { ascending: true });
  } catch (error) {
    console.error('Failed to load bid sections:', error);
  }

  try {
    responseLibraryResponse = await supabase
      .from("response_library")
      .select("id, section_name, content, source_references, supporting_evidence, confidence_score")
      .eq("organization_id", organizationId)
      .eq("project_id", projectId);
  } catch (error) {
    console.error('Failed to load response library:', error);
  }

  try {
    workspaceDocResponse = await supabase
      .from("workspace_documents")
      .select("id, title, document_type, content")
      .eq("organization_id", organizationId)
      .eq("project_id", projectId);
  } catch (error) {
    console.error('Failed to load workspace documents:', error);
  }

  try {
    taskResponse = await supabase
      .from("bid_tasks")
      .select("id, title, description, owner_name, task_type, status, priority, due_at")
      .eq("organization_id", organizationId)
      .eq("project_id", projectId)
      .order("due_at", { ascending: true });
  } catch (error) {
    console.error('Failed to load bid tasks:', error);
  }

  try {
    timelineResponse = await supabase
      .from("bid_timeline")
      .select("id, milestone_key, title, details, due_at, status, sort_order")
      .eq("organization_id", organizationId)
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true });
  } catch (error) {
    console.error('Failed to load bid timeline:', error);
  }

  try {
    knowledgeCoverage = await loadKnowledgeCoverageForTender(projectId, organizationId);
  } catch (error) {
    console.error('Failed to load knowledge coverage:', error);
    knowledgeCoverage = [];
  }

  const project = normalizeProjectSummary(projectResponse.data);
  const requirements: RequirementItem[] = (requirementResponse.data ?? []).map((row: any) => ({
    id: row.id as string,
    heading: row.heading as string,
    requirement: row.requirement as string,
    mandatory: Boolean(row.mandatory),
    owner: (row.owner_name as string | null) ?? undefined,
    responseStatus: row.response_status as RequirementItem["responseStatus"],
  }));

  const responseById = new Map<
    string,
    { id: string; section_name: string; content: string; source_references: string[]; supporting_evidence: string[]; confidence_score: number | null }
  >(
    ((responseLibraryResponse.data ?? []) as any[]).map((row: any) => [
      row.id as string,
      {
        id: row.id as string,
        section_name: row.section_name as string,
        content: row.content as string,
        source_references: (row.source_references ?? []) as string[],
        supporting_evidence: (row.supporting_evidence ?? []) as string[],
        confidence_score: (row.confidence_score as number | null) ?? null,
      },
    ]),
  );
  const docById = new Map<string, { id: string; title: string; document_type: string; content: string }>(
    ((workspaceDocResponse.data ?? []) as any[]).map((row: any) => [
      row.id as string,
      {
        id: row.id as string,
        title: row.title as string,
        document_type: row.document_type as string,
        content: row.content as string,
      },
    ]),
  );

  const opportunityId = (pipelineResponse.data?.opportunity_id as string | null) ?? null;
  let opportunity: OpportunityRecord | undefined;
  if (opportunityId) {
    const { data: opportunityRow } = await supabase
      .from("opportunities")
      .select("id, source_key, source_names, external_id, dedupe_key, title, description, buyer_name, buyer_identifier, source_url, source_notice_number, locations, industry_tags, cpv_codes, currency, minimum_value, maximum_value, estimated_value, published_at, submission_deadline, opportunity_status, ai_summary")
      .eq("organization_id", organizationId)
      .eq("id", opportunityId)
      .maybeSingle();

    if (opportunityRow) {
      opportunity = {
        id: opportunityRow.id as string,
        sourceKey: opportunityRow.source_key as OpportunityRecord["sourceKey"],
        sourceNames: (opportunityRow.source_names ?? []) as string[],
        externalId: opportunityRow.external_id as string,
        dedupeKey: opportunityRow.dedupe_key as string,
        title: opportunityRow.title as string,
        description: opportunityRow.description as string,
        buyerName: opportunityRow.buyer_name as string,
        buyerIdentifier: (opportunityRow.buyer_identifier as string | null) ?? undefined,
        sourceUrl: (opportunityRow.source_url as string | null) ?? undefined,
        sourceNoticeNumber: (opportunityRow.source_notice_number as string | null) ?? undefined,
        locations: (opportunityRow.locations ?? []) as string[],
        industryTags: (opportunityRow.industry_tags ?? []) as string[],
        cpvCodes: (opportunityRow.cpv_codes ?? []) as string[],
        currency: (opportunityRow.currency as string) ?? "GBP",
        minimumValue: (opportunityRow.minimum_value as number | null) ?? null,
        maximumValue: (opportunityRow.maximum_value as number | null) ?? null,
        estimatedValue: (opportunityRow.estimated_value as number | null) ?? null,
        publishedAt: (opportunityRow.published_at as string | null) ?? null,
        submissionDeadline: (opportunityRow.submission_deadline as string | null) ?? null,
        opportunityStatus: opportunityRow.opportunity_status as string,
        aiSummary: (opportunityRow.ai_summary as string | null) ?? undefined,
      };
    }
  }

  const compliance: BidWorkspaceSnapshot["compliance"] = complianceResponse.data
    ? {
        readinessScore: Number(complianceResponse.data.readiness_score ?? 0),
        completionScore: Number(complianceResponse.data.completion_score ?? 0),
        readinessState: complianceResponse.data.readiness_state as BidReadinessState,
        missingInformation: (complianceResponse.data.missing_information ?? []) as string[],
        missingDocuments: (complianceResponse.data.missing_documents ?? []) as string[],
        missingCertifications: (complianceResponse.data.missing_certifications ?? []) as string[],
        missingEvidence: (complianceResponse.data.missing_evidence ?? []) as string[],
        missingReferences: (complianceResponse.data.missing_references ?? []) as string[],
        riskWarnings: (complianceResponse.data.risk_warnings ?? []) as string[],
        checklist: (complianceResponse.data.checklist ?? []) as ComplianceSnapshot["checklist"],
      }
    : {
        ...demoCompliance,
        completionScore: 0,
        readinessState: "not_started",
        missingDocuments: [],
        missingCertifications: [],
        missingEvidence: [],
        missingReferences: [],
      };

  const bidRequirements: BidRequirementRecord[] = (bidRequirementResponse.data ?? []).map((row: any) => ({
    id: row.id as string,
    requirementId: (row.requirement_id as string | null) ?? null,
    heading: row.heading as string,
    requirement: row.requirement as string,
    category: row.category as string,
    mandatory: Boolean(row.mandatory),
    checklistStatus: row.checklist_status as BidChecklistStatus,
    missingInformationType: (row.missing_information_type as BidRequirementRecord["missingInformationType"]) ?? null,
    evidenceGuidance: (row.evidence_guidance as string | null) ?? null,
    sourceExcerpt: (row.source_excerpt as string | null) ?? null,
    sortOrder: Number(row.sort_order ?? 0),
  }));

  const bidSections: BidSectionRecord[] = (sectionResponse.data ?? []).map((row: any) => {
    const draft = row.latest_draft_id ? responseById.get(row.latest_draft_id as string) : null;
    const document = row.latest_workspace_document_id ? docById.get(row.latest_workspace_document_id as string) : null;
    return {
      id: row.id as string,
      sectionKey: row.section_key as BidSectionKey,
      title: row.title as string,
      status: row.status as BidSectionStatus,
      completionPercentage: Number(row.completion_percentage ?? 0),
      sectionOrder: Number(row.section_order ?? 0),
      guidance: (row.guidance as string | null) ?? null,
      latestDraftId: (row.latest_draft_id as string | null) ?? null,
      latestWorkspaceDocumentId: (row.latest_workspace_document_id as string | null) ?? null,
      lastGeneratedAt: (row.last_generated_at as string | null) ?? null,
      content: (document?.content as string | undefined) ?? (draft?.content as string | undefined) ?? "",
      confidence: (draft?.confidence_score as number | null) ?? null,
      sourceReferences: (draft?.source_references ?? []) as string[],
      supportingEvidence: (draft?.supporting_evidence ?? []) as string[],
    };
  });

  const bidTasks: BidTaskRecord[] = (taskResponse.data ?? []).map((row: any) => ({
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string | null) ?? null,
    ownerName: (row.owner_name as string | null) ?? null,
    taskType: row.task_type as BidTaskRecord["taskType"],
    status: row.status as BidTaskStatus,
    priority: row.priority as BidTaskRecord["priority"],
    dueAt: (row.due_at as string | null) ?? null,
  }));

  const bidTimeline: BidTimelineRecord[] = (timelineResponse.data ?? []).map((row: any) => ({
    id: row.id as string,
    milestoneKey: row.milestone_key as string,
    title: row.title as string,
    details: (row.details as string | null) ?? null,
    dueAt: (row.due_at as string | null) ?? null,
    status: row.status as BidTimelineRecord["status"],
    sortOrder: Number(row.sort_order ?? 0),
  }));

  return {
    organizationId: (projectResponse.data.organization_id as string | null) ?? organizationId,
    project,
    opportunity,
    knowledgeCoverage,
    requirements,
    compliance,
    bidRequirements,
    bidSections,
    bidTasks,
    bidTimeline,
  };
}

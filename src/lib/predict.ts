import { randomUUID } from "node:crypto";
import OpenAI from "openai";
import { z } from "zod";
import { env, hasOpenAIEnv } from "@/lib/env";
import { demoOpportunities } from "@/lib/opportunities";
import { createServiceSupabaseClient, demoOrganization, demoProjects, trackAuditEvent } from "@/lib/platform";

export type PredictBidRecommendation = "strong_bid" | "bid" | "borderline" | "no_bid";
export type PredictionFactorCategory = "strength" | "weakness" | "opportunity" | "risk";
export type PredictionOutcomeStatus = "won" | "lost" | "shortlisted" | "rejected";

export interface PredictionFactorRecord {
  id: string;
  predictionHistoryId?: string | null;
  opportunityId?: string | null;
  projectId?: string | null;
  factorCategory: PredictionFactorCategory;
  factorCode: string;
  title: string;
  explanation: string;
  evidence: string;
  impactScore: number;
  remediation: string;
  factorOrder: number;
  createdAt?: string | null;
}

export interface PredictionHistoryRecord {
  id: string;
  opportunityId?: string | null;
  projectId?: string | null;
  title: string;
  buyerName: string;
  sector: string;
  serviceLine: string;
  frameworkName?: string | null;
  tenderType: string;
  estimatedContractValue: number;
  expectedRevenue: number;
  winProbability: number;
  confidenceScore: number;
  bidStrengthScore: number;
  evidenceStrengthScore: number;
  complianceConfidence: number;
  deliveryConfidence: number;
  commercialConfidence: number;
  riskScore: number;
  strategicFitScore: number;
  reviewScore: number;
  knowledgeCoverageScore: number;
  recommendation: PredictBidRecommendation;
  recommendationRationale: string;
  strategistSummary: string;
  scoreBreakdown: Record<string, number>;
  evidenceSnapshot: Record<string, unknown>;
  usedDocumentTypes: string[];
  actualOutcome?: PredictionOutcomeStatus | null;
  predictionAccuracyScore?: number | null;
  outcomeRecordedAt?: string | null;
  createdAt?: string | null;
}

export interface OpportunityPredictionSummaryRecord {
  latestPrediction: PredictionHistoryRecord;
  topStrengths: PredictionFactorRecord[];
  topRisks: PredictionFactorRecord[];
  topOpportunities: PredictionFactorRecord[];
  topWeaknesses: PredictionFactorRecord[];
}

export interface PredictionMetricRecord {
  dimensionType: "overall" | "sector" | "buyer" | "service_line" | "framework" | "document_type";
  dimensionKey: string;
  sampleSize: number;
  wonCount: number;
  lostCount: number;
  shortlistedCount: number;
  rejectedCount: number;
  actualWinRate: number;
  averagePredictedWinProbability: number;
  averageAccuracyScore: number;
  lastOutcomeAt?: string | null;
}

export interface PredictDashboardOpportunity {
  title: string;
  buyerName: string;
  opportunityId?: string | null;
  projectId?: string | null;
  estimatedContractValue: number;
  expectedRevenue: number;
  winProbability: number;
  strategicFitScore: number;
  riskScore: number;
  confidenceScore: number;
  recommendation: PredictBidRecommendation;
  summary: string;
  strengths: string[];
  risks: string[];
}

export interface PredictEngineSnapshot {
  metrics: {
    opportunitiesPredicted: number;
    averageWinProbability: number;
    averageStrategicFit: number;
    averageRiskScore: number;
    strongBidCount: number;
    noBidCount: number;
    averagePredictionAccuracy: number;
  };
  distribution: Array<{ label: string; count: number }>;
  highestProbabilityOpportunities: PredictDashboardOpportunity[];
  lowestProbabilityOpportunities: PredictDashboardOpportunity[];
  strategicFitRankings: PredictDashboardOpportunity[];
  revenueWeightedOpportunities: PredictDashboardOpportunity[];
  recommendationBreakdown: Array<{ recommendation: PredictBidRecommendation; count: number }>;
  accuracy: {
    overall: PredictionMetricRecord | null;
    bySector: PredictionMetricRecord[];
    byBuyer: PredictionMetricRecord[];
    byServiceLine: PredictionMetricRecord[];
    byFramework: PredictionMetricRecord[];
    byDocumentType: PredictionMetricRecord[];
  };
}

export const PredictOpportunitySchema = z
  .object({
    organizationId: z.string().min(2).optional(),
    opportunityId: z.string().min(2).optional(),
    projectId: z.string().min(2).optional(),
    persist: z.boolean().default(true),
  })
  .refine((value) => Boolean(value.opportunityId || value.projectId), {
    message: "Either opportunityId or projectId is required.",
  });

export const RecordPredictionOutcomeSchema = z
  .object({
    organizationId: z.string().min(2),
    opportunityId: z.string().min(2).optional().nullable(),
    projectId: z.string().min(2).optional().nullable(),
    outcome: z.enum(["won", "lost", "shortlisted", "rejected"]),
  })
  .refine((value) => Boolean(value.opportunityId || value.projectId), {
    message: "Either opportunityId or projectId is required.",
  });

const AiPredictNarrativeSchema = z.object({
  strategistSummary: z.string().min(20).max(700).optional(),
  recommendationRationale: z.string().min(20).max(700).optional(),
});

type OrganizationSignals = {
  id?: string;
  companyName: string;
  industry: string;
  location: string;
  certifications: string[];
  activeBidLoad: number;
};

type OpportunitySignals = {
  opportunityId?: string | null;
  projectId?: string | null;
  title: string;
  description: string;
  buyerName: string;
  submissionDeadline?: string | null;
  estimatedContractValue: number;
  expectedRevenue: number;
  expectedWinProbability: number;
  bidEffortScore: number;
  locations: string[];
  industryTags: string[];
  sector: string;
  serviceLine: string;
  tenderType: string;
  frameworkName?: string | null;
};

type WorkspaceSignals = {
  completionScore: number;
  readinessScore: number;
  missingDocuments: string[];
  missingCertifications: string[];
  missingEvidence: string[];
  missingReferences: string[];
  sectionCompletionAverage: number;
  methodologyCompletion: number;
  experienceCompletion: number;
  reviewScore: number;
  knowledgeCoverageScore: number;
  knowledgeCoverageStrength?: string | null;
  knowledgeMissingAreas: string[];
  knowledgeRecommendations: string[];
  usedDocumentTypes: string[];
};

type ReviewSignals = {
  overallBidScore: number;
  complianceScore: number;
  qualityScore: number;
  evidenceScore: number;
  riskScore: number;
  confidenceScore: number;
  strengths: string[];
  weaknesses: string[];
  findings: Array<{ severity: string; issue: string; reason: string; sectionKey?: string | null }>;
  recommendations: Array<{ issue: string; suggestedFix: string }>;
};

type HistoricalSignals = {
  overallWinRate: number;
  sectorWinRate: number;
  buyerWinRate: number;
  serviceLineWinRate: number;
  frameworkWinRate: number;
  documentTypeWinRate: number;
  buyerLossSignals: string[];
  winningFactors: string[];
  losingFactors: string[];
};

type ComputedPrediction = {
  latestPrediction: PredictionHistoryRecord;
  factors: PredictionFactorRecord[];
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function normalizeText(value: string | null | undefined) {
  return (value ?? "").toLowerCase().replace(/\s+/g, " ").trim();
}

function getDaysUntil(dateValue?: string | null) {
  if (!dateValue) return 45;
  const milliseconds = new Date(dateValue).getTime() - Date.now();
  return Math.round(milliseconds / (1000 * 60 * 60 * 24));
}

function percentFromRate(value: number) {
  return clamp(Math.round(value * 100), 0, 100);
}

function countMatchingTerms(source: string, terms: string[]) {
  const normalizedSource = normalizeText(source);
  if (!normalizedSource || terms.length === 0) return 0;
  return terms.filter((term) => normalizedSource.includes(normalizeText(term))).length;
}

function dedupe<T>(values: T[]) {
  return Array.from(new Set(values));
}

function inferTenderType(text: string) {
  const normalized = normalizeText(text);
  if (normalized.includes("framework")) return "framework";
  if (normalized.includes("rfp")) return "rfp";
  if (normalized.includes("rfq")) return "rfq";
  if (normalized.includes("itt")) return "itt";
  if (normalized.includes("grant")) return "grant";
  return "tender";
}

function inferFrameworkName(title: string, description: string) {
  return /framework/i.test(`${title} ${description}`) ? "Framework" : null;
}

function inferSectorFromOpportunity(industryTags: string[], title: string, description: string) {
  const primary = industryTags.find(Boolean);
  if (primary) return primary;

  const text = normalizeText(`${title} ${description}`);
  if (/health|nhs|care/.test(text)) return "Healthcare";
  if (/construct|infrastructure|retrofit|decarboni/.test(text)) return "Construction";
  if (/cloud|data|software|ai|digital/.test(text)) return "Technology";
  if (/transport|mobility/.test(text)) return "Transport";
  if (/finance|bank|fca/.test(text)) return "Financial Services";
  return "General";
}

function inferServiceLine(industryTags: string[], sector: string, title: string) {
  return industryTags[0] ?? sector ?? title ?? "General";
}

function mapRecommendationLabel(value: PredictBidRecommendation) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function actualOutcomeScore(outcome: PredictionOutcomeStatus) {
  return outcome === "won" ? 1 : outcome === "shortlisted" ? 0.65 : outcome === "rejected" ? 0.25 : 0;
}

function formatFactorEvidence(values: string[]) {
  return values.filter(Boolean).slice(0, 2).join(" ");
}

async function readPrompt(promptFile: string) {
  const { readFile } = await import("node:fs/promises");
  const { join } = await import("node:path");
  return readFile(join(process.cwd(), "src", "prompts", promptFile), "utf8");
}

function extractJsonObject(text: string) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

async function loadOrganizationSignals(organizationId?: string): Promise<OrganizationSignals> {
  const supabase = createServiceSupabaseClient();
  if (!supabase || !organizationId) {
    return {
      id: demoOrganization.id,
      companyName: demoOrganization.companyName,
      industry: demoOrganization.industry,
      location: demoOrganization.location,
      certifications: demoOrganization.certifications,
      activeBidLoad: 2,
    };
  }

  const [organizationRow, activeProjects] = await Promise.all([
    supabase
      .from("organizations")
      .select("id, company_name, industry, location, certifications")
      .eq("id", organizationId)
      .maybeSingle(),
    supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .in("status", ["draft", "analyzing", "in_progress", "review"])
      .gte("submission_deadline", new Date().toISOString())
      .lte("submission_deadline", new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()),
  ]);

  return {
    id: organizationRow.data?.id as string | undefined,
    companyName: (organizationRow.data?.company_name as string | null) ?? demoOrganization.companyName,
    industry: (organizationRow.data?.industry as string | null) ?? demoOrganization.industry,
    location: (organizationRow.data?.location as string | null) ?? demoOrganization.location,
    certifications: Array.isArray(organizationRow.data?.certifications) ? (organizationRow.data?.certifications as string[]) : demoOrganization.certifications,
    activeBidLoad: activeProjects.count ?? 0,
  };
}

async function loadOpportunitySignals(input: {
  organizationId?: string;
  opportunityId?: string;
  projectId?: string;
}): Promise<OpportunitySignals> {
  const supabase = createServiceSupabaseClient();
  if (!supabase || !input.organizationId) {
    const demoOpportunity = input.opportunityId
      ? demoOpportunities.find((opportunity) => opportunity.id === input.opportunityId) ?? null
      : null;
    const demoOpportunityIndex = demoOpportunity ? demoOpportunities.findIndex((item) => item.id === demoOpportunity.id) : -1;
    const demoProject =
      demoProjects.find((project) => project.id === input.projectId) ??
      (demoOpportunityIndex >= 0 ? demoProjects[demoOpportunityIndex] ?? demoProjects[0] : null);
    const title = demoOpportunity?.title ?? demoProject?.tenderName ?? "Tracked opportunity";
    const description = demoOpportunity?.description ?? (demoProject ? `${demoProject.title} opportunity for ${demoProject.issuingBody}.` : "");
    const sector = inferSectorFromOpportunity(demoOpportunity?.industryTags ?? [], title, description);
    const estimatedContractValue = Number(demoOpportunity?.estimatedValue ?? demoProject?.estimatedContractValue ?? 0);
    return {
      opportunityId: input.opportunityId ?? demoOpportunity?.id ?? "opp_demo",
      projectId: input.projectId ?? demoProject?.id ?? null,
      title,
      description,
      buyerName: demoOpportunity?.buyerName ?? demoProject?.issuingBody ?? "Buyer",
      submissionDeadline: demoOpportunity?.submissionDeadline ?? demoProject?.submissionDeadline ?? null,
      estimatedContractValue,
      expectedRevenue: Math.round(estimatedContractValue * 0.62),
      expectedWinProbability: demoOpportunity?.id === "opp_1" ? 74 : demoOpportunity?.id === "opp_2" ? 66 : demoOpportunity?.id === "opp_3" ? 58 : demoProject ? 62 : 40,
      bidEffortScore: demoOpportunity?.id === "opp_2" ? 63 : demoOpportunity ? 48 : demoProject ? 46 : 60,
      locations: demoOpportunity?.locations ?? ["United Kingdom"],
      industryTags: demoOpportunity?.industryTags ?? [sector],
      sector,
      serviceLine: inferServiceLine(demoOpportunity?.industryTags ?? [], sector, title),
      tenderType: inferTenderType(`${title} ${description}`),
      frameworkName: inferFrameworkName(title, description),
    };
  }

  let opportunityId = input.opportunityId ?? null;
  if (!opportunityId && input.projectId) {
    const { data: pipelineRow } = await supabase
      .from("opportunity_pipeline")
      .select("opportunity_id")
      .eq("organization_id", input.organizationId)
      .eq("project_id", input.projectId)
      .maybeSingle();
    opportunityId = (pipelineRow?.opportunity_id as string | null) ?? null;
  }

  const [opportunityRow, roiRow, projectRow] = await Promise.all([
    opportunityId
      ? supabase
          .from("opportunities")
          .select(
            "id, title, description, buyer_name, submission_deadline, estimated_value, minimum_value, maximum_value, locations, industry_tags",
          )
          .eq("organization_id", input.organizationId)
          .eq("id", opportunityId)
          .maybeSingle()
      : Promise.resolve({ data: null as any }),
    opportunityId
      ? supabase
          .from("opportunity_roi_score")
          .select("expected_revenue, expected_win_probability, bid_effort_score")
          .eq("organization_id", input.organizationId)
          .eq("opportunity_id", opportunityId)
          .maybeSingle()
      : Promise.resolve({ data: null as any }),
    input.projectId
      ? supabase
          .from("projects")
          .select("id, title, tender_name, issuing_body, submission_deadline, estimated_contract_value")
          .eq("organization_id", input.organizationId)
          .eq("id", input.projectId)
          .maybeSingle()
      : Promise.resolve({ data: null as any }),
  ]);

  const title = (opportunityRow.data?.title as string | null) ?? (projectRow.data?.tender_name as string | null) ?? "Tracked opportunity";
  const description = (opportunityRow.data?.description as string | null) ?? (projectRow.data?.title as string | null) ?? "";
  const buyerName = (opportunityRow.data?.buyer_name as string | null) ?? (projectRow.data?.issuing_body as string | null) ?? "Buyer";
  const estimatedContractValue =
    Number(
      opportunityRow.data?.estimated_value ??
        opportunityRow.data?.maximum_value ??
        opportunityRow.data?.minimum_value ??
        projectRow.data?.estimated_contract_value ??
        0,
    ) || 0;
  const industryTags = Array.isArray(opportunityRow.data?.industry_tags) ? (opportunityRow.data?.industry_tags as string[]) : [];
  const sector = inferSectorFromOpportunity(industryTags, title, description);
  const tenderType = inferTenderType(`${title} ${description}`);

  return {
    opportunityId: (opportunityRow.data?.id as string | null) ?? opportunityId,
    projectId: (projectRow.data?.id as string | null) ?? input.projectId ?? null,
    title,
    description,
    buyerName,
    submissionDeadline:
      (opportunityRow.data?.submission_deadline as string | null) ??
      (projectRow.data?.submission_deadline as string | null) ??
      null,
    estimatedContractValue,
    expectedRevenue: Number(roiRow.data?.expected_revenue ?? Math.round(estimatedContractValue * 0.45)),
    expectedWinProbability: Number(roiRow.data?.expected_win_probability ?? 45),
    bidEffortScore: Number(roiRow.data?.bid_effort_score ?? 55),
    locations: Array.isArray(opportunityRow.data?.locations) ? (opportunityRow.data?.locations as string[]) : [],
    industryTags,
    sector,
    serviceLine: inferServiceLine(industryTags, sector, title),
    tenderType,
    frameworkName: inferFrameworkName(title, description),
  };
}

async function loadWorkspaceSignals(projectId?: string, organizationId?: string): Promise<WorkspaceSignals | null> {
  if (!projectId) return null;
  const workspaceModule = await import("@/lib/bid-workspace");
  const snapshot = await workspaceModule.getBidWorkspaceSnapshot(projectId, organizationId);
  const methodologySection = snapshot.bidSections.find((section) => section.sectionKey === "methodology");
  const experienceSection = snapshot.bidSections.find((section) => section.sectionKey === "experience_response");
  const sectionCompletionAverage = Math.round(average(snapshot.bidSections.map((section) => section.completionPercentage)));

  const supabase = createServiceSupabaseClient();
  let usedDocumentTypes: string[] = [];
  if (supabase && organizationId) {
    const { data } = await supabase
      .from("knowledge_usage")
      .select("knowledge_document_id")
      .eq("organization_id", organizationId)
      .eq("project_id", projectId);
    const documentIds = dedupe(((data ?? []) as any[]).map((row: any) => row.knowledge_document_id as string).filter(Boolean));
    if (documentIds.length > 0) {
      const { data: documents } = await supabase
        .from("knowledge_documents")
        .select("document_type")
        .eq("organization_id", organizationId)
        .in("id", documentIds);
      usedDocumentTypes = dedupe(((documents ?? []) as any[]).map((row: any) => row.document_type as string).filter(Boolean));
    }
  }

  return {
    completionScore: snapshot.compliance.completionScore,
    readinessScore: snapshot.compliance.readinessScore,
    missingDocuments: snapshot.compliance.missingDocuments,
    missingCertifications: snapshot.compliance.missingCertifications,
    missingEvidence: snapshot.compliance.missingEvidence,
    missingReferences: snapshot.compliance.missingReferences,
    sectionCompletionAverage,
    methodologyCompletion: methodologySection?.completionPercentage ?? 0,
    experienceCompletion: experienceSection?.completionPercentage ?? 0,
    reviewScore: 0,
    knowledgeCoverageScore: snapshot.knowledgeCoverage?.coverageScore ?? 0,
    knowledgeCoverageStrength: snapshot.knowledgeCoverage?.coverageStrength ?? null,
    knowledgeMissingAreas: snapshot.knowledgeCoverage?.missingKnowledgeAreas ?? [],
    knowledgeRecommendations: snapshot.knowledgeCoverage?.uploadRecommendations ?? [],
    usedDocumentTypes,
  };
}

async function loadReviewSignals(projectId?: string, organizationId?: string): Promise<ReviewSignals | null> {
  if (!projectId) return null;
  const reviewModule = await import("@/lib/bid-review");
  const snapshot = await reviewModule.getBidReviewSnapshot(projectId, organizationId);
  const latest = snapshot.latestReview;
  if (!latest) return null;

  return {
    overallBidScore: latest.overallBidScore,
    complianceScore: latest.complianceScore,
    qualityScore: latest.qualityScore,
    evidenceScore: latest.evidenceScore,
    riskScore: latest.riskScore,
    confidenceScore: latest.confidenceScore,
    strengths: latest.strengths,
    weaknesses: latest.weaknesses,
    findings: snapshot.reviewFindings.map((finding) => ({
      severity: finding.severity,
      issue: finding.issue,
      reason: finding.reason,
      sectionKey: finding.sectionKey ?? null,
    })),
    recommendations: snapshot.reviewRecommendations.map((recommendation) => ({
      issue: recommendation.issue,
      suggestedFix: recommendation.suggestedFix,
    })),
  };
}

async function loadHistoricalSignals(input: {
  organizationId?: string;
  sector: string;
  buyerName: string;
  serviceLine: string;
  frameworkName?: string | null;
  usedDocumentTypes: string[];
}): Promise<HistoricalSignals> {
  const supabase = createServiceSupabaseClient();
  if (!supabase || !input.organizationId) {
    return {
      overallWinRate: 0.56,
      sectorWinRate: 0.61,
      buyerWinRate: 0.52,
      serviceLineWinRate: 0.58,
      frameworkWinRate: input.frameworkName ? 0.54 : 0.5,
      documentTypeWinRate: input.usedDocumentTypes.length > 0 ? 0.6 : 0.5,
      buyerLossSignals: ["Strong incumbent advantage seen in similar frameworks."],
      winningFactors: ["Strong healthcare delivery history", "ISO 27001 evidence", "Clear mobilisation plan"],
      losingFactors: ["Weak evidence", "Framework mismatch", "No quantified outcomes in responses"],
    };
  }

  const { data: outcomeRows } = await supabase
    .from("bid_outcomes")
    .select("project_id, outcome, sector, tender_type, client_name, decision_factors, decided_at")
    .eq("organization_id", input.organizationId)
    .in("outcome", ["won", "lost", "shortlisted", "rejected"]);

  const outcomes = ((outcomeRows ?? []) as any[]).map((row: any) => ({
    projectId: (row.project_id as string | null) ?? null,
    outcome: row.outcome as PredictionOutcomeStatus,
    sector: (row.sector as string | null) ?? "General",
    tenderType: (row.tender_type as string | null) ?? "tender",
    clientName: (row.client_name as string | null) ?? "Buyer",
    decisionFactors: Array.isArray(row.decision_factors) ? (row.decision_factors as string[]) : [],
    decidedAt: (row.decided_at as string | null) ?? null,
  }));

  const overallWinRate = average(outcomes.map((item) => actualOutcomeScore(item.outcome)));
  const sectorRows = outcomes.filter((item) => normalizeText(item.sector) === normalizeText(input.sector));
  const buyerRows = outcomes.filter((item) => normalizeText(item.clientName) === normalizeText(input.buyerName));
  const serviceLineRows = outcomes.filter((item) => normalizeText(item.sector) === normalizeText(input.serviceLine));
  const frameworkRows = outcomes.filter((item) =>
    input.frameworkName ? normalizeText(item.tenderType) === "framework" : normalizeText(item.tenderType) === "tender",
  );

  let documentTypeWinRate = overallWinRate || 0.5;
  if (input.usedDocumentTypes.length > 0) {
    const decidedProjectIds = dedupe(
      outcomes
        .filter((item) => item.projectId)
        .map((item) => item.projectId as string),
    );

    if (decidedProjectIds.length > 0) {
      const [{ data: usageRows }, { data: documentRows }] = await Promise.all([
        supabase
          .from("knowledge_usage")
          .select("project_id, knowledge_document_id")
          .eq("organization_id", input.organizationId)
          .in("project_id", decidedProjectIds),
        supabase
          .from("knowledge_documents")
          .select("id, document_type")
          .eq("organization_id", input.organizationId),
      ]);

      const typeByDocumentId = new Map(((documentRows ?? []) as any[]).map((row: any) => [row.id as string, row.document_type as string]));
      const typesByProjectId = new Map<string, string[]>();
      ((usageRows ?? []) as any[]).forEach((row: any) => {
        const projectId = row.project_id as string | null;
        const documentType = typeByDocumentId.get(row.knowledge_document_id as string);
        if (!projectId || !documentType) return;
        const current = typesByProjectId.get(projectId) ?? [];
        if (!current.includes(documentType)) current.push(documentType);
        typesByProjectId.set(projectId, current);
      });

      const matchingScores = outcomes
        .filter((item) => item.projectId)
        .filter((item) => {
          const types = typesByProjectId.get(item.projectId as string) ?? [];
          return input.usedDocumentTypes.some((type) => types.includes(type));
        })
        .map((item) => actualOutcomeScore(item.outcome));

      if (matchingScores.length > 0) {
        documentTypeWinRate = average(matchingScores);
      }
    }
  }

  const losingFactors = dedupe(
    outcomes
      .filter((item) => item.outcome === "lost" || item.outcome === "rejected")
      .flatMap((item) => item.decisionFactors),
  ).slice(0, 8);
  const winningFactors = dedupe(outcomes.filter((item) => item.outcome === "won").flatMap((item) => item.decisionFactors)).slice(0, 8);

  return {
    overallWinRate: overallWinRate || 0.5,
    sectorWinRate: sectorRows.length > 0 ? average(sectorRows.map((item) => actualOutcomeScore(item.outcome))) : overallWinRate || 0.5,
    buyerWinRate: buyerRows.length > 0 ? average(buyerRows.map((item) => actualOutcomeScore(item.outcome))) : overallWinRate || 0.5,
    serviceLineWinRate:
      serviceLineRows.length > 0 ? average(serviceLineRows.map((item) => actualOutcomeScore(item.outcome))) : overallWinRate || 0.5,
    frameworkWinRate: frameworkRows.length > 0 ? average(frameworkRows.map((item) => actualOutcomeScore(item.outcome))) : overallWinRate || 0.5,
    documentTypeWinRate,
    buyerLossSignals: losingFactors
      .filter((factor) => /incumbent|competition|framework|pricing|capacity|coverage/i.test(factor))
      .slice(0, 4),
    winningFactors,
    losingFactors,
  };
}

function createFactor(input: Omit<PredictionFactorRecord, "id">): PredictionFactorRecord {
  return {
    id: randomUUID(),
    ...input,
  };
}

function buildPredictionFactors(input: {
  opportunity: OpportunitySignals;
  organization: OrganizationSignals;
  workspace: WorkspaceSignals | null;
  review: ReviewSignals | null;
  historical: HistoricalSignals;
  scores: Omit<PredictionHistoryRecord, "id" | "opportunityId" | "projectId" | "title" | "buyerName" | "sector" | "serviceLine" | "frameworkName" | "tenderType" | "estimatedContractValue" | "expectedRevenue" | "recommendation" | "recommendationRationale" | "strategistSummary" | "scoreBreakdown" | "evidenceSnapshot" | "usedDocumentTypes" | "createdAt">;
}): PredictionFactorRecord[] {
  const factors: PredictionFactorRecord[] = [];
  const missingCount =
    (input.workspace?.missingDocuments.length ?? 0) +
    (input.workspace?.missingCertifications.length ?? 0) +
    (input.workspace?.missingEvidence.length ?? 0) +
    (input.workspace?.missingReferences.length ?? 0);

  if (input.scores.strategicFitScore >= 72) {
    factors.push(
      createFactor({
        predictionHistoryId: null,
        opportunityId: input.opportunity.opportunityId ?? null,
        projectId: input.opportunity.projectId ?? null,
        factorCategory: "strength",
        factorCode: "strategic_fit",
        title: "Strong strategic fit",
        explanation: `${input.organization.companyName} aligns well with the buyer, sector, and service-line profile for this pursuit.`,
        evidence: `Strategic fit ${input.scores.strategicFitScore} with sector win rate ${percentFromRate(input.historical.sectorWinRate)}% and buyer win rate ${percentFromRate(input.historical.buyerWinRate)}%.`,
        impactScore: 18,
        remediation: "Keep the recommendation anchored to the strongest service-line and sector proof points.",
        factorOrder: 1,
      }),
    );
  }

  if (input.scores.evidenceStrengthScore >= 70) {
    factors.push(
      createFactor({
        predictionHistoryId: null,
        opportunityId: input.opportunity.opportunityId ?? null,
        projectId: input.opportunity.projectId ?? null,
        factorCategory: "strength",
        factorCode: "evidence_depth",
        title: "Evidence-backed response base",
        explanation: "The current pursuit is supported by strong knowledge coverage and review evidence quality.",
        evidence: `Evidence strength ${input.scores.evidenceStrengthScore} with knowledge coverage ${input.scores.knowledgeCoverageScore} and review evidence ${input.review?.evidenceScore ?? 0}.`,
        impactScore: 16,
        remediation: "Surface the strongest case studies and quantified outcomes in the executive summary and experience sections.",
        factorOrder: 2,
      }),
    );
  }

  if (input.scores.commercialConfidence >= 68) {
    factors.push(
      createFactor({
        predictionHistoryId: null,
        opportunityId: input.opportunity.opportunityId ?? null,
        projectId: input.opportunity.projectId ?? null,
        factorCategory: "strength",
        factorCode: "commercial_value",
        title: "Attractive commercial profile",
        explanation: "Expected revenue and bid-efficiency signals support pursuit from a portfolio perspective.",
        evidence: `Expected revenue ${Math.round(input.opportunity.expectedRevenue)} with commercial confidence ${input.scores.commercialConfidence} and bid effort ${input.opportunity.bidEffortScore}.`,
        impactScore: 14,
        remediation: "Protect margin by keeping pursuit scope tight and focusing resources on high-scoring sections.",
        factorOrder: 3,
      }),
    );
  }

  if ((input.workspace?.knowledgeCoverageScore ?? 0) < 60) {
    factors.push(
      createFactor({
        predictionHistoryId: null,
        opportunityId: input.opportunity.opportunityId ?? null,
        projectId: input.opportunity.projectId ?? null,
        factorCategory: "weakness",
        factorCode: "low_knowledge_coverage",
        title: "Weak knowledge coverage",
        explanation: "The pursuit does not yet have enough organization-specific evidence across the required themes.",
        evidence: `Knowledge coverage ${input.workspace?.knowledgeCoverageScore ?? 0}. Missing areas: ${formatFactorEvidence(input.workspace?.knowledgeMissingAreas ?? []) || "coverage gaps remain unresolved"}.`,
        impactScore: -18,
        remediation:
          input.workspace?.knowledgeRecommendations[0] ??
          "Upload relevant case studies, certifications, and policies before final qualification.",
        factorOrder: 4,
      }),
    );
  }

  if ((input.review?.overallBidScore ?? input.workspace?.completionScore ?? 0) < 62) {
    factors.push(
      createFactor({
        predictionHistoryId: null,
        opportunityId: input.opportunity.opportunityId ?? null,
        projectId: input.opportunity.projectId ?? null,
        factorCategory: "weakness",
        factorCode: "bid_strength_gap",
        title: "Bid strength is not yet convincing",
        explanation: "The current workspace and review signals suggest the bid would not compete strongly without more work.",
        evidence: `Bid strength ${input.scores.bidStrengthScore}, review score ${input.review?.overallBidScore ?? 0}, completion ${input.workspace?.completionScore ?? 0}.`,
        impactScore: -16,
        remediation: "Raise completion, evidence depth, and buyer-specific differentiation before committing full bid effort.",
        factorOrder: 5,
      }),
    );
  }

  if ((input.workspace?.missingCertifications.length ?? 0) > 0) {
    factors.push(
      createFactor({
        predictionHistoryId: null,
        opportunityId: input.opportunity.opportunityId ?? null,
        projectId: input.opportunity.projectId ?? null,
        factorCategory: "weakness",
        factorCode: "missing_certification",
        title: "Certification coverage is incomplete",
        explanation: "Required accreditations or certification evidence are still missing from the pursuit workspace.",
        evidence: formatFactorEvidence(input.workspace?.missingCertifications ?? []) || "Certification gaps remain open.",
        impactScore: -14,
        remediation: "Attach the current certification or provide an acceptable equivalent before submission review.",
        factorOrder: 6,
      }),
    );
  }

  if (input.scores.riskScore >= 60) {
    factors.push(
      createFactor({
        predictionHistoryId: null,
        opportunityId: input.opportunity.opportunityId ?? null,
        projectId: input.opportunity.projectId ?? null,
        factorCategory: "risk",
        factorCode: "elevated_risk",
        title: "Elevated execution risk",
        explanation: "Current delivery, compliance, or deadline pressures reduce the confidence of a clean win.",
        evidence: `Risk score ${input.scores.riskScore} with readiness ${input.workspace?.readinessScore ?? 0} and review risk ${input.review?.riskScore ?? 0}.`,
        impactScore: -20,
        remediation: "Close the top critical findings and re-run review before making a final bid decision.",
        factorOrder: 7,
      }),
    );
  }

  if (input.organization.activeBidLoad >= 4) {
    factors.push(
      createFactor({
        predictionHistoryId: null,
        opportunityId: input.opportunity.opportunityId ?? null,
        projectId: input.opportunity.projectId ?? null,
        factorCategory: "risk",
        factorCode: "capacity_pressure",
        title: "Capacity pressure across active pursuits",
        explanation: "The organization has several active deadlines, which may constrain pursuit quality and review bandwidth.",
        evidence: `${input.organization.activeBidLoad} active bids are currently due within the next 30 days.`,
        impactScore: -12,
        remediation: "Reduce scope or confirm resourcing before committing to a full bid response.",
        factorOrder: 8,
      }),
    );
  }

  const buyerLossSignal = input.historical.buyerLossSignals[0];
  if (buyerLossSignal) {
    factors.push(
      createFactor({
        predictionHistoryId: null,
        opportunityId: input.opportunity.opportunityId ?? null,
        projectId: input.opportunity.projectId ?? null,
        factorCategory: "risk",
        factorCode: "buyer_headwind",
        title: "Buyer-specific headwind",
        explanation: "Historical outcome signals indicate a recurring risk in similar pursuits for this buyer context.",
        evidence: buyerLossSignal,
        impactScore: -10,
        remediation: "Counter this explicitly in the executive summary with proof of differentiators and mobilisation confidence.",
        factorOrder: 9,
      }),
    );
  }

  if ((input.workspace?.knowledgeRecommendations.length ?? 0) > 0) {
    factors.push(
      createFactor({
        predictionHistoryId: null,
        opportunityId: input.opportunity.opportunityId ?? null,
        projectId: input.opportunity.projectId ?? null,
        factorCategory: "opportunity",
        factorCode: "knowledge_uplift",
        title: "Evidence uplift opportunity",
        explanation: "A targeted knowledge upload would materially improve qualification confidence and bid credibility.",
        evidence: input.workspace?.knowledgeRecommendations[0] ?? "Add missing supporting evidence.",
        impactScore: 14,
        remediation: input.workspace?.knowledgeRecommendations[0] ?? "Upload the highest-value missing evidence before the next review cycle.",
        factorOrder: 10,
      }),
    );
  }

  if ((input.review?.recommendations.length ?? 0) > 0) {
    factors.push(
      createFactor({
        predictionHistoryId: null,
        opportunityId: input.opportunity.opportunityId ?? null,
        projectId: input.opportunity.projectId ?? null,
        factorCategory: "opportunity",
        factorCode: "review_remediation",
        title: "Review-led uplift available",
        explanation: "The Review Engine has already identified practical actions that can improve competitiveness quickly.",
        evidence: input.review?.recommendations[0]?.suggestedFix ?? "Apply open review recommendations.",
        impactScore: 13,
        remediation: input.review?.recommendations[0]?.suggestedFix ?? "Apply the highest-severity recommendation and re-run the review.",
        factorOrder: 11,
      }),
    );
  }

  if ((input.workspace?.experienceCompletion ?? 0) < 70) {
    factors.push(
      createFactor({
        predictionHistoryId: null,
        opportunityId: input.opportunity.opportunityId ?? null,
        projectId: input.opportunity.projectId ?? null,
        factorCategory: "opportunity",
        factorCode: "experience_proof",
        title: "Add stronger comparable delivery proof",
        explanation: "Comparable case studies and quantified experience remain one of the fastest ways to improve evaluator confidence.",
        evidence: `Experience section completion ${input.workspace?.experienceCompletion ?? 0} with sector win rate ${percentFromRate(input.historical.sectorWinRate)}%.`,
        impactScore: 12,
        remediation: "Add the most relevant sector case study and quantify outcomes, mobilisation, and buyer similarity.",
        factorOrder: 12,
      }),
    );
  }

  return factors
    .sort((left, right) => Math.abs(right.impactScore) - Math.abs(left.impactScore) || left.factorOrder - right.factorOrder)
    .slice(0, 12);
}

function generateBidRecommendation(input: {
  winProbability: number;
  strategicFitScore: number;
  riskScore: number;
  commercialConfidence: number;
  factors: PredictionFactorRecord[];
}): { recommendation: PredictBidRecommendation; rationale: string } {
  const riskDrivers = input.factors.filter((factor) => factor.factorCategory === "risk" || factor.factorCategory === "weakness").slice(0, 3);
  const positiveDrivers = input.factors.filter((factor) => factor.factorCategory === "strength" || factor.factorCategory === "opportunity").slice(0, 3);

  let recommendation: PredictBidRecommendation = "borderline";
  if (input.winProbability >= 74 && input.strategicFitScore >= 70 && input.riskScore <= 38 && input.commercialConfidence >= 58) {
    recommendation = "strong_bid";
  } else if (input.winProbability >= 56 && input.strategicFitScore >= 52 && input.riskScore <= 55) {
    recommendation = "bid";
  } else if (input.winProbability < 40 || input.riskScore >= 70 || input.commercialConfidence < 30) {
    recommendation = "no_bid";
  }

  const rationale =
    recommendation === "strong_bid"
      ? `Recommend ${mapRecommendationLabel(recommendation)} because positive signals outweigh risks: ${positiveDrivers.map((factor) => factor.title).join(", ") || "strong fit and evidence"}.`
      : recommendation === "bid"
        ? `Recommend ${mapRecommendationLabel(recommendation)} with controlled qualification risk. Key positives: ${positiveDrivers.map((factor) => factor.title).join(", ") || "credible fit"}. Watch: ${riskDrivers.map((factor) => factor.title).join(", ") || "resourcing and evidence depth"}.`
        : recommendation === "borderline"
          ? `Recommend ${mapRecommendationLabel(recommendation)} until the main blockers are addressed: ${riskDrivers.map((factor) => factor.title).join(", ") || "evidence and fit gaps"}.`
          : `Recommend ${mapRecommendationLabel(recommendation)} because the pursuit is currently undermined by ${riskDrivers.map((factor) => factor.title).join(", ") || "insufficient strategic and commercial return"}.`;

  return { recommendation, rationale };
}

function calculateWinProbability(input: {
  organization: OrganizationSignals;
  opportunity: OpportunitySignals;
  workspace: WorkspaceSignals | null;
  review: ReviewSignals | null;
  historical: HistoricalSignals;
}) {
  const opportunityText = `${input.opportunity.title} ${input.opportunity.description} ${input.opportunity.industryTags.join(" ")}`;
  const industryOverlap = countMatchingTerms(opportunityText, [input.organization.industry]);
  const certificationSignals = countMatchingTerms(opportunityText, input.organization.certifications);
  const frameworkFit =
    input.opportunity.frameworkName && input.workspace?.usedDocumentTypes.includes("framework_agreement")
      ? 88
      : input.opportunity.frameworkName
        ? 42
        : 66;
  const locationFit =
    input.opportunity.locations.length === 0
      ? 65
      : countMatchingTerms(input.organization.location, input.opportunity.locations) > 0
        ? 82
        : 54;
  const capabilityFit = clamp(
    Math.round(
      46 +
        industryOverlap * 14 +
        certificationSignals * 6 +
        (input.workspace?.knowledgeCoverageScore ?? 45) * 0.25 +
        percentFromRate(input.historical.serviceLineWinRate) * 0.15,
    ),
    15,
    95,
  );
  const strategicFitScore = clamp(
    Math.round(
      percentFromRate(input.historical.sectorWinRate) * 0.22 +
        percentFromRate(input.historical.buyerWinRate) * 0.18 +
        capabilityFit * 0.26 +
        frameworkFit * 0.16 +
        locationFit * 0.08 +
        percentFromRate(input.historical.serviceLineWinRate) * 0.1,
    ),
    5,
    99,
  );

  const evidenceStrengthScore = clamp(
    Math.round(
      (input.review?.evidenceScore ?? input.workspace?.knowledgeCoverageScore ?? 42) * 0.45 +
        (input.workspace?.knowledgeCoverageScore ?? 42) * 0.35 +
        Math.min(100, (input.workspace?.usedDocumentTypes.length ?? 0) * 16) * 0.2,
    ),
    0,
    100,
  );

  const missingPenalty =
    (input.workspace?.missingDocuments.length ?? 0) * 6 +
    (input.workspace?.missingCertifications.length ?? 0) * 8 +
    (input.workspace?.missingEvidence.length ?? 0) * 4 +
    (input.workspace?.missingReferences.length ?? 0) * 5;

  const complianceConfidence = clamp(
    Math.round(
      (input.review?.complianceScore ?? input.workspace?.readinessScore ?? 48) * 0.7 +
        Math.max(0, 100 - Math.min(50, missingPenalty)) * 0.3,
    ),
    0,
    100,
  );

  const deliveryConfidence = clamp(
    Math.round(
      (input.review?.qualityScore ?? input.workspace?.sectionCompletionAverage ?? 42) * 0.35 +
        percentFromRate(input.historical.sectorWinRate) * 0.2 +
        (input.workspace?.methodologyCompletion ?? 0) * 0.25 +
        Math.min(100, input.organization.certifications.length * 20) * 0.2,
    ),
    0,
    100,
  );

  const revenueScale = clamp((Math.log10(Math.max(input.opportunity.expectedRevenue, 10000)) - 4) * 28, 0, 100);
  const commercialConfidence = clamp(
    Math.round(
      input.opportunity.expectedWinProbability * 0.35 +
        revenueScale * 0.25 +
        (100 - input.opportunity.bidEffortScore) * 0.2 +
        clamp((Math.log10(Math.max(input.opportunity.estimatedContractValue, 10000)) - 4) * 28, 0, 100) * 0.2,
    ),
    0,
    100,
  );

  const bidStrengthScore = clamp(
    Math.round(
      (input.review?.overallBidScore ?? input.workspace?.completionScore ?? 38) * 0.45 +
        evidenceStrengthScore * 0.2 +
        complianceConfidence * 0.15 +
        deliveryConfidence * 0.1 +
        strategicFitScore * 0.1,
    ),
    0,
    100,
  );

  const daysUntilDeadline = getDaysUntil(input.opportunity.submissionDeadline);
  const deadlineRisk = daysUntilDeadline <= 2 ? 95 : daysUntilDeadline <= 7 ? 80 : daysUntilDeadline <= 14 ? 64 : 34;
  const capacityRisk = input.organization.activeBidLoad >= 5 ? 76 : input.organization.activeBidLoad >= 3 ? 52 : 28;
  const coverageRisk = Math.max(0, 100 - (input.workspace?.knowledgeCoverageScore ?? 45));
  const buyerHeadwind = Math.max(0, percentFromRate(input.historical.overallWinRate) - percentFromRate(input.historical.buyerWinRate));
  const riskScore = clamp(
    Math.round(
      (input.review?.riskScore ?? 42) * 0.4 +
        deadlineRisk * 0.2 +
        coverageRisk * 0.15 +
        capacityRisk * 0.15 +
        buyerHeadwind * 0.1,
    ),
    0,
    100,
  );

  const historicalPerformance = clamp(
    Math.round(
      percentFromRate(input.historical.overallWinRate) * 0.2 +
        percentFromRate(input.historical.sectorWinRate) * 0.24 +
        percentFromRate(input.historical.buyerWinRate) * 0.18 +
        percentFromRate(input.historical.serviceLineWinRate) * 0.18 +
        percentFromRate(input.historical.frameworkWinRate) * 0.1 +
        percentFromRate(input.historical.documentTypeWinRate) * 0.1,
    ),
    0,
    100,
  );

  const winProbability = clamp(
    Math.round(
      strategicFitScore * 0.18 +
        bidStrengthScore * 0.18 +
        evidenceStrengthScore * 0.11 +
        complianceConfidence * 0.11 +
        deliveryConfidence * 0.14 +
        commercialConfidence * 0.1 +
        historicalPerformance * 0.11 +
        (100 - riskScore) * 0.07,
    ),
    5,
    95,
  );

  const signalSet = [
    strategicFitScore,
    bidStrengthScore,
    evidenceStrengthScore,
    complianceConfidence,
    deliveryConfidence,
    commercialConfidence,
    100 - riskScore,
  ];
  const alignmentVariance = average(signalSet.map((value) => Math.abs(value - average(signalSet))));
  const dataCompleteness = [
    input.workspace ? 1 : 0,
    input.review ? 1 : 0,
    input.opportunity.expectedRevenue > 0 ? 1 : 0,
    input.organization.certifications.length > 0 ? 1 : 0,
    input.historical.overallWinRate > 0 ? 1 : 0,
  ];
  const confidenceScore = clamp(
    Math.round((average(dataCompleteness) * 100) * 0.65 + Math.max(0, 100 - alignmentVariance * 1.6) * 0.35),
    15,
    98,
  );

  return {
    winProbability,
    confidenceScore,
    bidStrengthScore,
    evidenceStrengthScore,
    complianceConfidence,
    deliveryConfidence,
    commercialConfidence,
    riskScore,
    strategicFitScore,
    reviewScore: input.review?.overallBidScore ?? 0,
    knowledgeCoverageScore: input.workspace?.knowledgeCoverageScore ?? 0,
    historicalPerformance,
    scoreBreakdown: {
      strategicFit: strategicFitScore,
      bidStrength: bidStrengthScore,
      evidenceStrength: evidenceStrengthScore,
      complianceConfidence,
      deliveryConfidence,
      commercialConfidence,
      historicalPerformance,
      inverseRisk: 100 - riskScore,
    },
  };
}

async function maybeEnhanceNarrativeWithAI(input: {
  organization: OrganizationSignals;
  opportunity: OpportunitySignals;
  history: PredictionHistoryRecord;
  factors: PredictionFactorRecord[];
}) {
  if (!hasOpenAIEnv()) {
    return {
      strategistSummary: input.history.strategistSummary,
      recommendationRationale: input.history.recommendationRationale,
    };
  }

  try {
    const prompt = await readPrompt("predict-engine.md");
    const client = new OpenAI({ apiKey: env.openAiApiKey });
    const response = await client.responses.create({
      model: "gpt-4.1",
      input: [
        { role: "system", content: prompt },
        {
          role: "user",
          content: JSON.stringify({
            organization: input.organization,
            opportunity: input.opportunity,
            scores: input.history,
            factors: input.factors.map((factor) => ({
              category: factor.factorCategory,
              title: factor.title,
              explanation: factor.explanation,
              evidence: factor.evidence,
              remediation: factor.remediation,
            })),
          }),
        },
      ],
    });

    const parsed = AiPredictNarrativeSchema.safeParse(extractJsonObject(response.output_text));
    if (!parsed.success) {
      return {
        strategistSummary: input.history.strategistSummary,
        recommendationRationale: input.history.recommendationRationale,
      };
    }

    return {
      strategistSummary: parsed.data.strategistSummary ?? input.history.strategistSummary,
      recommendationRationale: parsed.data.recommendationRationale ?? input.history.recommendationRationale,
    };
  } catch {
    return {
      strategistSummary: input.history.strategistSummary,
      recommendationRationale: input.history.recommendationRationale,
    };
  }
}

function mapPredictionHistoryRow(row: any): PredictionHistoryRecord {
  return {
    id: row.id as string,
    opportunityId: (row.opportunity_id as string | null) ?? null,
    projectId: (row.project_id as string | null) ?? null,
    title: (row.title as string | null) ?? "",
    buyerName: (row.buyer_name as string | null) ?? "",
    sector: (row.sector as string | null) ?? "General",
    serviceLine: (row.service_line as string | null) ?? "General",
    frameworkName: (row.framework_name as string | null) ?? null,
    tenderType: (row.tender_type as string | null) ?? "tender",
    estimatedContractValue: Number(row.estimated_contract_value ?? 0),
    expectedRevenue: Number(row.expected_revenue ?? 0),
    winProbability: Number(row.win_probability ?? 0),
    confidenceScore: Number(row.confidence_score ?? 0),
    bidStrengthScore: Number(row.bid_strength_score ?? 0),
    evidenceStrengthScore: Number(row.evidence_strength_score ?? 0),
    complianceConfidence: Number(row.compliance_confidence ?? 0),
    deliveryConfidence: Number(row.delivery_confidence ?? 0),
    commercialConfidence: Number(row.commercial_confidence ?? 0),
    riskScore: Number(row.risk_score ?? 0),
    strategicFitScore: Number(row.strategic_fit_score ?? 0),
    reviewScore: Number(row.review_score ?? 0),
    knowledgeCoverageScore: Number(row.knowledge_coverage_score ?? 0),
    recommendation: row.recommendation as PredictBidRecommendation,
    recommendationRationale: (row.recommendation_rationale as string | null) ?? "",
    strategistSummary: (row.strategist_summary as string | null) ?? "",
    scoreBreakdown: ((row.score_breakdown ?? {}) as Record<string, number>) ?? {},
    evidenceSnapshot: ((row.evidence_snapshot ?? {}) as Record<string, unknown>) ?? {},
    usedDocumentTypes: Array.isArray(row.used_document_types) ? (row.used_document_types as string[]) : [],
    actualOutcome: (row.actual_outcome as PredictionOutcomeStatus | null) ?? null,
    predictionAccuracyScore: (row.prediction_accuracy_score as number | null) ?? null,
    outcomeRecordedAt: (row.outcome_recorded_at as string | null) ?? null,
    createdAt: (row.created_at as string | null) ?? null,
  };
}

function mapPredictionFactorRow(row: any): PredictionFactorRecord {
  return {
    id: row.id as string,
    predictionHistoryId: (row.prediction_history_id as string | null) ?? null,
    opportunityId: (row.opportunity_id as string | null) ?? null,
    projectId: (row.project_id as string | null) ?? null,
    factorCategory: row.factor_category as PredictionFactorCategory,
    factorCode: (row.factor_code as string | null) ?? "",
    title: row.title as string,
    explanation: (row.explanation as string | null) ?? "",
    evidence: (row.evidence as string | null) ?? "",
    impactScore: Number(row.impact_score ?? 0),
    remediation: (row.remediation as string | null) ?? "",
    factorOrder: Number(row.factor_order ?? 0),
    createdAt: (row.created_at as string | null) ?? null,
  };
}

async function persistPrediction(input: {
  organizationId: string;
  latestPrediction: PredictionHistoryRecord;
  factors: PredictionFactorRecord[];
}) {
  const supabase = createServiceSupabaseClient();
  if (!supabase) return input;

  const { data: historyRow } = await supabase
    .from("prediction_history")
    .insert({
      organization_id: input.organizationId,
      opportunity_id: input.latestPrediction.opportunityId ?? null,
      project_id: input.latestPrediction.projectId ?? null,
      title: input.latestPrediction.title,
      buyer_name: input.latestPrediction.buyerName,
      sector: input.latestPrediction.sector,
      service_line: input.latestPrediction.serviceLine,
      framework_name: input.latestPrediction.frameworkName ?? null,
      tender_type: input.latestPrediction.tenderType,
      estimated_contract_value: input.latestPrediction.estimatedContractValue,
      expected_revenue: input.latestPrediction.expectedRevenue,
      win_probability: input.latestPrediction.winProbability,
      confidence_score: input.latestPrediction.confidenceScore,
      bid_strength_score: input.latestPrediction.bidStrengthScore,
      evidence_strength_score: input.latestPrediction.evidenceStrengthScore,
      compliance_confidence: input.latestPrediction.complianceConfidence,
      delivery_confidence: input.latestPrediction.deliveryConfidence,
      commercial_confidence: input.latestPrediction.commercialConfidence,
      risk_score: input.latestPrediction.riskScore,
      strategic_fit_score: input.latestPrediction.strategicFitScore,
      review_score: input.latestPrediction.reviewScore,
      knowledge_coverage_score: input.latestPrediction.knowledgeCoverageScore,
      recommendation: input.latestPrediction.recommendation,
      recommendation_rationale: input.latestPrediction.recommendationRationale,
      strategist_summary: input.latestPrediction.strategistSummary,
      score_breakdown: input.latestPrediction.scoreBreakdown,
      evidence_snapshot: input.latestPrediction.evidenceSnapshot,
      used_document_types: input.latestPrediction.usedDocumentTypes,
    })
    .select("*")
    .single();

  const predictionHistoryId = historyRow?.id as string | undefined;
  if (!predictionHistoryId) {
    return input;
  }

  const factorRows =
    input.factors.length > 0
      ? await supabase
          .from("prediction_factors")
          .insert(
            input.factors.map((factor) => ({
              organization_id: input.organizationId,
              prediction_history_id: predictionHistoryId,
              opportunity_id: factor.opportunityId ?? null,
              project_id: factor.projectId ?? null,
              factor_category: factor.factorCategory,
              factor_code: factor.factorCode,
              title: factor.title,
              explanation: factor.explanation,
              evidence: factor.evidence,
              impact_score: factor.impactScore,
              remediation: factor.remediation,
              factor_order: factor.factorOrder,
            })),
          )
          .select("*")
      : { data: [] as any[] };

  return {
    latestPrediction: mapPredictionHistoryRow(historyRow),
    factors: (factorRows.data ?? []).map((row: any) => mapPredictionFactorRow(row)),
  };
}

export async function predictOpportunity(input: z.infer<typeof PredictOpportunitySchema>): Promise<ComputedPrediction> {
  const organization = await loadOrganizationSignals(input.organizationId);
  const opportunity = await loadOpportunitySignals(input);
  const workspace = await loadWorkspaceSignals(opportunity.projectId ?? undefined, input.organizationId);
  const review = await loadReviewSignals(opportunity.projectId ?? undefined, input.organizationId);
  const historical = await loadHistoricalSignals({
    organizationId: input.organizationId,
    sector: opportunity.sector,
    buyerName: opportunity.buyerName,
    serviceLine: opportunity.serviceLine,
    frameworkName: opportunity.frameworkName,
    usedDocumentTypes: workspace?.usedDocumentTypes ?? [],
  });

  if (workspace) {
    workspace.reviewScore = review?.overallBidScore ?? 0;
  }

  const scores = calculateWinProbability({
    organization,
    opportunity,
    workspace,
    review,
    historical,
  });
  const provisionalHistory: PredictionHistoryRecord = {
    id: randomUUID(),
    opportunityId: opportunity.opportunityId ?? null,
    projectId: opportunity.projectId ?? null,
    title: opportunity.title,
    buyerName: opportunity.buyerName,
    sector: opportunity.sector,
    serviceLine: opportunity.serviceLine,
    frameworkName: opportunity.frameworkName ?? null,
    tenderType: opportunity.tenderType,
    estimatedContractValue: opportunity.estimatedContractValue,
    expectedRevenue: opportunity.expectedRevenue,
    winProbability: scores.winProbability,
    confidenceScore: scores.confidenceScore,
    bidStrengthScore: scores.bidStrengthScore,
    evidenceStrengthScore: scores.evidenceStrengthScore,
    complianceConfidence: scores.complianceConfidence,
    deliveryConfidence: scores.deliveryConfidence,
    commercialConfidence: scores.commercialConfidence,
    riskScore: scores.riskScore,
    strategicFitScore: scores.strategicFitScore,
    reviewScore: scores.reviewScore,
    knowledgeCoverageScore: scores.knowledgeCoverageScore,
    recommendation: "borderline",
    recommendationRationale: "",
    strategistSummary:
      scores.winProbability >= 70
        ? "This pursuit is moving toward a strong bid position, but the remaining execution risks still need active management."
        : scores.winProbability >= 50
          ? "This pursuit is viable if the current evidence and review gaps are tightened before committing full bid effort."
          : "This pursuit is currently below a confident win threshold and should be qualified hard before further spend.",
    scoreBreakdown: scores.scoreBreakdown,
    evidenceSnapshot: {
      completionScore: workspace?.completionScore ?? 0,
      readinessScore: workspace?.readinessScore ?? 0,
      knowledgeCoverageScore: workspace?.knowledgeCoverageScore ?? 0,
      missingDocuments: workspace?.missingDocuments ?? [],
      missingCertifications: workspace?.missingCertifications ?? [],
      missingEvidence: workspace?.missingEvidence ?? [],
      topReviewFindings: review?.findings.slice(0, 4) ?? [],
      historical: {
        overallWinRate: percentFromRate(historical.overallWinRate),
        sectorWinRate: percentFromRate(historical.sectorWinRate),
        buyerWinRate: percentFromRate(historical.buyerWinRate),
        serviceLineWinRate: percentFromRate(historical.serviceLineWinRate),
        frameworkWinRate: percentFromRate(historical.frameworkWinRate),
        documentTypeWinRate: percentFromRate(historical.documentTypeWinRate),
      },
    },
    usedDocumentTypes: workspace?.usedDocumentTypes ?? [],
    actualOutcome: null,
    predictionAccuracyScore: null,
    outcomeRecordedAt: null,
  };

  const factors = buildPredictionFactors({
    opportunity,
    organization,
    workspace,
    review,
    historical,
    scores: provisionalHistory,
  });
  const recommendation = generateBidRecommendation({
    winProbability: provisionalHistory.winProbability,
    strategicFitScore: provisionalHistory.strategicFitScore,
    riskScore: provisionalHistory.riskScore,
    commercialConfidence: provisionalHistory.commercialConfidence,
    factors,
  });
  provisionalHistory.recommendation = recommendation.recommendation;
  provisionalHistory.recommendationRationale = recommendation.rationale;

  const aiNarrative = await maybeEnhanceNarrativeWithAI({
    organization,
    opportunity,
    history: provisionalHistory,
    factors,
  });

  provisionalHistory.strategistSummary = aiNarrative.strategistSummary;
  provisionalHistory.recommendationRationale = aiNarrative.recommendationRationale;

  const result = input.organizationId && input.persist !== false
    ? await persistPrediction({
        organizationId: input.organizationId,
        latestPrediction: provisionalHistory,
        factors,
      })
    : {
        latestPrediction: {
          ...provisionalHistory,
          createdAt: new Date().toISOString(),
        },
        factors,
      };

  await trackAuditEvent({
    action: "predict.prediction_generated",
    entityType: "prediction_history",
    organizationId: input.organizationId,
    entityId: result.latestPrediction.id,
    metadata: {
      opportunityId: result.latestPrediction.opportunityId ?? null,
      projectId: result.latestPrediction.projectId ?? null,
      winProbability: result.latestPrediction.winProbability,
      recommendation: result.latestPrediction.recommendation,
      confidenceScore: result.latestPrediction.confidenceScore,
    },
  });

  return result;
}

export async function syncPredictForOpportunity(input: {
  organizationId?: string;
  opportunityId: string;
  projectId?: string | null;
}) {
  if (!input.organizationId) return { ok: true };
  await predictOpportunity({
    organizationId: input.organizationId,
    opportunityId: input.opportunityId,
    projectId: input.projectId ?? undefined,
    persist: true,
  });
  return { ok: true };
}

export async function syncPredictForProject(input: { organizationId?: string; projectId: string }) {
  if (!input.organizationId) return { ok: true };
  await predictOpportunity({
    organizationId: input.organizationId,
    projectId: input.projectId,
    persist: true,
  });
  return { ok: true };
}

async function recalculatePredictionMetrics(organizationId: string) {
  const supabase = createServiceSupabaseClient();
  if (!supabase) return;

  const { data: rows } = await supabase
    .from("prediction_history")
    .select(
      "id, sector, buyer_name, service_line, framework_name, used_document_types, win_probability, actual_outcome, prediction_accuracy_score, outcome_recorded_at",
    )
    .eq("organization_id", organizationId)
    .not("actual_outcome", "is", null);

  const histories = (rows ?? []) as any[];
  const definitions: Array<{ type: PredictionMetricRecord["dimensionType"]; key: (row: any) => string[] }> = [
    { type: "overall", key: () => ["all"] },
    { type: "sector", key: (row) => [String(row.sector ?? "General")] },
    { type: "buyer", key: (row) => [String(row.buyer_name ?? "Buyer")] },
    { type: "service_line", key: (row) => [String(row.service_line ?? "General")] },
    { type: "framework", key: (row) => [String(row.framework_name ?? "No Framework")] },
    {
      type: "document_type",
      key: (row) =>
        Array.isArray(row.used_document_types) && row.used_document_types.length > 0
          ? (row.used_document_types as string[])
          : ["none"],
    },
  ];

  const metrics = new Map<string, PredictionMetricRecord>();
  histories.forEach((row) => {
    definitions.forEach((definition) => {
      definition.key(row).forEach((dimensionKey) => {
        const mapKey = `${definition.type}:${dimensionKey}`;
        const current =
          metrics.get(mapKey) ??
          ({
            dimensionType: definition.type,
            dimensionKey,
            sampleSize: 0,
            wonCount: 0,
            lostCount: 0,
            shortlistedCount: 0,
            rejectedCount: 0,
            actualWinRate: 0,
            averagePredictedWinProbability: 0,
            averageAccuracyScore: 0,
            lastOutcomeAt: null,
          } satisfies PredictionMetricRecord);

        current.sampleSize += 1;
        current.wonCount += row.actual_outcome === "won" ? 1 : 0;
        current.lostCount += row.actual_outcome === "lost" ? 1 : 0;
        current.shortlistedCount += row.actual_outcome === "shortlisted" ? 1 : 0;
        current.rejectedCount += row.actual_outcome === "rejected" ? 1 : 0;
        current.averagePredictedWinProbability += Number(row.win_probability ?? 0);
        current.averageAccuracyScore += Number(row.prediction_accuracy_score ?? 0);
        current.lastOutcomeAt =
          !current.lastOutcomeAt || new Date(String(row.outcome_recorded_at ?? 0)).getTime() > new Date(current.lastOutcomeAt).getTime()
            ? (row.outcome_recorded_at as string | null)
            : current.lastOutcomeAt;

        metrics.set(mapKey, current);
      });
    });
  });

  const upserts = Array.from(metrics.values()).map((metric) => ({
    organization_id: organizationId,
    dimension_type: metric.dimensionType,
    dimension_key: metric.dimensionKey,
    sample_size: metric.sampleSize,
    won_count: metric.wonCount,
    lost_count: metric.lostCount,
    shortlisted_count: metric.shortlistedCount,
    rejected_count: metric.rejectedCount,
    actual_win_rate: clamp(Math.round((metric.wonCount / Math.max(metric.sampleSize, 1)) * 100), 0, 100),
    average_predicted_win_probability: clamp(Math.round(metric.averagePredictedWinProbability / Math.max(metric.sampleSize, 1)), 0, 100),
    average_accuracy_score: clamp(Math.round(metric.averageAccuracyScore / Math.max(metric.sampleSize, 1)), 0, 100),
    last_outcome_at: metric.lastOutcomeAt,
  }));

  if (upserts.length > 0) {
    await supabase.from("prediction_metrics").upsert(upserts, { onConflict: "organization_id,dimension_type,dimension_key" });
  }
}

export async function recordPredictionOutcome(input: z.infer<typeof RecordPredictionOutcomeSchema>) {
  const supabase = createServiceSupabaseClient();
  if (!supabase) return { ok: true };

  const predictionQuery = supabase
    .from("prediction_history")
    .select("*")
    .eq("organization_id", input.organizationId)
    .order("created_at", { ascending: false })
    .limit(1);

  const { data: predictionRows } = input.projectId
    ? await predictionQuery.eq("project_id", input.projectId)
    : await predictionQuery.eq("opportunity_id", input.opportunityId ?? "");

  const latest = predictionRows?.[0];
  if (!latest) return { ok: true };

  const predicted = Number(latest.win_probability ?? 0);
  const actual = Math.round(actualOutcomeScore(input.outcome) * 100);
  const predictionAccuracyScore = clamp(100 - Math.abs(predicted - actual), 0, 100);

  await supabase
    .from("prediction_history")
    .update({
      actual_outcome: input.outcome,
      prediction_accuracy_score: predictionAccuracyScore,
      outcome_recorded_at: new Date().toISOString(),
    })
    .eq("id", latest.id);

  await recalculatePredictionMetrics(input.organizationId);

  await trackAuditEvent({
    action: "predict.outcome_recorded",
    entityType: "prediction_history",
    organizationId: input.organizationId,
    entityId: latest.id as string,
    metadata: {
      projectId: input.projectId ?? null,
      opportunityId: input.opportunityId ?? null,
      outcome: input.outcome,
      predictionAccuracyScore,
    },
  });

  return { ok: true, predictionAccuracyScore };
}

async function loadLatestPredictionRowsForOpportunities(organizationId: string, opportunityIds: string[]) {
  const supabase = createServiceSupabaseClient();
  if (!supabase || opportunityIds.length === 0) return { history: [] as PredictionHistoryRecord[], factors: [] as PredictionFactorRecord[] };

  const { data: rows } = await supabase
    .from("prediction_history")
    .select("*")
    .eq("organization_id", organizationId)
    .in("opportunity_id", opportunityIds)
    .order("created_at", { ascending: false });

  const latestByOpportunity = new Map<string, PredictionHistoryRecord>();
  ((rows ?? []) as any[]).forEach((row: any) => {
    const prediction = mapPredictionHistoryRow(row);
    if (prediction.opportunityId && !latestByOpportunity.has(prediction.opportunityId)) {
      latestByOpportunity.set(prediction.opportunityId, prediction);
    }
  });

  const history = Array.from(latestByOpportunity.values());
  const historyIds = history.map((item) => item.id);
  if (historyIds.length === 0) return { history, factors: [] as PredictionFactorRecord[] };

  const { data: factorRows } = await supabase
    .from("prediction_factors")
    .select("*")
    .eq("organization_id", organizationId)
    .in("prediction_history_id", historyIds)
    .order("factor_order", { ascending: true });

  return {
    history,
    factors: ((factorRows ?? []) as any[]).map((row: any) => mapPredictionFactorRow(row)),
  };
}

export async function getOpportunityPredictionSummaryMap(organizationId: string | undefined, opportunityIds: string[]) {
  if (opportunityIds.length === 0) return new Map<string, OpportunityPredictionSummaryRecord>();

  if (!organizationId) {
    const map = new Map<string, OpportunityPredictionSummaryRecord>();
    for (const opportunityId of opportunityIds.slice(0, 12)) {
      const result = await predictOpportunity({
        opportunityId,
        persist: false,
      });
      map.set(opportunityId, {
        latestPrediction: result.latestPrediction,
        topStrengths: result.factors.filter((item) => item.factorCategory === "strength").slice(0, 2),
        topRisks: result.factors.filter((item) => item.factorCategory === "risk").slice(0, 2),
        topOpportunities: result.factors.filter((item) => item.factorCategory === "opportunity").slice(0, 2),
        topWeaknesses: result.factors.filter((item) => item.factorCategory === "weakness").slice(0, 2),
      });
    }
    return map;
  }

  const persisted = await loadLatestPredictionRowsForOpportunities(organizationId, opportunityIds);
  const map = new Map<string, OpportunityPredictionSummaryRecord>();
  const factorsByPredictionId = new Map<string, PredictionFactorRecord[]>();
  persisted.factors.forEach((factor) => {
    const current = factorsByPredictionId.get(factor.predictionHistoryId ?? "") ?? [];
    current.push(factor);
    factorsByPredictionId.set(factor.predictionHistoryId ?? "", current);
  });

  persisted.history.forEach((history) => {
    if (!history.opportunityId) return;
    const factors = factorsByPredictionId.get(history.id) ?? [];
    map.set(history.opportunityId, {
      latestPrediction: history,
      topStrengths: factors.filter((item) => item.factorCategory === "strength").slice(0, 2),
      topRisks: factors.filter((item) => item.factorCategory === "risk").slice(0, 2),
      topOpportunities: factors.filter((item) => item.factorCategory === "opportunity").slice(0, 2),
      topWeaknesses: factors.filter((item) => item.factorCategory === "weakness").slice(0, 2),
    });
  });

  const missingOpportunityIds = opportunityIds.filter((id) => !map.has(id));
  for (const opportunityId of missingOpportunityIds) {
    const result = await predictOpportunity({
      organizationId,
      opportunityId,
      persist: true,
    });
    map.set(opportunityId, {
      latestPrediction: result.latestPrediction,
      topStrengths: result.factors.filter((item) => item.factorCategory === "strength").slice(0, 2),
      topRisks: result.factors.filter((item) => item.factorCategory === "risk").slice(0, 2),
      topOpportunities: result.factors.filter((item) => item.factorCategory === "opportunity").slice(0, 2),
      topWeaknesses: result.factors.filter((item) => item.factorCategory === "weakness").slice(0, 2),
    });
  }

  return map;
}

export async function getProjectPredictionSummary(projectId: string, organizationId?: string) {
  if (!organizationId) {
    const result = await predictOpportunity({ projectId, persist: false });
    return {
      latestPrediction: result.latestPrediction,
      factors: result.factors,
    };
  }

  const supabase = createServiceSupabaseClient();
  if (!supabase) {
    const result = await predictOpportunity({ projectId, persist: false });
    return {
      latestPrediction: result.latestPrediction,
      factors: result.factors,
    };
  }

  const { data: rows } = await supabase
    .from("prediction_history")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(1);

  const latest = rows?.[0];
  if (!latest) {
    const result = await predictOpportunity({ organizationId, projectId, persist: true });
    return {
      latestPrediction: result.latestPrediction,
      factors: result.factors,
    };
  }

  const { data: factorRows } = await supabase
    .from("prediction_factors")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("prediction_history_id", latest.id)
    .order("factor_order", { ascending: true });

  return {
    latestPrediction: mapPredictionHistoryRow(latest),
    factors: ((factorRows ?? []) as any[]).map((row: any) => mapPredictionFactorRow(row)),
  };
}

function toDashboardOpportunity(input: OpportunityPredictionSummaryRecord): PredictDashboardOpportunity {
  return {
    title: input.latestPrediction.title,
    buyerName: input.latestPrediction.buyerName,
    opportunityId: input.latestPrediction.opportunityId ?? null,
    projectId: input.latestPrediction.projectId ?? null,
    estimatedContractValue: input.latestPrediction.estimatedContractValue,
    expectedRevenue: input.latestPrediction.expectedRevenue,
    winProbability: input.latestPrediction.winProbability,
    strategicFitScore: input.latestPrediction.strategicFitScore,
    riskScore: input.latestPrediction.riskScore,
    confidenceScore: input.latestPrediction.confidenceScore,
    recommendation: input.latestPrediction.recommendation,
    summary: input.latestPrediction.strategistSummary,
    strengths: input.topStrengths.map((factor) => factor.title),
    risks: [...input.topRisks, ...input.topWeaknesses].slice(0, 2).map((factor) => factor.title),
  };
}

async function loadPredictionMetrics(organizationId?: string) {
  const supabase = createServiceSupabaseClient();
  if (!supabase || !organizationId) return [] as PredictionMetricRecord[];

  const { data } = await supabase
    .from("prediction_metrics")
    .select("*")
    .eq("organization_id", organizationId)
    .order("average_accuracy_score", { ascending: false });

  return ((data ?? []) as any[]).map((row: any) => ({
    dimensionType: row.dimension_type as PredictionMetricRecord["dimensionType"],
    dimensionKey: row.dimension_key as string,
    sampleSize: Number(row.sample_size ?? 0),
    wonCount: Number(row.won_count ?? 0),
    lostCount: Number(row.lost_count ?? 0),
    shortlistedCount: Number(row.shortlisted_count ?? 0),
    rejectedCount: Number(row.rejected_count ?? 0),
    actualWinRate: Number(row.actual_win_rate ?? 0),
    averagePredictedWinProbability: Number(row.average_predicted_win_probability ?? 0),
    averageAccuracyScore: Number(row.average_accuracy_score ?? 0),
    lastOutcomeAt: (row.last_outcome_at as string | null) ?? null,
  }));
}

export async function getPredictEngineSnapshot(organizationId?: string): Promise<PredictEngineSnapshot> {
  const supabase = createServiceSupabaseClient();

  let summaries: OpportunityPredictionSummaryRecord[] = [];
  if (!supabase || !organizationId) {
    summaries = Array.from((await getOpportunityPredictionSummaryMap(undefined, demoOpportunities.map((item) => item.id))).values());
  } else {
    const { data: opportunities } = await supabase
      .from("opportunities")
      .select("id")
      .eq("organization_id", organizationId)
      .order("published_at", { ascending: false })
      .limit(100);
    const ids = ((opportunities ?? []) as any[]).map((row: any) => row.id as string);
    const summaryMap = await getOpportunityPredictionSummaryMap(organizationId, ids);
    summaries = Array.from(summaryMap.values());
  }

  const dashboardItems = summaries.map((summary) => toDashboardOpportunity(summary));
  const metricsRows = await loadPredictionMetrics(organizationId);
  const overallMetric = metricsRows.find((item) => item.dimensionType === "overall") ?? null;

  return {
    metrics: {
      opportunitiesPredicted: dashboardItems.length,
      averageWinProbability: Math.round(average(dashboardItems.map((item) => item.winProbability))),
      averageStrategicFit: Math.round(average(dashboardItems.map((item) => item.strategicFitScore))),
      averageRiskScore: Math.round(average(dashboardItems.map((item) => item.riskScore))),
      strongBidCount: dashboardItems.filter((item) => item.recommendation === "strong_bid").length,
      noBidCount: dashboardItems.filter((item) => item.recommendation === "no_bid").length,
      averagePredictionAccuracy: overallMetric?.averageAccuracyScore ?? 0,
    },
    distribution: [
      { label: "0-24%", count: dashboardItems.filter((item) => item.winProbability < 25).length },
      { label: "25-49%", count: dashboardItems.filter((item) => item.winProbability >= 25 && item.winProbability < 50).length },
      { label: "50-74%", count: dashboardItems.filter((item) => item.winProbability >= 50 && item.winProbability < 75).length },
      { label: "75-100%", count: dashboardItems.filter((item) => item.winProbability >= 75).length },
    ],
    highestProbabilityOpportunities: [...dashboardItems].sort((left, right) => right.winProbability - left.winProbability).slice(0, 6),
    lowestProbabilityOpportunities: [...dashboardItems].sort((left, right) => left.winProbability - right.winProbability).slice(0, 6),
    strategicFitRankings: [...dashboardItems].sort((left, right) => right.strategicFitScore - left.strategicFitScore).slice(0, 6),
    revenueWeightedOpportunities: [...dashboardItems]
      .sort(
        (left, right) =>
          right.expectedRevenue * (right.winProbability / 100) - left.expectedRevenue * (left.winProbability / 100),
      )
      .slice(0, 6),
    recommendationBreakdown: [
      { recommendation: "strong_bid", count: dashboardItems.filter((item) => item.recommendation === "strong_bid").length },
      { recommendation: "bid", count: dashboardItems.filter((item) => item.recommendation === "bid").length },
      { recommendation: "borderline", count: dashboardItems.filter((item) => item.recommendation === "borderline").length },
      { recommendation: "no_bid", count: dashboardItems.filter((item) => item.recommendation === "no_bid").length },
    ],
    accuracy: {
      overall: overallMetric,
      bySector: metricsRows.filter((item) => item.dimensionType === "sector").slice(0, 6),
      byBuyer: metricsRows.filter((item) => item.dimensionType === "buyer").slice(0, 6),
      byServiceLine: metricsRows.filter((item) => item.dimensionType === "service_line").slice(0, 6),
      byFramework: metricsRows.filter((item) => item.dimensionType === "framework").slice(0, 6),
      byDocumentType: metricsRows.filter((item) => item.dimensionType === "document_type").slice(0, 6),
    },
  };
}

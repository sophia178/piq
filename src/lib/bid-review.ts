import { randomUUID } from "node:crypto";
import OpenAI from "openai";
import { z } from "zod";
import { env, hasOpenAIEnv } from "@/lib/env";
import { syncOpportunityRevenueFromBidReview } from "@/lib/opportunities";
import { syncPredictForProject } from "@/lib/predict";
import { createServiceSupabaseClient, demoOrganization, demoProjects, trackAuditEvent } from "@/lib/platform";
import type { BidSectionKey, BidSectionRecord, BidWorkspaceSnapshot } from "@/lib/bid-workspace";

export type ReviewSeverity = "critical" | "high" | "medium" | "low";
export type ReviewFindingType = "missing_response" | "weak_response" | "unsupported_claim" | "missing_evidence" | "compliance_gap";
export type ReviewRecommendationStatus = "pending" | "applied";
export type ReviewReadinessState = "not_ready" | "needs_review" | "ready_for_submission";

export interface BidSectionReviewScore {
  sectionKey: BidSectionKey;
  title: string;
  completeness: number;
  relevance: number;
  evidenceQuality: number;
  complianceCoverage: number;
  differentiation: number;
  persuasiveness: number;
  clarity: number;
  riskLevel: number;
}

export interface BidReviewFindingRecord {
  id: string;
  reviewHistoryId?: string | null;
  sectionKey?: BidSectionKey | null;
  severity: ReviewSeverity;
  findingType: ReviewFindingType;
  issue: string;
  reason: string;
  evidence: string;
  requirementHeading?: string | null;
  createdAt?: string | null;
}

export interface BidReviewRecommendationRecord {
  id: string;
  reviewHistoryId?: string | null;
  findingId?: string | null;
  sectionKey?: BidSectionKey | null;
  issue: string;
  reason: string;
  suggestedFix: string;
  improvedDraft: string;
  applyStatus: ReviewRecommendationStatus;
  createdAt?: string | null;
  appliedAt?: string | null;
}

export interface BidReviewHistoryRecord {
  id: string;
  projectId: string;
  overallBidScore: number;
  complianceScore: number;
  qualityScore: number;
  evidenceScore: number;
  winProbabilityAdjustment: number;
  submissionReadinessScore: number;
  riskScore: number;
  confidenceScore: number;
  readinessState: ReviewReadinessState;
  submissionRecommendation: string;
  strengths: string[];
  weaknesses: string[];
  competitivePosition: string;
  sectionScores: BidSectionReviewScore[];
  createdAt?: string | null;
}

export interface BidReviewSnapshot {
  latestReview: BidReviewHistoryRecord | null;
  reviewFindings: BidReviewFindingRecord[];
  reviewRecommendations: BidReviewRecommendationRecord[];
  reviewHistory: BidReviewHistoryRecord[];
}

export interface BidReviewDashboardProject {
  projectId: string;
  projectTitle: string;
  issuingBody: string;
  estimatedContractValue?: number;
  readinessScore: number;
  submissionRecommendation: string;
  overallBidScore: number;
  criticalFindings: number;
  totalFindings: number;
  improvementOpportunities: number;
  competitivePosition: string;
  topFindings: BidReviewFindingRecord[];
  updatedAt?: string | null;
}

export interface BidReviewDashboardSnapshot {
  metrics: {
    projectsReviewed: number;
    averageOverallBidScore: number;
    averageReadinessScore: number;
    criticalFindings: number;
    improvementOpportunities: number;
  };
  projects: BidReviewDashboardProject[];
}

export const BidReviewRunSchema = z.object({
  organizationId: z.string().min(2).optional(),
  projectId: z.string().min(2),
});

export const BidReviewRecommendationApplySchema = z.object({
  organizationId: z.string().min(2).optional(),
  projectId: z.string().min(2),
  recommendationId: z.string().min(2),
});

const sectionKeywords: Record<BidSectionKey, string[]> = {
  executive_summary: ["executive", "summary", "outcome", "benefit", "value", "buyer", "priority"],
  company_overview: ["company", "organisation", "organization", "overview", "credential", "capacity", "certification"],
  technical_response: ["technical", "solution", "architecture", "specification", "security", "delivery", "compliance"],
  methodology: ["methodology", "approach", "mobilisation", "governance", "implementation", "transition", "plan"],
  risk_management: ["risk", "mitigation", "raid", "assurance", "continuity", "escalation"],
  social_value: ["social", "community", "apprenticeship", "local", "employment", "volunteer", "value"],
  esg_response: ["esg", "environment", "sustainability", "carbon", "governance", "ethical"],
  experience_response: ["experience", "case study", "reference", "similar", "track record", "delivery"],
};

const sectionTitles: Record<BidSectionKey, string> = {
  executive_summary: "Executive Summary",
  company_overview: "Company Overview",
  technical_response: "Technical Response",
  methodology: "Methodology",
  risk_management: "Risk Management",
  social_value: "Social Value",
  esg_response: "ESG Response",
  experience_response: "Experience Response",
};

const AiReviewSchema = z.object({
  strengths: z.array(z.string()).max(6).optional(),
  weaknesses: z.array(z.string()).max(6).optional(),
  competitivePosition: z.string().max(500).optional(),
  winProbabilityAdjustment: z.number().int().min(-20).max(20).optional(),
  findings: z
    .array(
      z.object({
        sectionKey: z
          .enum([
            "executive_summary",
            "company_overview",
            "technical_response",
            "methodology",
            "risk_management",
            "social_value",
            "esg_response",
            "experience_response",
          ])
          .nullable()
          .optional(),
        severity: z.enum(["critical", "high", "medium", "low"]),
        findingType: z.enum(["missing_response", "weak_response", "unsupported_claim", "missing_evidence", "compliance_gap"]),
        issue: z.string().min(4),
        reason: z.string().min(8),
        suggestedFix: z.string().min(8),
        improvedDraft: z.string().min(12).optional(),
      }),
    )
    .max(8)
    .optional(),
});

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

function extractTerms(text: string) {
  const stopwords = new Set([
    "about",
    "against",
    "and",
    "are",
    "bid",
    "buyer",
    "company",
    "deliver",
    "delivery",
    "for",
    "from",
    "have",
    "into",
    "must",
    "our",
    "proposal",
    "section",
    "shall",
    "that",
    "the",
    "their",
    "them",
    "this",
    "with",
    "your",
  ]);

  return Array.from(
    new Set(
      normalizeText(text)
        .split(/[^a-z0-9]+/)
        .filter((item) => item.length > 3 && !stopwords.has(item)),
    ),
  );
}

function sentenceCount(text: string) {
  return text.split(/[.!?]+/).map((item) => item.trim()).filter(Boolean).length;
}

function countQuantifiedSignals(text: string) {
  const numbers = (text.match(/\b\d+(?:\.\d+)?%?\b/g) ?? []).length;
  const quantifiedWords = (normalizeText(text).match(/\b(outcomes|benefits|reduced|improved|saved|delivered|achieved|measured|kpi|sla)\b/g) ?? []).length;
  return numbers + quantifiedWords;
}

function countClaimSignals(text: string) {
  return (normalizeText(text).match(/\b(we|our|will|provide|deliver|ensure|guarantee|best|leading|expert)\b/g) ?? []).length;
}

function keywordCoverage(content: string, referenceText: string[]) {
  const contentTerms = new Set(extractTerms(content));
  const neededTerms = Array.from(new Set(referenceText.flatMap((item) => extractTerms(item)))).slice(0, 18);
  if (neededTerms.length === 0) return 0;
  const hits = neededTerms.filter((term) => contentTerms.has(term)).length;
  return hits / neededTerms.length;
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

function inferSector(snapshot: BidWorkspaceSnapshot) {
  const candidate =
    snapshot.opportunity?.industryTags.find(Boolean) ??
    snapshot.project.title ??
    snapshot.project.tenderName ??
    "General";
  return candidate;
}

function getSectionRequirements(snapshot: BidWorkspaceSnapshot, sectionKey: BidSectionKey) {
  const keywords = sectionKeywords[sectionKey];
  const matched = snapshot.bidRequirements.filter((item) => {
    const text = normalizeText(`${item.heading} ${item.requirement}`);
    return keywords.some((keyword) => text.includes(keyword));
  });

  if (matched.length > 0) return matched;
  if (sectionKey === "executive_summary" || sectionKey === "technical_response") {
    return snapshot.bidRequirements.filter((item) => item.mandatory).slice(0, 6);
  }
  return snapshot.bidRequirements.slice(0, 4);
}

function buildImprovedDraft(params: {
  section: BidSectionRecord | null;
  issue: string;
  reason: string;
  suggestedFix: string;
  requirements: Array<{ heading: string; requirement: string }>;
}) {
  const sectionTitle = params.section?.title ?? "Bid section";
  const currentContent = params.section?.content?.trim() ?? "";
  const requirementSummary = params.requirements.slice(0, 3).map((item) => `${item.heading}: ${item.requirement}`).join(" ");
  const evidenceSummary =
    params.section?.supportingEvidence.length && params.section?.supportingEvidence.length > 0
      ? params.section.supportingEvidence.slice(0, 3).join(" ")
      : "Add a cited case study, current certification or policy reference, and one quantified delivery outcome.";

  if (!currentContent) {
    return `${sectionTitle}\n\nAddress the buyer requirement directly by covering ${requirementSummary}. ${params.suggestedFix} Evidence to anchor the response: ${evidenceSummary}`;
  }

  return `${currentContent}\n\nReviewer improvement: ${params.issue}. ${params.reason} Suggested revision: ${params.suggestedFix} Requirement focus: ${requirementSummary} Evidence to include: ${evidenceSummary}`;
}

function createFinding(params: {
  sectionKey?: BidSectionKey | null;
  severity: ReviewSeverity;
  findingType: ReviewFindingType;
  issue: string;
  reason: string;
  evidence: string;
  requirementHeading?: string | null;
}): BidReviewFindingRecord {
  return {
    id: randomUUID(),
    sectionKey: params.sectionKey ?? null,
    severity: params.severity,
    findingType: params.findingType,
    issue: params.issue,
    reason: params.reason,
    evidence: params.evidence,
    requirementHeading: params.requirementHeading ?? null,
  };
}

function createRecommendation(params: {
  findingId: string;
  sectionKey?: BidSectionKey | null;
  issue: string;
  reason: string;
  suggestedFix: string;
  improvedDraft: string;
}): BidReviewRecommendationRecord {
  return {
    id: randomUUID(),
    findingId: params.findingId,
    sectionKey: params.sectionKey ?? null,
    issue: params.issue,
    reason: params.reason,
    suggestedFix: params.suggestedFix,
    improvedDraft: params.improvedDraft,
    applyStatus: "pending",
  };
}

function severityRank(value: ReviewSeverity) {
  return { critical: 0, high: 1, medium: 2, low: 3 }[value];
}

function buildFallbackReview(snapshot: BidWorkspaceSnapshot, outcomeContext: {
  overallWinRate: number;
  sectorWinRate: number;
  tenderTypeWinRate: number;
  winningFactors: string[];
  losingFactors: string[];
  outcomeCount: number;
}) {
  const sectionScores: BidSectionReviewScore[] = [];
  const findings: BidReviewFindingRecord[] = [];
  const recommendations: BidReviewRecommendationRecord[] = [];

  snapshot.bidSections.forEach((section) => {
    const relatedRequirements = getSectionRequirements(snapshot, section.sectionKey);
    const requirementTexts = relatedRequirements.map((item) => `${item.heading} ${item.requirement}`);
    const mandatoryRequirements = relatedRequirements.filter((item) => item.mandatory);
    const content = section.content?.trim() ?? "";
    const coverage = keywordCoverage(content, requirementTexts);
    const mandatoryCoverage = keywordCoverage(
      content,
      mandatoryRequirements.map((item) => `${item.heading} ${item.requirement}`),
    );
    const evidenceDepth = clamp(
      section.supportingEvidence.length * 22 +
        section.sourceReferences.length * 14 +
        countQuantifiedSignals(content) * 8 +
        Math.round((section.confidence ?? 0) * 0.22),
      0,
      100,
    );
    const completeness = clamp(
      Math.round(section.completionPercentage * 0.55 + Math.min(100, content.length / 12) * 0.25 + coverage * 20),
      0,
      100,
    );
    const relevance = clamp(Math.round(coverage * 78 + mandatoryCoverage * 22), 0, 100);
    const complianceCoverage = clamp(
      Math.round(mandatoryCoverage * 74 + coverage * 18 + (section.sourceReferences.length > 0 ? 8 : 0)),
      0,
      100,
    );
    const differentiation = clamp(
      Math.round(
        countQuantifiedSignals(content) * 9 +
          (normalizeText(content).match(/\b(unique|differentiat|specialist|proven|award|benchmark)\b/g) ?? []).length * 14 +
          section.sourceReferences.length * 6,
      ),
      0,
      100,
    );
    const clarity = clamp(
      Math.round(
        Math.min(100, content.length / 14) * 0.45 +
          (sentenceCount(content) > 0 ? 28 : 0) +
          Math.max(0, 24 - Math.abs(22 - Math.round(content.length / Math.max(sentenceCount(content), 1) / 5))),
      ),
      0,
      100,
    );
    const persuasiveness = clamp(Math.round(countQuantifiedSignals(content) * 10 + clarity * 0.35 + differentiation * 0.35), 0, 100);
    const riskLevel = clamp(Math.round(100 - (completeness * 0.25 + evidenceDepth * 0.25 + complianceCoverage * 0.3 + clarity * 0.2)), 0, 100);

    sectionScores.push({
      sectionKey: section.sectionKey,
      title: section.title,
      completeness,
      relevance,
      evidenceQuality: evidenceDepth,
      complianceCoverage,
      differentiation,
      persuasiveness,
      clarity,
      riskLevel,
    });

    if (content.length < 120) {
      const finding = createFinding({
        sectionKey: section.sectionKey,
        severity: mandatoryRequirements.length > 0 ? "high" : "medium",
        findingType: "missing_response",
        issue: `${section.title} is underdeveloped.`,
        reason: `The section does not yet provide enough content to answer the mapped buyer requirements with confidence.`,
        evidence: `Current draft length is ${content.length} characters across ${sentenceCount(content)} sentences.`,
        requirementHeading: relatedRequirements[0]?.heading ?? null,
      });
      findings.push(finding);
      recommendations.push(
        createRecommendation({
          findingId: finding.id,
          sectionKey: section.sectionKey,
          issue: finding.issue,
          reason: finding.reason,
          suggestedFix: `Expand the section with a direct answer to ${relatedRequirements.slice(0, 2).map((item) => item.heading).join(" and ")} and include one quantified proof point.`,
          improvedDraft: buildImprovedDraft({
            section,
            issue: finding.issue,
            reason: finding.reason,
            suggestedFix: `Expand the answer to cover ${relatedRequirements.slice(0, 2).map((item) => item.heading).join(" and ")} with measurable outcomes and named evidence.`,
            requirements: relatedRequirements,
          }),
        }),
      );
    }

    if (mandatoryRequirements.length > 0 && complianceCoverage < 60) {
      const missingHeadings = mandatoryRequirements.slice(0, 3).map((item) => item.heading).join(", ");
      const finding = createFinding({
        sectionKey: section.sectionKey,
        severity: "critical",
        findingType: "compliance_gap",
        issue: `${section.title} does not fully cover mandatory criteria.`,
        reason: `Mandatory requirements mapped to this section are not clearly answered, which creates a compliance risk before submission.`,
        evidence: `Low mandatory coverage detected against ${missingHeadings}.`,
        requirementHeading: mandatoryRequirements[0]?.heading ?? null,
      });
      findings.push(finding);
      recommendations.push(
        createRecommendation({
          findingId: finding.id,
          sectionKey: section.sectionKey,
          issue: finding.issue,
          reason: finding.reason,
          suggestedFix: `Explicitly answer ${missingHeadings} and state the supporting evidence or attachment against each point.`,
          improvedDraft: buildImprovedDraft({
            section,
            issue: finding.issue,
            reason: finding.reason,
            suggestedFix: `Add explicit coverage for ${missingHeadings} and make the compliance evidence unmistakable.`,
            requirements: mandatoryRequirements,
          }),
        }),
      );
    }

    if (evidenceDepth < 48 || section.supportingEvidence.length === 0) {
      const finding = createFinding({
        sectionKey: section.sectionKey,
        severity: section.sectionKey === "experience_response" || section.sectionKey === "technical_response" ? "high" : "medium",
        findingType: "missing_evidence",
        issue: `${section.title} lacks strong supporting evidence.`,
        reason: `The current answer does not contain enough cited proof, quantified outcomes, or document-backed evidence to support scoring.`,
        evidence: section.supportingEvidence.length > 0 ? section.supportingEvidence.slice(0, 2).join(" ") : "No supporting evidence is attached to this section.",
        requirementHeading: relatedRequirements[0]?.heading ?? null,
      });
      findings.push(finding);
      recommendations.push(
        createRecommendation({
          findingId: finding.id,
          sectionKey: section.sectionKey,
          issue: finding.issue,
          reason: finding.reason,
          suggestedFix: `Add at least one cited case study, one current policy or certification reference, and one measurable outcome relevant to the buyer.`,
          improvedDraft: buildImprovedDraft({
            section,
            issue: finding.issue,
            reason: finding.reason,
            suggestedFix: `Insert proof points, named references, and quantified outcomes that align with the requirement.`,
            requirements: relatedRequirements,
          }),
        }),
      );
    }

    if (countClaimSignals(content) >= 4 && countQuantifiedSignals(content) === 0) {
      const finding = createFinding({
        sectionKey: section.sectionKey,
        severity: "medium",
        findingType: "unsupported_claim",
        issue: `${section.title} contains unsupported claims.`,
        reason: `The response makes confidence statements about delivery but does not balance them with measurable proof or cited evidence.`,
        evidence: `Claim-heavy language detected without quantified outcome signals.`,
        requirementHeading: relatedRequirements[0]?.heading ?? null,
      });
      findings.push(finding);
      recommendations.push(
        createRecommendation({
          findingId: finding.id,
          sectionKey: section.sectionKey,
          issue: finding.issue,
          reason: finding.reason,
          suggestedFix: `Replace generic assurance statements with evidence-backed statements that include figures, outcomes, or named references.`,
          improvedDraft: buildImprovedDraft({
            section,
            issue: finding.issue,
            reason: finding.reason,
            suggestedFix: `Swap broad claims for specific outcomes, service levels, certifications, and comparable delivery evidence.`,
            requirements: relatedRequirements,
          }),
        }),
      );
    }

    if (persuasiveness < 50 || differentiation < 40 || clarity < 45) {
      const finding = createFinding({
        sectionKey: section.sectionKey,
        severity: "medium",
        findingType: "weak_response",
        issue: `${section.title} is not yet persuasive enough.`,
        reason: `The response may read as generic, lack buyer-specific emphasis, or fail to highlight why this bid is stronger than competing submissions.`,
        evidence: `Differentiation score ${differentiation}, persuasiveness score ${persuasiveness}, clarity score ${clarity}.`,
        requirementHeading: relatedRequirements[0]?.heading ?? null,
      });
      findings.push(finding);
      recommendations.push(
        createRecommendation({
          findingId: finding.id,
          sectionKey: section.sectionKey,
          issue: finding.issue,
          reason: finding.reason,
          suggestedFix: `Make the answer more buyer-specific, lead with outcomes, and state differentiators that competitors may struggle to match.`,
          improvedDraft: buildImprovedDraft({
            section,
            issue: finding.issue,
            reason: finding.reason,
            suggestedFix: `Reframe the answer around buyer outcomes, distinctive capability, and measurable proof.`,
            requirements: relatedRequirements,
          }),
        }),
      );
    }
  });

  if (snapshot.knowledgeCoverage && snapshot.knowledgeCoverage.coverageScore < 70) {
    const finding = createFinding({
      severity: snapshot.knowledgeCoverage.coverageScore < 50 ? "high" : "medium",
      findingType: "missing_evidence",
      issue: "Knowledge coverage is below the expected benchmark.",
      reason: `Organisation knowledge does not fully cover the bid, increasing the risk of generic answers and weak proof points.`,
      evidence: snapshot.knowledgeCoverage.missingKnowledgeAreas.join(", ") || "Coverage scoring indicates weak supporting knowledge depth.",
    });
    findings.push(finding);
    recommendations.push(
      createRecommendation({
        findingId: finding.id,
        issue: finding.issue,
        reason: finding.reason,
        suggestedFix: snapshot.knowledgeCoverage.uploadRecommendations[0] ?? "Upload missing case studies, certifications, or policies before final submission review.",
        improvedDraft: `Before submission, strengthen the bid by adding evidence for: ${snapshot.knowledgeCoverage.missingKnowledgeAreas.join(", ") || "the missing knowledge gaps identified in review"}. This will improve compliance coverage, proof quality, and competitiveness.`,
      }),
    );
  }

  snapshot.compliance.missingDocuments.slice(0, 2).forEach((item) => {
    const finding = createFinding({
      severity: "critical",
      findingType: "compliance_gap",
      issue: item,
      reason: "A required document or attachment is still missing from the submission pack.",
      evidence: item,
    });
    findings.push(finding);
    recommendations.push(
      createRecommendation({
        findingId: finding.id,
        issue: finding.issue,
        reason: finding.reason,
        suggestedFix: "Upload the missing document and reference it in the relevant bid section before final sign-off.",
        improvedDraft: `Submission pack action: upload and validate ${item}. Then update the relevant response section so the evaluator can clearly see that the document is available and current.`,
      }),
    );
  });

  snapshot.compliance.missingCertifications.slice(0, 2).forEach((item) => {
    const finding = createFinding({
      severity: "critical",
      findingType: "compliance_gap",
      issue: item,
      reason: "Certification coverage appears incomplete against a buyer requirement or tender condition.",
      evidence: item,
    });
    findings.push(finding);
    recommendations.push(
      createRecommendation({
        findingId: finding.id,
        issue: finding.issue,
        reason: finding.reason,
        suggestedFix: "Attach the current certificate or provide an equivalent compliance explanation with validity dates.",
        improvedDraft: `Compliance evidence action: provide the current certification record for ${item} and reference its validity, scope, and relevance in the company overview or technical response.`,
      }),
    );
  });

  const sortedFindings = [...findings].sort((left, right) => severityRank(left.severity) - severityRank(right.severity));
  const sortedRecommendations = recommendations.filter((item) =>
    sortedFindings.some((finding) => finding.id === item.findingId),
  );

  const complianceScore = clamp(
    Math.round(average(sectionScores.map((item) => item.complianceCoverage)) * 0.62 + snapshot.compliance.readinessScore * 0.38),
    0,
    100,
  );
  const qualityScore = clamp(
    Math.round(
      average(
        sectionScores.map((item) => average([item.completeness, item.relevance, item.differentiation, item.persuasiveness, item.clarity])),
      ),
    ),
    0,
    100,
  );
  const evidenceScore = clamp(
    Math.round(
      average(sectionScores.map((item) => item.evidenceQuality)) * 0.7 +
        Number(snapshot.knowledgeCoverage?.coverageScore ?? 0) * 0.3,
    ),
    0,
    100,
  );
  const overallBidScore = clamp(Math.round(complianceScore * 0.34 + qualityScore * 0.38 + evidenceScore * 0.28), 0, 100);
  const criticalFindings = sortedFindings.filter((item) => item.severity === "critical").length;
  const highFindings = sortedFindings.filter((item) => item.severity === "high").length;
  const riskScore = clamp(
    Math.round(
      average(sectionScores.map((item) => item.riskLevel)) * 0.55 +
        criticalFindings * 14 +
        highFindings * 7 +
        snapshot.compliance.missingInformation.length * 2,
    ),
    0,
    100,
  );
  const confidenceScore = clamp(
    Math.round(
      average(snapshot.bidSections.map((item) => item.confidence ?? 60)) * 0.45 +
        evidenceScore * 0.25 +
        qualityScore * 0.2 +
        Math.min(100, outcomeContext.outcomeCount * 10) * 0.1,
    ),
    0,
    100,
  );
  const benchmarkAdjustment = Math.round((outcomeContext.sectorWinRate - outcomeContext.overallWinRate) * 22 + (outcomeContext.tenderTypeWinRate - outcomeContext.overallWinRate) * 14);
  const winProbabilityAdjustment = clamp(
    Math.round((overallBidScore - 65) * 0.22 + (evidenceScore - 55) * 0.1 + benchmarkAdjustment - criticalFindings * 4 - highFindings * 2),
    -20,
    20,
  );
  const submissionReadinessScore = clamp(
    Math.round(snapshot.compliance.readinessScore * 0.4 + overallBidScore * 0.35 + evidenceScore * 0.15 + confidenceScore * 0.1 - criticalFindings * 6 - highFindings * 3),
    0,
    100,
  );
  const readinessState: ReviewReadinessState =
    criticalFindings > 0 || submissionReadinessScore < 70
      ? "not_ready"
      : highFindings > 1 || submissionReadinessScore < 86
        ? "needs_review"
        : "ready_for_submission";
  const submissionRecommendation =
    readinessState === "ready_for_submission"
      ? "Ready For Submission"
      : readinessState === "needs_review"
        ? "Needs Review"
        : "Not Ready";

  const strengths = [
    ...sectionScores
      .filter((item) => average([item.completeness, item.relevance, item.evidenceQuality]) >= 75)
      .slice(0, 3)
      .map((item) => `${item.title} is well developed with strong relevance and evidence support.`),
    ...outcomeContext.winningFactors
      .filter((factor) =>
        snapshot.bidSections.some((section) => normalizeText(`${section.content} ${section.supportingEvidence.join(" ")}`).includes(normalizeText(factor))),
      )
      .slice(0, 2)
      .map((factor) => `The bid aligns with a historical win factor: ${factor}.`),
  ].slice(0, 5);

  const weaknesses = [
    ...sortedFindings.slice(0, 4).map((item) => item.issue),
    ...outcomeContext.losingFactors
      .filter((factor) => !snapshot.bidSections.some((section) => normalizeText(section.content).includes(normalizeText(factor))))
      .slice(0, 2)
      .map((factor) => `Historical loss factor not clearly addressed: ${factor}.`),
  ].slice(0, 5);

  const competitivePosition =
    readinessState === "ready_for_submission"
      ? outcomeContext.outcomeCount >= 3
        ? `This bid is above the organisation's recent benchmark with strong evidence depth, controlled risk, and a positive win-probability adjustment of ${winProbabilityAdjustment} points.`
        : `This bid is currently competitive, with strong internal scores and limited historical benchmark data available.`
      : readinessState === "needs_review"
        ? `This bid is competitive in parts but still trails a likely winning position because several findings reduce confidence and evaluator impact.`
        : `This bid is below submission benchmark right now because compliance, evidence, or section quality gaps remain unresolved.`;

  return {
    latestReview: {
      id: randomUUID(),
      projectId: snapshot.project.id,
      overallBidScore,
      complianceScore,
      qualityScore,
      evidenceScore,
      winProbabilityAdjustment,
      submissionReadinessScore,
      riskScore,
      confidenceScore,
      readinessState,
      submissionRecommendation,
      strengths: strengths.length > 0 ? strengths : ["Core bid structure is in place and can be strengthened with focused evidence-backed revisions."],
      weaknesses: weaknesses.length > 0 ? weaknesses : ["No major weakness identified, but continue checking evaluator alignment and proof depth."],
      competitivePosition,
      sectionScores,
    } satisfies BidReviewHistoryRecord,
    reviewFindings: sortedFindings.slice(0, 12),
    reviewRecommendations: sortedRecommendations.slice(0, 12),
  };
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

async function maybeEnhanceReviewWithAI(params: {
  snapshot: BidWorkspaceSnapshot;
  fallback: {
    latestReview: BidReviewHistoryRecord;
    reviewFindings: BidReviewFindingRecord[];
    reviewRecommendations: BidReviewRecommendationRecord[];
  };
  outcomeContext: {
    overallWinRate: number;
    sectorWinRate: number;
    tenderTypeWinRate: number;
    winningFactors: string[];
    losingFactors: string[];
    outcomeCount: number;
  };
}) {
  if (!hasOpenAIEnv()) return params.fallback;

  try {
    const prompt = await readPrompt("bid-review.md");
    const client = new OpenAI({ apiKey: env.openAiApiKey });
    const response = await client.responses.create({
      model: "gpt-4.1",
      input: [
        { role: "system", content: prompt },
        {
          role: "user",
          content: JSON.stringify({
            organization: demoOrganization,
            project: params.snapshot.project,
            opportunity: params.snapshot.opportunity ?? null,
            knowledgeCoverage: params.snapshot.knowledgeCoverage,
            compliance: params.snapshot.compliance,
            bidRequirements: params.snapshot.bidRequirements,
            sections: params.snapshot.bidSections.map((section) => ({
              sectionKey: section.sectionKey,
              title: section.title,
              content: section.content,
              completionPercentage: section.completionPercentage,
              sourceReferences: section.sourceReferences,
              supportingEvidence: section.supportingEvidence,
              confidence: section.confidence ?? null,
            })),
            outcomeContext: params.outcomeContext,
            fallbackScores: params.fallback.latestReview,
            fallbackFindings: params.fallback.reviewFindings.map((item) => ({
              sectionKey: item.sectionKey,
              severity: item.severity,
              findingType: item.findingType,
              issue: item.issue,
              reason: item.reason,
            })),
            responseFormat: {
              strengths: ["string"],
              weaknesses: ["string"],
              competitivePosition: "string",
              winProbabilityAdjustment: 0,
              findings: [
                {
                  sectionKey: "technical_response or null",
                  severity: "critical | high | medium | low",
                  findingType: "missing_response | weak_response | unsupported_claim | missing_evidence | compliance_gap",
                  issue: "string",
                  reason: "string",
                  suggestedFix: "string",
                  improvedDraft: "string",
                },
              ],
            },
          }),
        },
      ],
    });

    const parsed = AiReviewSchema.safeParse(extractJsonObject(response.output_text));
    if (!parsed.success) return params.fallback;

    const aiFindings = (parsed.data.findings ?? []).map((item) => {
      const finding = createFinding({
        sectionKey: item.sectionKey ?? null,
        severity: item.severity,
        findingType: item.findingType,
        issue: item.issue,
        reason: item.reason,
        evidence: item.reason,
      });
      const section = item.sectionKey
        ? params.snapshot.bidSections.find((bidSection) => bidSection.sectionKey === item.sectionKey) ?? null
        : null;
      const recommendation = createRecommendation({
        findingId: finding.id,
        sectionKey: item.sectionKey ?? null,
        issue: item.issue,
        reason: item.reason,
        suggestedFix: item.suggestedFix,
        improvedDraft:
          item.improvedDraft && item.improvedDraft.trim().length > 12
            ? item.improvedDraft
            : buildImprovedDraft({
                section,
                issue: item.issue,
                reason: item.reason,
                suggestedFix: item.suggestedFix,
                requirements: section ? getSectionRequirements(params.snapshot, section.sectionKey) : [],
              }),
      });

      return { finding, recommendation };
    });

    return {
      latestReview: {
        ...params.fallback.latestReview,
        strengths: parsed.data.strengths?.length ? parsed.data.strengths : params.fallback.latestReview.strengths,
        weaknesses: parsed.data.weaknesses?.length ? parsed.data.weaknesses : params.fallback.latestReview.weaknesses,
        competitivePosition: parsed.data.competitivePosition ?? params.fallback.latestReview.competitivePosition,
        winProbabilityAdjustment:
          typeof parsed.data.winProbabilityAdjustment === "number"
            ? parsed.data.winProbabilityAdjustment
            : params.fallback.latestReview.winProbabilityAdjustment,
      },
      reviewFindings: aiFindings.length > 0 ? aiFindings.map((item) => item.finding) : params.fallback.reviewFindings,
      reviewRecommendations: aiFindings.length > 0 ? aiFindings.map((item) => item.recommendation) : params.fallback.reviewRecommendations,
    };
  } catch {
    return params.fallback;
  }
}

async function loadOutcomeContext(organizationId?: string, snapshot?: BidWorkspaceSnapshot) {
  const supabase = createServiceSupabaseClient();
  if (!supabase || !organizationId) {
    return {
      overallWinRate: 0.5,
      sectorWinRate: 0.55,
      tenderTypeWinRate: 0.5,
      winningFactors: ["ISO 27001 evidence", "clear mobilisation plan", "relevant case studies"],
      losingFactors: ["generic response", "weak social value detail"],
      outcomeCount: 3,
    };
  }

  const { data } = await supabase
    .from("bid_outcomes")
    .select("outcome, sector, tender_type, decision_factors")
    .eq("organization_id", organizationId)
    .in("outcome", ["won", "lost"]);

  const rows = (data ?? []) as Array<{
    outcome: "won" | "lost";
    sector: string;
    tender_type: string;
    decision_factors: string[] | null;
  }>;
  const decided = rows.filter((item) => item.outcome === "won" || item.outcome === "lost");
  const overallWinRate = decided.length > 0 ? decided.filter((item) => item.outcome === "won").length / decided.length : 0.5;
  const currentSector = normalizeText(inferSector(snapshot as BidWorkspaceSnapshot));
  const currentTenderType = normalizeText(
    inferTenderType(`${snapshot?.project.tenderName ?? ""} ${snapshot?.opportunity?.description ?? ""}`),
  );
  const sectorRows = decided.filter((item) => normalizeText(item.sector) === currentSector);
  const tenderTypeRows = decided.filter((item) => normalizeText(item.tender_type) === currentTenderType);
  const sectorWinRate =
    sectorRows.length > 0 ? sectorRows.filter((item) => item.outcome === "won").length / sectorRows.length : overallWinRate;
  const tenderTypeWinRate =
    tenderTypeRows.length > 0
      ? tenderTypeRows.filter((item) => item.outcome === "won").length / tenderTypeRows.length
      : overallWinRate;

  const winningFactors = Array.from(
    new Set(
      decided
        .filter((item) => item.outcome === "won")
        .flatMap((item) => (Array.isArray(item.decision_factors) ? item.decision_factors : [])),
    ),
  ).slice(0, 6);
  const losingFactors = Array.from(
    new Set(
      decided
        .filter((item) => item.outcome === "lost")
        .flatMap((item) => (Array.isArray(item.decision_factors) ? item.decision_factors : [])),
    ),
  ).slice(0, 6);

  return {
    overallWinRate,
    sectorWinRate,
    tenderTypeWinRate,
    winningFactors,
    losingFactors,
    outcomeCount: decided.length,
  };
}

async function loadWorkspaceSnapshot(projectId: string, organizationId?: string) {
  const workspaceModule = await import("@/lib/bid-workspace");
  return workspaceModule.getBidWorkspaceSnapshot(projectId, organizationId);
}

function mapReviewHistoryRow(row: any): BidReviewHistoryRecord {
  return {
    id: row.id as string,
    projectId: row.project_id as string,
    overallBidScore: Number(row.overall_bid_score ?? 0),
    complianceScore: Number(row.compliance_score ?? 0),
    qualityScore: Number(row.quality_score ?? 0),
    evidenceScore: Number(row.evidence_score ?? 0),
    winProbabilityAdjustment: Number(row.win_probability_adjustment ?? 0),
    submissionReadinessScore: Number(row.submission_readiness_score ?? 0),
    riskScore: Number(row.risk_score ?? 0),
    confidenceScore: Number(row.confidence_score ?? 0),
    readinessState: row.readiness_state as ReviewReadinessState,
    submissionRecommendation: (row.submission_recommendation as string | null) ?? "Needs Review",
    strengths: (row.strengths ?? []) as string[],
    weaknesses: (row.weaknesses ?? []) as string[],
    competitivePosition: (row.competitive_position as string | null) ?? "",
    sectionScores: ((row.section_scores ?? []) as BidSectionReviewScore[]).map((item) => ({
      sectionKey: item.sectionKey,
      title: item.title,
      completeness: Number(item.completeness ?? 0),
      relevance: Number(item.relevance ?? 0),
      evidenceQuality: Number(item.evidenceQuality ?? 0),
      complianceCoverage: Number(item.complianceCoverage ?? 0),
      differentiation: Number(item.differentiation ?? 0),
      persuasiveness: Number(item.persuasiveness ?? 0),
      clarity: Number(item.clarity ?? 0),
      riskLevel: Number(item.riskLevel ?? 0),
    })),
    createdAt: (row.created_at as string | null) ?? null,
  };
}

function mapReviewFindingRow(row: any): BidReviewFindingRecord {
  return {
    id: row.id as string,
    reviewHistoryId: (row.review_history_id as string | null) ?? null,
    sectionKey: (row.section_key as BidSectionKey | null) ?? null,
    severity: row.severity as ReviewSeverity,
    findingType: row.finding_type as ReviewFindingType,
    issue: row.issue as string,
    reason: row.reason as string,
    evidence: row.evidence as string,
    requirementHeading: (row.requirement_heading as string | null) ?? null,
    createdAt: (row.created_at as string | null) ?? null,
  };
}

function mapReviewRecommendationRow(row: any): BidReviewRecommendationRecord {
  return {
    id: row.id as string,
    reviewHistoryId: (row.review_history_id as string | null) ?? null,
    findingId: (row.review_finding_id as string | null) ?? null,
    sectionKey: (row.section_key as BidSectionKey | null) ?? null,
    issue: row.issue as string,
    reason: row.reason as string,
    suggestedFix: row.suggested_fix as string,
    improvedDraft: row.improved_draft as string,
    applyStatus: row.apply_status as ReviewRecommendationStatus,
    createdAt: (row.created_at as string | null) ?? null,
    appliedAt: (row.applied_at as string | null) ?? null,
  };
}

async function persistReview(input: {
  organizationId: string;
  projectId: string;
  review: {
    latestReview: BidReviewHistoryRecord;
    reviewFindings: BidReviewFindingRecord[];
    reviewRecommendations: BidReviewRecommendationRecord[];
  };
}) {
  const supabase = createServiceSupabaseClient();
  if (!supabase) return input.review;

  const { data: historyRow } = await supabase
    .from("review_history")
    .insert({
      organization_id: input.organizationId,
      project_id: input.projectId,
      overall_bid_score: input.review.latestReview.overallBidScore,
      compliance_score: input.review.latestReview.complianceScore,
      quality_score: input.review.latestReview.qualityScore,
      evidence_score: input.review.latestReview.evidenceScore,
      win_probability_adjustment: input.review.latestReview.winProbabilityAdjustment,
      submission_readiness_score: input.review.latestReview.submissionReadinessScore,
      risk_score: input.review.latestReview.riskScore,
      confidence_score: input.review.latestReview.confidenceScore,
      readiness_state: input.review.latestReview.readinessState,
      submission_recommendation: input.review.latestReview.submissionRecommendation,
      strengths: input.review.latestReview.strengths,
      weaknesses: input.review.latestReview.weaknesses,
      competitive_position: input.review.latestReview.competitivePosition,
      section_scores: input.review.latestReview.sectionScores,
    })
    .select("id, created_at")
    .single();

  const reviewHistoryId = historyRow?.id as string;
  const createdAt = (historyRow?.created_at as string | null) ?? new Date().toISOString();

  const findingsToInsert = input.review.reviewFindings.map((item) => ({
    organization_id: input.organizationId,
    project_id: input.projectId,
    review_history_id: reviewHistoryId,
    section_key: item.sectionKey ?? null,
    severity: item.severity,
    finding_type: item.findingType,
    issue: item.issue,
    reason: item.reason,
    evidence: item.evidence,
    requirement_heading: item.requirementHeading ?? null,
  }));

  const { data: insertedFindings } = await supabase
    .from("review_findings")
    .insert(findingsToInsert)
    .select("id, section_key, severity, finding_type, issue, reason, evidence, requirement_heading, review_history_id, created_at");

  const findingLookup = new Map<string, BidReviewFindingRecord>();
  (insertedFindings ?? []).forEach((row: any) => {
    const mapped = mapReviewFindingRow(row);
    findingLookup.set(`${mapped.sectionKey ?? "global"}:${mapped.issue}`, mapped);
  });

  const recommendationsToInsert = input.review.reviewRecommendations.map((item) => ({
    organization_id: input.organizationId,
    project_id: input.projectId,
    review_history_id: reviewHistoryId,
    review_finding_id: findingLookup.get(`${item.sectionKey ?? "global"}:${item.issue}`)?.id ?? null,
    section_key: item.sectionKey ?? null,
    issue: item.issue,
    reason: item.reason,
    suggested_fix: item.suggestedFix,
    improved_draft: item.improvedDraft,
    apply_status: item.applyStatus,
  }));

  const { data: insertedRecommendations } = await supabase
    .from("review_recommendations")
    .insert(recommendationsToInsert)
    .select("id, review_history_id, review_finding_id, section_key, issue, reason, suggested_fix, improved_draft, apply_status, created_at, applied_at");

  return {
    latestReview: {
      ...input.review.latestReview,
      id: reviewHistoryId || input.review.latestReview.id,
      createdAt,
    },
    reviewFindings: (insertedFindings ?? []).map((row: any) => mapReviewFindingRow(row)),
    reviewRecommendations: (insertedRecommendations ?? []).map((row: any) => mapReviewRecommendationRow(row)),
  };
}

export async function syncBidReviewForProject(input: {
  projectId: string;
  organizationId?: string;
  snapshot?: BidWorkspaceSnapshot;
}) {
  const snapshot = input.snapshot ?? (await loadWorkspaceSnapshot(input.projectId, input.organizationId));
  const outcomeContext = await loadOutcomeContext(input.organizationId, snapshot);
  const fallbackReview = buildFallbackReview(snapshot, outcomeContext);
  const enhancedReview = await maybeEnhanceReviewWithAI({
    snapshot,
    fallback: fallbackReview,
    outcomeContext,
  });

  if (!input.organizationId) {
    return {
      latestReview: {
        ...enhancedReview.latestReview,
        createdAt: new Date().toISOString(),
      },
      reviewFindings: enhancedReview.reviewFindings,
      reviewRecommendations: enhancedReview.reviewRecommendations,
    };
  }

  const persisted = await persistReview({
    organizationId: input.organizationId,
    projectId: input.projectId,
    review: enhancedReview,
  });

  await syncOpportunityRevenueFromBidReview({
    organizationId: input.organizationId,
    projectId: input.projectId,
    overallBidScore: persisted.latestReview.overallBidScore,
    submissionReadinessScore: persisted.latestReview.submissionReadinessScore,
    evidenceScore: persisted.latestReview.evidenceScore,
    winProbabilityAdjustment: persisted.latestReview.winProbabilityAdjustment,
  });
  await syncPredictForProject({
    organizationId: input.organizationId,
    projectId: input.projectId,
  });

  await trackAuditEvent({
    action: "review.review_generated",
    entityType: "project_review",
    entityId: input.projectId,
    organizationId: input.organizationId,
    metadata: {
      overallBidScore: persisted.latestReview.overallBidScore,
      submissionRecommendation: persisted.latestReview.submissionRecommendation,
      findings: persisted.reviewFindings.length,
      recommendations: persisted.reviewRecommendations.length,
    },
  });

  return persisted;
}

export async function getBidReviewSnapshot(projectId: string, organizationId?: string): Promise<BidReviewSnapshot> {
  const supabase = createServiceSupabaseClient();
  if (!supabase || !organizationId) {
    const generated = await syncBidReviewForProject({
      projectId,
      organizationId,
    });
    return {
      latestReview: generated.latestReview,
      reviewFindings: generated.reviewFindings,
      reviewRecommendations: generated.reviewRecommendations,
      reviewHistory: generated.latestReview ? [generated.latestReview] : [],
    };
  }

  const { data: historyRows } = await supabase
    .from("review_history")
    .select("id, project_id, overall_bid_score, compliance_score, quality_score, evidence_score, win_probability_adjustment, submission_readiness_score, risk_score, confidence_score, readiness_state, submission_recommendation, strengths, weaknesses, competitive_position, section_scores, created_at")
    .eq("organization_id", organizationId)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(8);

  if (!historyRows || historyRows.length === 0) {
    const generated = await syncBidReviewForProject({ projectId, organizationId });
    return {
      latestReview: generated.latestReview,
      reviewFindings: generated.reviewFindings,
      reviewRecommendations: generated.reviewRecommendations,
      reviewHistory: generated.latestReview ? [generated.latestReview] : [],
    };
  }

  const reviewHistory = historyRows.map((row: any) => mapReviewHistoryRow(row));
  const latestReview = reviewHistory[0] ?? null;

  const [findingsRows, recommendationsRows] = await Promise.all([
    latestReview
      ? supabase
          .from("review_findings")
          .select("id, review_history_id, section_key, severity, finding_type, issue, reason, evidence, requirement_heading, created_at")
          .eq("organization_id", organizationId)
          .eq("review_history_id", latestReview.id)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [] as any[] }),
    latestReview
      ? supabase
          .from("review_recommendations")
          .select("id, review_history_id, review_finding_id, section_key, issue, reason, suggested_fix, improved_draft, apply_status, created_at, applied_at")
          .eq("organization_id", organizationId)
          .eq("review_history_id", latestReview.id)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [] as any[] }),
  ]);

  return {
    latestReview,
    reviewFindings: (findingsRows.data ?? []).map((row: any) => mapReviewFindingRow(row)),
    reviewRecommendations: (recommendationsRows.data ?? []).map((row: any) => mapReviewRecommendationRow(row)),
    reviewHistory,
  };
}

export async function applyBidReviewRecommendation(input: z.infer<typeof BidReviewRecommendationApplySchema>) {
  const supabase = createServiceSupabaseClient();
  if (!supabase || !input.organizationId) {
    return { ok: true };
  }

  const { data: recommendationRow } = await supabase
    .from("review_recommendations")
    .select("id, section_key, issue, reason, suggested_fix, improved_draft, apply_status")
    .eq("organization_id", input.organizationId)
    .eq("project_id", input.projectId)
    .eq("id", input.recommendationId)
    .single();

  if (!recommendationRow) {
    throw new Error("Review recommendation not found.");
  }

  const sectionKey = (recommendationRow.section_key as BidSectionKey | null) ?? null;
  if (!sectionKey) {
    throw new Error("This recommendation does not target a specific bid section.");
  }

  const snapshot = await loadWorkspaceSnapshot(input.projectId, input.organizationId);
  const section = snapshot.bidSections.find((item) => item.sectionKey === sectionKey);
  if (!section) {
    throw new Error("Target bid section not found.");
  }

  const sectionTitle = section.title ?? sectionTitles[sectionKey];
  const improvedDraft = recommendationRow.improved_draft as string;
  const sourceReferences = Array.from(new Set([...section.sourceReferences, "Bid Review Engine Recommendation"]));
  const supportingEvidence = Array.from(
    new Set([
      ...section.supportingEvidence,
      `Reviewer fix: ${String(recommendationRow.suggested_fix ?? recommendationRow.issue)}`,
    ]),
  );

  const { data: responseRow } = await supabase
    .from("response_library")
    .insert({
      organization_id: input.organizationId,
      project_id: input.projectId,
      section_name: sectionTitle,
      content: improvedDraft,
      source_references: sourceReferences,
      supporting_evidence: supportingEvidence,
      confidence_score: Math.max(82, Number(section.confidence ?? 75)),
    })
    .select("id")
    .single();

  let workspaceDocumentId = section.latestWorkspaceDocumentId ?? null;
  if (workspaceDocumentId) {
    await supabase
      .from("workspace_documents")
      .update({
        title: sectionTitle,
        content: improvedDraft,
      })
      .eq("organization_id", input.organizationId)
      .eq("id", workspaceDocumentId);
  } else {
    const { data: insertedDocument } = await supabase
      .from("workspace_documents")
      .insert({
        organization_id: input.organizationId,
        project_id: input.projectId,
        title: sectionTitle,
        document_type: sectionKey,
        content: improvedDraft,
      })
      .select("id")
      .single();
    workspaceDocumentId = (insertedDocument?.id as string | null) ?? null;
  }

  await supabase
    .from("bid_sections")
    .update({
      latest_draft_id: (responseRow?.id as string | null) ?? null,
      latest_workspace_document_id: workspaceDocumentId,
      status: "ready_for_review",
      completion_percentage: Math.max(90, Number(section.completionPercentage ?? 0)),
      last_generated_at: new Date().toISOString(),
    })
    .eq("organization_id", input.organizationId)
    .eq("project_id", input.projectId)
    .eq("section_key", sectionKey);

  await supabase
    .from("review_recommendations")
    .update({
      apply_status: "applied",
      applied_at: new Date().toISOString(),
    })
    .eq("organization_id", input.organizationId)
    .eq("id", input.recommendationId);

  const workspaceModule = await import("@/lib/bid-workspace");
  await workspaceModule.recalculateBidWorkspaceScores(input.projectId, input.organizationId);

  await trackAuditEvent({
    action: "review.recommendation_applied",
    entityType: "review_recommendation",
    entityId: input.recommendationId,
    organizationId: input.organizationId,
    metadata: {
      projectId: input.projectId,
      sectionKey,
      issue: recommendationRow.issue,
    },
  });

  return { ok: true };
}

export async function getBidReviewDashboardSnapshot(organizationId?: string): Promise<BidReviewDashboardSnapshot> {
  if (!organizationId) {
    const projects = await Promise.all(
      demoProjects.slice(0, 3).map(async (project) => {
        const reviewSnapshot = await getBidReviewSnapshot(project.id);
        const latestReview = reviewSnapshot.latestReview;
        return {
          projectId: project.id,
          projectTitle: project.title,
          issuingBody: project.issuingBody,
          estimatedContractValue: project.estimatedContractValue,
          readinessScore: latestReview?.submissionReadinessScore ?? 0,
          submissionRecommendation: latestReview?.submissionRecommendation ?? "Needs Review",
          overallBidScore: latestReview?.overallBidScore ?? 0,
          criticalFindings: reviewSnapshot.reviewFindings.filter((item) => item.severity === "critical").length,
          totalFindings: reviewSnapshot.reviewFindings.length,
          improvementOpportunities: reviewSnapshot.reviewRecommendations.filter((item) => item.applyStatus !== "applied").length,
          competitivePosition: latestReview?.competitivePosition ?? "",
          topFindings: reviewSnapshot.reviewFindings.slice(0, 3),
          updatedAt: latestReview?.createdAt ?? null,
        } satisfies BidReviewDashboardProject;
      }),
    );

    return {
      metrics: {
        projectsReviewed: projects.length,
        averageOverallBidScore: Math.round(average(projects.map((item) => item.overallBidScore))),
        averageReadinessScore: Math.round(average(projects.map((item) => item.readinessScore))),
        criticalFindings: projects.reduce((sum, item) => sum + item.criticalFindings, 0),
        improvementOpportunities: projects.reduce((sum, item) => sum + item.improvementOpportunities, 0),
      },
      projects,
    };
  }

  const supabase = createServiceSupabaseClient();
  if (!supabase) {
    return getBidReviewDashboardSnapshot();
  }

  const { data: projectRows } = await supabase
    .from("projects")
    .select("id, title, issuing_body, estimated_contract_value, readiness_score")
    .eq("organization_id", organizationId)
    .order("updated_at", { ascending: false })
    .limit(8);

  const projects = await Promise.all(
    ((projectRows ?? []) as any[]).map(async (projectRow: any) => {
      const reviewSnapshot = await getBidReviewSnapshot(projectRow.id as string, organizationId);
      const latestReview = reviewSnapshot.latestReview;
      return {
        projectId: projectRow.id as string,
        projectTitle: projectRow.title as string,
        issuingBody: projectRow.issuing_body as string,
        estimatedContractValue: Number(projectRow.estimated_contract_value ?? 0) || undefined,
        readinessScore: latestReview?.submissionReadinessScore ?? Number(projectRow.readiness_score ?? 0),
        submissionRecommendation: latestReview?.submissionRecommendation ?? "Needs Review",
        overallBidScore: latestReview?.overallBidScore ?? 0,
        criticalFindings: reviewSnapshot.reviewFindings.filter((item) => item.severity === "critical").length,
        totalFindings: reviewSnapshot.reviewFindings.length,
        improvementOpportunities: reviewSnapshot.reviewRecommendations.filter((item) => item.applyStatus !== "applied").length,
        competitivePosition: latestReview?.competitivePosition ?? "",
        topFindings: reviewSnapshot.reviewFindings.slice(0, 3),
        updatedAt: latestReview?.createdAt ?? null,
      } satisfies BidReviewDashboardProject;
    }),
  );

  return {
    metrics: {
      projectsReviewed: projects.length,
      averageOverallBidScore: Math.round(average(projects.map((item) => item.overallBidScore))),
      averageReadinessScore: Math.round(average(projects.map((item) => item.readinessScore))),
      criticalFindings: projects.reduce((sum, item) => sum + item.criticalFindings, 0),
      improvementOpportunities: projects.reduce((sum, item) => sum + item.improvementOpportunities, 0),
    },
    projects,
  };
}

import { createHash } from "node:crypto";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { env, hasOpenAIEnv, hasSupabaseEnv } from "@/lib/env";

export type KnowledgeDocumentType =
  | "case_study"
  | "previous_bid"
  | "certification"
  | "policy"
  | "staff_cv"
  | "method_statement"
  | "framework_agreement"
  | "service_description"
  | "testimonial";

type KnowledgeGenerationType = "workspace_generation" | "bid_section_generation" | "response_library_generation";

export interface KnowledgeDocumentRecord {
  id: string;
  organizationId?: string;
  name: string;
  documentType: KnowledgeDocumentType;
  title: string;
  description?: string | null;
  sourceFile?: string | null;
  uploadDate?: string | null;
  processingStatus: "queued" | "processing" | "indexed" | "failed";
  confidenceScore: number;
  extractedText: string;
  chunkCount: number;
  timesReferenced: number;
  influencedBidsCount: number;
  averageWinProbabilityLift: number;
  generatedSectionsInfluenced: number;
  revenueImpact: number;
  lastReferencedAt?: string | null;
  createdAt?: string | null;
}

export interface KnowledgeChunkHit {
  knowledgeDocumentId: string;
  title: string;
  documentType: KnowledgeDocumentType;
  chunkId: string;
  content: string;
  score: number;
  sourceLabel: string;
  sourceFile?: string | null;
  supportingEvidence: string;
  confidenceScore: number;
}

export interface KnowledgeCoverageArea {
  documentType: KnowledgeDocumentType;
  label: string;
  count: number;
  covered: boolean;
}

export interface KnowledgeCoverageRecord {
  projectId: string;
  coverageScore: number;
  missingEvidenceScore: number;
  missingCertificationScore: number;
  missingExperienceScore: number;
  coverageStrength: "strong" | "moderate" | "weak";
  missingKnowledgeAreas: string[];
  uploadRecommendations: string[];
  supportingDocumentIds: string[];
  updatedAt?: string | null;
}

export interface KnowledgePerformanceRecord {
  knowledgeDocumentId: string;
  timesUsed: number;
  generatedSectionsInfluenced: number;
  winProbabilityImprovement: number;
  revenueImpact: number;
  lastUsedAt?: string | null;
}

export interface KnowledgeEngineSnapshot {
  coverageScore: number;
  missingKnowledgeAreas: string[];
  coveredKnowledgeAreas: string[];
  coverageByType: KnowledgeCoverageArea[];
  totalDocuments: number;
  totalChunks: number;
  referencedDocuments: number;
  impactfulDocuments: number;
  averageImpactLift: number;
  topDocuments: KnowledgeDocumentRecord[];
  recentDocuments: KnowledgeDocumentRecord[];
  uploadRecommendations: string[];
  totalCoverageRecords: number;
  averageMissingEvidenceScore: number;
  averageMissingCertificationScore: number;
  averageMissingExperienceScore: number;
  mostValuableDocuments: KnowledgeDocumentRecord[];
  recentCoverage: KnowledgeCoverageRecord[];
}

export const KnowledgeUploadSchema = z.object({
  organizationId: z.string().min(2),
  title: z.string().min(3),
  description: z.string().optional(),
  documentType: z.enum([
    "case_study",
    "previous_bid",
    "certification",
    "policy",
    "staff_cv",
    "method_statement",
    "framework_agreement",
    "service_description",
    "testimonial",
  ]),
  storagePath: z.string().min(3),
  sourceFile: z.string().optional(),
  extractedText: z.string().min(20),
});

const knowledgeTypeLabels: Record<KnowledgeDocumentType, string> = {
  case_study: "Case Studies",
  previous_bid: "Previous Tender Responses",
  certification: "Certifications",
  policy: "Policies",
  staff_cv: "Staff CVs",
  method_statement: "Method Statements",
  framework_agreement: "Framework Agreements",
  service_description: "Service Descriptions",
  testimonial: "Testimonials",
};

export function getKnowledgeDocumentTypeLabel(type: KnowledgeDocumentType) {
  return knowledgeTypeLabels[type];
}

const demoKnowledgeDocuments: KnowledgeDocumentRecord[] = [
  {
    id: "know_1",
    organizationId: "org_demo",
    name: "Healthcare Transformation Case Study",
    documentType: "case_study",
    title: "Healthcare Transformation Case Study",
    description: "Regional healthcare data transformation delivery outcomes.",
    sourceFile: "healthcare-case-study.pdf",
    uploadDate: "2026-06-01T09:00:00.000Z",
    processingStatus: "indexed",
    confidenceScore: 94,
    extractedText:
      "Delivered a regional healthcare transformation programme across multiple trusts with measurable service improvements, ISO-accredited governance, and quantified patient data outcomes.",
    chunkCount: 2,
    timesReferenced: 12,
    influencedBidsCount: 4,
    averageWinProbabilityLift: 6,
    generatedSectionsInfluenced: 9,
    revenueImpact: 324000,
    lastReferencedAt: "2026-06-24T10:00:00.000Z",
    createdAt: "2026-06-01T09:00:00.000Z",
  },
  {
    id: "know_2",
    organizationId: "org_demo",
    name: "ISO 27001 Certificate",
    documentType: "certification",
    title: "ISO 27001 Certificate",
    description: "Current information security certification.",
    sourceFile: "iso-27001-certificate.pdf",
    uploadDate: "2026-05-12T08:00:00.000Z",
    processingStatus: "indexed",
    confidenceScore: 98,
    extractedText: "ISO 27001 certification covering information security management and supplier assurance controls.",
    chunkCount: 1,
    timesReferenced: 18,
    influencedBidsCount: 7,
    averageWinProbabilityLift: 4,
    generatedSectionsInfluenced: 14,
    revenueImpact: 412000,
    lastReferencedAt: "2026-06-24T08:00:00.000Z",
    createdAt: "2026-05-12T08:00:00.000Z",
  },
  {
    id: "know_3",
    organizationId: "org_demo",
    name: "Programme Delivery Methodology",
    documentType: "method_statement",
    title: "Programme Delivery Methodology",
    description: "Core mobilisation, governance, RAID, QA, and reporting controls.",
    sourceFile: "delivery-methodology.docx",
    uploadDate: "2026-05-18T12:00:00.000Z",
    processingStatus: "indexed",
    confidenceScore: 90,
    extractedText:
      "Programme governance follows weekly RAID review, named workstream leads, stage-gated assurance, and benefits tracking through mobilisation, implementation, and transition.",
    chunkCount: 2,
    timesReferenced: 15,
    influencedBidsCount: 5,
    averageWinProbabilityLift: 5,
    generatedSectionsInfluenced: 11,
    revenueImpact: 278000,
    lastReferencedAt: "2026-06-23T16:00:00.000Z",
    createdAt: "2026-05-18T12:00:00.000Z",
  },
  {
    id: "know_4",
    organizationId: "org_demo",
    name: "Managed Service Description",
    documentType: "service_description",
    title: "Managed Service Description",
    description: "Service scope, SLAs, onboarding, and reporting model.",
    sourceFile: "service-description.pdf",
    uploadDate: "2026-05-22T10:00:00.000Z",
    processingStatus: "indexed",
    confidenceScore: 87,
    extractedText:
      "The managed service includes mobilisation, service desk onboarding, monthly performance reporting, named service manager ownership, and a structured continuous improvement plan.",
    chunkCount: 2,
    timesReferenced: 8,
    influencedBidsCount: 3,
    averageWinProbabilityLift: 3,
    generatedSectionsInfluenced: 6,
    revenueImpact: 146000,
    lastReferencedAt: "2026-06-20T09:00:00.000Z",
    createdAt: "2026-05-22T10:00:00.000Z",
  },
];

const demoCoverageRecords: KnowledgeCoverageRecord[] = [
  {
    projectId: "proj_1",
    coverageScore: 84,
    missingEvidenceScore: 18,
    missingCertificationScore: 8,
    missingExperienceScore: 16,
    coverageStrength: "strong",
    missingKnowledgeAreas: ["Financial services testimonials"],
    uploadRecommendations: ["Upload Financial Services Case Studies.", "Upload client testimonials for regulated programmes."],
    supportingDocumentIds: ["know_1", "know_2", "know_3"],
    updatedAt: "2026-06-24T10:00:00.000Z",
  },
  {
    projectId: "proj_2",
    coverageScore: 61,
    missingEvidenceScore: 42,
    missingCertificationScore: 28,
    missingExperienceScore: 34,
    coverageStrength: "moderate",
    missingKnowledgeAreas: ["Cyber security policy", "Named transport case studies"],
    uploadRecommendations: ["Upload a Cyber Security Policy.", "Upload Smart Mobility Case Studies."],
    supportingDocumentIds: ["know_2", "know_4"],
    updatedAt: "2026-06-23T12:00:00.000Z",
  },
];

function createKnowledgeSupabaseClient() {
  if (!hasSupabaseEnv() || !env.supabaseServiceRoleKey) return null;

  return createClient(env.supabaseUrl!, env.supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function cleanExtractedText(text: string) {
  return text
    .replace(/\u0000/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function buildDeterministicEmbedding(text: string, dimensions = 64) {
  const output = new Array(dimensions).fill(0);
  const normalized = normalizeText(text);
  for (let index = 0; index < normalized.length; index += 1) {
    output[index % dimensions] += normalized.charCodeAt(index) / 255;
  }
  const magnitude = Math.sqrt(output.reduce((sum, item) => sum + item * item, 0)) || 1;
  return output.map((item) => Number((item / magnitude).toFixed(6)));
}

async function buildEmbedding(text: string) {
  if (!hasOpenAIEnv()) {
    return {
      model: "deterministic-hash-64",
      values: buildDeterministicEmbedding(text),
    };
  }

  try {
    const client = new OpenAI({ apiKey: env.openAiApiKey });
    const response = await client.embeddings.create({
      model: "text-embedding-3-small",
      input: text.slice(0, 12000),
    });
    return {
      model: "text-embedding-3-small",
      values: response.data[0]?.embedding ?? buildDeterministicEmbedding(text),
    };
  } catch {
    return {
      model: "deterministic-hash-64",
      values: buildDeterministicEmbedding(text),
    };
  }
}

function countApproximateTokens(text: string) {
  return Math.max(1, Math.round(text.split(/\s+/).length * 1.3));
}

function chunkText(text: string, maxLength = 900) {
  const paragraphs = text
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
  const chunks: string[] = [];
  let buffer = "";

  paragraphs.forEach((paragraph) => {
    if (!buffer) {
      buffer = paragraph;
      return;
    }

    if (`${buffer}\n${paragraph}`.length <= maxLength) {
      buffer = `${buffer}\n${paragraph}`;
      return;
    }

    chunks.push(buffer);
    buffer = paragraph;
  });

  if (buffer) chunks.push(buffer);
  if (chunks.length === 0 && text.trim()) {
    for (let index = 0; index < text.length; index += maxLength) {
      chunks.push(text.slice(index, index + maxLength));
    }
  }

  return chunks.slice(0, 36);
}

function cosineSimilarity(left: number[], right: number[]) {
  const length = Math.min(left.length, right.length);
  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;

  for (let index = 0; index < length; index += 1) {
    const leftValue = left[index] ?? 0;
    const rightValue = right[index] ?? 0;
    dot += leftValue * rightValue;
    leftMagnitude += leftValue * leftValue;
    rightMagnitude += rightValue * rightValue;
  }

  return dot / ((Math.sqrt(leftMagnitude) || 1) * (Math.sqrt(rightMagnitude) || 1));
}

function lexicalScore(text: string, query: string) {
  const haystack = normalizeText(text);
  const terms = Array.from(new Set(normalizeText(query).split(/\s+/).filter((item) => item.length > 2)));
  if (terms.length === 0) return 0;

  const hits = terms.filter((term) => haystack.includes(term)).length;
  return hits / terms.length;
}

function extractKeywords(text: string, topK = 12) {
  const counts = new Map<string, number>();
  const stopwords = new Set(["the", "and", "for", "with", "that", "this", "from", "into", "your", "have", "will", "are", "not", "our", "has", "was", "but"]);
  normalizeText(text)
    .split(/[^a-z0-9_]+/)
    .filter((item) => item.length > 3 && !stopwords.has(item))
    .forEach((term) => counts.set(term, (counts.get(term) ?? 0) + 1));

  return Array.from(counts.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, topK)
    .map(([term]) => term);
}

function inferDocumentConfidence(text: string, documentType: KnowledgeDocumentType) {
  const lengthScore = Math.min(35, Math.round(text.length / 220));
  const structureBonus = /\n/.test(text) ? 8 : 3;
  const evidenceBonus =
    documentType === "certification"
      ? /iso|certified|certificate|accreditation|compliance/.test(normalizeText(text))
        ? 28
        : 14
      : documentType === "case_study" || documentType === "testimonial"
        ? /outcome|delivered|results|improvement|benefit|impact/.test(normalizeText(text))
          ? 24
          : 12
        : 18;

  return Math.max(45, Math.min(98, 30 + lengthScore + structureBonus + evidenceBonus));
}

function mapKnowledgeAssetType(documentType: KnowledgeDocumentType) {
  switch (documentType) {
    case "previous_bid":
      return "previous_response";
    case "framework_agreement":
      return "framework_agreement";
    case "service_description":
      return "service_description";
    case "testimonial":
      return "testimonial";
    default:
      return documentType;
  }
}

function buildSearchableMetadata(text: string, documentType: KnowledgeDocumentType) {
  return {
    keywords: extractKeywords(text),
    characterCount: text.length,
    approximateTokens: countApproximateTokens(text),
    documentType,
    lineCount: text.split(/\n+/).length,
  };
}

function mapDocumentRow(row: any, performance?: KnowledgePerformanceRecord): KnowledgeDocumentRecord {
  return {
    id: row.id as string,
    organizationId: (row.organization_id as string | null) ?? undefined,
    name: ((row.name as string | null) ?? row.title ?? "Knowledge document") as string,
    documentType: row.document_type as KnowledgeDocumentType,
    title: row.title as string,
    description: (row.description as string | null) ?? null,
    sourceFile: (row.source_file as string | null) ?? null,
    uploadDate: (row.upload_date as string | null) ?? (row.created_at as string | null) ?? null,
    processingStatus: ((row.processing_status as KnowledgeDocumentRecord["processingStatus"] | null) ?? "indexed"),
    confidenceScore: Number(row.confidence_score ?? 0),
    extractedText: (row.extracted_text as string | null) ?? "",
    chunkCount: Number(row.chunk_count ?? 0),
    timesReferenced: Number(row.times_referenced ?? 0),
    influencedBidsCount: Number(row.influenced_bids_count ?? 0),
    averageWinProbabilityLift: Number(row.average_win_probability_lift ?? 0),
    generatedSectionsInfluenced: Number(performance?.generatedSectionsInfluenced ?? 0),
    revenueImpact: Number(performance?.revenueImpact ?? 0),
    lastReferencedAt: (row.last_referenced_at as string | null) ?? null,
    createdAt: (row.created_at as string | null) ?? null,
  };
}

async function insertAnalyticsEvent(input: {
  organizationId: string;
  projectId?: string;
  eventName: string;
  metadata?: Record<string, unknown>;
}) {
  const supabase = createKnowledgeSupabaseClient();
  if (!supabase) return;

  await supabase.from("analytics_events").insert({
    organization_id: input.organizationId,
    project_id: input.projectId ?? null,
    event_name: input.eventName,
    metadata: input.metadata ?? {},
  });
}

function getCoverageStrength(score: number) {
  return score >= 75 ? "strong" : score >= 45 ? "moderate" : "weak";
}

function inferRecommendedDocumentTypes(text: string) {
  const normalized = normalizeText(text);
  const required = new Set<KnowledgeDocumentType>(["case_study", "certification", "policy", "staff_cv", "method_statement"]);

  if (/framework/.test(normalized)) required.add("framework_agreement");
  if (/service|managed service|solution|technical|scope|approach/.test(normalized)) required.add("service_description");
  if (/reference|testimonial|referee|client feedback/.test(normalized)) required.add("testimonial");
  if (/previous bid|prior tender|bid response/.test(normalized)) required.add("previous_bid");
  if (/team|personnel|consultant|expert|cv/.test(normalized)) required.add("staff_cv");
  if (/experience|case study|delivery|implemented|programme|project/.test(normalized)) required.add("case_study");
  if (/certification|accreditation|iso|cyber essentials|fca|compliance/.test(normalized)) required.add("certification");
  if (/policy|security policy|privacy|governance|risk management/.test(normalized)) required.add("policy");
  if (/method statement|methodology|mobilisation|delivery plan/.test(normalized)) required.add("method_statement");

  return Array.from(required);
}

function buildUploadRecommendationsFromMissing(missingAreas: string[], contextText = "") {
  const normalized = normalizeText(contextText);
  const recommendations = new Set<string>();

  missingAreas.forEach((area) => {
    if (area.includes("Cyber") || /cyber|security/.test(normalized)) {
      recommendations.add("Upload a Cyber Security Policy.");
    }
    if (area.includes("Financial") || /financial|bank|fca/.test(normalized)) {
      recommendations.add("Upload Financial Services Case Studies.");
      recommendations.add("Upload FCA Compliance Documentation.");
    }
    if (area.includes("Case Studies")) {
      recommendations.add("Upload sector-specific case studies with quantified outcomes.");
    }
    if (area.includes("Certifications")) {
      recommendations.add("Upload current certifications and accreditation evidence.");
    }
    if (area.includes("Policies")) {
      recommendations.add("Upload the relevant governance, privacy, or security policy.");
    }
    if (area.includes("Staff CVs")) {
      recommendations.add("Upload staff CVs for delivery leads and subject matter experts.");
    }
    if (area.includes("Testimonials")) {
      recommendations.add("Upload client testimonials or named reference evidence.");
    }
  });

  if (recommendations.size === 0 && missingAreas.length > 0) {
    recommendations.add(`Upload ${missingAreas[0]}.`);
  }

  return Array.from(recommendations).slice(0, 6);
}

function buildCoverageRecordFromContext(params: {
  projectId: string;
  requirements: string[];
  availableDocuments: KnowledgeDocumentRecord[];
  supportingDocumentIds: string[];
}) {
  const contextText = params.requirements.join("\n");
  const requiredTypes = inferRecommendedDocumentTypes(contextText);
  const countsByType = new Map<KnowledgeDocumentType, number>();
  params.availableDocuments.forEach((document) => {
    countsByType.set(document.documentType, (countsByType.get(document.documentType) ?? 0) + 1);
  });

  const missingTypes = requiredTypes.filter((type) => (countsByType.get(type) ?? 0) === 0);
  const missingKnowledgeAreas = missingTypes.map((type) => knowledgeTypeLabels[type]);
  const missingEvidenceScore = Math.min(
    100,
    requiredTypes
      .filter((type) => ["case_study", "testimonial", "service_description", "previous_bid"].includes(type))
      .reduce((sum, type) => sum + ((countsByType.get(type) ?? 0) === 0 ? 30 : 0), 0),
  );
  const missingCertificationScore = Math.min(100, ((countsByType.get("certification") ?? 0) === 0 ? 70 : 10) + ((countsByType.get("policy") ?? 0) === 0 ? 20 : 0));
  const missingExperienceScore = Math.min(
    100,
    ((countsByType.get("case_study") ?? 0) === 0 ? 45 : 10) +
      ((countsByType.get("staff_cv") ?? 0) === 0 ? 30 : 10) +
      ((countsByType.get("testimonial") ?? 0) === 0 ? 20 : 5),
  );
  const coverageRatio = requiredTypes.length > 0 ? (requiredTypes.length - missingTypes.length) / requiredTypes.length : 0;
  const supportDepth = Math.min(1, params.supportingDocumentIds.length / Math.max(requiredTypes.length, 1));
  const coverageScore = Math.round((coverageRatio * 0.7 + supportDepth * 0.3) * 100);

  return {
    projectId: params.projectId,
    coverageScore,
    missingEvidenceScore,
    missingCertificationScore,
    missingExperienceScore,
    coverageStrength: getCoverageStrength(coverageScore),
    missingKnowledgeAreas,
    uploadRecommendations: buildUploadRecommendationsFromMissing(missingKnowledgeAreas, contextText),
    supportingDocumentIds: Array.from(new Set(params.supportingDocumentIds)),
  } satisfies Omit<KnowledgeCoverageRecord, "updatedAt">;
}

export async function indexKnowledgeDocument(input: z.infer<typeof KnowledgeUploadSchema>) {
  const supabase = createKnowledgeSupabaseClient();
  const cleanedText = cleanExtractedText(input.extractedText);
  const chunks = chunkText(cleanedText);
  const confidenceScore = inferDocumentConfidence(cleanedText, input.documentType);
  const searchableMetadata = buildSearchableMetadata(cleanedText, input.documentType);
  const sourceFile = input.sourceFile ?? input.storagePath.split("/").pop() ?? input.title;

  if (!supabase) {
    return {
      documentId: createHash("sha256").update(input.title).digest("hex").slice(0, 16),
      chunkCount: chunks.length,
    };
  }

  const { data: legacyAsset } = await supabase
    .from("knowledge_assets")
    .insert({
      organization_id: input.organizationId,
      asset_type: mapKnowledgeAssetType(input.documentType),
      title: input.title,
      description: input.description ?? null,
      storage_path: input.storagePath,
      extracted_text: cleanedText.slice(0, 100000),
      metadata: { knowledgeDocumentType: input.documentType, searchableMetadata },
    })
    .select("id")
    .single();

  const { data: document } = await supabase
    .from("knowledge_documents")
    .insert({
      organization_id: input.organizationId,
      legacy_knowledge_asset_id: legacyAsset?.id ?? null,
      name: input.title,
      document_type: input.documentType,
      title: input.title,
      description: input.description ?? null,
      source_file: sourceFile,
      storage_path: input.storagePath,
      upload_date: new Date().toISOString(),
      processing_status: "processing",
      confidence_score: confidenceScore,
      extracted_text: cleanedText.slice(0, 100000),
      chunk_count: chunks.length,
      searchable_metadata: searchableMetadata,
      metadata: { cleaned: true },
    })
    .select("id")
    .single();

  const documentId = document?.id as string;
  if (!documentId) {
    throw new Error("Unable to create knowledge document.");
  }

  const insertedChunks: Array<{ id: string; content: string }> = [];
  for (let index = 0; index < chunks.length; index += 1) {
    const chunk = chunks[index];
    const { data: chunkRow } = await supabase
      .from("knowledge_chunks")
      .insert({
        organization_id: input.organizationId,
        knowledge_document_id: documentId,
        chunk_index: index,
        content: chunk,
        token_count: countApproximateTokens(chunk),
        metadata: { searchableMetadata: buildSearchableMetadata(chunk, input.documentType) },
      })
      .select("id")
      .single();

    if (chunkRow?.id) {
      insertedChunks.push({ id: chunkRow.id as string, content: chunk });
    }
  }

  for (const chunk of insertedChunks) {
    const embedding = await buildEmbedding(chunk.content);
    await supabase.from("knowledge_embeddings").insert({
      organization_id: input.organizationId,
      knowledge_chunk_id: chunk.id,
      embedding_model: embedding.model,
      embedding: embedding.values,
      dimensions: embedding.values.length,
    });
  }

  await supabase
    .from("knowledge_documents")
    .update({
      processing_status: "indexed",
      chunk_count: insertedChunks.length,
      confidence_score: confidenceScore,
      searchable_metadata: searchableMetadata,
    })
    .eq("organization_id", input.organizationId)
    .eq("id", documentId);

  await insertAnalyticsEvent({
    organizationId: input.organizationId,
    eventName: "knowledge.document_indexed",
    metadata: {
      documentId,
      documentType: input.documentType,
      chunkCount: insertedChunks.length,
      confidenceScore,
      sourceFile,
    },
  });

  return {
    documentId,
    chunkCount: insertedChunks.length,
  };
}

export async function retrieveRelevantKnowledge(input: {
  organizationId?: string;
  query: string;
  topK?: number;
  allowedDocumentTypes?: KnowledgeDocumentType[];
}) {
  const supabase = createKnowledgeSupabaseClient();
  if (!supabase || !input.organizationId) {
    return demoKnowledgeDocuments.slice(0, input.topK ?? 4).map((item, index) => ({
      knowledgeDocumentId: item.id,
      title: item.title,
      documentType: item.documentType,
      chunkId: `demo_chunk_${index}`,
      content: item.extractedText,
      score: 0.82 - index * 0.08,
      sourceLabel: `${item.title} (${knowledgeTypeLabels[item.documentType]})`,
      sourceFile: item.sourceFile,
      supportingEvidence: item.extractedText.slice(0, 280),
      confidenceScore: item.confidenceScore,
    } satisfies KnowledgeChunkHit));
  }

  const [documentsResponse, chunksResponse, embeddingsResponse, performanceResponse, queryEmbedding] = await Promise.all([
    supabase
      .from("knowledge_documents")
      .select("id, organization_id, name, document_type, title, description, source_file, upload_date, processing_status, confidence_score, extracted_text, chunk_count, times_referenced, influenced_bids_count, average_win_probability_lift, last_referenced_at, created_at")
      .eq("organization_id", input.organizationId)
      .eq("processing_status", "indexed"),
    supabase
      .from("knowledge_chunks")
      .select("id, knowledge_document_id, chunk_index, content, token_count")
      .eq("organization_id", input.organizationId)
      .limit(600),
    supabase
      .from("knowledge_embeddings")
      .select("knowledge_chunk_id, embedding")
      .eq("organization_id", input.organizationId)
      .limit(600),
    supabase
      .from("knowledge_performance")
      .select("knowledge_document_id, times_used, generated_sections_influenced, win_probability_improvement, revenue_impact, last_used_at")
      .eq("organization_id", input.organizationId),
    buildEmbedding(input.query),
  ]);

  const performanceMap = new Map<string, KnowledgePerformanceRecord>(
    ((performanceResponse.data ?? []) as any[]).map((row: any) => [
      row.knowledge_document_id as string,
      {
        knowledgeDocumentId: row.knowledge_document_id as string,
        timesUsed: Number(row.times_used ?? 0),
        generatedSectionsInfluenced: Number(row.generated_sections_influenced ?? 0),
        winProbabilityImprovement: Number(row.win_probability_improvement ?? 0),
        revenueImpact: Number(row.revenue_impact ?? 0),
        lastUsedAt: (row.last_used_at as string | null) ?? null,
      },
    ]),
  );

  const documents = (documentsResponse.data ?? []) as any[];
  const chunks = (chunksResponse.data ?? []) as any[];
  const embeddings = new Map<string, number[]>(
    ((embeddingsResponse.data ?? []) as any[]).map((row) => [row.knowledge_chunk_id as string, ((row.embedding ?? []) as number[]).map(Number)]),
  );
  const documentMap = new Map(
    documents
      .filter((row) => !input.allowedDocumentTypes || input.allowedDocumentTypes.includes(row.document_type as KnowledgeDocumentType))
      .map((row) => [row.id as string, mapDocumentRow(row, performanceMap.get(row.id as string))]),
  );

  const ranked = chunks
    .filter((row) => documentMap.has(row.knowledge_document_id as string))
    .map((row) => {
      const document = documentMap.get(row.knowledge_document_id as string)!;
      const overlap = lexicalScore(row.content as string, input.query);
      const similarity = cosineSimilarity(embeddings.get(row.id as string) ?? [], queryEmbedding.values);
      const impact = Math.min(0.25, document.averageWinProbabilityLift / 100 + document.revenueImpact / 10000000);
      const confidenceBoost = document.confidenceScore / 1000;
      const score = overlap * 0.5 + similarity * 0.32 + impact * 0.1 + confidenceBoost * 0.08;
      return {
        knowledgeDocumentId: document.id,
        title: document.title,
        documentType: document.documentType,
        chunkId: row.id as string,
        content: row.content as string,
        score,
        sourceLabel: `${document.title} (${knowledgeTypeLabels[document.documentType]})`,
        sourceFile: document.sourceFile,
        supportingEvidence: String(row.content ?? "").slice(0, 320),
        confidenceScore: document.confidenceScore,
      } satisfies KnowledgeChunkHit;
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, input.topK ?? 5);

  return ranked;
}

export async function recordKnowledgeUsage(input: {
  organizationId?: string;
  projectId?: string;
  documentIds: string[];
  sectionName: string;
  generationType: KnowledgeGenerationType;
  chunkHits?: KnowledgeChunkHit[];
  confidenceScore?: number;
}) {
  const supabase = createKnowledgeSupabaseClient();
  if (!supabase || !input.organizationId || input.documentIds.length === 0) return;

  const organizationId = input.organizationId;
  const now = new Date().toISOString();
  const documentIds = Array.from(new Set(input.documentIds));
  const chunkHits = (input.chunkHits ?? []).filter((item) => documentIds.includes(item.knowledgeDocumentId));

  await insertAnalyticsEvent({
    organizationId,
    projectId: input.projectId,
    eventName: "knowledge.document_applied",
    metadata: {
      documentIds,
      sectionName: input.sectionName,
      generationType: input.generationType,
    },
  });

  const usageRows: Array<{
    organization_id: string;
    project_id: string | null;
    knowledge_document_id: string;
    knowledge_chunk_id: string | null;
    section_name: string;
    generation_type: KnowledgeGenerationType;
    source_reference: string;
    supporting_evidence: string;
    confidence_score: number;
  }> =
    chunkHits.length > 0
      ? chunkHits.map((hit) => ({
          organization_id: organizationId,
          project_id: input.projectId ?? null,
          knowledge_document_id: hit.knowledgeDocumentId,
          knowledge_chunk_id: hit.chunkId,
          section_name: input.sectionName,
          generation_type: input.generationType,
          source_reference: hit.sourceLabel,
          supporting_evidence: hit.supportingEvidence,
          confidence_score: input.confidenceScore ?? hit.confidenceScore ?? 0,
        }))
      : documentIds.map((documentId) => ({
          organization_id: organizationId,
          project_id: input.projectId ?? null,
          knowledge_document_id: documentId,
          knowledge_chunk_id: null,
          section_name: input.sectionName,
          generation_type: input.generationType,
          source_reference: documentId,
          supporting_evidence: "",
          confidence_score: input.confidenceScore ?? 0,
        }));

  await supabase.from("knowledge_usage").insert(usageRows);

  const usageCountByDocument = new Map<string, number>();
  usageRows.forEach((row) => usageCountByDocument.set(row.knowledge_document_id, (usageCountByDocument.get(row.knowledge_document_id) ?? 0) + 1));

  for (const documentId of documentIds) {
    const [{ data: existingDoc }, { data: existingPerformance }] = await Promise.all([
      supabase
        .from("knowledge_documents")
        .select("times_referenced")
        .eq("organization_id", organizationId)
        .eq("id", documentId)
        .maybeSingle(),
      supabase
        .from("knowledge_performance")
        .select("times_used, generated_sections_influenced, win_probability_improvement, revenue_impact")
        .eq("organization_id", organizationId)
        .eq("knowledge_document_id", documentId)
        .maybeSingle(),
    ]);

    await supabase
      .from("knowledge_documents")
      .update({
        times_referenced: Number(existingDoc?.times_referenced ?? 0) + (usageCountByDocument.get(documentId) ?? 1),
        last_referenced_at: now,
      })
      .eq("organization_id", organizationId)
      .eq("id", documentId);

    await supabase.from("knowledge_performance").upsert(
      {
        organization_id: organizationId,
        knowledge_document_id: documentId,
        times_used: Number(existingPerformance?.times_used ?? 0) + (usageCountByDocument.get(documentId) ?? 1),
        generated_sections_influenced: Number(existingPerformance?.generated_sections_influenced ?? 0) + 1,
        win_probability_improvement: Number(existingPerformance?.win_probability_improvement ?? 0),
        revenue_impact: Number(existingPerformance?.revenue_impact ?? 0),
        last_used_at: now,
      },
      { onConflict: "organization_id,knowledge_document_id" },
    );
  }
}

export async function syncKnowledgeCoverageForTender(input: {
  organizationId?: string;
  projectId: string;
  requirements: string[];
  supportingDocumentIds?: string[];
}): Promise<KnowledgeCoverageRecord | null> {
  const supabase = createKnowledgeSupabaseClient();
  const documents = input.organizationId ? await loadKnowledgeDocuments(input.organizationId) : demoKnowledgeDocuments;
  const coverage = buildCoverageRecordFromContext({
    projectId: input.projectId,
    requirements: input.requirements,
    availableDocuments: documents,
    supportingDocumentIds: input.supportingDocumentIds ?? [],
  });

  if (!supabase || !input.organizationId) {
    return { ...coverage, updatedAt: new Date().toISOString() };
  }

  await supabase.from("knowledge_coverage").upsert(
    {
      organization_id: input.organizationId,
      project_id: input.projectId,
      coverage_score: coverage.coverageScore,
      missing_evidence_score: coverage.missingEvidenceScore,
      missing_certification_score: coverage.missingCertificationScore,
      missing_experience_score: coverage.missingExperienceScore,
      coverage_strength: coverage.coverageStrength,
      missing_knowledge_areas: coverage.missingKnowledgeAreas,
      upload_recommendations: coverage.uploadRecommendations,
      supporting_document_ids: coverage.supportingDocumentIds,
    },
    { onConflict: "organization_id,project_id" },
  );

  await insertAnalyticsEvent({
    organizationId: input.organizationId,
    projectId: input.projectId,
    eventName: "knowledge.coverage_updated",
    metadata: coverage,
  });

  return { ...coverage, updatedAt: new Date().toISOString() };
}

export async function loadKnowledgeCoverageForTender(projectId: string, organizationId?: string): Promise<KnowledgeCoverageRecord | null> {
  const supabase = createKnowledgeSupabaseClient();
  if (!supabase || !organizationId) {
    return demoCoverageRecords.find((item) => item.projectId === projectId) ?? demoCoverageRecords[0] ?? null;
  }

  const { data } = await supabase
    .from("knowledge_coverage")
    .select("project_id, coverage_score, missing_evidence_score, missing_certification_score, missing_experience_score, coverage_strength, missing_knowledge_areas, upload_recommendations, supporting_document_ids, updated_at")
    .eq("organization_id", organizationId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (!data) return null;

  return {
    projectId: data.project_id as string,
    coverageScore: Number(data.coverage_score ?? 0),
    missingEvidenceScore: Number(data.missing_evidence_score ?? 0),
    missingCertificationScore: Number(data.missing_certification_score ?? 0),
    missingExperienceScore: Number(data.missing_experience_score ?? 0),
    coverageStrength: data.coverage_strength as KnowledgeCoverageRecord["coverageStrength"],
    missingKnowledgeAreas: (data.missing_knowledge_areas ?? []) as string[],
    uploadRecommendations: (data.upload_recommendations ?? []) as string[],
    supportingDocumentIds: (data.supporting_document_ids ?? []) as string[],
    updatedAt: (data.updated_at as string | null) ?? null,
  };
}

async function loadKnowledgeDocuments(organizationId: string) {
  const supabase = createKnowledgeSupabaseClient();
  if (!supabase) return demoKnowledgeDocuments;

  const [documentsResponse, performanceResponse, usageResponse, outcomesResponse] = await Promise.all([
    supabase
      .from("knowledge_documents")
      .select("id, organization_id, name, document_type, title, description, source_file, upload_date, processing_status, confidence_score, extracted_text, chunk_count, times_referenced, influenced_bids_count, average_win_probability_lift, last_referenced_at, created_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false }),
    supabase
      .from("knowledge_performance")
      .select("knowledge_document_id, times_used, generated_sections_influenced, win_probability_improvement, revenue_impact, last_used_at")
      .eq("organization_id", organizationId),
    supabase
      .from("knowledge_usage")
      .select("project_id, knowledge_document_id")
      .eq("organization_id", organizationId),
    supabase
      .from("bid_outcomes")
      .select("project_id, outcome, contract_value")
      .eq("organization_id", organizationId)
      .in("outcome", ["won", "lost"]),
  ]);

  const performanceMap = new Map<string, KnowledgePerformanceRecord>(
    ((performanceResponse.data ?? []) as any[]).map((row: any) => [
      row.knowledge_document_id as string,
      {
        knowledgeDocumentId: row.knowledge_document_id as string,
        timesUsed: Number(row.times_used ?? 0),
        generatedSectionsInfluenced: Number(row.generated_sections_influenced ?? 0),
        winProbabilityImprovement: Number(row.win_probability_improvement ?? 0),
        revenueImpact: Number(row.revenue_impact ?? 0),
        lastUsedAt: (row.last_used_at as string | null) ?? null,
      },
    ]),
  );

  const documentIdsByProject = new Map<string, string[]>();
  ((usageResponse.data ?? []) as any[]).forEach((row: any) => {
    const projectId = row.project_id as string | null;
    const documentId = row.knowledge_document_id as string | null;
    if (!projectId || !documentId) return;
    const current = documentIdsByProject.get(projectId) ?? [];
    if (!current.includes(documentId)) current.push(documentId);
    documentIdsByProject.set(projectId, current);
  });

  const outcomeRevenueByDocument = new Map<string, number>();
  const outcomeInfluenceByDocument = new Map<string, number>();
  ((outcomesResponse.data ?? []) as any[]).forEach((row: any) => {
    const projectId = row.project_id as string | null;
    const contractValue = Number(row.contract_value ?? 0);
    const outcome = row.outcome as string | null;
    const documentIds = projectId ? documentIdsByProject.get(projectId) ?? [] : [];
    if (!projectId || documentIds.length === 0) return;

    documentIds.forEach((documentId) => {
      outcomeInfluenceByDocument.set(documentId, (outcomeInfluenceByDocument.get(documentId) ?? 0) + (outcome ? 1 : 0));
      if (outcome === "won" && contractValue > 0) {
        outcomeRevenueByDocument.set(documentId, (outcomeRevenueByDocument.get(documentId) ?? 0) + contractValue / documentIds.length);
      }
    });
  });

  return ((documentsResponse.data ?? []) as any[]).map((row: any) => {
    const mapped = mapDocumentRow(row, performanceMap.get(row.id as string));
    return {
      ...mapped,
      revenueImpact: Math.max(mapped.revenueImpact, Number(outcomeRevenueByDocument.get(mapped.id) ?? 0)),
      influencedBidsCount: Math.max(mapped.influencedBidsCount, Number(outcomeInfluenceByDocument.get(mapped.id) ?? 0)),
    };
  });
}

export async function loadKnowledgeDocumentsForExport(input: {
  organizationId?: string;
  documentIds?: string[];
  documentTypes?: KnowledgeDocumentType[];
  limit?: number;
}) {
  const limit = input.limit ?? 12;

  if (!input.organizationId) {
    return demoKnowledgeDocuments
      .filter((document) => (input.documentIds?.length ? input.documentIds.includes(document.id) : true))
      .filter((document) => (input.documentTypes?.length ? input.documentTypes.includes(document.documentType) : true))
      .slice(0, limit);
  }

  const documents = await loadKnowledgeDocuments(input.organizationId);
  const filtered = documents
    .filter((document) => (input.documentIds?.length ? input.documentIds.includes(document.id) : true))
    .filter((document) => (input.documentTypes?.length ? input.documentTypes.includes(document.documentType) : true));

  if (filtered.length > 0) return filtered.slice(0, limit);
  return documents
    .filter((document) => (input.documentTypes?.length ? input.documentTypes.includes(document.documentType) : true))
    .slice(0, limit);
}

export async function syncKnowledgeImpactFromBidQuality(input: {
  organizationId?: string;
  projectId: string;
  readinessScore: number;
  completionScore: number;
}) {
  const supabase = createKnowledgeSupabaseClient();
  if (!supabase || !input.organizationId) return { ok: true };

  const winProbabilityLift = Math.round(input.completionScore * 0.09 + input.readinessScore * 0.06);
  const [{ data: project }, { data: usageRows }, { data: priorSyncEvents }] = await Promise.all([
    supabase
      .from("projects")
      .select("estimated_contract_value")
      .eq("organization_id", input.organizationId)
      .eq("id", input.projectId)
      .maybeSingle(),
    supabase
      .from("knowledge_usage")
      .select("id, knowledge_document_id")
      .eq("organization_id", input.organizationId)
      .eq("project_id", input.projectId),
    supabase
      .from("analytics_events")
      .select("metadata, created_at")
      .eq("organization_id", input.organizationId)
      .eq("project_id", input.projectId)
      .eq("event_name", "knowledge.quality_impact_synced")
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  const revenueImpact = Math.round(Number(project?.estimated_contract_value ?? 0) * (winProbabilityLift / 100));
  const previousLift = Number(((priorSyncEvents?.[0] as any)?.metadata?.winProbabilityLift as number | undefined) ?? 0);
  const previousRevenueImpact = Number(((priorSyncEvents?.[0] as any)?.metadata?.revenueImpact as number | undefined) ?? 0);
  const uniqueDocumentIds = Array.from(new Set(((usageRows ?? []) as any[]).map((row: any) => row.knowledge_document_id as string).filter(Boolean)));

  await supabase
    .from("knowledge_usage")
    .update({
      win_probability_improvement: winProbabilityLift,
      revenue_impact: revenueImpact,
    })
    .eq("organization_id", input.organizationId)
    .eq("project_id", input.projectId);

  for (const documentId of uniqueDocumentIds) {
    const [{ data: row }, { count: usageCount }] = await Promise.all([
      supabase
        .from("knowledge_documents")
        .select("influenced_bids_count, average_win_probability_lift")
        .eq("organization_id", input.organizationId)
        .eq("id", documentId)
        .maybeSingle(),
      supabase
        .from("knowledge_usage")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", input.organizationId)
        .eq("knowledge_document_id", documentId),
    ]);

    const influenced = Math.max(Number(row?.influenced_bids_count ?? 0), 0) + (winProbabilityLift > 0 ? 1 : 0);
    const average =
      influenced > 0
        ? Math.round(((Number(row?.average_win_probability_lift ?? 0) * Math.max(influenced - 1, 0) + winProbabilityLift) / influenced) * 100) / 100
        : 0;

    await supabase
      .from("knowledge_documents")
      .update({
        influenced_bids_count: influenced,
        average_win_probability_lift: average,
      })
      .eq("organization_id", input.organizationId)
      .eq("id", documentId);

    const { data: existingPerformance } = await supabase
      .from("knowledge_performance")
      .select("generated_sections_influenced")
      .eq("organization_id", input.organizationId)
      .eq("knowledge_document_id", documentId)
      .maybeSingle();

    await supabase.from("knowledge_performance").upsert(
      {
        organization_id: input.organizationId,
        knowledge_document_id: documentId,
        times_used: usageCount ?? 0,
        generated_sections_influenced: Number(existingPerformance?.generated_sections_influenced ?? 0),
        win_probability_improvement: winProbabilityLift,
        revenue_impact: revenueImpact,
        last_used_at: new Date().toISOString(),
      },
      { onConflict: "organization_id,knowledge_document_id" },
    );
  }

  await insertAnalyticsEvent({
    organizationId: input.organizationId,
    projectId: input.projectId,
    eventName: "knowledge.quality_impact_synced",
    metadata: {
      documentIds: uniqueDocumentIds,
      winProbabilityLift,
      revenueImpact,
      previousLift,
      previousRevenueImpact,
      completionScore: input.completionScore,
      readinessScore: input.readinessScore,
    },
  });

  return { ok: true };
}

export async function getKnowledgeEngineSnapshot(organizationId?: string): Promise<KnowledgeEngineSnapshot> {
  const supabase = createKnowledgeSupabaseClient();
  const buildSnapshot = (documents: KnowledgeDocumentRecord[], totalChunks: number, coverageRecords: KnowledgeCoverageRecord[]): KnowledgeEngineSnapshot => {
    const requiredTypes = Object.keys(knowledgeTypeLabels) as KnowledgeDocumentType[];
    const coverageByType = requiredTypes.map((type) => {
      const count = documents.filter((item) => item.documentType === type).length;
      return {
        documentType: type,
        label: knowledgeTypeLabels[type],
        count,
        covered: count > 0,
      } satisfies KnowledgeCoverageArea;
    });
    const coverageGaps = new Set<string>(coverageByType.filter((item) => !item.covered).map((item) => item.label));
    coverageRecords.forEach((record) => record.missingKnowledgeAreas.forEach((item) => coverageGaps.add(item)));
    const missingKnowledgeAreas = Array.from(coverageGaps);
    const coveredKnowledgeAreas = coverageByType.filter((item) => item.covered).map((item) => item.label);
    const completeness = coveredKnowledgeAreas.length / requiredTypes.length;
    const depth = Math.min(1, documents.length / 16);
    const usageDepth = Math.min(1, documents.filter((item) => item.timesReferenced > 0).length / Math.max(requiredTypes.length, 1));
    const coverageFromProjects =
      coverageRecords.length > 0 ? coverageRecords.reduce((sum, item) => sum + item.coverageScore, 0) / coverageRecords.length / 100 : 0;
    const coverageScore = Math.round((completeness * 0.35 + depth * 0.15 + usageDepth * 0.15 + coverageFromProjects * 0.35) * 100);
    const referencedDocuments = documents.filter((item) => item.timesReferenced > 0).length;
    const impactfulDocuments = documents.filter((item) => item.averageWinProbabilityLift > 0 || item.revenueImpact > 0).length;
    const averageImpactLift =
      impactfulDocuments > 0
        ? Math.round(
            (documents
              .filter((item) => item.averageWinProbabilityLift > 0 || item.revenueImpact > 0)
              .reduce((sum, item) => sum + item.averageWinProbabilityLift, 0) /
              impactfulDocuments) *
              100,
          ) / 100
        : 0;
    const uploadRecommendations = buildUploadRecommendationsFromMissing(
      missingKnowledgeAreas,
      coverageRecords.flatMap((item) => item.uploadRecommendations).join("\n"),
    ).concat(coverageRecords.flatMap((item) => item.uploadRecommendations)).filter((item, index, array) => array.indexOf(item) === index);

    return {
      coverageScore,
      missingKnowledgeAreas,
      coveredKnowledgeAreas,
      coverageByType,
      totalDocuments: documents.length,
      totalChunks,
      referencedDocuments,
      impactfulDocuments,
      averageImpactLift,
      topDocuments: [...documents]
        .sort(
          (left, right) =>
            right.averageWinProbabilityLift - left.averageWinProbabilityLift ||
            right.revenueImpact - left.revenueImpact ||
            right.timesReferenced - left.timesReferenced,
        )
        .slice(0, 6),
      recentDocuments: [...documents]
        .sort((left, right) => new Date(right.uploadDate ?? right.createdAt ?? 0).getTime() - new Date(left.uploadDate ?? left.createdAt ?? 0).getTime())
        .slice(0, 10),
      uploadRecommendations: uploadRecommendations.slice(0, 8),
      totalCoverageRecords: coverageRecords.length,
      averageMissingEvidenceScore:
        coverageRecords.length > 0 ? Math.round(coverageRecords.reduce((sum, item) => sum + item.missingEvidenceScore, 0) / coverageRecords.length) : 0,
      averageMissingCertificationScore:
        coverageRecords.length > 0 ? Math.round(coverageRecords.reduce((sum, item) => sum + item.missingCertificationScore, 0) / coverageRecords.length) : 0,
      averageMissingExperienceScore:
        coverageRecords.length > 0 ? Math.round(coverageRecords.reduce((sum, item) => sum + item.missingExperienceScore, 0) / coverageRecords.length) : 0,
      mostValuableDocuments: [...documents].sort((left, right) => right.revenueImpact - left.revenueImpact || right.generatedSectionsInfluenced - left.generatedSectionsInfluenced).slice(0, 6),
      recentCoverage: [...coverageRecords].sort((left, right) => new Date(right.updatedAt ?? 0).getTime() - new Date(left.updatedAt ?? 0).getTime()).slice(0, 6),
    };
  };

  if (!supabase || !organizationId) {
    return buildSnapshot(demoKnowledgeDocuments, demoKnowledgeDocuments.reduce((sum, item) => sum + item.chunkCount, 0), demoCoverageRecords);
  }

  const [documents, chunksResponse, coverageResponse] = await Promise.all([
    loadKnowledgeDocuments(organizationId),
    supabase.from("knowledge_chunks").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
    supabase
      .from("knowledge_coverage")
      .select("project_id, coverage_score, missing_evidence_score, missing_certification_score, missing_experience_score, coverage_strength, missing_knowledge_areas, upload_recommendations, supporting_document_ids, updated_at")
      .eq("organization_id", organizationId)
      .order("updated_at", { ascending: false }),
  ]);

  const coverageRecords: KnowledgeCoverageRecord[] = ((coverageResponse.data ?? []) as any[]).map((row: any) => ({
    projectId: row.project_id as string,
    coverageScore: Number(row.coverage_score ?? 0),
    missingEvidenceScore: Number(row.missing_evidence_score ?? 0),
    missingCertificationScore: Number(row.missing_certification_score ?? 0),
    missingExperienceScore: Number(row.missing_experience_score ?? 0),
    coverageStrength: row.coverage_strength as KnowledgeCoverageRecord["coverageStrength"],
    missingKnowledgeAreas: (row.missing_knowledge_areas ?? []) as string[],
    uploadRecommendations: (row.upload_recommendations ?? []) as string[],
    supportingDocumentIds: (row.supporting_document_ids ?? []) as string[],
    updatedAt: (row.updated_at as string | null) ?? null,
  }));

  return buildSnapshot(documents, chunksResponse.count ?? 0, coverageRecords);
}

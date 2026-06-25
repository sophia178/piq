import { createHash, randomUUID } from "node:crypto";
import OpenAI from "openai";
import { z } from "zod";
import { env, hasOpenAIEnv } from "@/lib/env";
import { createServiceSupabaseClient, demoOrganization, demoProjects, trackAuditEvent } from "@/lib/platform";
import {
  getOpportunityPredictionSummaryMap,
  recordPredictionOutcome,
  syncPredictForOpportunity,
  type OpportunityPredictionSummaryRecord,
} from "@/lib/predict";

export type OpportunitySourceKey = "contracts_finder" | "find_a_tender" | "ted_europe" | "sam_gov";
export type OpportunityMatchStatus = "new" | "saved" | "dismissed" | "imported" | "alerted";
export type OpportunityRecommendation = "bid_immediately" | "worth_investigating" | "low_probability" | "do_not_pursue";
export type OpportunityPriorityBand = "critical" | "high" | "medium" | "low";
export type OpportunityPipelineStage = "opportunity" | "imported" | "bid_created" | "submitted" | "won" | "lost";
export type BidOutcomeStatus = "submitted" | "won" | "lost" | "shortlisted" | "rejected";

export interface OpportunityAlertRule {
  id: string;
  name: string;
  keywords: string[];
  industries: string[];
  locations: string[];
  minimumContractValue?: number | null;
  maximumContractValue?: number | null;
}

export interface OpportunityRecord {
  id: string;
  sourceKey: OpportunitySourceKey;
  sourceNames: string[];
  externalId: string;
  dedupeKey: string;
  title: string;
  description: string;
  buyerName: string;
  buyerIdentifier?: string;
  sourceUrl?: string;
  sourceNoticeNumber?: string;
  locations: string[];
  industryTags: string[];
  cpvCodes: string[];
  currency: string;
  minimumValue?: number | null;
  maximumValue?: number | null;
  estimatedValue?: number | null;
  publishedAt?: string | null;
  submissionDeadline?: string | null;
  opportunityStatus: string;
  aiSummary?: string;
}

export interface OpportunityMatchRecord {
  id: string;
  opportunityId: string;
  alertId: string;
  relevanceScore: number;
  winProbability: number;
  revenuePotential: number;
  combinedScore: number;
  rationale: string;
  matchStatus: OpportunityMatchStatus;
  importedProjectId?: string | null;
}

export interface OpportunityRoiScoreRecord {
  opportunityId: string;
  estimatedContractValue: number;
  expectedWinProbability: number;
  expectedRevenue: number;
  bidEffortScore: number;
  roiScore: number;
  recommendation: OpportunityRecommendation;
  justification: string;
}

export interface OpportunityPriorityRecord {
  opportunityId: string;
  priorityScore: number;
  priorityBand: OpportunityPriorityBand;
  quickWin: boolean;
  highValue: boolean;
  bestOpportunity: boolean;
  reasoning: string;
}

export interface OpportunityPipelineRecord {
  opportunityId: string;
  currentStage: OpportunityPipelineStage;
  projectId?: string | null;
  importedAt?: string | null;
  bidCreatedAt?: string | null;
  submittedAt?: string | null;
  wonAt?: string | null;
  lostAt?: string | null;
  contractValueWon?: number | null;
  stageHistory: Array<{ stage: OpportunityPipelineStage; at: string; metadata?: Record<string, unknown> }>;
}

export interface BidOutcomeRecord {
  id: string;
  projectId?: string | null;
  opportunityId?: string | null;
  title: string;
  clientName: string;
  contractValue: number;
  outcome: BidOutcomeStatus;
  competitorCount?: number | null;
  sector: string;
  tenderType: string;
  outcomeSummary?: string | null;
  decisionFactors: string[];
  submittedAt?: string | null;
  decidedAt?: string | null;
  createdAt?: string | null;
}

export interface BidOutcomePatternRecord {
  label: string;
  bids: number;
  wins: number;
  losses: number;
  winRate: number;
  averageContractValue: number;
  revenueWon: number;
  revenueLost: number;
}

export interface BidOutcomeInsights {
  whyWon: string[];
  whyLost: string[];
  patternsBySector: string[];
  patternsByClient: string[];
}

export interface TrackableBidRecord {
  projectId?: string | null;
  opportunityId?: string | null;
  title: string;
  clientName: string;
  currentStage: OpportunityPipelineStage;
  contractValue: number;
  sector: string;
  tenderType: string;
}

export interface BidOutcomeIntelligenceSnapshot {
  metrics: {
    submitted: number;
    shortlisted: number;
    rejected: number;
    won: number;
    lost: number;
    winRate: number;
    averageContractValue: number;
    revenueWon: number;
    revenueLost: number;
  };
  insights: BidOutcomeInsights;
  sectorPatterns: BidOutcomePatternRecord[];
  clientPatterns: BidOutcomePatternRecord[];
  recentOutcomes: BidOutcomeRecord[];
  trackableBids: TrackableBidRecord[];
}

export interface OpportunityRevenueView extends OpportunityRecord {
  match?: OpportunityMatchRecord;
  roi?: OpportunityRoiScoreRecord;
  priority?: OpportunityPriorityRecord;
  pipeline?: OpportunityPipelineRecord;
  prediction?: OpportunityPredictionSummaryRecord;
}

export interface DiscoverySnapshot {
  metrics: {
    newOpportunities: number;
    savedOpportunities: number;
    highMatchOpportunities: number;
    scansLast7Days: number;
  };
  organizationReport: {
    opportunitiesFound: number;
    opportunitiesPursued: number;
    bidsSubmitted: number;
    contractsWon: number;
    totalContractValueWon: number;
  };
  funnel: {
    opportunity: number;
    imported: number;
    bidCreated: number;
    submitted: number;
    won: number;
  };
  alerts: OpportunityAlertRule[];
  newOpportunities: OpportunityRevenueView[];
  savedOpportunities: OpportunityRevenueView[];
  highMatchOpportunities: OpportunityRevenueView[];
  bestOpportunities: OpportunityRevenueView[];
  highestRoiOpportunities: OpportunityRevenueView[];
  quickWins: OpportunityRevenueView[];
  highValueOpportunities: OpportunityRevenueView[];
}

export interface ScheduledOpportunityScanSummary {
  organizationsScanned: number;
  opportunitiesDiscovered: number;
  matchesCreated: number;
}

export const OpportunityAlertSchema = z.object({
  organizationId: z.string().min(2).optional(),
  name: z.string().min(3),
  keywords: z.array(z.string().min(2)).min(1),
  industries: z.array(z.string().min(2)).default([]),
  locations: z.array(z.string().min(2)).default([]),
  minimumContractValue: z.number().nonnegative().optional().nullable(),
  maximumContractValue: z.number().nonnegative().optional().nullable(),
});

export const OpportunityScanSchema = z.object({
  organizationId: z.string().min(2).optional(),
  lookbackHours: z.number().int().min(1).max(168).default(24),
});

export const OpportunityMatchUpdateSchema = z.object({
  organizationId: z.string().min(2).optional(),
  matchId: z.string().min(2),
  status: z.enum(["saved", "dismissed"]),
});

export const OpportunityImportSchema = z.object({
  organizationId: z.string().min(2).optional(),
  opportunityId: z.string().min(2),
  matchId: z.string().min(2).optional(),
});

export const OpportunityPipelineUpdateSchema = z.object({
  organizationId: z.string().min(2).optional(),
  opportunityId: z.string().min(2),
  projectId: z.string().min(2).optional().nullable(),
  stage: z.enum(["imported", "bid_created", "submitted", "won", "lost"]),
  contractValueWon: z.number().nonnegative().optional().nullable(),
});

export const BidOutcomeUpsertSchema = z.object({
  organizationId: z.string().min(2).optional(),
  projectId: z.string().min(2).optional().nullable(),
  opportunityId: z.string().min(2).optional().nullable(),
  title: z.string().min(3),
  clientName: z.string().min(2),
  contractValue: z.number().nonnegative(),
  outcome: z.enum(["submitted", "won", "lost", "shortlisted", "rejected"]),
  competitorCount: z.number().int().min(0).max(100).optional().nullable(),
  sector: z.string().min(2),
  tenderType: z.string().min(2),
  outcomeSummary: z.string().max(4000).optional().nullable(),
  decisionFactors: z.array(z.string().min(2)).max(12).default([]),
  submittedAt: z.string().optional().nullable(),
  decidedAt: z.string().optional().nullable(),
});

const sourceCatalog: Array<{
  sourceKey: OpportunitySourceKey;
  name: string;
  baseUrl: string;
  apiUrl: string;
  authenticationType: "none" | "api_key";
  scanFrequencyMinutes: number;
}> = [
  {
    sourceKey: "contracts_finder",
    name: "UK Contracts Finder",
    baseUrl: "https://www.contractsfinder.service.gov.uk",
    apiUrl: env.contractsFinderApiUrl ?? "https://www.contractsfinder.service.gov.uk/Published/Notices/OCDS/Search",
    authenticationType: "none",
    scanFrequencyMinutes: 120,
  },
  {
    sourceKey: "find_a_tender",
    name: "Find a Tender",
    baseUrl: "https://www.find-tender.service.gov.uk",
    apiUrl: env.findATenderApiUrl ?? "https://www.find-tender.service.gov.uk/api/1.0/ocdsReleasePackages",
    authenticationType: "none",
    scanFrequencyMinutes: 120,
  },
  {
    sourceKey: "ted_europe",
    name: "TED Europe",
    baseUrl: "https://ted.europa.eu",
    apiUrl: env.tedApiUrl ?? "https://ted.europa.eu/api/v3/notices/search",
    authenticationType: "none",
    scanFrequencyMinutes: 240,
  },
  {
    sourceKey: "sam_gov",
    name: "SAM.gov",
    baseUrl: "https://sam.gov",
    apiUrl: env.samGovApiUrl ?? "https://api.sam.gov/opportunities/v2/search",
    authenticationType: "api_key",
    scanFrequencyMinutes: 240,
  },
];

const demoAlerts: OpportunityAlertRule[] = [
  {
    id: "alert_1",
    name: "Digital Transformation UK",
    keywords: ["digital transformation", "cloud", "data platform"],
    industries: ["IT consulting", "software", "healthcare"],
    locations: ["United Kingdom", "England", "London"],
    minimumContractValue: 100000,
    maximumContractValue: 5000000,
  },
  {
    id: "alert_2",
    name: "Construction Frameworks",
    keywords: ["framework", "construction", "infrastructure"],
    industries: ["construction", "civil engineering"],
    locations: ["United Kingdom", "Scotland", "Wales"],
    minimumContractValue: 250000,
    maximumContractValue: 25000000,
  },
];

export const demoOpportunities: OpportunityRecord[] = [
  {
    id: "opp_1",
    sourceKey: "contracts_finder",
    sourceNames: ["UK Contracts Finder"],
    externalId: "cf-1001",
    dedupeKey: "dedupe-1",
    title: "NHS Regional Data Platform Modernisation",
    description: "Design, implementation, and managed support for a regional healthcare data platform including migration, governance, and analytics.",
    buyerName: "NHS Shared Business Services",
    buyerIdentifier: "nhs-sbs",
    sourceUrl: "https://www.contractsfinder.service.gov.uk/",
    sourceNoticeNumber: "1001-2026",
    locations: ["England", "United Kingdom", "London"],
    industryTags: ["IT consulting", "healthcare", "data"],
    cpvCodes: ["72000000", "72222300"],
    currency: "GBP",
    minimumValue: 900000,
    maximumValue: 2400000,
    estimatedValue: 1800000,
    publishedAt: "2026-06-22T09:00:00.000Z",
    submissionDeadline: "2026-07-14T12:00:00.000Z",
    opportunityStatus: "active",
    aiSummary: "Strong fit for digital transformation, analytics, and healthcare delivery credentials.",
  },
  {
    id: "opp_2",
    sourceKey: "find_a_tender",
    sourceNames: ["Find a Tender"],
    externalId: "fts-2211",
    dedupeKey: "dedupe-2",
    title: "National Construction Framework for Decarbonisation Works",
    description: "Framework covering retrofit, energy efficiency upgrades, and associated compliance management across public estates.",
    buyerName: "Crown Commercial Service",
    buyerIdentifier: "ccs",
    sourceUrl: "https://www.find-tender.service.gov.uk/",
    sourceNoticeNumber: "2211-2026",
    locations: ["United Kingdom", "Scotland", "Wales"],
    industryTags: ["construction", "decarbonisation", "framework"],
    cpvCodes: ["45000000", "45321000"],
    currency: "GBP",
    minimumValue: 3000000,
    maximumValue: 18000000,
    estimatedValue: 12000000,
    publishedAt: "2026-06-23T08:30:00.000Z",
    submissionDeadline: "2026-08-01T17:00:00.000Z",
    opportunityStatus: "active",
    aiSummary: "High revenue potential for firms with framework and public estate delivery evidence.",
  },
  {
    id: "opp_3",
    sourceKey: "sam_gov",
    sourceNames: ["SAM.gov"],
    externalId: "sam-4408",
    dedupeKey: "dedupe-3",
    title: "Federal Cloud Modernization and AI Readiness Services",
    description: "Professional services contract for cloud operating model design, security hardening, data readiness, and AI adoption planning.",
    buyerName: "Department of the Treasury",
    buyerIdentifier: "us-treasury",
    sourceUrl: "https://sam.gov",
    sourceNoticeNumber: "2032L2-26-X-0001",
    locations: ["United States", "Washington, DC"],
    industryTags: ["IT consulting", "cloud", "AI"],
    cpvCodes: ["518210"],
    currency: "USD",
    minimumValue: 500000,
    maximumValue: 3500000,
    estimatedValue: 2500000,
    publishedAt: "2026-06-20T14:00:00.000Z",
    submissionDeadline: "2026-07-10T17:00:00.000Z",
    opportunityStatus: "active",
    aiSummary: "Good fit for consultancies with regulated sector security and AI transformation references.",
  },
];

const demoMatches: OpportunityMatchRecord[] = [
  {
    id: "match_1",
    opportunityId: "opp_1",
    alertId: "alert_1",
    relevanceScore: 92,
    winProbability: 74,
    revenuePotential: 1332000,
    combinedScore: 86,
    rationale: "Healthcare, digital transformation, and data platform keywords align strongly with the alert profile.",
    matchStatus: "alerted",
    importedProjectId: null,
  },
  {
    id: "match_2",
    opportunityId: "opp_2",
    alertId: "alert_2",
    relevanceScore: 90,
    winProbability: 68,
    revenuePotential: 8160000,
    combinedScore: 84,
    rationale: "Framework, construction, and decarbonisation signals create a strong strategic fit.",
    matchStatus: "saved",
    importedProjectId: null,
  },
  {
    id: "match_3",
    opportunityId: "opp_3",
    alertId: "alert_1",
    relevanceScore: 81,
    winProbability: 58,
    revenuePotential: 1450000,
    combinedScore: 73,
    rationale: "Strong services fit, but geography and buyer context reduce overall win probability.",
    matchStatus: "new",
    importedProjectId: null,
  },
];

const demoBidOutcomes: BidOutcomeRecord[] = [
  {
    id: "outcome_1",
    projectId: "proj_1",
    opportunityId: "opp_1",
    title: "NHS Regional Data Platform Modernisation",
    clientName: "NHS Shared Business Services",
    contractValue: 1800000,
    outcome: "won",
    competitorCount: 4,
    sector: "healthcare",
    tenderType: "framework",
    outcomeSummary: "Won on healthcare delivery credibility, strong security evidence, and clear implementation governance.",
    decisionFactors: ["healthcare case studies", "ISO 27001 evidence", "clear mobilisation plan"],
    submittedAt: "2026-06-19T12:00:00.000Z",
    decidedAt: "2026-06-24T10:00:00.000Z",
    createdAt: "2026-06-24T10:00:00.000Z",
  },
  {
    id: "outcome_2",
    projectId: "proj_2",
    opportunityId: "opp_2",
    title: "National Construction Framework for Decarbonisation Works",
    clientName: "Crown Commercial Service",
    contractValue: 12000000,
    outcome: "lost",
    competitorCount: 9,
    sector: "construction",
    tenderType: "framework",
    outcomeSummary: "Lost in a crowded framework competition where incumbent scale and wider regional coverage outweighed the bid.",
    decisionFactors: ["high competitor count", "incumbent supplier advantage", "regional delivery coverage"],
    submittedAt: "2026-06-20T15:00:00.000Z",
    decidedAt: "2026-06-25T11:30:00.000Z",
    createdAt: "2026-06-25T11:30:00.000Z",
  },
  {
    id: "outcome_3",
    projectId: "proj_3",
    opportunityId: "opp_3",
    title: "Federal Cloud Modernization and AI Readiness Services",
    clientName: "Department of the Treasury",
    contractValue: 2500000,
    outcome: "submitted",
    competitorCount: 6,
    sector: "technology",
    tenderType: "rfp",
    outcomeSummary: "Submission completed and awaiting buyer decision.",
    decisionFactors: ["federal security experience", "AI transformation references"],
    submittedAt: "2026-06-22T18:00:00.000Z",
    decidedAt: null,
    createdAt: "2026-06-22T18:00:00.000Z",
  },
];

const opportunityPipelineStageOrder: OpportunityPipelineStage[] = ["opportunity", "imported", "bid_created", "submitted", "won", "lost"];

function normalizeText(value: string | null | undefined) {
  return (value ?? "").toLowerCase().replace(/\s+/g, " ").trim();
}

function makeId(prefix: string, value: string) {
  const hash = createHash("sha256").update(value).digest("hex").slice(0, 16);
  return `${prefix}_${hash}`;
}

function makeDedupeKey(parts: Array<string | number | null | undefined>) {
  const normalized = parts.map((part) => normalizeText(String(part ?? ""))).join("|");
  return createHash("sha256").update(normalized).digest("hex");
}

function formatIsoWithoutMs(date: Date) {
  return date.toISOString().slice(0, 19);
}

function parseNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function collectStrings(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((item) => item?.trim()).filter(Boolean) as string[]));
}

function getSourceMeta(sourceKey: OpportunitySourceKey) {
  return sourceCatalog.find((item) => item.sourceKey === sourceKey)!;
}

async function readPrompt(promptFile: string) {
  const { readFile } = await import("node:fs/promises");
  const { join } = await import("node:path");
  return readFile(join(process.cwd(), "src", "prompts", promptFile), "utf8");
}

function mapOcdsReleaseToOpportunity(release: any, sourceKey: OpportunitySourceKey): OpportunityRecord | null {
  const tender = release?.tender ?? {};
  const title = tender?.title ?? release?.description ?? "";
  const description = tender?.description ?? release?.description ?? "";
  if (!title || !description) return null;

  const parties = Array.isArray(release?.parties) ? release.parties : [];
  const buyer = parties.find((party: any) => Array.isArray(party?.roles) && party.roles.includes("buyer")) ?? release?.buyer ?? {};
  const items = Array.isArray(tender?.items) ? tender.items : [];
  const documents = Array.isArray(tender?.documents) ? tender.documents : [];
  const value = parseNumber(tender?.value?.amount) ?? parseNumber(tender?.minValue?.amount);
  const deliveryLocations = items.flatMap((item: any) =>
    Array.isArray(item?.deliveryAddresses)
      ? item.deliveryAddresses.map((address: any) => address?.region ?? address?.countryName ?? "")
      : [],
  );
  const cpv = collectStrings([
    tender?.classification?.id,
    ...(items.flatMap((item: any) =>
      Array.isArray(item?.additionalClassifications)
        ? item.additionalClassifications.map((classification: any) => classification?.id ?? "")
        : [],
    ) as string[]),
  ]);
  const industryTags = collectStrings([
    tender?.classification?.description,
    tender?.mainProcurementCategory,
    ...(items.flatMap((item: any) =>
      Array.isArray(item?.additionalClassifications)
        ? item.additionalClassifications.map((classification: any) => classification?.description ?? "")
        : [],
    ) as string[]),
  ]);
  const sourceUrl =
    documents.find((document: any) => document?.url)?.url ??
    release?.uri ??
    getSourceMeta(sourceKey).baseUrl;
  const dedupeKey = makeDedupeKey([
    title,
    buyer?.name ?? buyer?.identifier?.legalName,
    tender?.tenderPeriod?.endDate,
    value,
  ]);

  return {
    id: makeId("opp", `${sourceKey}:${release?.id ?? release?.ocid ?? title}`),
    sourceKey,
    sourceNames: [getSourceMeta(sourceKey).name],
    externalId: String(release?.id ?? release?.ocid ?? title),
    dedupeKey,
    title,
    description,
    buyerName: buyer?.name ?? buyer?.identifier?.legalName ?? "Unknown buyer",
    buyerIdentifier: buyer?.id ?? undefined,
    sourceUrl,
    sourceNoticeNumber: tender?.id ?? release?.id ?? undefined,
    locations: collectStrings(deliveryLocations),
    industryTags,
    cpvCodes: cpv,
    currency: tender?.value?.currency ?? tender?.minValue?.currency ?? "GBP",
    minimumValue: parseNumber(tender?.minValue?.amount),
    maximumValue: value,
    estimatedValue: value,
    publishedAt: tender?.datePublished ?? release?.date ?? null,
    submissionDeadline: tender?.tenderPeriod?.endDate ?? tender?.awardPeriod?.startDate ?? null,
    opportunityStatus: tender?.status ?? "active",
    aiSummary: undefined,
  };
}

function mapSamOpportunityToRecord(item: any): OpportunityRecord | null {
  const title = item?.title ?? item?.solicitationNumber ?? "";
  if (!title) return null;

  const value = parseNumber(item?.award?.amount) ?? parseNumber(item?.baseAndAllOptionsValue);
  const buyerName = item?.fullParentPathName ?? item?.department ?? item?.organizationType ?? "US Federal Buyer";
  const dedupeKey = makeDedupeKey([title, buyerName, item?.responseDeadLine, item?.solicitationNumber]);

  return {
    id: makeId("opp", `sam_gov:${item?.noticeId ?? item?.solicitationNumber ?? title}`),
    sourceKey: "sam_gov",
    sourceNames: [getSourceMeta("sam_gov").name],
    externalId: String(item?.noticeId ?? item?.solicitationNumber ?? title),
    dedupeKey,
    title,
    description: item?.description ?? item?.typeOfSetAsideDescription ?? item?.archiveType ?? "SAM.gov contract opportunity",
    buyerName,
    buyerIdentifier: item?.deptCode ?? undefined,
    sourceUrl: item?.uiLink ?? "https://sam.gov",
    sourceNoticeNumber: item?.solicitationNumber ?? item?.noticeId ?? undefined,
    locations: collectStrings([item?.placeOfPerformance?.state?.name, item?.placeOfPerformance?.country?.name, item?.placeOfPerformance?.city?.name]),
    industryTags: collectStrings([item?.naicsCode, item?.classificationCode, item?.type]),
    cpvCodes: collectStrings([item?.naicsCode, item?.classificationCode]),
    currency: "USD",
    minimumValue: null,
    maximumValue: value,
    estimatedValue: value,
    publishedAt: item?.postedDate ?? null,
    submissionDeadline: item?.responseDeadLine ?? null,
    opportunityStatus: item?.active ? "active" : item?.archiveType ?? "active",
    aiSummary: undefined,
  };
}

function mapTedNoticeToRecord(item: any): OpportunityRecord | null {
  const title = item?.title ?? item?.noticeTitle ?? item?.summary ?? "";
  if (!title) return null;

  const buyerName = item?.buyerName ?? item?.organisationName ?? item?.contractingAuthority ?? "EU Contracting Authority";
  const publicationNumber = item?.publicationNumber ?? item?.noticeIdentifier ?? item?.id;
  const estimate = parseNumber(item?.estimatedValue) ?? parseNumber(item?.value?.amount) ?? parseNumber(item?.totalValue);
  const dedupeKey = makeDedupeKey([title, buyerName, item?.deadline, publicationNumber]);

  return {
    id: makeId("opp", `ted_europe:${publicationNumber ?? title}`),
    sourceKey: "ted_europe",
    sourceNames: [getSourceMeta("ted_europe").name],
    externalId: String(publicationNumber ?? title),
    dedupeKey,
    title,
    description: item?.description ?? item?.summary ?? "TED Europe procurement opportunity",
    buyerName,
    buyerIdentifier: item?.buyerId ?? undefined,
    sourceUrl: publicationNumber ? `https://ted.europa.eu/en/notice/${publicationNumber}/html` : getSourceMeta("ted_europe").baseUrl,
    sourceNoticeNumber: publicationNumber ?? undefined,
    locations: collectStrings([item?.country, item?.countryName, item?.placeOfPerformance]),
    industryTags: collectStrings([item?.mainClassificationDescription, item?.noticeType, item?.sector]),
    cpvCodes: collectStrings(Array.isArray(item?.cpvCodes) ? item.cpvCodes : [item?.mainClassification]),
    currency: item?.currency ?? "EUR",
    minimumValue: null,
    maximumValue: estimate,
    estimatedValue: estimate,
    publishedAt: item?.publicationDate ?? item?.publishedAt ?? null,
    submissionDeadline: item?.deadline ?? item?.responseDeadline ?? null,
    opportunityStatus: item?.status ?? "active",
    aiSummary: undefined,
  };
}

async function fetchJson(url: string, init?: RequestInit & { next?: { revalidate?: number } }) {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status} for ${url}`);
  }
  return response.json();
}

async function fetchContractsFinderOpportunities(lookbackHours: number) {
  const source = getSourceMeta("contracts_finder");
  const end = new Date();
  const start = new Date(end.getTime() - lookbackHours * 60 * 60 * 1000);
  const url = new URL(source.apiUrl);
  url.searchParams.set("publishedFrom", formatIsoWithoutMs(start));
  url.searchParams.set("publishedTo", formatIsoWithoutMs(end));
  url.searchParams.set("stages", "planning,tender");
  url.searchParams.set("limit", "100");

  try {
    const payload = await fetchJson(url.toString(), {
      headers: { Accept: "application/json" },
      next: { revalidate: 0 },
    });
    const releases = Array.isArray(payload?.releases) ? payload.releases : [];
    return releases.map((release: any) => mapOcdsReleaseToOpportunity(release, "contracts_finder")).filter(Boolean) as OpportunityRecord[];
  } catch {
    return [];
  }
}

async function fetchFindATenderOpportunities(lookbackHours: number) {
  const source = getSourceMeta("find_a_tender");
  const end = new Date();
  const start = new Date(end.getTime() - lookbackHours * 60 * 60 * 1000);
  const url = new URL(source.apiUrl);
  url.searchParams.set("updatedFrom", formatIsoWithoutMs(start));
  url.searchParams.set("updatedTo", formatIsoWithoutMs(end));
  url.searchParams.set("stages", "planning,tender");
  url.searchParams.set("limit", "100");

  try {
    const payload = await fetchJson(url.toString(), {
      headers: { Accept: "application/json" },
      next: { revalidate: 0 },
    });
    const releases = Array.isArray(payload?.releases) ? payload.releases : [];
    return releases.map((release: any) => mapOcdsReleaseToOpportunity(release, "find_a_tender")).filter(Boolean) as OpportunityRecord[];
  } catch {
    return [];
  }
}

async function fetchTedOpportunities() {
  const source = getSourceMeta("ted_europe");

  try {
    const payload = await fetchJson(source.apiUrl, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        page: 1,
        limit: 100,
        scope: "ACTIVE",
        sort: ["publication-date:desc"],
      }),
      next: { revalidate: 0 },
    });
    const notices = Array.isArray(payload?.notices)
      ? payload.notices
      : Array.isArray(payload?.results)
        ? payload.results
        : Array.isArray(payload?.content)
          ? payload.content
          : [];
    return notices.map((item: any) => mapTedNoticeToRecord(item)).filter(Boolean) as OpportunityRecord[];
  } catch {
    return [];
  }
}

async function fetchSamGovOpportunities(lookbackHours: number) {
  if (!env.samGovApiKey) return [];

  const source = getSourceMeta("sam_gov");
  const end = new Date();
  const start = new Date(end.getTime() - lookbackHours * 60 * 60 * 1000);
  const toSamDate = (value: Date) => {
    const month = `${value.getUTCMonth() + 1}`.padStart(2, "0");
    const day = `${value.getUTCDate()}`.padStart(2, "0");
    const year = value.getUTCFullYear();
    return `${month}/${day}/${year}`;
  };
  const url = new URL(source.apiUrl);
  url.searchParams.set("api_key", env.samGovApiKey);
  url.searchParams.set("limit", "100");
  url.searchParams.set("offset", "0");
  url.searchParams.set("postedFrom", toSamDate(start));
  url.searchParams.set("postedTo", toSamDate(end));
  url.searchParams.set("ptype", "o");

  try {
    const payload = await fetchJson(url.toString(), {
      headers: { Accept: "application/json" },
      next: { revalidate: 0 },
    });
    const opportunities = Array.isArray(payload?.opportunitiesData) ? payload.opportunitiesData : [];
    return opportunities.map((item: any) => mapSamOpportunityToRecord(item)).filter(Boolean) as OpportunityRecord[];
  } catch {
    return [];
  }
}

async function fetchSourceOpportunities(lookbackHours: number) {
  const [contractsFinder, findATender, tedEurope, samGov] = await Promise.all([
    fetchContractsFinderOpportunities(lookbackHours),
    fetchFindATenderOpportunities(lookbackHours),
    fetchTedOpportunities(),
    fetchSamGovOpportunities(lookbackHours),
  ]);

  const combined = [...contractsFinder, ...findATender, ...tedEurope, ...samGov];
  if (combined.length > 0) {
    return deduplicateOpportunityBatch(combined);
  }

  return demoOpportunities;
}

function deduplicateOpportunityBatch(opportunities: OpportunityRecord[]) {
  const deduped = new Map<string, OpportunityRecord>();

  opportunities.forEach((opportunity) => {
    const existing = deduped.get(opportunity.dedupeKey);
    if (!existing) {
      deduped.set(opportunity.dedupeKey, opportunity);
      return;
    }

    deduped.set(opportunity.dedupeKey, {
      ...existing,
      sourceNames: collectStrings([...existing.sourceNames, ...opportunity.sourceNames]),
      locations: collectStrings([...existing.locations, ...opportunity.locations]),
      industryTags: collectStrings([...existing.industryTags, ...opportunity.industryTags]),
      cpvCodes: collectStrings([...existing.cpvCodes, ...opportunity.cpvCodes]),
      minimumValue: existing.minimumValue ?? opportunity.minimumValue,
      maximumValue: Math.max(existing.maximumValue ?? 0, opportunity.maximumValue ?? 0) || existing.maximumValue || opportunity.maximumValue,
      estimatedValue: Math.max(existing.estimatedValue ?? 0, opportunity.estimatedValue ?? 0) || existing.estimatedValue || opportunity.estimatedValue,
      publishedAt: existing.publishedAt ?? opportunity.publishedAt,
      submissionDeadline: existing.submissionDeadline ?? opportunity.submissionDeadline,
      sourceUrl: existing.sourceUrl ?? opportunity.sourceUrl,
      aiSummary: existing.aiSummary ?? opportunity.aiSummary,
    });
  });

  return Array.from(deduped.values());
}

function calculateKeywordOverlap(text: string, terms: string[]) {
  const normalizedText = normalizeText(text);
  if (terms.length === 0) return 0;
  const hits = terms.filter((term) => normalizedText.includes(normalizeText(term))).length;
  return hits / Math.max(terms.length, 1);
}

function buildHeuristicScores(
  opportunity: OpportunityRecord,
  alert: OpportunityAlertRule,
  learningContext?: OutcomeLearningContext,
) {
  const searchableText = [opportunity.title, opportunity.description, opportunity.buyerName, ...opportunity.industryTags, ...opportunity.locations].join(" ");
  const keywordScore = calculateKeywordOverlap(searchableText, alert.keywords);
  const industryScore = calculateKeywordOverlap(searchableText, alert.industries);
  const locationScore = calculateKeywordOverlap(searchableText, alert.locations);
  const estimatedValue = opportunity.estimatedValue ?? opportunity.maximumValue ?? opportunity.minimumValue ?? 0;
  const minValue = alert.minimumContractValue ?? 0;
  const maxValue = alert.maximumContractValue ?? Number.MAX_SAFE_INTEGER;
  const valueFit = estimatedValue >= minValue && estimatedValue <= maxValue ? 1 : estimatedValue >= minValue * 0.8 && estimatedValue <= maxValue * 1.2 ? 0.65 : 0.25;
  const relevanceScore = Math.min(98, Math.round(keywordScore * 45 + industryScore * 25 + locationScore * 15 + valueFit * 15));
  const historicalAdjustment = getHistoricalWinProbabilityAdjustment(opportunity, learningContext);
  const winProbability = clamp(Math.round(relevanceScore * 0.72 + valueFit * 14 + historicalAdjustment), 5, 95);
  const revenuePotential = Math.round(estimatedValue * (winProbability / 100));
  const combinedScore = Math.min(
    99,
    Math.round(relevanceScore * 0.45 + winProbability * 0.35 + Math.min(100, Math.log10(Math.max(revenuePotential, 10)) * 20) * 0.2),
  );

  return {
    relevanceScore,
    winProbability,
    revenuePotential,
    combinedScore,
    rationale: `Keyword fit ${Math.round(keywordScore * 100)}%, industry fit ${Math.round(industryScore * 100)}%, location fit ${Math.round(
      locationScore * 100,
    )}%, value fit ${Math.round(valueFit * 100)}%, and historical performance adjustment ${historicalAdjustment >= 0 ? "+" : ""}${historicalAdjustment} support this ranking.`,
  };
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function getEstimatedContractValue(opportunity: OpportunityRecord) {
  if (opportunity.estimatedValue && opportunity.estimatedValue > 0) return opportunity.estimatedValue;
  if (opportunity.minimumValue && opportunity.maximumValue) {
    return Math.round((opportunity.minimumValue + opportunity.maximumValue) / 2);
  }
  return opportunity.maximumValue ?? opportunity.minimumValue ?? 0;
}

function getDaysUntil(dateValue?: string | null) {
  if (!dateValue) return 45;
  const milliseconds = new Date(dateValue).getTime() - Date.now();
  return Math.round(milliseconds / (1000 * 60 * 60 * 24));
}

function getStageRank(stage: OpportunityPipelineStage) {
  return opportunityPipelineStageOrder.indexOf(stage);
}

function inferSector(opportunity: Pick<OpportunityRecord, "industryTags" | "title" | "description">) {
  const primary = opportunity.industryTags.find(Boolean);
  if (primary) return primary;

  const text = normalizeText(`${opportunity.title} ${opportunity.description}`);
  if (/health|nhs|care/.test(text)) return "Healthcare";
  if (/construct|infrastructure|retrofit|decarboni/.test(text)) return "Construction";
  if (/cloud|data|software|ai|digital/.test(text)) return "Technology";
  if (/transport|mobility/.test(text)) return "Transport";
  return "General";
}

function inferTenderType(opportunity: Pick<OpportunityRecord, "title" | "description">) {
  const text = normalizeText(`${opportunity.title} ${opportunity.description}`);
  if (/framework/.test(text)) return "framework";
  if (/rfq|request for quotation/.test(text)) return "rfq";
  if (/rfp|request for proposal/.test(text)) return "rfp";
  if (/itt|invitation to tender/.test(text)) return "itt";
  if (/grant/.test(text)) return "grant";
  return "tender";
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

interface OutcomeLearningContext {
  overallWinRate: number;
  sectorWinRates: Record<string, number>;
  clientWinRates: Record<string, number>;
  tenderTypeWinRates: Record<string, number>;
}

function buildOutcomeLearningContext(outcomes: BidOutcomeRecord[]): OutcomeLearningContext {
  const decided = outcomes.filter((item) => item.outcome === "won" || item.outcome === "lost" || item.outcome === "rejected");
  const overallWinRate = decided.length > 0 ? decided.filter((item) => item.outcome === "won").length / decided.length : 0;

  const buildRateMap = (items: BidOutcomeRecord[], keySelector: (item: BidOutcomeRecord) => string) => {
    const grouped = new Map<string, BidOutcomeRecord[]>();
    items.forEach((item) => {
      const key = keySelector(item).trim() || "General";
      grouped.set(key, [...(grouped.get(key) ?? []), item]);
    });

    return Object.fromEntries(
      Array.from(grouped.entries()).map(([key, group]) => [
        key,
        group.length > 0 ? group.filter((item) => item.outcome === "won").length / group.length : 0,
      ]),
    );
  };

  return {
    overallWinRate,
    sectorWinRates: buildRateMap(decided, (item) => item.sector),
    clientWinRates: buildRateMap(decided, (item) => item.clientName),
    tenderTypeWinRates: buildRateMap(decided, (item) => item.tenderType),
  };
}

function getHistoricalWinProbabilityAdjustment(
  opportunity: OpportunityRecord,
  learningContext?: OutcomeLearningContext,
) {
  if (!learningContext) return 0;

  const sector = inferSector(opportunity);
  const tenderType = inferTenderType(opportunity);
  const clientName = opportunity.buyerName;
  const baseline = learningContext.overallWinRate || 0;
  const sectorDelta = (learningContext.sectorWinRates[sector] ?? baseline) - baseline;
  const clientDelta = (learningContext.clientWinRates[clientName] ?? baseline) - baseline;
  const tenderTypeDelta = (learningContext.tenderTypeWinRates[tenderType] ?? baseline) - baseline;

  return Math.round(sectorDelta * 18 + clientDelta * 14 + tenderTypeDelta * 12);
}

function buildRevenueScoreHeuristics(
  opportunity: OpportunityRecord,
  match?: OpportunityMatchRecord,
  learningContext?: OutcomeLearningContext,
): OpportunityRoiScoreRecord {
  const estimatedContractValue = getEstimatedContractValue(opportunity);
  const genericWinProbability = clamp(
    Math.round(
      28 +
        Math.min(28, Math.log10(Math.max(estimatedContractValue, 10)) * 7) +
        Math.min(16, opportunity.industryTags.length * 4) +
        Math.min(10, opportunity.locations.length * 2),
    ),
    12,
    82,
  );
  const historicalAdjustment = getHistoricalWinProbabilityAdjustment(opportunity, learningContext);
  const expectedWinProbability = clamp((match?.winProbability ?? genericWinProbability) + historicalAdjustment, 5, 95);
  const daysUntilDeadline = getDaysUntil(opportunity.submissionDeadline);
  const deadlinePressure = daysUntilDeadline <= 2 ? 95 : daysUntilDeadline <= 7 ? 82 : daysUntilDeadline <= 21 ? 64 : daysUntilDeadline <= 45 ? 46 : 30;
  const complexityScore = clamp(
    Math.round(
      Math.min(28, opportunity.cpvCodes.length * 5) +
        Math.min(18, opportunity.sourceNames.length * 7) +
        (estimatedContractValue >= 5000000 ? 18 : estimatedContractValue >= 1000000 ? 12 : 6) +
        (opportunity.description.length >= 1200 ? 18 : opportunity.description.length >= 600 ? 10 : 5),
    ),
    10,
    92,
  );
  const bidEffortScore = clamp(Math.round(deadlinePressure * 0.45 + complexityScore * 0.55), 12, 98);
  const expectedRevenue = Math.round(estimatedContractValue * (expectedWinProbability / 100));
  const roiScore = clamp(
    Math.round(
      expectedWinProbability * 0.38 +
        clamp((Math.log10(Math.max(expectedRevenue, 10000)) - 4) * 24, 0, 32) +
        (100 - bidEffortScore) * 0.3,
    ),
    6,
    99,
  );

  let recommendation: OpportunityRecommendation = "worth_investigating";
  if (roiScore >= 78 && expectedWinProbability >= 65 && bidEffortScore <= 62) {
    recommendation = "bid_immediately";
  } else if (roiScore < 28 || expectedWinProbability < 18 || daysUntilDeadline < 0) {
    recommendation = "do_not_pursue";
  } else if (expectedWinProbability < 40 || roiScore < 45 || daysUntilDeadline <= 3) {
    recommendation = "low_probability";
  }

  const justification =
    recommendation === "bid_immediately"
      ? `Strong commercial upside with ${expectedWinProbability}% win probability, ${bidEffortScore}/100 effort, and expected revenue of ${expectedRevenue}.`
      : recommendation === "worth_investigating"
        ? `Balanced fit with credible revenue potential, but needs deeper qualification before committing full bid effort.`
        : recommendation === "low_probability"
          ? `Limited win odds or elevated effort reduce efficiency, so this needs careful qualification before pursuit.`
          : `Current timing, effort, or win probability makes the opportunity commercially unattractive to pursue.`;

  return {
    opportunityId: opportunity.id,
    estimatedContractValue,
    expectedWinProbability,
    expectedRevenue,
    bidEffortScore,
    roiScore,
    recommendation,
    justification: `${justification} Historical performance adjustment: ${historicalAdjustment >= 0 ? "+" : ""}${historicalAdjustment} win-probability points.`,
  };
}

function buildOpportunityPriority(roi: OpportunityRoiScoreRecord): OpportunityPriorityRecord {
  const priorityScore = clamp(
    Math.round(roi.roiScore * 0.45 + roi.expectedWinProbability * 0.3 + Math.min(100, Math.log10(Math.max(roi.estimatedContractValue, 10)) * 18) * 0.15 + (100 - roi.bidEffortScore) * 0.1),
    5,
    99,
  );
  const priorityBand: OpportunityPriorityBand =
    priorityScore >= 82 ? "critical" : priorityScore >= 67 ? "high" : priorityScore >= 45 ? "medium" : "low";
  const quickWin = roi.expectedWinProbability >= 58 && roi.bidEffortScore <= 45 && roi.roiScore >= 60;
  const highValue = roi.estimatedContractValue >= 1000000;
  const bestOpportunity = priorityScore >= 82 || (highValue && roi.roiScore >= 76);

  return {
    opportunityId: roi.opportunityId,
    priorityScore,
    priorityBand,
    quickWin,
    highValue,
    bestOpportunity,
    reasoning: `${priorityBand} priority driven by ROI ${roi.roiScore}, win probability ${roi.expectedWinProbability}, and bid effort ${roi.bidEffortScore}.`,
  };
}

function buildInitialPipeline(opportunityId: string): OpportunityPipelineRecord {
  return {
    opportunityId,
    currentStage: "opportunity",
    projectId: null,
    importedAt: null,
    bidCreatedAt: null,
    submittedAt: null,
    wonAt: null,
    lostAt: null,
    contractValueWon: null,
    stageHistory: [{ stage: "opportunity", at: new Date().toISOString() }],
  };
}

function mapBidOutcomeToPipelineStage(outcome: BidOutcomeStatus): OpportunityPipelineStage {
  if (outcome === "rejected") return "lost";
  if (outcome === "shortlisted") return "submitted";
  return outcome;
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

async function scoreOpportunityWithAI(
  opportunity: OpportunityRecord,
  alert: OpportunityAlertRule,
  learningContext?: OutcomeLearningContext,
) {
  const fallback = buildHeuristicScores(opportunity, alert, learningContext);

  if (!hasOpenAIEnv()) {
    return fallback;
  }

  try {
    const prompt = await readPrompt("opportunity-scoring.md");
    const client = new OpenAI({ apiKey: env.openAiApiKey });
    const response = await client.responses.create({
      model: "gpt-4.1",
      input: [
        { role: "system", content: prompt },
        {
          role: "user",
          content: JSON.stringify({
            organization: demoOrganization,
            alert,
            opportunity,
            outcomeLearningContext: learningContext ?? null,
          }),
        },
      ],
    });
    const parsed = extractJsonObject(response.output_text);
    if (!parsed) return fallback;

    return {
      relevanceScore: Math.max(0, Math.min(100, Number(parsed.relevanceScore ?? fallback.relevanceScore))),
      winProbability: Math.max(0, Math.min(100, Number(parsed.winProbability ?? fallback.winProbability))),
      revenuePotential: Math.max(0, Number(parsed.revenuePotential ?? fallback.revenuePotential)),
      combinedScore: Math.max(0, Math.min(100, Number(parsed.combinedScore ?? fallback.combinedScore))),
      rationale: String(parsed.rationale ?? fallback.rationale),
    };
  } catch {
    return fallback;
  }
}

async function recommendOpportunityWithAI(params: {
  opportunity: OpportunityRecord;
  match?: OpportunityMatchRecord;
  roi: OpportunityRoiScoreRecord;
  priority: OpportunityPriorityRecord;
  learningContext?: OutcomeLearningContext;
}) {
  if (!hasOpenAIEnv()) {
    return params.roi;
  }

  try {
    const prompt = await readPrompt("opportunity-revenue-recommendation.md");
    const client = new OpenAI({ apiKey: env.openAiApiKey });
    const response = await client.responses.create({
      model: "gpt-4.1",
      input: [
        { role: "system", content: prompt },
        {
          role: "user",
          content: JSON.stringify({
            organization: demoOrganization,
            opportunity: params.opportunity,
            match: params.match ?? null,
            roi: params.roi,
            priority: params.priority,
            outcomeLearningContext: params.learningContext ?? null,
          }),
        },
      ],
    });
    const parsed = extractJsonObject(response.output_text);
    if (!parsed) return params.roi;

    return {
      ...params.roi,
      recommendation: (parsed.recommendation as OpportunityRecommendation) ?? params.roi.recommendation,
      justification: String(parsed.justification ?? params.roi.justification),
    };
  } catch {
    return params.roi;
  }
}

function attachRevenueData(params: {
  opportunities: OpportunityRecord[];
  matches: OpportunityMatchRecord[];
  roiScores: OpportunityRoiScoreRecord[];
  priorities: OpportunityPriorityRecord[];
  pipelines: OpportunityPipelineRecord[];
  predictionMap?: Map<string, OpportunityPredictionSummaryRecord>;
}) {
  const matchMap = new Map<string, OpportunityMatchRecord>();
  params.matches.forEach((match) => {
    const existing = matchMap.get(match.opportunityId);
    if (!existing || match.combinedScore > existing.combinedScore) {
      matchMap.set(match.opportunityId, match);
    }
  });

  const roiMap = new Map(params.roiScores.map((item) => [item.opportunityId, item]));
  const priorityMap = new Map(params.priorities.map((item) => [item.opportunityId, item]));
  const pipelineMap = new Map(params.pipelines.map((item) => [item.opportunityId, item]));

  return params.opportunities.map((opportunity) => ({
    ...opportunity,
    match: matchMap.get(opportunity.id),
    roi: roiMap.get(opportunity.id),
    priority: priorityMap.get(opportunity.id),
    pipeline: pipelineMap.get(opportunity.id),
    prediction: params.predictionMap?.get(opportunity.id),
  }));
}

async function upsertOpportunityRoiScore(organizationId: string, roi: OpportunityRoiScoreRecord) {
  const supabase = createServiceSupabaseClient();
  if (!supabase) return;

  await supabase.from("opportunity_roi_score").upsert(
    {
      organization_id: organizationId,
      opportunity_id: roi.opportunityId,
      estimated_contract_value: roi.estimatedContractValue,
      expected_win_probability: roi.expectedWinProbability,
      expected_revenue: roi.expectedRevenue,
      bid_effort_score: roi.bidEffortScore,
      roi_score: roi.roiScore,
      recommendation: roi.recommendation,
      justification: roi.justification,
    },
    { onConflict: "organization_id,opportunity_id" },
  );
}

async function upsertOpportunityPriority(organizationId: string, priority: OpportunityPriorityRecord) {
  const supabase = createServiceSupabaseClient();
  if (!supabase) return;

  await supabase.from("opportunity_priority").upsert(
    {
      organization_id: organizationId,
      opportunity_id: priority.opportunityId,
      priority_score: priority.priorityScore,
      priority_band: priority.priorityBand,
      quick_win: priority.quickWin,
      high_value: priority.highValue,
      best_opportunity: priority.bestOpportunity,
      reasoning: priority.reasoning,
    },
    { onConflict: "organization_id,opportunity_id" },
  );
}

export async function syncOpportunityRevenueFromBidQuality(input: {
  organizationId?: string;
  projectId: string;
  completionScore: number;
  readinessScore: number;
}) {
  const supabase = createServiceSupabaseClient();
  if (!supabase || !input.organizationId) return { ok: true };

  const { data: pipeline } = await supabase
    .from("opportunity_pipeline")
    .select("opportunity_id")
    .eq("organization_id", input.organizationId)
    .eq("project_id", input.projectId)
    .maybeSingle();

  const opportunityId = pipeline?.opportunity_id as string | undefined;
  if (!opportunityId) return { ok: true };

  const { data: roiRow } = await supabase
    .from("opportunity_roi_score")
    .select("estimated_contract_value, expected_win_probability, expected_revenue, bid_effort_score, roi_score, recommendation, justification")
    .eq("organization_id", input.organizationId)
    .eq("opportunity_id", opportunityId)
    .maybeSingle();

  if (!roiRow) return { ok: true };

  const qualityBoost = Math.round(input.completionScore * 0.12 + input.readinessScore * 0.08);
  const adjustedWinProbability = clamp(Number(roiRow.expected_win_probability ?? 0) + qualityBoost, 5, 95);
  const adjustedEffort = clamp(Number(roiRow.bid_effort_score ?? 0) - Math.round(input.completionScore * 0.18), 5, 98);
  const estimatedContractValue = Number(roiRow.estimated_contract_value ?? 0);
  const adjustedExpectedRevenue = Math.round(estimatedContractValue * (adjustedWinProbability / 100));

  const adjustedRoi: OpportunityRoiScoreRecord = {
    opportunityId,
    estimatedContractValue,
    expectedWinProbability: adjustedWinProbability,
    expectedRevenue: adjustedExpectedRevenue,
    bidEffortScore: adjustedEffort,
    roiScore: clamp(
      Math.round(
        adjustedWinProbability * 0.4 +
          clamp((Math.log10(Math.max(adjustedExpectedRevenue, 10000)) - 4) * 24, 0, 32) +
          (100 - adjustedEffort) * 0.28,
      ),
      6,
      99,
    ),
    recommendation: (roiRow.recommendation as OpportunityRecommendation) ?? "worth_investigating",
    justification: `${String(roiRow.justification ?? "")} Bid quality uplift applied from completion ${input.completionScore}% and readiness ${input.readinessScore}%.`.trim(),
  };

  await upsertOpportunityRoiScore(input.organizationId, adjustedRoi);
  await upsertOpportunityPriority(input.organizationId, buildOpportunityPriority(adjustedRoi));
  await syncPredictForOpportunity({
    organizationId: input.organizationId,
    opportunityId,
    projectId: input.projectId,
  });

  await trackAnalyticsEvent({
    organizationId: input.organizationId,
    projectId: input.projectId,
    eventName: "opportunities.revenue_quality_sync",
    metadata: {
      opportunityId,
      completionScore: input.completionScore,
      readinessScore: input.readinessScore,
      expectedWinProbability: adjustedWinProbability,
      roiScore: adjustedRoi.roiScore,
    },
  });

  return { ok: true };
}

export async function syncOpportunityRevenueFromBidReview(input: {
  organizationId?: string;
  projectId: string;
  overallBidScore: number;
  submissionReadinessScore: number;
  evidenceScore: number;
  winProbabilityAdjustment: number;
}) {
  const supabase = createServiceSupabaseClient();
  if (!supabase || !input.organizationId) return { ok: true };

  const { data: pipeline } = await supabase
    .from("opportunity_pipeline")
    .select("opportunity_id")
    .eq("organization_id", input.organizationId)
    .eq("project_id", input.projectId)
    .maybeSingle();

  const opportunityId = pipeline?.opportunity_id as string | undefined;
  if (!opportunityId) return { ok: true };

  const { data: roiRow } = await supabase
    .from("opportunity_roi_score")
    .select("estimated_contract_value, expected_win_probability, expected_revenue, bid_effort_score, roi_score, recommendation, justification")
    .eq("organization_id", input.organizationId)
    .eq("opportunity_id", opportunityId)
    .maybeSingle();

  if (!roiRow) return { ok: true };

  const readinessLift = Math.round((input.submissionReadinessScore - 70) * 0.08);
  const evidenceLift = Math.round((input.evidenceScore - 60) * 0.05);
  const adjustedWinProbability = clamp(
    Number(roiRow.expected_win_probability ?? 0) + input.winProbabilityAdjustment + readinessLift + evidenceLift,
    5,
    95,
  );
  const adjustedEffort = clamp(
    Number(roiRow.bid_effort_score ?? 0) - Math.round((input.overallBidScore - 50) * 0.12),
    5,
    98,
  );
  const estimatedContractValue = Number(roiRow.estimated_contract_value ?? 0);
  const adjustedExpectedRevenue = Math.round(estimatedContractValue * (adjustedWinProbability / 100));

  const adjustedRoi: OpportunityRoiScoreRecord = {
    opportunityId,
    estimatedContractValue,
    expectedWinProbability: adjustedWinProbability,
    expectedRevenue: adjustedExpectedRevenue,
    bidEffortScore: adjustedEffort,
    roiScore: clamp(
      Math.round(
        adjustedWinProbability * 0.42 +
          clamp((Math.log10(Math.max(adjustedExpectedRevenue, 10000)) - 4) * 24, 0, 32) +
          (100 - adjustedEffort) * 0.26,
      ),
      6,
      99,
    ),
    recommendation: (roiRow.recommendation as OpportunityRecommendation) ?? "worth_investigating",
    justification: `${String(roiRow.justification ?? "")} Bid review adjustment applied from overall score ${input.overallBidScore}, readiness ${input.submissionReadinessScore}, evidence ${input.evidenceScore}, and review uplift ${input.winProbabilityAdjustment}.`.trim(),
  };

  await upsertOpportunityRoiScore(input.organizationId, adjustedRoi);
  await upsertOpportunityPriority(input.organizationId, buildOpportunityPriority(adjustedRoi));
  await syncPredictForOpportunity({
    organizationId: input.organizationId,
    opportunityId,
    projectId: input.projectId,
  });

  await trackAnalyticsEvent({
    organizationId: input.organizationId,
    projectId: input.projectId,
    eventName: "opportunities.revenue_review_sync",
    metadata: {
      opportunityId,
      overallBidScore: input.overallBidScore,
      submissionReadinessScore: input.submissionReadinessScore,
      evidenceScore: input.evidenceScore,
      winProbabilityAdjustment: input.winProbabilityAdjustment,
      expectedWinProbability: adjustedWinProbability,
      roiScore: adjustedRoi.roiScore,
    },
  });

  return { ok: true };
}

async function ensureOpportunityPipeline(organizationId: string, opportunityId: string) {
  const supabase = createServiceSupabaseClient();
  if (!supabase) return;

  const initial = buildInitialPipeline(opportunityId);
  await supabase.from("opportunity_pipeline").upsert(
    {
      organization_id: organizationId,
      opportunity_id: opportunityId,
      current_stage: initial.currentStage,
      project_id: initial.projectId,
      imported_at: initial.importedAt,
      bid_created_at: initial.bidCreatedAt,
      submitted_at: initial.submittedAt,
      won_at: initial.wonAt,
      lost_at: initial.lostAt,
      contract_value_won: initial.contractValueWon,
      stage_history: initial.stageHistory,
    },
    { onConflict: "organization_id,opportunity_id", ignoreDuplicates: true },
  );
}

async function loadBidOutcomes(organizationId?: string) {
  const supabase = createServiceSupabaseClient();
  if (!supabase || !organizationId) {
    return demoBidOutcomes;
  }

  const { data, error } = await supabase
    .from("bid_outcomes")
    .select("id, project_id, opportunity_id, contract_value, outcome, competitor_count, sector, tender_type, client_name, outcome_summary, decision_factors, submitted_at, decided_at, created_at")
    .eq("organization_id", organizationId);

  if (error || !data) return [];

  const opportunityIds = Array.from(new Set(data.map((row: any) => row.opportunity_id).filter(Boolean))) as string[];
  const projectIds = Array.from(new Set(data.map((row: any) => row.project_id).filter(Boolean))) as string[];

  const [opportunityTitles, projectTitles] = await Promise.all([
    opportunityIds.length > 0
      ? supabase.from("opportunities").select("id, title").eq("organization_id", organizationId).in("id", opportunityIds)
      : Promise.resolve({ data: [] as any[] }),
    projectIds.length > 0
      ? supabase.from("projects").select("id, title").eq("organization_id", organizationId).in("id", projectIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const opportunityTitleMap = new Map(((opportunityTitles.data ?? []) as any[]).map((row: any) => [row.id as string, row.title as string]));
  const projectTitleMap = new Map(((projectTitles.data ?? []) as any[]).map((row: any) => [row.id as string, row.title as string]));

  return (data as any[]).map((row: any) => ({
    id: row.id as string,
    projectId: (row.project_id as string | null) ?? null,
    opportunityId: (row.opportunity_id as string | null) ?? null,
    title:
      opportunityTitleMap.get((row.opportunity_id as string | null) ?? "") ??
      projectTitleMap.get((row.project_id as string | null) ?? "") ??
      "Tracked bid",
    clientName: (row.client_name as string | null) ?? "Client",
    contractValue: Number(row.contract_value ?? 0),
    outcome: row.outcome as BidOutcomeStatus,
    competitorCount: (row.competitor_count as number | null) ?? null,
    sector: (row.sector as string | null) ?? "General",
    tenderType: (row.tender_type as string | null) ?? "tender",
    outcomeSummary: (row.outcome_summary as string | null) ?? null,
    decisionFactors: Array.isArray(row.decision_factors) ? (row.decision_factors as string[]) : [],
    submittedAt: (row.submitted_at as string | null) ?? null,
    decidedAt: (row.decided_at as string | null) ?? null,
    createdAt: (row.created_at as string | null) ?? null,
  })) satisfies BidOutcomeRecord[];
}

async function upsertBidOutcome(input: z.infer<typeof BidOutcomeUpsertSchema>) {
  const supabase = createServiceSupabaseClient();
  if (!supabase || !input.organizationId) {
    return {
      id: makeId("outcome", `${input.projectId ?? ""}:${input.opportunityId ?? ""}:${input.title}`),
      ...input,
    };
  }

  let existingId: string | null = null;
  if (input.opportunityId) {
    const { data } = await supabase
      .from("bid_outcomes")
      .select("id")
      .eq("organization_id", input.organizationId)
      .eq("opportunity_id", input.opportunityId)
      .maybeSingle();
    existingId = (data?.id as string | null) ?? null;
  }
  if (!existingId && input.projectId) {
    const { data } = await supabase
      .from("bid_outcomes")
      .select("id")
      .eq("organization_id", input.organizationId)
      .eq("project_id", input.projectId)
      .maybeSingle();
    existingId = (data?.id as string | null) ?? null;
  }

  const payload = {
    organization_id: input.organizationId,
    project_id: input.projectId ?? null,
    opportunity_id: input.opportunityId ?? null,
    contract_value: input.contractValue,
    outcome: input.outcome,
    competitor_count: input.competitorCount ?? null,
    sector: input.sector,
    tender_type: input.tenderType,
    client_name: input.clientName,
    outcome_summary: input.outcomeSummary ?? null,
    decision_factors: input.decisionFactors,
    submitted_at: input.submittedAt ?? (input.outcome === "submitted" || input.outcome === "won" || input.outcome === "lost" ? new Date().toISOString() : null),
    decided_at: input.outcome === "won" || input.outcome === "lost" ? input.decidedAt ?? new Date().toISOString() : null,
  };

  if (existingId) {
    await supabase.from("bid_outcomes").update(payload).eq("id", existingId);
    return { id: existingId, ...input };
  }

  const { data } = await supabase.from("bid_outcomes").insert(payload).select("id").single();
  return { id: data?.id as string, ...input };
}

async function syncBidOutcomeFromPipelineStage(params: {
  organizationId: string;
  opportunityId: string;
  projectId?: string | null;
  stage: Extract<OpportunityPipelineStage, "submitted" | "won" | "lost">;
  contractValueWon?: number | null;
}) {
  const supabase = createServiceSupabaseClient();
  if (!supabase) return;

  const [{ data: opportunity }, { data: project }] = await Promise.all([
    supabase
      .from("opportunities")
      .select("title, buyer_name, estimated_value, minimum_value, maximum_value, description, industry_tags")
      .eq("organization_id", params.organizationId)
      .eq("id", params.opportunityId)
      .maybeSingle(),
    params.projectId
      ? supabase
          .from("projects")
          .select("id, title, estimated_contract_value")
          .eq("organization_id", params.organizationId)
          .eq("id", params.projectId)
          .maybeSingle()
      : Promise.resolve({ data: null as any }),
  ]);

  const title = (opportunity?.title as string | null) ?? (project?.title as string | null) ?? "Tracked bid";
  const clientName = (opportunity?.buyer_name as string | null) ?? "Client";
  const contractValue =
    Number(
      params.contractValueWon ??
        project?.estimated_contract_value ??
        opportunity?.estimated_value ??
        opportunity?.maximum_value ??
        opportunity?.minimum_value ??
        0,
    ) || 0;
  const syntheticOpportunity: OpportunityRecord = {
    id: params.opportunityId,
    sourceKey: "contracts_finder",
    sourceNames: [],
    externalId: params.opportunityId,
    dedupeKey: params.opportunityId,
    title,
    description: (opportunity?.description as string | null) ?? "",
    buyerName: clientName,
    locations: [],
    industryTags: ((opportunity?.industry_tags ?? []) as string[]) ?? [],
    cpvCodes: [],
    currency: "GBP",
    estimatedValue: contractValue,
    opportunityStatus: "active",
  };

  await upsertBidOutcome({
    organizationId: params.organizationId,
    projectId: params.projectId ?? null,
    opportunityId: params.opportunityId,
    title,
    clientName,
    contractValue,
    outcome: params.stage,
    competitorCount: null,
    sector: inferSector(syntheticOpportunity),
    tenderType: inferTenderType(syntheticOpportunity),
    outcomeSummary:
      params.stage === "submitted"
        ? "Bid submitted and awaiting buyer decision."
        : params.stage === "won"
          ? "Bid recorded as won."
          : "Bid recorded as lost.",
    decisionFactors: [],
    submittedAt: params.stage === "submitted" || params.stage === "won" || params.stage === "lost" ? new Date().toISOString() : null,
    decidedAt: params.stage === "won" || params.stage === "lost" ? new Date().toISOString() : null,
  });
}

async function seedOpportunitySources() {
  const supabase = createServiceSupabaseClient();
  if (!supabase) return;

  await supabase.from("opportunity_sources").upsert(
    sourceCatalog.map((source) => ({
      source_key: source.sourceKey,
      name: source.name,
      base_url: source.baseUrl,
      api_url: source.apiUrl,
      authentication_type: source.authenticationType,
      scan_frequency_minutes: source.scanFrequencyMinutes,
      status: "active",
    })),
    { onConflict: "source_key" },
  );
}

async function loadAlertRules(organizationId?: string) {
  const supabase = createServiceSupabaseClient();
  if (!supabase || !organizationId) return demoAlerts;

  const { data, error } = await supabase
    .from("opportunity_alerts")
    .select("id, name, keywords, industries, locations, minimum_contract_value, maximum_contract_value")
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((row: any) => ({
    id: row.id as string,
    name: row.name as string,
    keywords: (row.keywords ?? []) as string[],
    industries: (row.industries ?? []) as string[],
    locations: (row.locations ?? []) as string[],
    minimumContractValue: row.minimum_contract_value as number | null,
    maximumContractValue: row.maximum_contract_value as number | null,
  }));
}

async function upsertOpportunity(organizationId: string, opportunity: OpportunityRecord) {
  const supabase = createServiceSupabaseClient();
  if (!supabase) return opportunity.id;

  const { data: existing } = await supabase
    .from("opportunities")
    .select("id, source_names")
    .eq("organization_id", organizationId)
    .eq("dedupe_key", opportunity.dedupeKey)
    .maybeSingle();

  if (existing?.id) {
    await supabase
      .from("opportunities")
      .update({
        source_key: opportunity.sourceKey,
        source_names: collectStrings([...(existing.source_names ?? []), ...opportunity.sourceNames]),
        external_id: opportunity.externalId,
        title: opportunity.title,
        description: opportunity.description,
        buyer_name: opportunity.buyerName,
        buyer_identifier: opportunity.buyerIdentifier ?? null,
        source_url: opportunity.sourceUrl ?? null,
        source_notice_number: opportunity.sourceNoticeNumber ?? null,
        locations: opportunity.locations,
        industry_tags: opportunity.industryTags,
        cpv_codes: opportunity.cpvCodes,
        currency: opportunity.currency,
        minimum_value: opportunity.minimumValue ?? null,
        maximum_value: opportunity.maximumValue ?? null,
        estimated_value: opportunity.estimatedValue ?? null,
        published_at: opportunity.publishedAt ?? null,
        submission_deadline: opportunity.submissionDeadline ?? null,
        opportunity_status: opportunity.opportunityStatus,
        ai_summary: opportunity.aiSummary ?? null,
        source_payload: opportunity,
        last_seen_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    return existing.id as string;
  }

  const { data: inserted } = await supabase
    .from("opportunities")
    .insert({
      organization_id: organizationId,
      source_key: opportunity.sourceKey,
      source_names: opportunity.sourceNames,
      external_id: opportunity.externalId,
      dedupe_key: opportunity.dedupeKey,
      title: opportunity.title,
      description: opportunity.description,
      buyer_name: opportunity.buyerName,
      buyer_identifier: opportunity.buyerIdentifier ?? null,
      source_url: opportunity.sourceUrl ?? null,
      source_notice_number: opportunity.sourceNoticeNumber ?? null,
      locations: opportunity.locations,
      industry_tags: opportunity.industryTags,
      cpv_codes: opportunity.cpvCodes,
      currency: opportunity.currency,
      minimum_value: opportunity.minimumValue ?? null,
      maximum_value: opportunity.maximumValue ?? null,
      estimated_value: opportunity.estimatedValue ?? null,
      published_at: opportunity.publishedAt ?? null,
      submission_deadline: opportunity.submissionDeadline ?? null,
      opportunity_status: opportunity.opportunityStatus,
      ai_summary: opportunity.aiSummary ?? null,
      source_payload: opportunity,
      last_seen_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  return (inserted?.id as string) ?? opportunity.id;
}

async function upsertOpportunityMatch(params: {
  organizationId: string;
  opportunityId: string;
  alertId: string;
  relevanceScore: number;
  winProbability: number;
  revenuePotential: number;
  combinedScore: number;
  rationale: string;
}) {
  const supabase = createServiceSupabaseClient();
  if (!supabase) {
    return makeId("match", `${params.opportunityId}:${params.alertId}`);
  }

  const initialStatus: OpportunityMatchStatus = params.combinedScore >= 75 ? "alerted" : "new";
  const { data: existing } = await supabase
    .from("opportunity_matches")
    .select("id, match_status")
    .eq("organization_id", params.organizationId)
    .eq("opportunity_id", params.opportunityId)
    .eq("alert_id", params.alertId)
    .maybeSingle();

  if (existing?.id) {
    await supabase
      .from("opportunity_matches")
      .update({
        relevance_score: params.relevanceScore,
        win_probability: params.winProbability,
        revenue_potential: params.revenuePotential,
        combined_score: params.combinedScore,
        rationale: params.rationale,
        alerted_at: params.combinedScore >= 75 ? new Date().toISOString() : null,
      })
      .eq("id", existing.id);
    return existing.id as string;
  }

  const { data: inserted } = await supabase
    .from("opportunity_matches")
    .insert({
      organization_id: params.organizationId,
      opportunity_id: params.opportunityId,
      alert_id: params.alertId,
      relevance_score: params.relevanceScore,
      win_probability: params.winProbability,
      revenue_potential: params.revenuePotential,
      combined_score: params.combinedScore,
      rationale: params.rationale,
      match_status: initialStatus,
      alerted_at: initialStatus === "alerted" ? new Date().toISOString() : null,
    })
    .select("id")
    .single();

  return inserted?.id as string;
}

async function trackAnalyticsEvent(event: { organizationId?: string; projectId?: string; eventName: string; metadata?: Record<string, unknown> }) {
  const supabase = createServiceSupabaseClient();
  if (!supabase) return;

  await supabase.from("analytics_events").insert({
    organization_id: event.organizationId ?? null,
    project_id: event.projectId ?? null,
    event_name: event.eventName,
    metadata: event.metadata ?? {},
  });
}

export async function runOpportunityScan({
  organizationId,
  lookbackHours = 24,
}: {
  organizationId?: string;
  lookbackHours?: number;
}) {
  await seedOpportunitySources();
  const supabase = createServiceSupabaseClient();
  const shouldPersist = Boolean(supabase && organizationId);
  const alerts = await loadAlertRules(organizationId);
  const normalizedOpportunities = await fetchSourceOpportunities(lookbackHours);
  const historicalOutcomes = await loadBidOutcomes(organizationId);
  const learningContext = historicalOutcomes.length > 0 ? buildOutcomeLearningContext(historicalOutcomes) : undefined;
  const matches: OpportunityMatchRecord[] = [];
  const revenueScores: OpportunityRoiScoreRecord[] = [];
  const priorities: OpportunityPriorityRecord[] = [];

  for (const opportunity of normalizedOpportunities) {
    const persistedOpportunityId = shouldPersist && organizationId ? await upsertOpportunity(organizationId, opportunity) : opportunity.id;
    const persistedOpportunity = { ...opportunity, id: persistedOpportunityId };
    let bestMatchForOpportunity: OpportunityMatchRecord | undefined;

    for (const alert of alerts) {
      const scores = await scoreOpportunityWithAI(opportunity, alert, learningContext);
      if (scores.relevanceScore < 45) continue;

      const matchId =
        shouldPersist && organizationId
          ? await upsertOpportunityMatch({
              organizationId,
              opportunityId: persistedOpportunityId,
              alertId: alert.id,
              ...scores,
            })
          : makeId("match", `${persistedOpportunityId}:${alert.id}`);

      const matchRecord: OpportunityMatchRecord = {
        id: matchId,
        opportunityId: persistedOpportunityId,
        alertId: alert.id,
        relevanceScore: scores.relevanceScore,
        winProbability: scores.winProbability,
        revenuePotential: scores.revenuePotential,
        combinedScore: scores.combinedScore,
        rationale: scores.rationale,
        matchStatus: scores.combinedScore >= 75 ? "alerted" : "new",
        importedProjectId: null,
      };

      matches.push(matchRecord);
      if (!bestMatchForOpportunity || matchRecord.combinedScore > bestMatchForOpportunity.combinedScore) {
        bestMatchForOpportunity = matchRecord;
      }
    }

    let roi = buildRevenueScoreHeuristics(persistedOpportunity, bestMatchForOpportunity, learningContext);
    let priority = buildOpportunityPriority(roi);
    roi = await recommendOpportunityWithAI({
      opportunity: persistedOpportunity,
      match: bestMatchForOpportunity,
      roi,
      priority,
      learningContext,
    });
    priority = buildOpportunityPriority(roi);

    revenueScores.push(roi);
    priorities.push(priority);

    if (shouldPersist && organizationId) {
      await upsertOpportunityRoiScore(organizationId, roi);
      await upsertOpportunityPriority(organizationId, priority);
      await ensureOpportunityPipeline(organizationId, persistedOpportunityId);
      await syncPredictForOpportunity({
        organizationId,
        opportunityId: persistedOpportunityId,
      });
    }
  }

  if (shouldPersist && organizationId && supabase) {
    await supabase.from("opportunity_alerts").update({ last_scanned_at: new Date().toISOString() }).eq("organization_id", organizationId);
    await supabase.from("opportunity_sources").update({ last_scanned_at: new Date().toISOString() }).in(
      "source_key",
      sourceCatalog.map((item) => item.sourceKey),
    );
  }

  await trackAuditEvent({
    action: "opportunities.scan_completed",
    entityType: "opportunity_scan",
    organizationId,
    metadata: {
      sources: sourceCatalog.map((item) => item.sourceKey),
      opportunities: normalizedOpportunities.length,
      matches: matches.length,
      revenueScored: revenueScores.length,
      lookbackHours,
    },
  });

  await trackAnalyticsEvent({
    organizationId,
    eventName: "opportunities.scan_completed",
    metadata: {
      opportunities: normalizedOpportunities.length,
      matches: matches.length,
      revenueScored: revenueScores.length,
    },
  });

  return {
    opportunities: normalizedOpportunities,
    matches,
    revenueScores,
    priorities,
  };
}

export async function saveOpportunityAlert(input: z.infer<typeof OpportunityAlertSchema>) {
  const supabase = createServiceSupabaseClient();
  if (!supabase || !input.organizationId) {
    return { id: makeId("alert", JSON.stringify(input)), ...input };
  }

  const { data } = await supabase
    .from("opportunity_alerts")
    .insert({
      organization_id: input.organizationId,
      name: input.name,
      keywords: input.keywords,
      industries: input.industries,
      locations: input.locations,
      minimum_contract_value: input.minimumContractValue ?? null,
      maximum_contract_value: input.maximumContractValue ?? null,
      is_active: true,
    })
    .select("id")
    .single();

  await trackAuditEvent({
    action: "opportunities.alert_created",
    entityType: "opportunity_alert",
    organizationId: input.organizationId,
    entityId: data?.id as string,
    metadata: input,
  });

  await trackAnalyticsEvent({
    organizationId: input.organizationId,
    eventName: "opportunities.alert_created",
    metadata: {
      alertId: data?.id as string,
      keywordCount: input.keywords.length,
      industryCount: input.industries.length,
      locationCount: input.locations.length,
    },
  });

  return { id: data?.id as string, ...input };
}

export async function updateOpportunityMatchStatus(input: z.infer<typeof OpportunityMatchUpdateSchema>) {
  const supabase = createServiceSupabaseClient();
  if (!supabase || !input.organizationId) {
    return { ok: true };
  }

  await supabase
    .from("opportunity_matches")
    .update({ match_status: input.status })
    .eq("organization_id", input.organizationId)
    .eq("id", input.matchId);

  await trackAuditEvent({
    action: "opportunities.match_updated",
    entityType: "opportunity_match",
    organizationId: input.organizationId,
    entityId: input.matchId,
    metadata: { status: input.status },
  });

  await trackAnalyticsEvent({
    organizationId: input.organizationId,
    eventName: "opportunities.match_updated",
    metadata: { matchId: input.matchId, status: input.status },
  });

  return { ok: true };
}

export async function updateOpportunityPipelineStage(input: z.infer<typeof OpportunityPipelineUpdateSchema>) {
  const supabase = createServiceSupabaseClient();
  if (!supabase || !input.organizationId) {
    return { ok: true };
  }

  await ensureOpportunityPipeline(input.organizationId, input.opportunityId);

  const { data: existing } = await supabase
    .from("opportunity_pipeline")
    .select("current_stage, project_id, imported_at, bid_created_at, submitted_at, won_at, lost_at, contract_value_won, stage_history")
    .eq("organization_id", input.organizationId)
    .eq("opportunity_id", input.opportunityId)
    .maybeSingle();

  const now = new Date().toISOString();
  const currentStage = (existing?.current_stage as OpportunityPipelineStage | undefined) ?? "opportunity";
  const nextStage = getStageRank(input.stage) > getStageRank(currentStage) ? input.stage : currentStage;
  const stageHistory = Array.isArray(existing?.stage_history) ? [...existing.stage_history] : buildInitialPipeline(input.opportunityId).stageHistory;
  const hasCurrentStageEntry = stageHistory.some((item: any) => item?.stage === input.stage);
  if (!hasCurrentStageEntry) {
    stageHistory.push({
      stage: input.stage,
      at: now,
      metadata: {
        projectId: input.projectId ?? null,
        contractValueWon: input.contractValueWon ?? null,
      },
    });
  }

  const patch: Record<string, unknown> = {
    current_stage: nextStage,
    project_id: input.projectId ?? existing?.project_id ?? null,
    stage_history: stageHistory,
  };

  if (input.stage === "imported" || input.stage === "bid_created" || input.stage === "submitted" || input.stage === "won" || input.stage === "lost") {
    patch.imported_at = existing?.imported_at ?? now;
  }
  if (input.stage === "bid_created" || input.stage === "submitted" || input.stage === "won" || input.stage === "lost") {
    patch.bid_created_at = existing?.bid_created_at ?? now;
  }
  if (input.stage === "submitted" || input.stage === "won" || input.stage === "lost") {
    patch.submitted_at = existing?.submitted_at ?? now;
  }
  if (input.stage === "won") {
    patch.won_at = existing?.won_at ?? now;
    patch.contract_value_won = input.contractValueWon ?? existing?.contract_value_won ?? null;
  }
  if (input.stage === "lost") {
    patch.lost_at = existing?.lost_at ?? now;
  }

  await supabase
    .from("opportunity_pipeline")
    .update(patch)
    .eq("organization_id", input.organizationId)
    .eq("opportunity_id", input.opportunityId);

  if (input.stage === "submitted" || input.stage === "won" || input.stage === "lost") {
    await syncBidOutcomeFromPipelineStage({
      organizationId: input.organizationId,
      opportunityId: input.opportunityId,
      projectId: input.projectId ?? existing?.project_id ?? null,
      stage: input.stage,
      contractValueWon: input.contractValueWon ?? null,
    });
  }

  await syncPredictForOpportunity({
    organizationId: input.organizationId,
    opportunityId: input.opportunityId,
    projectId: (input.projectId ?? existing?.project_id ?? null) as string | null | undefined,
  });

  await trackAuditEvent({
    action: "opportunities.pipeline_updated",
    entityType: "opportunity_pipeline",
    organizationId: input.organizationId,
    entityId: input.opportunityId,
    metadata: {
      stage: input.stage,
      projectId: input.projectId ?? null,
      contractValueWon: input.contractValueWon ?? null,
    },
  });

  await trackAnalyticsEvent({
    organizationId: input.organizationId,
    projectId: input.projectId ?? undefined,
    eventName: "opportunities.pipeline_updated",
    metadata: {
      opportunityId: input.opportunityId,
      stage: input.stage,
      contractValueWon: input.contractValueWon ?? null,
    },
  });

  return { ok: true };
}

export async function importOpportunityToWorkspace(input: z.infer<typeof OpportunityImportSchema>) {
  const supabase = createServiceSupabaseClient();
  if (!supabase || !input.organizationId) {
    return { projectId: demoProjects[0].id, projectTitle: demoProjects[0].title };
  }

  if (input.matchId) {
    const { data: existingMatch } = await supabase
      .from("opportunity_matches")
      .select("imported_project_id")
      .eq("organization_id", input.organizationId)
      .eq("id", input.matchId)
      .maybeSingle();

    if (existingMatch?.imported_project_id) {
      const { data: existingProject } = await supabase
        .from("projects")
        .select("id, title")
        .eq("organization_id", input.organizationId)
        .eq("id", existingMatch.imported_project_id)
        .maybeSingle();

      return {
        projectId: (existingProject?.id as string) ?? (existingMatch.imported_project_id as string),
        projectTitle: (existingProject?.title as string) ?? "Imported opportunity",
      };
    }
  }

  const { data: opportunity } = await supabase
    .from("opportunities")
    .select("id, title, buyer_name, estimated_value, submission_deadline, description")
    .eq("organization_id", input.organizationId)
    .eq("id", input.opportunityId)
    .single();

  if (!opportunity) {
    throw new Error("Opportunity not found.");
  }

  const projectId = randomUUID();
  await supabase.from("projects").insert({
    id: projectId,
    organization_id: input.organizationId,
    title: opportunity.title,
    tender_name: opportunity.title,
    issuing_body: opportunity.buyer_name,
    submission_deadline: opportunity.submission_deadline,
    estimated_contract_value: opportunity.estimated_value,
    status: "draft",
    readiness_score: 0,
  });

  await supabase.from("workspace_documents").insert({
    organization_id: input.organizationId,
    project_id: projectId,
    title: `${opportunity.title} Workspace`,
    document_type: "workspace",
    content: `Imported from Opportunity Discovery Engine.\n\nOpportunity:\n${opportunity.title}\n\nBuyer:\n${opportunity.buyer_name}\n\nSummary:\n${opportunity.description ?? ""}`,
  });

  if (input.matchId) {
    await supabase
      .from("opportunity_matches")
      .update({ match_status: "imported", imported_project_id: projectId })
      .eq("organization_id", input.organizationId)
      .eq("id", input.matchId);
  }

  await updateOpportunityPipelineStage({
    organizationId: input.organizationId,
    opportunityId: input.opportunityId,
    projectId,
    stage: "imported",
  });
  await updateOpportunityPipelineStage({
    organizationId: input.organizationId,
    opportunityId: input.opportunityId,
    projectId,
    stage: "bid_created",
  });

  await trackAuditEvent({
    action: "opportunities.imported_to_workspace",
    entityType: "opportunity",
    entityId: input.opportunityId,
    organizationId: input.organizationId,
    metadata: { projectId },
  });

  await trackAnalyticsEvent({
    organizationId: input.organizationId,
    projectId,
    eventName: "opportunities.imported_to_workspace",
    metadata: { opportunityId: input.opportunityId },
  });

  return { projectId, projectTitle: opportunity.title };
}

export async function runScheduledOpportunityScans({
  lookbackHours = 24,
}: {
  lookbackHours?: number;
} = {}): Promise<ScheduledOpportunityScanSummary> {
  const supabase = createServiceSupabaseClient();
  if (!supabase) {
    return {
      organizationsScanned: 0,
      opportunitiesDiscovered: 0,
      matchesCreated: 0,
    };
  }

  const { data: alerts, error } = await supabase.from("opportunity_alerts").select("organization_id").eq("is_active", true);
  if (error || !alerts) {
    return {
      organizationsScanned: 0,
      opportunitiesDiscovered: 0,
      matchesCreated: 0,
    };
  }

  const organizationIds = Array.from(new Set(alerts.map((alert: any) => alert.organization_id).filter(Boolean))) as string[];
  let opportunitiesDiscovered = 0;
  let matchesCreated = 0;

  for (const organizationId of organizationIds) {
    const result = await runOpportunityScan({ organizationId, lookbackHours });
    opportunitiesDiscovered += result.opportunities.length;
    matchesCreated += result.matches.length;
  }

  await trackAuditEvent({
    action: "opportunities.scheduled_scan_completed",
    entityType: "opportunity_scan",
    metadata: {
      organizationsScanned: organizationIds.length,
      opportunitiesDiscovered,
      matchesCreated,
      lookbackHours,
    },
  });

  return {
    organizationsScanned: organizationIds.length,
    opportunitiesDiscovered,
    matchesCreated,
  };
}

export async function getOpportunityDiscoverySnapshot(organizationId?: string): Promise<DiscoverySnapshot> {
  const supabase = createServiceSupabaseClient();
  const buildSnapshotFromRecords = async (params: {
    alerts: OpportunityAlertRule[];
    opportunities: OpportunityRecord[];
    matches: OpportunityMatchRecord[];
    roiScores: OpportunityRoiScoreRecord[];
    priorities: OpportunityPriorityRecord[];
    pipelines: OpportunityPipelineRecord[];
    scansLast7Days: number;
  }): Promise<DiscoverySnapshot> => {
    const predictionMap = await getOpportunityPredictionSummaryMap(
      organizationId,
      params.opportunities.map((item) => item.id),
    );
    const attached = attachRevenueData({
      opportunities: params.opportunities,
      matches: params.matches,
      roiScores: params.roiScores,
      priorities: params.priorities,
      pipelines: params.pipelines,
      predictionMap,
    });

    const wonValueByOpportunity = new Map(
      attached
        .filter((item) => item.pipeline?.wonAt)
        .map((item) => [item.id, item.pipeline?.contractValueWon ?? item.roi?.estimatedContractValue ?? getEstimatedContractValue(item)]),
    );

    return {
      metrics: {
        newOpportunities: params.matches.filter((item) => item.matchStatus === "new" || item.matchStatus === "alerted").length,
        savedOpportunities: params.matches.filter((item) => item.matchStatus === "saved").length,
        highMatchOpportunities: params.matches.filter((item) => item.combinedScore >= 80).length,
        scansLast7Days: params.scansLast7Days,
      },
      organizationReport: {
        opportunitiesFound: params.opportunities.length,
        opportunitiesPursued: attached.filter((item) => item.pipeline?.importedAt).length,
        bidsSubmitted: attached.filter((item) => item.pipeline?.submittedAt).length,
        contractsWon: attached.filter((item) => item.pipeline?.wonAt).length,
        totalContractValueWon: attached
          .filter((item) => item.pipeline?.wonAt)
          .reduce((sum, item) => sum + Number(wonValueByOpportunity.get(item.id) ?? 0), 0),
      },
      funnel: {
        opportunity: params.opportunities.length,
        imported: attached.filter((item) => item.pipeline?.importedAt).length,
        bidCreated: attached.filter((item) => item.pipeline?.bidCreatedAt).length,
        submitted: attached.filter((item) => item.pipeline?.submittedAt).length,
        won: attached.filter((item) => item.pipeline?.wonAt).length,
      },
      alerts: params.alerts,
      newOpportunities: attached.filter((item) => item.match && (item.match.matchStatus === "new" || item.match.matchStatus === "alerted")),
      savedOpportunities: attached.filter((item) => item.match?.matchStatus === "saved"),
      highMatchOpportunities: attached.filter((item) => (item.match?.combinedScore ?? 0) >= 80),
      bestOpportunities: [...attached]
        .sort((left, right) => (right.priority?.priorityScore ?? 0) - (left.priority?.priorityScore ?? 0))
        .filter((item) => (item.priority?.bestOpportunity ?? false) || (item.priority?.priorityScore ?? 0) >= 75)
        .slice(0, 6),
      highestRoiOpportunities: [...attached]
        .sort((left, right) => (right.roi?.roiScore ?? 0) - (left.roi?.roiScore ?? 0))
        .slice(0, 6),
      quickWins: [...attached]
        .filter((item) => item.priority?.quickWin)
        .sort((left, right) => (right.roi?.expectedWinProbability ?? 0) - (left.roi?.expectedWinProbability ?? 0))
        .slice(0, 6),
      highValueOpportunities: [...attached]
        .sort((left, right) => (right.roi?.estimatedContractValue ?? 0) - (left.roi?.estimatedContractValue ?? 0))
        .filter((item) => (item.priority?.highValue ?? false) || (item.roi?.estimatedContractValue ?? 0) >= 1000000)
        .slice(0, 6),
    };
  };

  if (!supabase || !organizationId) {
    const demoLearningContext = buildOutcomeLearningContext(demoBidOutcomes);
    const demoRoiScores = demoOpportunities.map((opportunity) =>
      buildRevenueScoreHeuristics(
        opportunity,
        demoMatches
          .filter((match) => match.opportunityId === opportunity.id)
          .sort((left, right) => right.combinedScore - left.combinedScore)[0],
        demoLearningContext,
      ),
    );
    const demoPriorities = demoRoiScores.map((roi) => buildOpportunityPriority(roi));
    const demoPipelines: OpportunityPipelineRecord[] = [
      {
        opportunityId: "opp_1",
        currentStage: "bid_created",
        projectId: "proj_1",
        importedAt: "2026-06-23T10:00:00.000Z",
        bidCreatedAt: "2026-06-23T10:05:00.000Z",
        submittedAt: null,
        wonAt: null,
        lostAt: null,
        contractValueWon: null,
        stageHistory: [
          { stage: "opportunity", at: "2026-06-22T09:00:00.000Z" },
          { stage: "imported", at: "2026-06-23T10:00:00.000Z" },
          { stage: "bid_created", at: "2026-06-23T10:05:00.000Z" },
        ],
      },
      {
        opportunityId: "opp_2",
        currentStage: "submitted",
        projectId: "proj_2",
        importedAt: "2026-06-23T09:00:00.000Z",
        bidCreatedAt: "2026-06-23T09:10:00.000Z",
        submittedAt: "2026-06-24T14:00:00.000Z",
        wonAt: null,
        lostAt: null,
        contractValueWon: null,
        stageHistory: [
          { stage: "opportunity", at: "2026-06-23T08:30:00.000Z" },
          { stage: "imported", at: "2026-06-23T09:00:00.000Z" },
          { stage: "bid_created", at: "2026-06-23T09:10:00.000Z" },
          { stage: "submitted", at: "2026-06-24T14:00:00.000Z" },
        ],
      },
      {
        opportunityId: "opp_3",
        currentStage: "won",
        projectId: "proj_3",
        importedAt: "2026-06-21T08:00:00.000Z",
        bidCreatedAt: "2026-06-21T08:15:00.000Z",
        submittedAt: "2026-06-22T18:00:00.000Z",
        wonAt: "2026-06-24T11:30:00.000Z",
        lostAt: null,
        contractValueWon: 2500000,
        stageHistory: [
          { stage: "opportunity", at: "2026-06-20T14:00:00.000Z" },
          { stage: "imported", at: "2026-06-21T08:00:00.000Z" },
          { stage: "bid_created", at: "2026-06-21T08:15:00.000Z" },
          { stage: "submitted", at: "2026-06-22T18:00:00.000Z" },
          { stage: "won", at: "2026-06-24T11:30:00.000Z" },
        ],
      },
    ];

    return await buildSnapshotFromRecords({
      alerts: demoAlerts,
      opportunities: demoOpportunities,
      matches: demoMatches,
      roiScores: demoRoiScores,
      priorities: demoPriorities,
      pipelines: demoPipelines,
      scansLast7Days: 6,
    });
  }

  const [alertsResponse, opportunitiesResponse, matchesResponse, roiResponse, priorityResponse, pipelineResponse, scansResponse] = await Promise.all([
    supabase
      .from("opportunity_alerts")
      .select("id, name, keywords, industries, locations, minimum_contract_value, maximum_contract_value")
      .eq("organization_id", organizationId)
      .eq("is_active", true),
    supabase
      .from("opportunities")
      .select("id, source_key, source_names, external_id, dedupe_key, title, description, buyer_name, buyer_identifier, source_url, source_notice_number, locations, industry_tags, cpv_codes, currency, minimum_value, maximum_value, estimated_value, published_at, submission_deadline, opportunity_status, ai_summary")
      .eq("organization_id", organizationId)
      .order("published_at", { ascending: false })
      .limit(100),
    supabase
      .from("opportunity_matches")
      .select("id, opportunity_id, alert_id, relevance_score, win_probability, revenue_potential, combined_score, rationale, match_status, imported_project_id")
      .eq("organization_id", organizationId)
      .order("combined_score", { ascending: false })
      .limit(200),
    supabase
      .from("opportunity_roi_score")
      .select("opportunity_id, estimated_contract_value, expected_win_probability, expected_revenue, bid_effort_score, roi_score, recommendation, justification")
      .eq("organization_id", organizationId),
    supabase
      .from("opportunity_priority")
      .select("opportunity_id, priority_score, priority_band, quick_win, high_value, best_opportunity, reasoning")
      .eq("organization_id", organizationId),
    supabase
      .from("opportunity_pipeline")
      .select("opportunity_id, current_stage, project_id, imported_at, bid_created_at, submitted_at, won_at, lost_at, contract_value_won, stage_history")
      .eq("organization_id", organizationId),
    supabase
      .from("analytics_events")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("event_name", "opportunities.scan_completed")
      .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
  ]);

  if (opportunitiesResponse.error || matchesResponse.error || roiResponse.error || priorityResponse.error || pipelineResponse.error) {
    return getOpportunityDiscoverySnapshot();
  }

  const alerts = (alertsResponse.data ?? []).map((row: any) => ({
    id: row.id as string,
    name: row.name as string,
    keywords: (row.keywords ?? []) as string[],
    industries: (row.industries ?? []) as string[],
    locations: (row.locations ?? []) as string[],
    minimumContractValue: row.minimum_contract_value as number | null,
    maximumContractValue: row.maximum_contract_value as number | null,
  }));

  const opportunities: OpportunityRecord[] = (opportunitiesResponse.data ?? []).map((row: any) => ({
    id: row.id as string,
    sourceKey: row.source_key as OpportunitySourceKey,
    sourceNames: (row.source_names ?? []) as string[],
    externalId: row.external_id as string,
    dedupeKey: row.dedupe_key as string,
    title: row.title as string,
    description: row.description as string,
    buyerName: row.buyer_name as string,
    buyerIdentifier: (row.buyer_identifier as string | null) ?? undefined,
    sourceUrl: (row.source_url as string | null) ?? undefined,
    sourceNoticeNumber: (row.source_notice_number as string | null) ?? undefined,
    locations: (row.locations ?? []) as string[],
    industryTags: (row.industry_tags ?? []) as string[],
    cpvCodes: (row.cpv_codes ?? []) as string[],
    currency: (row.currency as string) ?? "GBP",
    minimumValue: row.minimum_value as number | null,
    maximumValue: row.maximum_value as number | null,
    estimatedValue: row.estimated_value as number | null,
    publishedAt: row.published_at as string | null,
    submissionDeadline: row.submission_deadline as string | null,
    opportunityStatus: row.opportunity_status as string,
    aiSummary: (row.ai_summary as string | null) ?? undefined,
  }));

  const matches: OpportunityMatchRecord[] = (matchesResponse.data ?? []).map((row: any) => ({
    id: row.id as string,
    opportunityId: row.opportunity_id as string,
    alertId: row.alert_id as string,
    relevanceScore: Number(row.relevance_score),
    winProbability: Number(row.win_probability),
    revenuePotential: Number(row.revenue_potential),
    combinedScore: Number(row.combined_score),
    rationale: row.rationale as string,
    matchStatus: row.match_status as OpportunityMatchStatus,
    importedProjectId: (row.imported_project_id as string | null) ?? null,
  }));

  const roiScores: OpportunityRoiScoreRecord[] = (roiResponse.data ?? []).map((row: any) => ({
    opportunityId: row.opportunity_id as string,
    estimatedContractValue: Number(row.estimated_contract_value ?? 0),
    expectedWinProbability: Number(row.expected_win_probability ?? 0),
    expectedRevenue: Number(row.expected_revenue ?? 0),
    bidEffortScore: Number(row.bid_effort_score ?? 0),
    roiScore: Number(row.roi_score ?? 0),
    recommendation: row.recommendation as OpportunityRecommendation,
    justification: row.justification as string,
  }));

  const priorities: OpportunityPriorityRecord[] = (priorityResponse.data ?? []).map((row: any) => ({
    opportunityId: row.opportunity_id as string,
    priorityScore: Number(row.priority_score ?? 0),
    priorityBand: row.priority_band as OpportunityPriorityBand,
    quickWin: Boolean(row.quick_win),
    highValue: Boolean(row.high_value),
    bestOpportunity: Boolean(row.best_opportunity),
    reasoning: row.reasoning as string,
  }));

  const pipelines: OpportunityPipelineRecord[] = (pipelineResponse.data ?? []).map((row: any) => ({
    opportunityId: row.opportunity_id as string,
    currentStage: row.current_stage as OpportunityPipelineStage,
    projectId: (row.project_id as string | null) ?? null,
    importedAt: (row.imported_at as string | null) ?? null,
    bidCreatedAt: (row.bid_created_at as string | null) ?? null,
    submittedAt: (row.submitted_at as string | null) ?? null,
    wonAt: (row.won_at as string | null) ?? null,
    lostAt: (row.lost_at as string | null) ?? null,
    contractValueWon: (row.contract_value_won as number | null) ?? null,
    stageHistory: Array.isArray(row.stage_history)
      ? (row.stage_history as Array<{ stage: OpportunityPipelineStage; at: string; metadata?: Record<string, unknown> }>)
      : [],
  }));

  return await buildSnapshotFromRecords({
    alerts,
    opportunities,
    matches,
    roiScores,
    priorities,
    pipelines,
    scansLast7Days: scansResponse.count ?? 0,
  });
}

function buildOutcomePatterns(
  outcomes: BidOutcomeRecord[],
  keySelector: (item: BidOutcomeRecord) => string,
): BidOutcomePatternRecord[] {
  const decided = outcomes.filter((item) => item.outcome === "won" || item.outcome === "lost" || item.outcome === "rejected");
  const grouped = new Map<string, BidOutcomeRecord[]>();

  decided.forEach((item) => {
    const key = keySelector(item).trim() || "General";
    grouped.set(key, [...(grouped.get(key) ?? []), item]);
  });

  return Array.from(grouped.entries())
    .map(([label, items]) => {
      const wins = items.filter((item) => item.outcome === "won");
      const losses = items.filter((item) => item.outcome === "lost" || item.outcome === "rejected");
      return {
        label,
        bids: items.length,
        wins: wins.length,
        losses: losses.length,
        winRate: items.length > 0 ? Math.round((wins.length / items.length) * 100) : 0,
        averageContractValue: Math.round(average(items.map((item) => item.contractValue))),
        revenueWon: wins.reduce((sum, item) => sum + item.contractValue, 0),
        revenueLost: losses.reduce((sum, item) => sum + item.contractValue, 0),
      };
    })
    .sort((left, right) => right.winRate - left.winRate || right.revenueWon - left.revenueWon)
    .slice(0, 6);
}

function buildFallbackOutcomeInsights(
  outcomes: BidOutcomeRecord[],
  sectorPatterns: BidOutcomePatternRecord[],
  clientPatterns: BidOutcomePatternRecord[],
): BidOutcomeInsights {
  const wins = outcomes.filter((item) => item.outcome === "won");
  const losses = outcomes.filter((item) => item.outcome === "lost" || item.outcome === "rejected");
  const collectTopFactors = (items: BidOutcomeRecord[]) => {
    const factorCounts = new Map<string, number>();
    items.forEach((item) => {
      item.decisionFactors.forEach((factor) => {
        factorCounts.set(factor, (factorCounts.get(factor) ?? 0) + 1);
      });
    });
    return Array.from(factorCounts.entries())
      .sort((left, right) => right[1] - left[1])
      .slice(0, 3)
      .map(([factor, count]) => `${factor} appeared in ${count} ${count === 1 ? "decision" : "decisions"}.`);
  };

  const whyWon = collectTopFactors(wins);
  const whyLost = collectTopFactors(losses);

  if (whyWon.length === 0 && wins.length > 0) {
    whyWon.push(`Won bids average ${Math.round(average(wins.map((item) => item.contractValue)))} in contract value across ${wins.length} decisions.`);
  }
  if (whyLost.length === 0 && losses.length > 0) {
    whyLost.push(`Lost bids face an average of ${Math.round(average(losses.map((item) => item.competitorCount ?? 0)))} competitors.`);
  }

  return {
    whyWon: whyWon.length > 0 ? whyWon : ["Capture win reasons by adding decision factors to completed bids."],
    whyLost: whyLost.length > 0 ? whyLost : ["Capture loss reasons and competitor counts to improve loss analysis."],
    patternsBySector:
      sectorPatterns.length > 0
        ? sectorPatterns.map((item) => `${item.label}: ${item.winRate}% win rate across ${item.bids} decided bids.`)
        : ["More decided bids are needed to identify sector-level performance patterns."],
    patternsByClient:
      clientPatterns.length > 0
        ? clientPatterns.map((item) => `${item.label}: ${item.winRate}% win rate with ${item.wins} wins and ${item.losses} losses.`)
        : ["More decided bids are needed to identify client-level performance patterns."],
  };
}

async function generateOutcomeInsights(
  outcomes: BidOutcomeRecord[],
  sectorPatterns: BidOutcomePatternRecord[],
  clientPatterns: BidOutcomePatternRecord[],
) {
  const fallback = buildFallbackOutcomeInsights(outcomes, sectorPatterns, clientPatterns);
  if (!hasOpenAIEnv() || outcomes.length === 0) {
    return fallback;
  }

  try {
    const prompt = await readPrompt("bid-outcome-intelligence.md");
    const client = new OpenAI({ apiKey: env.openAiApiKey });
    const response = await client.responses.create({
      model: "gpt-4.1",
      input: [
        { role: "system", content: prompt },
        {
          role: "user",
          content: JSON.stringify({
            organization: demoOrganization,
            outcomes,
            sectorPatterns,
            clientPatterns,
          }),
        },
      ],
    });

    const parsed = extractJsonObject(response.output_text);
    if (!parsed) return fallback;

    return {
      whyWon: Array.isArray(parsed.whyWon) ? (parsed.whyWon as string[]).slice(0, 4) : fallback.whyWon,
      whyLost: Array.isArray(parsed.whyLost) ? (parsed.whyLost as string[]).slice(0, 4) : fallback.whyLost,
      patternsBySector: Array.isArray(parsed.patternsBySector) ? (parsed.patternsBySector as string[]).slice(0, 4) : fallback.patternsBySector,
      patternsByClient: Array.isArray(parsed.patternsByClient) ? (parsed.patternsByClient as string[]).slice(0, 4) : fallback.patternsByClient,
    } satisfies BidOutcomeInsights;
  } catch {
    return fallback;
  }
}

async function loadTrackableBids(organizationId?: string): Promise<TrackableBidRecord[]> {
  const supabase = createServiceSupabaseClient();
  if (!supabase || !organizationId) {
    return demoOpportunities.map((opportunity, index) => ({
      projectId: demoProjects[index]?.id ?? null,
      opportunityId: opportunity.id,
      title: opportunity.title,
      clientName: opportunity.buyerName,
      currentStage: index === 0 ? "bid_created" : index === 1 ? "submitted" : "won",
      contractValue: getEstimatedContractValue(opportunity),
      sector: inferSector(opportunity),
      tenderType: inferTenderType(opportunity),
    }));
  }

  const [pipelineResponse, opportunitiesResponse] = await Promise.all([
    supabase
      .from("opportunity_pipeline")
      .select("opportunity_id, project_id, current_stage")
      .eq("organization_id", organizationId)
      .in("current_stage", ["bid_created", "submitted", "won", "lost"]),
    supabase
      .from("opportunities")
      .select("id, title, buyer_name, estimated_value, minimum_value, maximum_value, description, industry_tags")
      .eq("organization_id", organizationId),
  ]);

  const opportunityMap = new Map(((opportunitiesResponse.data ?? []) as any[]).map((row: any) => [row.id as string, row]));

  return ((pipelineResponse.data ?? []) as any[]).map((row: any) => {
    const opportunity = opportunityMap.get(row.opportunity_id as string);
    const syntheticOpportunity: OpportunityRecord = {
      id: row.opportunity_id as string,
      sourceKey: "contracts_finder",
      sourceNames: [],
      externalId: row.opportunity_id as string,
      dedupeKey: row.opportunity_id as string,
      title: (opportunity?.title as string | null) ?? "Tracked bid",
      description: (opportunity?.description as string | null) ?? "",
      buyerName: (opportunity?.buyer_name as string | null) ?? "Client",
      locations: [],
      industryTags: ((opportunity?.industry_tags ?? []) as string[]) ?? [],
      cpvCodes: [],
      currency: "GBP",
      estimatedValue: Number(opportunity?.estimated_value ?? opportunity?.maximum_value ?? opportunity?.minimum_value ?? 0),
      opportunityStatus: "active",
    };

    return {
      projectId: (row.project_id as string | null) ?? null,
      opportunityId: row.opportunity_id as string,
      title: syntheticOpportunity.title,
      clientName: syntheticOpportunity.buyerName,
      currentStage: row.current_stage as OpportunityPipelineStage,
      contractValue: getEstimatedContractValue(syntheticOpportunity),
      sector: inferSector(syntheticOpportunity),
      tenderType: inferTenderType(syntheticOpportunity),
    };
  });
}

async function syncOpportunityPipelineFromOutcome(input: z.infer<typeof BidOutcomeUpsertSchema>) {
  const supabase = createServiceSupabaseClient();
  if (!supabase || !input.organizationId) return;

  let pipelineOpportunityId = input.opportunityId ?? null;
  let pipelineProjectId = input.projectId ?? null;
  let existing: any = null;

  if (pipelineOpportunityId) {
    const lookup = await supabase
      .from("opportunity_pipeline")
      .select("opportunity_id, project_id, imported_at, bid_created_at, submitted_at, won_at, lost_at, contract_value_won, stage_history")
      .eq("organization_id", input.organizationId)
      .eq("opportunity_id", pipelineOpportunityId)
      .maybeSingle();

    if (lookup.error) return;
    existing = lookup.data;
  } else if (pipelineProjectId) {
    const lookup = await supabase
      .from("opportunity_pipeline")
      .select("opportunity_id, project_id, imported_at, bid_created_at, submitted_at, won_at, lost_at, contract_value_won, stage_history")
      .eq("organization_id", input.organizationId)
      .eq("project_id", pipelineProjectId)
      .maybeSingle();

    if (lookup.error) return;
    existing = lookup.data;
  }

  if (!existing && !pipelineOpportunityId) return;

  if (!existing && pipelineOpportunityId) {
    await ensureOpportunityPipeline(input.organizationId, pipelineOpportunityId);
  }

  const resolvedOpportunityId = (existing?.opportunity_id as string | null) ?? pipelineOpportunityId;
  if (!resolvedOpportunityId) return;

  const { data: current } = await supabase
    .from("opportunity_pipeline")
    .select("project_id, imported_at, bid_created_at, submitted_at, won_at, lost_at, contract_value_won, stage_history")
    .eq("organization_id", input.organizationId)
    .eq("opportunity_id", resolvedOpportunityId)
    .maybeSingle();

  const now = new Date().toISOString();
  const stageHistory = Array.isArray(current?.stage_history) ? [...current.stage_history] : buildInitialPipeline(resolvedOpportunityId).stageHistory;
  const pipelineStage = mapBidOutcomeToPipelineStage(input.outcome);
  const lastHistoryStage = stageHistory[stageHistory.length - 1]?.stage as OpportunityPipelineStage | undefined;

  if (lastHistoryStage !== pipelineStage) {
    stageHistory.push({
      stage: pipelineStage,
      at: now,
      metadata: {
        source: "bid_outcome",
        outcome: input.outcome,
        contractValue: input.contractValue,
      },
    });
  }

  const patch: Record<string, unknown> = {
    current_stage: pipelineStage,
    project_id: pipelineProjectId ?? (current?.project_id as string | null) ?? null,
    imported_at: current?.imported_at ?? now,
    bid_created_at: current?.bid_created_at ?? now,
    submitted_at: input.submittedAt ?? (current?.submitted_at as string | null) ?? now,
    won_at: input.outcome === "won" ? input.decidedAt ?? now : null,
    lost_at: input.outcome === "lost" || input.outcome === "rejected" ? input.decidedAt ?? now : null,
    contract_value_won: input.outcome === "won" ? input.contractValue : null,
    stage_history: stageHistory,
  };

  await supabase
    .from("opportunity_pipeline")
    .update(patch)
    .eq("organization_id", input.organizationId)
    .eq("opportunity_id", resolvedOpportunityId);
}

async function refreshRecommendationEngineFromOutcomes(organizationId: string) {
  const supabase = createServiceSupabaseClient();
  if (!supabase) return;

  const [opportunitiesResponse, matchesResponse] = await Promise.all([
    supabase
      .from("opportunities")
      .select("id, source_key, source_names, external_id, dedupe_key, title, description, buyer_name, buyer_identifier, source_url, source_notice_number, locations, industry_tags, cpv_codes, currency, minimum_value, maximum_value, estimated_value, published_at, submission_deadline, opportunity_status, ai_summary")
      .eq("organization_id", organizationId),
    supabase
      .from("opportunity_matches")
      .select("id, opportunity_id, alert_id, relevance_score, win_probability, revenue_potential, combined_score, rationale, match_status, imported_project_id")
      .eq("organization_id", organizationId),
  ]);

  if (opportunitiesResponse.error || matchesResponse.error) return;

  const opportunities: OpportunityRecord[] = (opportunitiesResponse.data ?? []).map((row: any) => ({
    id: row.id as string,
    sourceKey: row.source_key as OpportunitySourceKey,
    sourceNames: (row.source_names ?? []) as string[],
    externalId: row.external_id as string,
    dedupeKey: row.dedupe_key as string,
    title: row.title as string,
    description: row.description as string,
    buyerName: row.buyer_name as string,
    buyerIdentifier: (row.buyer_identifier as string | null) ?? undefined,
    sourceUrl: (row.source_url as string | null) ?? undefined,
    sourceNoticeNumber: (row.source_notice_number as string | null) ?? undefined,
    locations: (row.locations ?? []) as string[],
    industryTags: (row.industry_tags ?? []) as string[],
    cpvCodes: (row.cpv_codes ?? []) as string[],
    currency: (row.currency as string) ?? "GBP",
    minimumValue: row.minimum_value as number | null,
    maximumValue: row.maximum_value as number | null,
    estimatedValue: row.estimated_value as number | null,
    publishedAt: row.published_at as string | null,
    submissionDeadline: row.submission_deadline as string | null,
    opportunityStatus: row.opportunity_status as string,
    aiSummary: (row.ai_summary as string | null) ?? undefined,
  }));

  const matches: OpportunityMatchRecord[] = (matchesResponse.data ?? []).map((row: any) => ({
    id: row.id as string,
    opportunityId: row.opportunity_id as string,
    alertId: row.alert_id as string,
    relevanceScore: Number(row.relevance_score ?? 0),
    winProbability: Number(row.win_probability ?? 0),
    revenuePotential: Number(row.revenue_potential ?? 0),
    combinedScore: Number(row.combined_score ?? 0),
    rationale: row.rationale as string,
    matchStatus: row.match_status as OpportunityMatchStatus,
    importedProjectId: (row.imported_project_id as string | null) ?? null,
  }));

  const learningContext = buildOutcomeLearningContext(await loadBidOutcomes(organizationId));
  for (const opportunity of opportunities) {
    const bestMatch = matches
      .filter((item) => item.opportunityId === opportunity.id)
      .sort((left, right) => right.combinedScore - left.combinedScore)[0];
    let roi = buildRevenueScoreHeuristics(opportunity, bestMatch, learningContext);
    let priority = buildOpportunityPriority(roi);
    roi = await recommendOpportunityWithAI({
      opportunity,
      match: bestMatch,
      roi,
      priority,
      learningContext,
    });
    priority = buildOpportunityPriority(roi);
    await upsertOpportunityRoiScore(organizationId, roi);
    await upsertOpportunityPriority(organizationId, priority);
  }
}

export async function saveBidOutcome(input: z.infer<typeof BidOutcomeUpsertSchema>) {
  const result = await upsertBidOutcome(input);

  if (input.organizationId) {
    await syncOpportunityPipelineFromOutcome(input);
    await refreshRecommendationEngineFromOutcomes(input.organizationId);
    if (input.outcome !== "submitted") {
      await recordPredictionOutcome({
        organizationId: input.organizationId,
        opportunityId: input.opportunityId ?? null,
        projectId: input.projectId ?? null,
        outcome: input.outcome,
      });
    }
  }

  await trackAuditEvent({
    action: "opportunities.bid_outcome_saved",
    entityType: "bid_outcome",
    organizationId: input.organizationId,
    entityId: result.id,
    metadata: {
      projectId: input.projectId ?? null,
      opportunityId: input.opportunityId ?? null,
      outcome: input.outcome,
      sector: input.sector,
      tenderType: input.tenderType,
    },
  });

  await trackAnalyticsEvent({
    organizationId: input.organizationId,
    projectId: input.projectId ?? undefined,
    eventName: "opportunities.bid_outcome_saved",
    metadata: {
      bidOutcomeId: result.id,
      opportunityId: input.opportunityId ?? null,
      outcome: input.outcome,
      competitorCount: input.competitorCount ?? null,
    },
  });

  return { ok: true, id: result.id };
}

export async function getBidOutcomeIntelligenceSnapshot(organizationId?: string): Promise<BidOutcomeIntelligenceSnapshot> {
  const outcomes = await loadBidOutcomes(organizationId);
  const trackableBids = await loadTrackableBids(organizationId);
  const decided = outcomes.filter((item) => item.outcome === "won" || item.outcome === "lost" || item.outcome === "rejected");
  const wins = outcomes.filter((item) => item.outcome === "won");
  const shortlisted = outcomes.filter((item) => item.outcome === "shortlisted");
  const rejected = outcomes.filter((item) => item.outcome === "rejected");
  const losses = outcomes.filter((item) => item.outcome === "lost" || item.outcome === "rejected");
  const sectorPatterns = buildOutcomePatterns(outcomes, (item) => item.sector);
  const clientPatterns = buildOutcomePatterns(outcomes, (item) => item.clientName);
  const insights = await generateOutcomeInsights(outcomes, sectorPatterns, clientPatterns);

  return {
    metrics: {
      submitted: outcomes.filter((item) => item.outcome === "submitted").length,
      shortlisted: shortlisted.length,
      rejected: rejected.length,
      won: wins.length,
      lost: losses.length,
      winRate: decided.length > 0 ? Math.round((wins.length / decided.length) * 100) : 0,
      averageContractValue: Math.round(average(outcomes.map((item) => item.contractValue))),
      revenueWon: wins.reduce((sum, item) => sum + item.contractValue, 0),
      revenueLost: losses.reduce((sum, item) => sum + item.contractValue, 0),
    },
    insights,
    sectorPatterns,
    clientPatterns,
    recentOutcomes: [...outcomes]
      .sort((left, right) => new Date(right.decidedAt ?? right.submittedAt ?? right.createdAt ?? 0).getTime() - new Date(left.decidedAt ?? left.submittedAt ?? left.createdAt ?? 0).getTime())
      .slice(0, 8),
    trackableBids,
  };
}

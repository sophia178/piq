import OpenAI from "openai";
import { z } from "zod";
import { env, hasOpenAIEnv } from "@/lib/env";
import { createServiceSupabaseClient, trackAuditEvent } from "@/lib/platform";

export type LinkedInRegion = "uk" | "us" | "canada" | "australia" | "eu";
export type LinkedInPersona =
  | "procurement_managers"
  | "bid_writers"
  | "consultants"
  | "construction_firms"
  | "it_consultancies";
export type LinkedInPillar =
  | "tender_tips"
  | "procurement_updates"
  | "winning_bid_examples"
  | "compliance_guidance"
  | "product_demonstrations";

export interface GrowthMetricSnapshot {
  impressions: number;
  clicks: number;
  signups: number;
  trials: number;
  paidConversions: number;
}

export interface LinkedInTopicHistory {
  topicKey: string;
  lastPublishedAt: string;
  paidConversions: number;
}

export interface GrowthPerformanceBenchmark {
  pillar: LinkedInPillar;
  region: LinkedInRegion;
  persona: LinkedInPersona;
  metrics: GrowthMetricSnapshot;
}

export interface LinkedInTopicCandidate {
  topicKey: string;
  title: string;
  angle: string;
  pillar: LinkedInPillar;
  region: LinkedInRegion;
  persona: LinkedInPersona;
  cta: string;
  hook: string;
  landingPage: string;
}

export interface LinkedInPlannedPost extends LinkedInTopicCandidate {
  id: string;
  publishAt: string;
  score: number;
  rationale: string;
  metrics: GrowthMetricSnapshot;
}

export interface GeneratedLinkedInPost extends LinkedInPlannedPost {
  copy: string;
  hashtags: string[];
  utmCampaign: string;
}

export const GrowthPlanSchema = z.object({
  organizationId: z.string().min(2).optional(),
  days: z.number().int().min(1).max(60).default(7),
  timezone: z.string().min(2).default("Europe/London"),
});

export const GrowthGenerateSchema = z.object({
  organizationId: z.string().min(2).optional(),
  topicKey: z.string().min(3),
  title: z.string().min(3),
  angle: z.string().min(10),
  pillar: z.enum(["tender_tips", "procurement_updates", "winning_bid_examples", "compliance_guidance", "product_demonstrations"]),
  region: z.enum(["uk", "us", "canada", "australia", "eu"]),
  persona: z.enum(["procurement_managers", "bid_writers", "consultants", "construction_firms", "it_consultancies"]),
  publishAt: z.string(),
  cta: z.string().min(3),
  hook: z.string().min(6),
  landingPage: z.string().min(3),
});

export const GrowthTrackSchema = z.object({
  organizationId: z.string().min(2).optional(),
  postId: z.string().min(2),
  topicKey: z.string().min(3),
  pillar: z.enum(["tender_tips", "procurement_updates", "winning_bid_examples", "compliance_guidance", "product_demonstrations"]),
  region: z.enum(["uk", "us", "canada", "australia", "eu"]),
  persona: z.enum(["procurement_managers", "bid_writers", "consultants", "construction_firms", "it_consultancies"]),
  impressions: z.number().int().min(0),
  clicks: z.number().int().min(0),
  signups: z.number().int().min(0),
  trials: z.number().int().min(0),
  paidConversions: z.number().int().min(0),
});

const pillarTargets: Record<LinkedInPillar, number> = {
  tender_tips: 0.3,
  procurement_updates: 0.2,
  winning_bid_examples: 0.2,
  compliance_guidance: 0.15,
  product_demonstrations: 0.15,
};

const pillarLabels: Record<LinkedInPillar, string> = {
  tender_tips: "Tender tips",
  procurement_updates: "Procurement updates",
  winning_bid_examples: "Winning bid examples",
  compliance_guidance: "Compliance guidance",
  product_demonstrations: "Product demonstrations",
};

const regionLabels: Record<LinkedInRegion, string> = {
  uk: "UK",
  us: "US",
  canada: "Canada",
  australia: "Australia",
  eu: "EU",
};

const personaLabels: Record<LinkedInPersona, string> = {
  procurement_managers: "Procurement managers",
  bid_writers: "Bid writers",
  consultants: "Consultants",
  construction_firms: "Construction firms",
  it_consultancies: "IT consultancies",
};

const personaPainPoints: Record<LinkedInPersona, string[]> = {
  procurement_managers: [
    "vendor responses are hard to compare",
    "non-compliant submissions create review risk",
    "scoring criteria are interpreted inconsistently",
  ],
  bid_writers: [
    "requirements get missed under deadline pressure",
    "evidence mapping slows first-draft production",
    "reusing old answers causes compliance gaps",
  ],
  consultants: [
    "clients need stronger win themes",
    "partner evidence is fragmented across teams",
    "cross-market procurement language differs by region",
  ],
  construction_firms: [
    "mandatory HSEQ evidence is scattered",
    "framework submissions need faster mobilisation narratives",
    "social value commitments are too generic",
  ],
  it_consultancies: [
    "security and delivery evidence must be current",
    "technical responses need clearer differentiation",
    "case studies are not mapped to scoring criteria",
  ],
};

const regionalAngles: Record<LinkedInRegion, string[]> = {
  uk: ["framework agreements", "social value commitments", "public sector procurement reform"],
  us: ["RFP evaluation committees", "federal and state procurement patterns", "past performance positioning"],
  canada: ["Crown procurement readiness", "bilingual proposal workflows", "indigenous procurement priorities"],
  australia: ["panel refresh cycles", "value-for-money evaluation", "local industry participation"],
  eu: ["cross-border procurement compliance", "framework lot strategy", "ESG and public value scoring"],
};

const pillarAngleLibrary: Record<LinkedInPillar, string[]> = {
  tender_tips: [
    "how to map every evaluator question to a named evidence source",
    "how to build a first-pass response in hours, not days",
    "how to avoid last-minute compliance gaps in final review",
  ],
  procurement_updates: [
    "what changing procurement rules mean for suppliers",
    "how new buyer behavior changes response strategy",
    "which market shifts should reshape bid planning this quarter",
  ],
  winning_bid_examples: [
    "the structure behind a high-scoring executive summary",
    "why evidence-rich methodology answers outperform generic claims",
    "how a quantified case study can lift evaluator confidence",
  ],
  compliance_guidance: [
    "which mandatory documents most often block submission readiness",
    "how to score internal bid readiness before sign-off",
    "where compliance reviews break down under deadline pressure",
  ],
  product_demonstrations: [
    "how BidPilot AI extracts requirements from large tender packs",
    "how compliance scoring surfaces blockers before submission day",
    "how grounded drafting accelerates proposal reviews",
  ],
};

const callToActions: Record<LinkedInPillar, string> = {
  tender_tips: "Book a BidPilot AI workflow demo to cut drafting time before your next deadline.",
  procurement_updates: "Start a trial to turn procurement updates into a reusable bid playbook.",
  winning_bid_examples: "See how BidPilot AI turns proven answers into a searchable response library.",
  compliance_guidance: "Run a submission-readiness review with BidPilot AI before final sign-off.",
  product_demonstrations: "Start a free trial and see the platform draft, check, and organize your next bid.",
};

const landingPages: Record<LinkedInPillar, string> = {
  tender_tips: "/signup?intent=tender-tips",
  procurement_updates: "/signup?intent=procurement-updates",
  winning_bid_examples: "/signup?intent=winning-examples",
  compliance_guidance: "/signup?intent=compliance-guidance",
  product_demonstrations: "/signup?intent=product-demo",
};

export const demoTopicHistory: LinkedInTopicHistory[] = [
  { topicKey: "uk-procurement_managers-tender_tips-framework-agreements-0", lastPublishedAt: "2026-06-10T09:00:00.000Z", paidConversions: 2 },
  { topicKey: "us-it_consultancies-winning_bid_examples-past-performance-positioning-1", lastPublishedAt: "2026-06-08T14:00:00.000Z", paidConversions: 4 },
  { topicKey: "eu-bid_writers-compliance_guidance-cross-border-procurement-compliance-1", lastPublishedAt: "2026-06-02T11:30:00.000Z", paidConversions: 1 },
];

export const demoGrowthMetrics: GrowthMetricSnapshot = {
  impressions: 188400,
  clicks: 6240,
  signups: 402,
  trials: 118,
  paidConversions: 36,
};

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function setUtcHour(date: Date, hour: number) {
  const copy = new Date(date);
  copy.setUTCHours(hour, 0, 0, 0);
  return copy;
}

function daysBetween(dateA: Date, dateB: Date) {
  return Math.floor((dateA.getTime() - dateB.getTime()) / (1000 * 60 * 60 * 24));
}

function ratioFor(metrics: GrowthMetricSnapshot, field: keyof GrowthMetricSnapshot, base: keyof GrowthMetricSnapshot) {
  const denominator = Math.max(metrics[base], 1);
  return metrics[field] / denominator;
}

export function scoreGrowthOutcome(metrics: GrowthMetricSnapshot) {
  return metrics.paidConversions * 25 + metrics.trials * 8 + metrics.signups * 3 + metrics.clicks * 0.08 + metrics.impressions * 0.002;
}

function buildHistoricalPerformanceByDimension(): GrowthPerformanceBenchmark[] {
  const benchmarkSeed: GrowthPerformanceBenchmark[] = [
    {
      pillar: "product_demonstrations",
      region: "uk",
      persona: "bid_writers",
      metrics: { impressions: 22000, clicks: 840, signups: 54, trials: 19, paidConversions: 7 },
    },
    {
      pillar: "winning_bid_examples",
      region: "us",
      persona: "it_consultancies",
      metrics: { impressions: 19000, clicks: 720, signups: 39, trials: 14, paidConversions: 6 },
    },
    {
      pillar: "tender_tips",
      region: "australia",
      persona: "construction_firms",
      metrics: { impressions: 17000, clicks: 610, signups: 32, trials: 11, paidConversions: 4 },
    },
    {
      pillar: "compliance_guidance",
      region: "eu",
      persona: "procurement_managers",
      metrics: { impressions: 15000, clicks: 470, signups: 28, trials: 10, paidConversions: 5 },
    },
    {
      pillar: "procurement_updates",
      region: "canada",
      persona: "consultants",
      metrics: { impressions: 14200, clicks: 430, signups: 19, trials: 7, paidConversions: 2 },
    },
  ];

  return benchmarkSeed;
}

export function buildLinkedInTopicUniverse() {
  const candidates: LinkedInTopicCandidate[] = [];
  const regions = Object.keys(regionLabels) as LinkedInRegion[];
  const personas = Object.keys(personaLabels) as LinkedInPersona[];
  const pillars = Object.keys(pillarLabels) as LinkedInPillar[];

  regions.forEach((region) => {
    personas.forEach((persona) => {
      pillars.forEach((pillar) => {
        regionalAngles[region].forEach((regionalAngle, angleIndex) => {
          pillarAngleLibrary[pillar].forEach((libraryAngle, libraryIndex) => {
            const topicKey = `${region}-${persona}-${pillar}-${regionalAngle.replace(/\s+/g, "-").toLowerCase()}-${libraryIndex}-${angleIndex}`;
            candidates.push({
              topicKey,
              title: `${pillarLabels[pillar]} for ${regionLabels[region]} ${personaLabels[persona]}`,
              angle: `${libraryAngle} with a focus on ${regionalAngle} and the buyer challenge that ${personaPainPoints[persona][(angleIndex + libraryIndex) % personaPainPoints[persona].length]}.`,
              pillar,
              region,
              persona,
              cta: callToActions[pillar],
              hook: `What if your ${regionLabels[region]} bid team could turn ${regionalAngle} into a conversion-ready LinkedIn narrative?`,
              landingPage: landingPages[pillar],
            });
          });
        });
      });
    });
  });

  return candidates;
}

function chooseNextPillar(currentCounts: Record<LinkedInPillar, number>, totalScheduled: number) {
  const pillars = Object.keys(pillarTargets) as LinkedInPillar[];
  return pillars
    .map((pillar) => {
      const targetCount = pillarTargets[pillar] * (totalScheduled + 1);
      return { pillar, deficit: targetCount - currentCounts[pillar] };
    })
    .sort((a, b) => b.deficit - a.deficit)[0].pillar;
}

function buildSlotTimes(startDate: Date, days: number) {
  const hours = [8, 10, 12, 14, 16, 18, 20, 22];
  const slots: Date[] = [];

  for (let day = 0; day < days; day += 1) {
    const base = addDays(startDate, day);
    hours.forEach((hour) => slots.push(setUtcHour(base, hour)));
  }

  return slots;
}

function findRecentTopicMap(history: LinkedInTopicHistory[], today = new Date()) {
  return new Map(
    history
      .filter((item) => daysBetween(today, new Date(item.lastPublishedAt)) <= 60)
      .map((item) => [item.topicKey, item]),
  );
}

function scoreCandidate(candidate: LinkedInTopicCandidate, benchmarks: GrowthPerformanceBenchmark[]) {
  const exact = benchmarks.find(
    (item) => item.pillar === candidate.pillar && item.region === candidate.region && item.persona === candidate.persona,
  );
  const pillarAverage = benchmarks.filter((item) => item.pillar === candidate.pillar);
  const pillarBase =
    pillarAverage.reduce((sum, item) => sum + scoreGrowthOutcome(item.metrics), 0) / Math.max(pillarAverage.length, 1);
  const conversionBias = exact ? scoreGrowthOutcome(exact.metrics) : pillarBase;
  const paidConversionRate = exact ? ratioFor(exact.metrics, "paidConversions", "clicks") : 0.007;
  return conversionBias + paidConversionRate * 1000;
}

export function buildLinkedInGrowthPlan({
  days = 7,
  history = demoTopicHistory,
  performanceBenchmarks = buildHistoricalPerformanceByDimension(),
  startDate = new Date("2026-06-24T00:00:00.000Z"),
}: {
  days?: number;
  history?: LinkedInTopicHistory[];
  performanceBenchmarks?: GrowthPerformanceBenchmark[];
  startDate?: Date;
}) {
  const slots = buildSlotTimes(startDate, days);
  const recentTopics = findRecentTopicMap(history, startDate);
  const pillarCounts: Record<LinkedInPillar, number> = {
    tender_tips: 0,
    procurement_updates: 0,
    winning_bid_examples: 0,
    compliance_guidance: 0,
    product_demonstrations: 0,
  };
  const scheduled: LinkedInPlannedPost[] = [];
  const usedTopicsInPlan = new Set<string>();
  const universe = buildLinkedInTopicUniverse();

  slots.forEach((slot, index) => {
    const targetPillar = chooseNextPillar(pillarCounts, index);
    const candidates = universe
      .filter((candidate) => candidate.pillar === targetPillar)
      .filter((candidate) => !recentTopics.has(candidate.topicKey))
      .filter((candidate) => !usedTopicsInPlan.has(candidate.topicKey))
      .map((candidate) => ({ ...candidate, score: scoreCandidate(candidate, performanceBenchmarks) }))
      .sort((a, b) => b.score - a.score);

    const selected = candidates[index % Math.max(candidates.length, 1)] ?? {
      ...universe[index % universe.length],
      score: 10,
    };

    const post: LinkedInPlannedPost = {
      id: `post_${index + 1}`,
      ...selected,
      publishAt: slot.toISOString(),
      score: selected.score,
      rationale: `Prioritized for ${personaLabels[selected.persona]} in ${regionLabels[selected.region]} because this combination shows stronger paid-conversion potential than engagement-only patterns.`,
      metrics: {
        impressions: Math.round(selected.score * 8),
        clicks: Math.round(selected.score * 0.28),
        signups: Math.round(selected.score * 0.03),
        trials: Math.round(selected.score * 0.012),
        paidConversions: Math.max(1, Math.round(selected.score * 0.004)),
      },
    };

    scheduled.push(post);
    usedTopicsInPlan.add(post.topicKey);
    pillarCounts[post.pillar] += 1;
  });

  return scheduled;
}

async function loadOrganizationTopicHistory(organizationId?: string): Promise<LinkedInTopicHistory[]> {
  if (!organizationId) return demoTopicHistory;

  const supabase = createServiceSupabaseClient();
  if (!supabase) return demoTopicHistory;

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 60);

  const { data, error } = await supabase
    .from("linkedin_posts")
    .select("topic_key, published_at")
    .eq("organization_id", organizationId)
    .gte("published_at", since.toISOString())
    .order("published_at", { ascending: false })
    .limit(500);

  if (error || !data) return demoTopicHistory;

  const rows = data as Array<{ topic_key: string | null; published_at: string | null }>;

  return rows
    .filter((item: { topic_key: string | null; published_at: string | null }) => Boolean(item.topic_key && item.published_at))
    .map((item: { topic_key: string | null; published_at: string | null }) => ({
      topicKey: item.topic_key as string,
      lastPublishedAt: item.published_at as string,
      paidConversions: 0,
    }));
}

async function loadOrganizationPerformanceBenchmarks(organizationId?: string): Promise<GrowthPerformanceBenchmark[]> {
  if (!organizationId) return buildHistoricalPerformanceByDimension();

  const supabase = createServiceSupabaseClient();
  if (!supabase) return buildHistoricalPerformanceByDimension();

  const { data, error } = await supabase
    .from("linkedin_post_performance")
    .select("pillar, region, persona, impressions, clicks, signups, trials, paid_conversions")
    .eq("organization_id", organizationId)
    .order("captured_at", { ascending: false })
    .limit(500);

  if (error || !data || data.length === 0) {
    return buildHistoricalPerformanceByDimension();
  }

  const grouped = new Map<string, GrowthPerformanceBenchmark[]>();
  const rows = data as Array<{
    pillar: string | null;
    region: string | null;
    persona: string | null;
    impressions: number | null;
    clicks: number | null;
    signups: number | null;
    trials: number | null;
    paid_conversions: number | null;
  }>;

  rows.forEach((row) => {
    const key = `${row.pillar}-${row.region}-${row.persona}`;
    const entry: GrowthPerformanceBenchmark = {
      pillar: row.pillar as LinkedInPillar,
      region: row.region as LinkedInRegion,
      persona: row.persona as LinkedInPersona,
      metrics: {
        impressions: Number(row.impressions ?? 0),
        clicks: Number(row.clicks ?? 0),
        signups: Number(row.signups ?? 0),
        trials: Number(row.trials ?? 0),
        paidConversions: Number(row.paid_conversions ?? 0),
      },
    };
    grouped.set(key, [...(grouped.get(key) ?? []), entry]);
  });

  const normalized = Array.from(grouped.values()).map((entries) => {
    const sample = entries[0];
    const totals = entries.reduce(
      (acc, item) => ({
        impressions: acc.impressions + item.metrics.impressions,
        clicks: acc.clicks + item.metrics.clicks,
        signups: acc.signups + item.metrics.signups,
        trials: acc.trials + item.metrics.trials,
        paidConversions: acc.paidConversions + item.metrics.paidConversions,
      }),
      { impressions: 0, clicks: 0, signups: 0, trials: 0, paidConversions: 0 },
    );

    return {
      pillar: sample.pillar,
      region: sample.region,
      persona: sample.persona,
      metrics: {
        impressions: Math.round(totals.impressions / entries.length),
        clicks: Math.round(totals.clicks / entries.length),
        signups: Math.round(totals.signups / entries.length),
        trials: Math.round(totals.trials / entries.length),
        paidConversions: Math.round(totals.paidConversions / entries.length),
      },
    };
  });

  return [...normalized, ...buildHistoricalPerformanceByDimension()];
}

export async function planLinkedInGrowthCampaign({
  organizationId,
  days = 7,
}: {
  organizationId?: string;
  days?: number;
}) {
  const [history, performanceBenchmarks] = await Promise.all([
    loadOrganizationTopicHistory(organizationId),
    loadOrganizationPerformanceBenchmarks(organizationId),
  ]);

  return buildLinkedInGrowthPlan({ days, history, performanceBenchmarks });
}

async function readPrompt(promptFile: string) {
  const { readFile } = await import("node:fs/promises");
  const { join } = await import("node:path");
  return readFile(join(process.cwd(), "src", "prompts", promptFile), "utf8");
}

export async function generateLinkedInPost(post: z.infer<typeof GrowthGenerateSchema>): Promise<GeneratedLinkedInPost> {
  const prompt = await readPrompt("linkedin-growth-engine.md");
  const hashtags = [
    "#Procurement",
    "#BidManagement",
    "#Tendering",
    `#${regionLabels[post.region].replace(/\s+/g, "")}`,
    "#BidPilotAI",
  ];

  if (!hasOpenAIEnv()) {
    return {
      ...post,
      id: `generated_${post.topicKey}`,
      score: 0,
      rationale: "Deterministic fallback output because OpenAI is not configured.",
      metrics: { impressions: 0, clicks: 0, signups: 0, trials: 0, paidConversions: 0 },
      copy: `${post.hook}\n\n${post.title}: ${post.angle}\n\nFor ${personaLabels[post.persona]} working across the ${regionLabels[post.region]} market, this post shows how to turn procurement complexity into a repeatable bid workflow. Focus on the blocker, show the process, and end with a clear next step.\n\n${post.cta}`,
      hashtags,
      utmCampaign: `linkedin-${post.region}-${post.pillar}`,
    };
  }

  const client = new OpenAI({ apiKey: env.openAiApiKey });
  const response = await client.responses.create({
    model: "gpt-4.1",
    input: [
      { role: "system", content: prompt },
      {
        role: "user",
        content: JSON.stringify({
          post,
          objective: "maximize paid conversions from LinkedIn content for BidPilot AI",
          metricsToOptimize: ["paidConversions", "trials", "signups"],
        }),
      },
    ],
  });

  return {
    ...post,
    id: `generated_${post.topicKey}`,
    score: 0,
    rationale: "Generated with paid-conversion-first prompt strategy.",
    metrics: { impressions: 0, clicks: 0, signups: 0, trials: 0, paidConversions: 0 },
    copy: response.output_text || `${post.hook}\n\n${post.angle}\n\n${post.cta}`,
    hashtags,
    utmCampaign: `linkedin-${post.region}-${post.pillar}`,
  };
}

export async function trackLinkedInPerformance(input: z.infer<typeof GrowthTrackSchema>) {
  const supabase = createServiceSupabaseClient();

  if (supabase) {
    await supabase.from("linkedin_post_performance").insert({
      organization_id: input.organizationId ?? null,
      linkedin_post_id: input.postId,
      topic_key: input.topicKey,
      pillar: input.pillar,
      region: input.region,
      persona: input.persona,
      impressions: input.impressions,
      clicks: input.clicks,
      signups: input.signups,
      trials: input.trials,
      paid_conversions: input.paidConversions,
      optimization_score: scoreGrowthOutcome({
        impressions: input.impressions,
        clicks: input.clicks,
        signups: input.signups,
        trials: input.trials,
        paidConversions: input.paidConversions,
      }),
    });
  }

  await trackAuditEvent({
    action: "growth.linkedin.performance_tracked",
    entityType: "linkedin_post",
    entityId: input.postId,
    metadata: input,
  });

  return { ok: true };
}

export function getGrowthEngineSnapshot() {
  const plannedPosts = buildLinkedInGrowthPlan({ days: 7 });
  const topPatterns = plannedPosts
    .slice()
    .sort((a, b) => b.metrics.paidConversions - a.metrics.paidConversions)
    .slice(0, 5)
    .map((post) => ({
      label: `${pillarLabels[post.pillar]} • ${regionLabels[post.region]} • ${personaLabels[post.persona]}`,
      paidConversions: post.metrics.paidConversions,
      trials: post.metrics.trials,
      clickToPaidRate: `${((post.metrics.paidConversions / Math.max(post.metrics.clicks, 1)) * 100).toFixed(1)}%`,
    }));

  const mixSummary = (Object.keys(pillarLabels) as LinkedInPillar[]).map((pillar) => ({
    pillar,
    label: pillarLabels[pillar],
    target: pillarTargets[pillar],
    scheduled: plannedPosts.filter((item) => item.pillar === pillar).length,
  }));

  return {
    dailyPostTarget: 8,
    optimizationGoal: "Paid conversions",
    repetitionWindowDays: 60,
    audiences: Object.values(personaLabels),
    regions: Object.values(regionLabels),
    metrics: demoGrowthMetrics,
    mixSummary,
    plannedPosts,
    topPatterns,
  };
}

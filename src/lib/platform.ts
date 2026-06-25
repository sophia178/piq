import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createBrowserClient, createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { Document, Packer, Paragraph, TextRun } from "docx";
import mammoth from "mammoth";
import OpenAI from "openai";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import pdfParse from "pdf-parse";
import Stripe from "stripe";
import { z } from "zod";
import { env, hasOpenAIEnv, hasStripeEnv, hasSupabaseEnv } from "@/lib/env";
import { recordKnowledgeUsage, retrieveRelevantKnowledge } from "@/lib/knowledge";

export type PlanTier = "starter" | "professional" | "agency";
export type ProjectStatus = "draft" | "analyzing" | "in_progress" | "review" | "submitted" | "archived";

export interface ProjectSummary {
  id: string;
  title: string;
  tenderName: string;
  issuingBody: string;
  submissionDeadline: string;
  estimatedContractValue?: number;
  status: ProjectStatus;
  readinessScore: number;
}

export interface RequirementItem {
  id: string;
  heading: string;
  requirement: string;
  mandatory: boolean;
  owner?: string;
  responseStatus: "todo" | "drafted" | "complete";
}

export interface GeneratedResponse {
  section: string;
  content: string;
  sourceReferences: string[];
  supportingEvidence: string[];
  confidence: number;
}

export interface ComplianceSnapshot {
  readinessScore: number;
  missingInformation: string[];
  riskWarnings: string[];
  checklist: Array<{ label: string; status: "complete" | "warning" | "missing" }>;
}

export interface OrganizationProfile {
  id: string;
  companyName: string;
  industry: string;
  website: string;
  employeeCount: string;
  certifications: string[];
  location: string;
}

export const AuthSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  companyName: z.string().min(2).optional(),
});

export const TenderUploadSchema = z.object({
  projectId: z.string().uuid().or(z.string().min(3)),
  title: z.string().min(3),
  issuingBody: z.string().min(2),
});

export const WorkspaceGenerationSchema = z.object({
  projectId: z.string().uuid().or(z.string().min(3)),
  requirementIds: z.array(z.string()).min(1),
  tone: z.enum(["formal", "confident", "technical"]).default("formal"),
});

export const ExportSchema = z.object({
  projectTitle: z.string().min(3),
  format: z.enum(["pdf", "docx"]),
  content: z.string().min(20),
});

export const planCatalog: Array<{ tier: PlanTier; price: string; monthlyTenderLimit: number | null; priceId?: string }> = [
  { tier: "starter", price: "149", monthlyTenderLimit: 5, priceId: env.stripeSoloPriceId },
  { tier: "professional", price: "399", monthlyTenderLimit: 25, priceId: env.stripeSmePriceId },
  { tier: "agency", price: "799", monthlyTenderLimit: null, priceId: env.stripeAgencyPriceId },
];

export const demoOrganization: OrganizationProfile = {
  id: "org_demo",
  companyName: "Northstar Infrastructure Ltd",
  industry: "Construction Technology",
  website: "https://northstar.example.com",
  employeeCount: "201-500",
  certifications: ["ISO 9001", "ISO 27001", "Cyber Essentials Plus"],
  location: "London, UK",
};

export const demoProjects: ProjectSummary[] = [
  {
    id: "proj_1",
    title: "NHS Digital Transformation Framework",
    tenderName: "Digital Transformation Delivery Partner",
    issuingBody: "NHS Shared Business Services",
    submissionDeadline: "2026-07-18T17:00:00.000Z",
    estimatedContractValue: 2400000,
    status: "review",
    readinessScore: 82,
  },
  {
    id: "proj_2",
    title: "Smart Mobility Analytics Platform",
    tenderName: "Local Authority Smart Mobility RFQ",
    issuingBody: "Greater Manchester Combined Authority",
    submissionDeadline: "2026-06-29T12:00:00.000Z",
    estimatedContractValue: 780000,
    status: "in_progress",
    readinessScore: 68,
  },
  {
    id: "proj_3",
    title: "Net Zero Capability Delivery",
    tenderName: "ESG Advisory Services Grant",
    issuingBody: "Innovate UK",
    submissionDeadline: "2026-08-02T23:59:00.000Z",
    estimatedContractValue: 350000,
    status: "analyzing",
    readinessScore: 41,
  },
];

export const demoRequirements: RequirementItem[] = [
  {
    id: "req_1",
    heading: "Technical capability",
    requirement: "Demonstrate delivery of at least three enterprise transformation programmes within the last five years.",
    mandatory: true,
    owner: "Delivery Director",
    responseStatus: "drafted",
  },
  {
    id: "req_2",
    heading: "Data security",
    requirement: "Provide evidence of ISO 27001 certification and secure data handling controls.",
    mandatory: true,
    owner: "Security Lead",
    responseStatus: "complete",
  },
  {
    id: "req_3",
    heading: "Social value",
    requirement: "Outline measurable apprenticeships, local hiring, and carbon reduction commitments.",
    mandatory: false,
    owner: "ESG Manager",
    responseStatus: "todo",
  },
];

export const demoCompliance: ComplianceSnapshot = {
  readinessScore: 82,
  missingInformation: [
    "Updated insurance schedule exceeding £10m professional indemnity cover",
    "Named subcontractor cyber security attestations",
  ],
  riskWarnings: [
    "Case study evidence is credible but not mapped to quantified healthcare outcomes.",
    "Social value draft lacks borough-specific targets and named delivery partners.",
  ],
  checklist: [
    { label: "Mandatory certifications uploaded", status: "complete" },
    { label: "Pricing schedule reviewed", status: "warning" },
    { label: "Executive sign-off ready", status: "missing" },
  ],
};

export const demoResponses: GeneratedResponse[] = [
  {
    section: "Executive Summary",
    content:
      "Northstar Infrastructure Ltd provides a low-risk delivery model for complex transformation procurements, pairing regulated-sector delivery experience with ISO-accredited governance and measurable service improvement outcomes.",
    sourceReferences: ["Healthcare Framework Case Study 2025", "ISO 27001 Certificate"],
    supportingEvidence: [
      "Regional healthcare transformation programme with quantified service improvements.",
      "ISO 27001 certification covering secure delivery controls.",
    ],
    confidence: 92,
  },
  {
    section: "Technical Response",
    content:
      "Our delivery model spans mobilisation, discovery, service design, implementation, and transition. Each stage is governed through weekly RAID reviews, benefits-tracking checkpoints, and named workstream accountability.",
    sourceReferences: ["PMO Methodology Policy", "Integrated Mobilisation Playbook"],
    supportingEvidence: ["Weekly RAID review cadence and named workstream accountability."],
    confidence: 88,
  },
  {
    section: "Social Value Response",
    content:
      "BidPilot recommends enriching this answer with location-specific apprenticeships, local SME spend, and carbon reporting baselines before final submission.",
    sourceReferences: ["ESG Impact Report 2025"],
    supportingEvidence: ["Existing ESG report provides broad impact data but lacks local targets."],
    confidence: 73,
  },
];

export function createBrowserSupabaseClient() {
  if (!hasSupabaseEnv()) return null;

  return createBrowserClient(env.supabaseUrl!, env.supabaseAnonKey!);
}

export async function createServerSupabaseClient() {
  if (!hasSupabaseEnv()) return null;

  const cookieStore = await cookies();

  return createServerClient(env.supabaseUrl!, env.supabaseAnonKey!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(entries: Array<{ name: string; value: string; options?: Parameters<typeof cookieStore.set>[2] }>) {
        entries.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
      },
    },
  });
}

export async function getActiveOrganizationContext(): Promise<OrganizationProfile> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return demoOrganization;

  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) {
    redirect("/login");
  }

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userData.user.id)
    .limit(1)
    .maybeSingle();

  const organizationId = (membership?.organization_id as string | undefined) ?? null;
  if (!organizationId) {
    redirect("/onboarding?step=2");
  }

  const { data } = await supabase
    .from("organizations")
    .select("id, company_name, industry, website, employee_count, certifications, location")
    .eq("id", organizationId)
    .limit(1)
    .maybeSingle();

  if (!data) {
    redirect("/onboarding?step=2");
  }

  return {
    id: data.id as string,
    companyName: data.company_name as string,
    industry: (data.industry as string | null) ?? demoOrganization.industry,
    website: (data.website as string | null) ?? demoOrganization.website,
    employeeCount: (data.employee_count as string | null) ?? demoOrganization.employeeCount,
    certifications: Array.isArray(data.certifications) ? (data.certifications as string[]) : demoOrganization.certifications,
    location: (data.location as string | null) ?? demoOrganization.location,
  };
}

export function createServiceSupabaseClient() {
  if (!hasSupabaseEnv() || !env.supabaseServiceRoleKey) return null;

  return createClient(env.supabaseUrl!, env.supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function extractTextFromFile(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const lowerName = file.name.toLowerCase();

  if (lowerName.endsWith(".txt")) {
    return buffer.toString("utf8");
  }

  if (lowerName.endsWith(".docx")) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (lowerName.endsWith(".pdf")) {
    const result = await pdfParse(buffer);
    return result.text;
  }

  throw new Error("Unsupported file type. Allowed file types: PDF, DOCX, TXT.");
}

export function heuristicRequirementExtraction(text: string): RequirementItem[] {
  const lines = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 20)
    .slice(0, 12);

  if (lines.length === 0) {
    return demoRequirements;
  }

  return lines.map((line, index) => ({
    id: `req_${index + 1}`,
    heading: `Requirement ${index + 1}`,
    requirement: line,
    mandatory: /must|required|mandatory|shall|essential/i.test(line),
    owner: index % 2 === 0 ? "Bid Manager" : "SME",
    responseStatus: index % 3 === 0 ? "drafted" : "todo",
  }));
}

export function buildComplianceSnapshot(requirements: RequirementItem[]): ComplianceSnapshot {
  const mandatory = requirements.filter((item) => item.mandatory);
  const completed = requirements.filter((item) => item.responseStatus === "complete").length;
  const drafted = requirements.filter((item) => item.responseStatus === "drafted").length;
  const readinessScore = Math.min(98, Math.round(((completed * 1.2 + drafted * 0.8) / Math.max(requirements.length, 1)) * 100));

  return {
    readinessScore,
    missingInformation: mandatory.slice(0, 2).map((item) => `Evidence pack missing for "${item.heading}"`),
    riskWarnings: mandatory.slice(0, 2).map((item) => `Mandatory criterion "${item.heading}" needs fully referenced evidence.`),
    checklist: [
      { label: "Requirement extraction complete", status: "complete" },
      { label: "Mandatory criteria reviewed", status: mandatory.length > 0 ? "warning" : "complete" },
      { label: "Executive sign-off ready", status: readinessScore > 85 ? "complete" : "missing" },
    ],
  };
}

async function readPrompt(promptFile: string) {
  const { readFile } = await import("node:fs/promises");
  const { join } = await import("node:path");
  return readFile(join(process.cwd(), "src", "prompts", promptFile), "utf8");
}

export async function runTenderAnalysis(text: string) {
  const requirements = heuristicRequirementExtraction(text);
  const compliance = buildComplianceSnapshot(requirements);
  const responseDrafts = demoResponses;

  if (!hasOpenAIEnv()) {
    return {
      summary: "OpenAI key not configured. Falling back to deterministic extraction and drafting.",
      requirements,
      compliance,
      responses: responseDrafts,
    };
  }

  const prompt = await readPrompt("tender-analysis.md");
  const client = new OpenAI({ apiKey: env.openAiApiKey });
  const response = await client.responses.create({
    model: "gpt-4.1",
    input: [
      { role: "system", content: prompt },
      { role: "user", content: `Analyse the following tender text and extract structured requirements.\n\n${text.slice(0, 15000)}` },
    ],
  });

  return {
    summary: response.output_text || "Tender analysis completed.",
    requirements,
    compliance,
    responses: responseDrafts,
  };
}

export async function generateWorkspaceResponses(input: z.infer<typeof WorkspaceGenerationSchema>) {
  const supabase = createServiceSupabaseClient();
  let selectedRequirements = demoRequirements.filter((item) => input.requirementIds.includes(item.id));
  let organizationId: string | undefined;
  let projectTitle = demoProjects[0].tenderName;
  let knowledgeQueryContext = selectedRequirements.map((item) => `${item.heading}: ${item.requirement}`).join("\n");

  if (supabase) {
    const [{ data: project }, { data: requirementRows }] = await Promise.all([
      supabase
        .from("projects")
        .select("organization_id, tender_name")
        .eq("id", input.projectId)
        .maybeSingle(),
      supabase
        .from("requirements")
        .select("id, heading, requirement, mandatory, owner_name, response_status")
        .in("id", input.requirementIds),
    ]);

    if (project) {
      organizationId = project.organization_id as string;
      projectTitle = (project.tender_name as string) ?? projectTitle;
    }

    if (requirementRows && requirementRows.length > 0) {
      selectedRequirements = requirementRows.map((item: any) => ({
        id: item.id as string,
        heading: item.heading as string,
        requirement: item.requirement as string,
        mandatory: Boolean(item.mandatory),
        owner: (item.owner_name as string | null) ?? undefined,
        responseStatus: item.response_status as RequirementItem["responseStatus"],
      }));
      knowledgeQueryContext = selectedRequirements.map((item) => `${item.heading}: ${item.requirement}`).join("\n");
    }
  }

  const knowledgeHits = await retrieveRelevantKnowledge({
    organizationId,
    query: `${projectTitle}\n${knowledgeQueryContext}`,
    topK: 5,
  });
  const knowledgeCitations = knowledgeHits.map((item) => item.sourceLabel);
  const knowledgeEvidence = knowledgeHits.map((item) => `- ${item.sourceLabel}: ${item.content.slice(0, 320)}`).join("\n");
  const prompt = await readPrompt("technical-response-generation.md");

  if (!hasOpenAIEnv()) {
    const responses = selectedRequirements.map((item) => ({
      section: item.heading,
      content: `Draft response for ${item.heading}: demonstrate delivery controls, evidence, named owners, quantified benefits, and alignment to the issuing body's objectives. Ground the answer in organisation evidence including ${knowledgeCitations.join(", ") || "available internal knowledge assets"}.`,
      sourceReferences: knowledgeCitations.length > 0 ? knowledgeCitations : ["Knowledge Base"],
      supportingEvidence: knowledgeHits.map((hit) => hit.supportingEvidence),
      confidence: 74,
      promptUsed: prompt,
    }));

    await recordKnowledgeUsage({
      organizationId,
      projectId: input.projectId,
      documentIds: knowledgeHits.map((item) => item.knowledgeDocumentId),
      sectionName: selectedRequirements.map((item) => item.heading).join(", "),
      generationType: "workspace_generation",
      chunkHits: knowledgeHits,
      confidenceScore: 74,
    });

    return responses;
  }

  const client = new OpenAI({ apiKey: env.openAiApiKey });
  const output = await client.responses.create({
    model: "gpt-4.1",
    input: [
      { role: "system", content: prompt },
      {
        role: "user",
        content: `Generate polished tender response sections in a ${input.tone} tone for these requirements:\n${selectedRequirements
          .map((item) => `- ${item.heading}: ${item.requirement}`)
          .join("\n")}\n\nUse this organisation knowledge automatically and cite it naturally in the response:\n${knowledgeEvidence || "- No indexed knowledge available."}`,
      },
    ],
  });

  const responses = selectedRequirements.map((item) => ({
    section: item.heading,
    content: output.output_text || `Structured response generated for ${item.heading}.`,
    sourceReferences: knowledgeCitations.length > 0 ? knowledgeCitations : ["Knowledge Base"],
    supportingEvidence: knowledgeHits.map((hit) => hit.supportingEvidence),
    confidence: 89,
    promptUsed: prompt,
  }));

  await recordKnowledgeUsage({
    organizationId,
    projectId: input.projectId,
    documentIds: knowledgeHits.map((item) => item.knowledgeDocumentId),
    sectionName: selectedRequirements.map((item) => item.heading).join(", "),
    generationType: "workspace_generation",
    chunkHits: knowledgeHits,
    confidenceScore: 89,
  });

  return responses;
}

export async function trackAuditEvent(event: {
  action: string;
  entityType: string;
  entityId?: string;
  organizationId?: string;
  actorId?: string;
  metadata?: Record<string, unknown>;
}) {
  const supabase = createServiceSupabaseClient();
  if (!supabase) return;

  await supabase.from("audit_logs").insert({
    action: event.action,
    entity_type: event.entityType,
    entity_id: event.entityId ?? null,
    organization_id: event.organizationId ?? null,
    actor_id: event.actorId ?? null,
    metadata: event.metadata ?? {},
  });
}

export async function createCheckoutSession(input: { tier: PlanTier; organizationId: string; userId: string }) {
  if (!hasStripeEnv()) {
    return { url: `${env.appUrl}/billing?mode=demo&tier=${input.tier}` };
  }

  const plan = planCatalog.find((item) => item.tier === input.tier);
  if (!plan?.priceId) {
    throw new Error(`Missing Stripe price id for ${input.tier}.`);
  }

  const stripe = new Stripe(env.stripeSecretKey!);
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: plan.priceId, quantity: 1 }],
    client_reference_id: input.organizationId,
    metadata: {
      organization_id: input.organizationId,
      user_id: input.userId,
      tier: input.tier,
    },
    subscription_data: {
      metadata: {
        organization_id: input.organizationId,
        user_id: input.userId,
        tier: input.tier,
      },
    },
    success_url: `${env.appUrl}/onboarding?step=4&status=success`,
    cancel_url: `${env.appUrl}/onboarding?step=3&status=cancelled`,
  });

  return { url: session.url };
}

export async function exportProjectDocument(input: z.infer<typeof ExportSchema>) {
  if (input.format === "docx") {
    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              children: [new TextRun({ text: input.projectTitle, bold: true, size: 34 })],
            }),
            ...input.content.split("\n").map(
              (line) =>
                new Paragraph({
                  spacing: { after: 180 },
                  children: [new TextRun({ text: line })],
                }),
            ),
          ],
        },
      ],
    });

    return {
      buffer: Buffer.from(await Packer.toBuffer(doc)),
      contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      extension: "docx",
    };
  }

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  page.drawText(input.projectTitle, { x: 48, y: 790, size: 24, font, color: rgb(0.1, 0.13, 0.2) });
  const lines = input.content.split("\n");
  let y = 750;

  lines.forEach((line) => {
    if (y < 70) return;
    page.drawText(line.slice(0, 100), { x: 48, y, size: 11, font, color: rgb(0.2, 0.24, 0.31) });
    y -= 18;
  });

  return {
    buffer: Buffer.from(await pdf.save()),
    contentType: "application/pdf",
    extension: "pdf",
  };
}

export function getDashboardSnapshot() {
  return {
    organization: demoOrganization,
    projects: demoProjects,
    requirements: demoRequirements,
    compliance: demoCompliance,
    responses: demoResponses,
    analytics: {
      uploads: 146,
      generatedResponses: 612,
      exports: 89,
      activeUsers: 24,
      conversionRate: 18.4,
      revenue: 7940,
    },
  };
}

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
  submissionDeadline: string | null;
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

export interface DashboardProjectSnapshot {
  id: string;
  title: string;
  tenderName: string;
  issuingBody: string;
  submissionDeadline: string | null;
  estimatedContractValue?: number;
  status: ProjectStatus;
  readinessScore: number;
  updatedAt: string | null;
  totalRequirements: number;
  completedRequirements: number;
  draftedRequirements: number;
  pendingRequirements: number;
  pendingMandatoryRequirements: number;
}

export interface DashboardDocumentSnapshot {
  id: string;
  title: string;
  documentType: string;
  uploadedAt: string | null;
}

export interface DashboardExportSnapshot {
  id: string;
  projectId: string;
  fileName: string;
  exportType: string;
  generatedAt: string | null;
}

export interface DashboardRecommendation {
  title: string;
  detail: string;
  href: string;
}

export interface DashboardSnapshot {
  metrics: {
    activeProjects: number;
    upcomingDeadlines: number;
    recentUploads: number;
    tasksRequiringAttention: number;
    organizationReadiness: number;
  };
  projects: DashboardProjectSnapshot[];
  recentUploads: DashboardDocumentSnapshot[];
  recentExports: DashboardExportSnapshot[];
  recommendations: DashboardRecommendation[];
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
  if (!supabase) {
    redirect("/login");
  }

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
    industry: (data.industry as string | null) ?? "",
    website: (data.website as string | null) ?? "",
    employeeCount: (data.employee_count as string | null) ?? "",
    certifications: Array.isArray(data.certifications) ? (data.certifications as string[]) : [],
    location: (data.location as string | null) ?? "",
  };
}

export async function getAuthenticatedAppContext() {
  const organization = await getActiveOrganizationContext();
  
  const serverSupabase = await createServerSupabaseClient();
  if (!serverSupabase) {
    redirect("/login");
  }
  
  const { data: userData, error: userError } = await serverSupabase.auth.getUser();
  if (userError || !userData?.user) {
    redirect("/login");
  }
  
  let supabaseClient = createServiceSupabaseClient();
  if (!supabaseClient) {
    supabaseClient = serverSupabase;
  }
  
  const { data: membership } = await supabaseClient
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userData.user.id)
    .limit(1)
    .maybeSingle();
  
  if (!membership?.organization_id) {
    redirect("/billing");
  }
  
  const { data: subscription } = await supabaseClient
    .from("subscriptions")
    .select("status")
    .eq("organization_id", membership.organization_id)
    .maybeSingle();
  
  const hasActiveSubscription = subscription?.status === "active" || subscription?.status === "trialing";
  if (!hasActiveSubscription) {
    redirect("/billing");
  }
  
  return {
    organization,
    organizationId: organization.id,
    user: userData.user,
  };
}

export async function getUserSubscriptionStatus() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return null;

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userData.user.id)
    .limit(1)
    .maybeSingle();

  if (!membership?.organization_id) return null;

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("status, stripe_price_id, current_period_end")
    .eq("organization_id", membership.organization_id)
    .maybeSingle();

  return {
    organizationId: membership.organization_id as string,
    status: (subscription?.status as string | null) ?? null,
    stripePriceId: (subscription?.stripe_price_id as string | null) ?? null,
    currentPeriodEnd: (subscription?.current_period_end as string | null) ?? null,
    isActive: subscription?.status === "active" || subscription?.status === "trialing",
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

export async function getRecentProject() {
  try {
    const supabase = await createServerSupabaseClient();
    if (!supabase) return null;

    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return null;

    const { data: membership } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", userData.user.id)
      .limit(1)
      .maybeSingle();

    const organizationId = (membership?.organization_id as string | undefined) ?? null;
    if (!organizationId) return null;

    const { data } = await supabase
      .from("projects")
      .select("id")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return data ? { id: data.id as string } : null;
  } catch (error) {
    console.error('Failed to get recent project:', error);
    return null;
  }
}

export async function runTenderAnalysis(text: string) {
  const requirements = heuristicRequirementExtraction(text);
  const compliance = buildComplianceSnapshot(requirements);
  const responseDrafts: GeneratedResponse[] = [];

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
  let selectedRequirements: RequirementItem[] = [];
  let organizationId: string | undefined;
  let projectTitle = "Untitled Project";
  let knowledgeQueryContext = "";

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
      trial_period_days: 7,
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

export async function getDashboardSnapshot(organizationId?: string): Promise<DashboardSnapshot> {
  const emptySnapshot: DashboardSnapshot = {
    metrics: {
      activeProjects: 0,
      upcomingDeadlines: 0,
      recentUploads: 0,
      tasksRequiringAttention: 0,
      organizationReadiness: 0,
    },
    projects: [],
    recentUploads: [],
    recentExports: [],
    recommendations: [
      {
        title: "Import your first opportunity",
        detail: "Create a live workspace by importing an opportunity or uploading a tender pack.",
        href: "/opportunities",
      },
      {
        title: "Upload organization evidence",
        detail: "Add case studies, policies, CVs, and certifications before generating draft responses.",
        href: "/knowledge",
      },
    ],
  };

  const supabase = createServiceSupabaseClient();
  if (!supabase || !organizationId) {
    return emptySnapshot;
  }

  const projectsResponse = await supabase
    .from("projects")
    .select("id, title, tender_name, issuing_body, submission_deadline, estimated_contract_value, status, readiness_score, updated_at")
    .eq("organization_id", organizationId)
    .order("updated_at", { ascending: false })
    .limit(12);

  if (projectsResponse.error) {
    return emptySnapshot;
  }

  const projectRows = (projectsResponse.data ?? []) as Array<Record<string, unknown>>;
  const projectIds = projectRows.map((row) => String(row.id));

  const requirementsResponse =
    projectIds.length > 0
      ? await supabase.from("requirements").select("project_id, mandatory, response_status").in("project_id", projectIds)
      : { data: [], error: null };

  const uploadsResponse = await supabase
    .from("knowledge_documents")
    .select("id, title, document_type, upload_date, created_at")
    .eq("organization_id", organizationId)
    .order("upload_date", { ascending: false })
    .limit(6);

  const exportsResponse = await supabase
    .from("export_history")
    .select("id, project_id, file_name, export_type, generated_at")
    .eq("organization_id", organizationId)
    .order("generated_at", { ascending: false })
    .limit(6);

  const requirementsByProject = new Map<
    string,
    { total: number; complete: number; drafted: number; pending: number; pendingMandatory: number }
  >();

  for (const row of ((requirementsResponse.data ?? []) as Array<Record<string, unknown>>)) {
    const projectId = String(row.project_id ?? "");
    if (!projectId) continue;

    const bucket =
      requirementsByProject.get(projectId) ?? { total: 0, complete: 0, drafted: 0, pending: 0, pendingMandatory: 0 };
    const status = String(row.response_status ?? "todo");
    const mandatory = Boolean(row.mandatory);

    bucket.total += 1;
    if (status === "complete") {
      bucket.complete += 1;
    } else if (status === "drafted") {
      bucket.drafted += 1;
      bucket.pending += 1;
      if (mandatory) {
        bucket.pendingMandatory += 1;
      }
    } else {
      bucket.pending += 1;
      if (mandatory) {
        bucket.pendingMandatory += 1;
      }
    }

    requirementsByProject.set(projectId, bucket);
  }

  const now = Date.now();
  const fourteenDaysFromNow = now + 14 * 24 * 60 * 60 * 1000;

  const projects: DashboardProjectSnapshot[] = projectRows.map((row) => {
    const projectId = String(row.id);
    const requirementStats =
      requirementsByProject.get(projectId) ?? { total: 0, complete: 0, drafted: 0, pending: 0, pendingMandatory: 0 };

    return {
      id: projectId,
      title: String(row.title ?? row.tender_name ?? "Untitled project"),
      tenderName: String(row.tender_name ?? row.title ?? "Untitled project"),
      issuingBody: String(row.issuing_body ?? "Unknown buyer"),
      submissionDeadline: (row.submission_deadline as string | null) ?? null,
      estimatedContractValue: Number(row.estimated_contract_value ?? 0) || undefined,
      status: (row.status as ProjectStatus | null) ?? "draft",
      readinessScore: Number(row.readiness_score ?? 0),
      updatedAt: (row.updated_at as string | null) ?? null,
      totalRequirements: requirementStats.total,
      completedRequirements: requirementStats.complete,
      draftedRequirements: requirementStats.drafted,
      pendingRequirements: requirementStats.pending,
      pendingMandatoryRequirements: requirementStats.pendingMandatory,
    };
  });

  const activeProjects = projects.filter((project) => project.status !== "submitted" && project.status !== "archived");
  const upcomingDeadlines = activeProjects.filter((project) => {
    if (!project.submissionDeadline) return false;
    const deadline = new Date(project.submissionDeadline).getTime();
    return deadline >= now && deadline <= fourteenDaysFromNow;
  });

  const tasksRequiringAttention = activeProjects.reduce((sum, project) => {
    const lowReadinessTask = project.readinessScore < 80 ? 1 : 0;
    const deadlineTask =
      project.submissionDeadline && new Date(project.submissionDeadline).getTime() <= fourteenDaysFromNow ? 1 : 0;
    return sum + lowReadinessTask + deadlineTask + project.pendingMandatoryRequirements;
  }, 0);

  const readinessBase = activeProjects.length > 0 ? activeProjects : projects;
  const organizationReadiness =
    readinessBase.length > 0
      ? Math.round(readinessBase.reduce((sum, project) => sum + project.readinessScore, 0) / readinessBase.length)
      : 0;

  const recentUploads: DashboardDocumentSnapshot[] = ((uploadsResponse.data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id),
    title: String(row.title ?? "Untitled document"),
    documentType: String(row.document_type ?? "document"),
    uploadedAt: (row.upload_date as string | null) ?? (row.created_at as string | null) ?? null,
  }));

  const recentExports: DashboardExportSnapshot[] = ((exportsResponse.data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id),
    projectId: String(row.project_id ?? ""),
    fileName: String(row.file_name ?? "submission-export"),
    exportType: String(row.export_type ?? "export"),
    generatedAt: (row.generated_at as string | null) ?? null,
  }));

  const recommendations: DashboardRecommendation[] = [];
  if (projects.length === 0) {
    recommendations.push({
      title: "Create the first workspace",
      detail: "Import a tender opportunity to start requirement extraction, drafting, and review in one place.",
      href: "/opportunities",
    });
  }

  if (recentUploads.length === 0) {
    recommendations.push({
      title: "Upload company knowledge",
      detail: "Add case studies, policies, CVs, and certifications before asking AI to draft responses.",
      href: "/knowledge",
    });
  }

  const urgentProject = upcomingDeadlines.find((project) => project.readinessScore < 80) ?? upcomingDeadlines[0];
  if (urgentProject) {
    recommendations.push({
      title: "Prioritize the nearest deadline",
      detail: `${urgentProject.title} is due soon and needs focused workspace progress before review and export.`,
      href: `/projects/${urgentProject.id}/workspace`,
    });
  }

  const blockedProject = activeProjects.find((project) => project.pendingMandatoryRequirements > 0);
  if (blockedProject) {
    recommendations.push({
      title: "Resolve mandatory gaps",
      detail: `${blockedProject.title} still has ${blockedProject.pendingMandatoryRequirements} mandatory requirement${blockedProject.pendingMandatoryRequirements === 1 ? "" : "s"} not fully completed.`,
      href: `/projects/${blockedProject.id}/workspace`,
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      title: "Keep momentum in review",
      detail: "Open active workspaces, confirm evidence coverage, and move ready bids toward final export.",
      href: activeProjects[0] ? `/projects/${activeProjects[0].id}/workspace` : "/dashboard",
    });
  }

  return {
    metrics: {
      activeProjects: activeProjects.length,
      upcomingDeadlines: upcomingDeadlines.length,
      recentUploads: recentUploads.length,
      tasksRequiringAttention,
      organizationReadiness,
    },
    projects,
    recentUploads,
    recentExports,
    recommendations: recommendations.slice(0, 4),
  };
}

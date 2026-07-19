import { BookOpenText, BrainCircuit, FileSearch, FileText, Fingerprint, Globe2, SearchCheck, ShieldCheck, Sparkles, Target, TrendingUp, Upload } from "lucide-react";

export const siteTagline = "The operating system for winning bids.";

export const navLinks = [
  { label: "Product", href: "/#product-tour" },
  { label: "Features", href: "/features" },
  { label: "Pricing", href: "/pricing" },
  { label: "FAQ", href: "/#faq" },
] as const;

export const problemPoints = [
  {
    icon: FileText,
    title: "Bid work is scattered across too many systems",
    description:
      "Tender packs, response drafts, evidence folders, and review comments often live in separate tools, making each submission slower than it should be.",
  },
  {
    icon: Target,
    title: "Qualification decisions are difficult to defend",
    description: "Teams need a shared view of fit, missing evidence, and delivery risk before they spend days building a bid.",
  },
  {
    icon: TrendingUp,
    title: "Lessons from one bid rarely improve the next",
    description: "Buyer feedback, reviewer comments, and the strongest evidence often stay trapped in old folders instead of strengthening future submissions.",
  },
] as const;

export interface MarketingWorkflowModule {
  id: string;
  label: string;
  icon: typeof SearchCheck;
  headline: string;
  description: string;
  bullets: string[];
  outputs: string[];
}

export const productEngines: readonly MarketingWorkflowModule[] = [
  {
    id: "discover",
    label: "PursuitIQ Discover",
    icon: SearchCheck,
    headline: "Find opportunities worth qualifying.",
    description: "Bring procurement notices into one queue, filter them, and move the right opportunities into a live workspace.",
    bullets: ["Saved searches and alert rules", "Buyer, value, and deadline context", "One-click workspace creation"],
    outputs: ["Qualified opportunity record", "Shared qualification notes", "Next action for the bid team"],
  },
  {
    id: "draft",
    label: "PursuitIQ Draft",
    icon: Sparkles,
    headline: "Draft responses from real evidence.",
    description: "Generate editable response sections inside the workspace using indexed organizational knowledge and mapped buyer requirements.",
    bullets: ["Requirement-by-requirement drafting", "Source-linked evidence retrieval", "Editable response sections"],
    outputs: ["Draft response content", "Supporting source references", "Evidence gaps to close"],
  },
  {
    id: "review",
    label: "PursuitIQ Review",
    icon: FileSearch,
    headline: "Review the bid before submission.",
    description: "Surface missing evidence, compliance issues, and weak answers before the export pack is generated.",
    bullets: ["Actionable findings", "Suggested fixes", "Submission-readiness review"],
    outputs: ["Finding list by severity", "Suggested improvements", "Readiness summary"],
  },
  {
    id: "predict",
    label: "PursuitIQ Predict",
    icon: BrainCircuit,
    headline: "Explain strengths, risks, and next actions.",
    description: "Use workspace, review, knowledge, and outcome signals to understand whether the bid is getting stronger or riskier.",
    bullets: ["Strengths and risks", "Explainable recommendation", "Next-step guidance"],
    outputs: ["Strength summary", "Weakness summary", "Recommended next action"],
  },
  {
    id: "outcomes",
    label: "PursuitIQ Outcomes",
    icon: TrendingUp,
    headline: "Learn from submitted bids and real outcomes.",
    description: "Capture wins, losses, shortlist decisions, and buyer feedback so future qualification and review work gets better over time.",
    bullets: ["Win/loss tracking", "Buyer feedback capture", "Outcome-informed learning"],
    outputs: ["Outcome history", "Buyer patterns", "Improvement prompts"],
  },
  {
    id: "knowledge",
    label: "PursuitIQ Knowledge",
    icon: BookOpenText,
    headline: "Build institutional memory into every bid.",
    description: "Store the evidence your team reuses across bids and surface the gaps that still need coverage.",
    bullets: ["Indexed source library", "Coverage tracking", "Source retrieval for drafting"],
    outputs: ["Document inventory", "Coverage gaps", "Upload recommendations"],
  },
];

export const howItWorks = [
  {
    step: "01",
    icon: Upload,
    title: "Import the opportunity",
    description: "Start with a procurement notice or tender pack and create a live workspace for the bid team.",
  },
  {
    step: "02",
    icon: BookOpenText,
    title: "Build the bid",
    description: "Map requirements, draft responses, attach evidence, and coordinate work inside one structured workspace.",
  },
  {
    step: "03",
    icon: ShieldCheck,
    title: "Review, predict, and export",
    description: "Resolve findings, understand strengths and risks, then generate the final submission pack.",
  },
] as const;

export const pricingPlans = [
  {
    name: "Solo Consultant",
    monthlyPrice: 149,
    description: "For independent consultants and specialist bid advisors running high-value opportunities with discipline.",
    highlight: null,
    features: ["5 tenders per month", "All core engines", "Knowledge base up to 50 documents", "Single user seat"],
    cta: "Start 7-Day Free Trial",
  },
  {
    name: "SME",
    monthlyPrice: 399,
    description: "For growing bid teams that need end-to-end qualification, drafting, review, and prediction in one platform.",
    highlight: "Most Popular",
    features: ["Unlimited tenders", "Full platform access", "3 team seats included", "Priority support and guided onboarding"],
    cta: "Start 7-Day Free Trial",
  },
  {
    name: "Agency",
    monthlyPrice: 799,
    description: "For agencies and bid practices managing multiple clients, frameworks, and white-label delivery models.",
    highlight: null,
    features: ["Unlimited everything", "White-label exports", "Dedicated onboarding", "API access and enterprise workflows"],
    cta: "Start 7-Day Free Trial",
  },
  {
    name: "Enterprise",
    monthlyPrice: 2000,
    description: "For procurement organisations that need advanced governance, larger teams, and tailored rollout support.",
    highlight: "Custom",
    customPriceLabel: "From £2,000",
    features: ["Custom deployment scope", "Expanded team access", "Dedicated success and onboarding", "Enterprise API and workflow design"],
    cta: "Get Started",
  },
] as const;

export const faqs = [
  {
    question: "Does PursuitIQ replace our bid team?",
    answer:
      "No. PursuitIQ gives your team a faster operating system for qualification, drafting, review, and learning. It improves decision quality and throughput without removing human oversight.",
  },
  {
    question: "Can we use our own case studies, policies, and previous bids?",
    answer:
      "Yes. The Knowledge Engine is designed to store and retrieve organisation-specific evidence such as policies, certifications, CVs, case studies, framework agreements, and prior responses.",
  },
  {
    question: "How does win probability work?",
    answer:
      "PursuitIQ is being rebuilt around explainable bid recommendations. The focus is on strengths, weaknesses, missing evidence, and next actions rather than arbitrary marketing percentages.",
  },
  {
    question: "Is this only for public sector tenders?",
    answer:
      "PursuitIQ is especially strong for public procurement, framework, and regulated-sector bidding, but the workflow also supports broader RFP, RFQ, and grant processes.",
  },
] as const;

export const featurePillars = [
  {
    icon: SearchCheck,
    title: "Opportunity intelligence",
    description: "Source, filter, and qualify opportunities before your team commits bid effort.",
  },
  {
    icon: Sparkles,
    title: "Evidence-backed drafting",
    description: "Generate complete bid sections with organisation knowledge and buyer-relevant proof built in.",
  },
  {
    icon: FileSearch,
    title: "Consultant-grade review",
    description: "Check readiness, compliance, persuasiveness, and evidence strength before submission.",
  },
  {
    icon: BrainCircuit,
    title: "Predictive qualification",
    description: "Understand strengths, weaknesses, and next actions before you commit more delivery effort.",
  },
  {
    icon: TrendingUp,
    title: "Outcome learning",
    description: "Track shortlists, wins, losses, and rejections so the system becomes more useful over time.",
  },
  {
    icon: Fingerprint,
    title: "Enterprise control",
    description: "Support auditability, evidence traceability, repeatable workflows, and cross-team alignment.",
  },
] as const;

export const featureStories = [
  {
    eyebrow: "Qualification",
    title: "Stop bidding blind.",
    copy:
      "Prioritise the tenders that fit your buyer history, service line, delivery evidence, and commercial threshold. PursuitIQ turns bid/no-bid from a meeting debate into an evidence-backed decision.",
    icon: Target,
  },
  {
    eyebrow: "Execution",
    title: "Build better bids faster.",
    copy:
      "Map requirements, generate structured responses, pull the right supporting evidence, and review every section before submission from one operating environment.",
    icon: Globe2,
  },
  {
    eyebrow: "Learning",
    title: "Improve with every result.",
    copy:
      "Carry forward what buyers rewarded, what competitors exposed, and which evidence helped the submission so tomorrow's pursuit is stronger than today's.",
    icon: TrendingUp,
  },
] as const;

export const legalSections = {
  privacy: [
    {
      heading: "Data handling",
      body:
        "PursuitIQ is designed for enterprise procurement workflows. We process account data, workspace inputs, uploaded knowledge assets, and analytical signals to deliver qualification, drafting, review, and prediction functionality.",
    },
    {
      heading: "Customer control",
      body:
        "Customers remain responsible for the bid content, evidence, and tender data they upload. Administrative controls, authentication, tenancy boundaries, and audit logging are used to support secure platform operations.",
    },
    {
      heading: "Platform analytics",
      body:
        "Operational analytics may be used to improve reliability, product quality, and prediction accuracy. We do not sell customer tender data.",
    },
  ],
  terms: [
    {
      heading: "Use of service",
      body:
        "PursuitIQ is licensed as a subscription platform for procurement qualification, bid preparation, review, and intelligence workflows. Customers are responsible for ensuring submissions remain accurate and compliant with buyer instructions.",
    },
    {
      heading: "Availability and support",
      body:
        "We aim to provide reliable enterprise-grade service, but availability, maintenance windows, and support commitments vary by plan. Agency and enterprise customers may receive enhanced onboarding and service coverage.",
    },
    {
      heading: "Output and recommendations",
      body:
        "Scores, recommendations, and generated content are decision-support outputs. Final bid/no-bid decisions and final submission approval remain the customer's responsibility.",
    },
  ],
};

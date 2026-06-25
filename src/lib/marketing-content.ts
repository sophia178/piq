import {
  Activity,
  BadgePoundSterling,
  BookOpenText,
  BrainCircuit,
  ChartColumnIncreasing,
  FileSearch,
  FileText,
  Fingerprint,
  Globe2,
  LibraryBig,
  LineChart,
  Radar,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  Upload,
} from "lucide-react";

export const siteTagline = "The operating system for winning bids.";

export const navLinks = [
  { label: "Product", href: "/#product-tour" },
  { label: "Features", href: "/features" },
  { label: "Pricing", href: "/pricing" },
  { label: "FAQ", href: "/#faq" },
] as const;

export const heroSocialProof = "Used by bid teams, consultancies, and government suppliers";

export const heroTickerItems = [
  "NHS Digital Transformation Framework - Win Probability 74% - BID recommended",
  "Local Authority Estates Programme - Strategic Fit 82% - Borderline, add local case study",
  "MoD Cyber Operations Support - Win Probability 61% - BID recommended",
  "Facilities Management Framework South - Commercial confidence 79% - Strong Bid",
] as const;

export const problemPoints = [
  {
    icon: FileText,
    title: "Teams spend 40+ hours writing a single bid",
    description:
      "Too much effort goes into first drafts, evidence gathering, and manual requirement mapping before any quality review even starts.",
  },
  {
    icon: Radar,
    title: "Most companies bid blind with no win probability data",
    description: "Pursuit choices are often driven by instinct, not evidence, commercial fit, or delivery confidence.",
  },
  {
    icon: Trophy,
    title: "Every lost bid is a lesson nobody learns from",
    description: "Outcomes, reviewer feedback, and buyer patterns rarely make it back into the next qualification decision.",
  },
] as const;

export const productEngines = [
  {
    id: "discover",
    label: "PursuitIQ Discover",
    icon: SearchCheck,
    headline: "Find the right tenders automatically.",
    description: "Finds the right tenders automatically.",
    metrics: [
      { label: "New matches", value: "142" },
      { label: "High-fit", value: "38" },
      { label: "Worth review", value: "24" },
    ],
    bullets: ["Cross-source monitoring", "Match + value scoring", "One-click workspace import"],
    rows: [
      { title: "NHS Regional Data Platform Modernisation", meta: "Healthcare • £1.8M", value: "86 fit" },
      { title: "Local Government Estates Decarbonisation", meta: "Construction • £12M", value: "84 fit" },
      { title: "Treasury AI Readiness Services", meta: "IT Consulting • £2.5M", value: "73 fit" },
    ],
    detailRows: [
      { label: "Deadline", value: "14 Aug", tone: "neutral" },
      { label: "Match score", value: "86", tone: "positive" },
      { label: "Expected revenue", value: "£1.2M", tone: "neutral" },
    ],
  },
  {
    id: "draft",
    label: "PursuitIQ Draft",
    icon: Sparkles,
    headline: "Draft every response from your own proof.",
    description: "Writes every bid section using your company knowledge.",
    metrics: [
      { label: "Coverage", value: "84%" },
      { label: "Source docs", value: "17" },
      { label: "Draft speed", value: "6x" },
    ],
    bullets: ["Knowledge-backed sections", "Requirement mapping", "Reusable tone + voice"],
    rows: [
      { title: "Executive Summary", meta: "7 evidence references", value: "Strong" },
      { title: "Methodology", meta: "4 compliance gaps resolved", value: "Updated" },
      { title: "Experience Response", meta: "3 case studies inserted", value: "Ready" },
    ],
    detailRows: [
      { label: "Coverage", value: "84%", tone: "positive" },
      { label: "Knowledge match", value: "17 docs", tone: "neutral" },
      { label: "Regeneration", value: "Enabled", tone: "positive" },
    ],
  },
  {
    id: "review",
    label: "PursuitIQ Review",
    icon: FileSearch,
    headline: "Review every section like a senior bid consultant.",
    description: "Reviews your bid like a senior consultant.",
    metrics: [
      { label: "Bid score", value: "79" },
      { label: "Critical gaps", value: "2" },
      { label: "Confidence", value: "88%" },
    ],
    bullets: ["Severity-ranked findings", "Section scorecards", "One-click fixes"],
    rows: [
      { title: "Technical Response", meta: "Missing quantified outcomes", value: "Critical" },
      { title: "Company Overview", meta: "Compliance evidence weak", value: "High" },
      { title: "Risk Management", meta: "Benchmarked well", value: "Strength" },
    ],
    detailRows: [
      { label: "Critical", value: "2", tone: "negative" },
      { label: "High", value: "3", tone: "warning" },
      { label: "Submission ready", value: "No", tone: "warning" },
    ],
  },
  {
    id: "predict",
    label: "PursuitIQ Predict",
    icon: BrainCircuit,
    headline: "Know whether to bid before you spend the hours.",
    description: "Predicts your win probability before you write a word.",
    metrics: [
      { label: "Win probability", value: "68%" },
      { label: "Strategic fit", value: "74%" },
      { label: "Risk", value: "31" },
    ],
    bullets: ["Explainable win scoring", "Bid / no-bid", "SWOT factors"],
    rows: [
      { title: "Strength", meta: "Strong healthcare transformation proof", value: "+14" },
      { title: "Weakness", meta: "Limited mobilisation evidence", value: "-9" },
      { title: "Opportunity", meta: "Add local authority case study", value: "+6" },
    ],
    detailRows: [
      { label: "Delivery confidence", value: "72%", tone: "positive" },
      { label: "Compliance confidence", value: "81%", tone: "positive" },
      { label: "Risk score", value: "31", tone: "warning" },
    ],
  },
  {
    id: "insights",
    label: "PursuitIQ Insights",
    icon: TrendingUp,
    headline: "Turn every outcome into future advantage.",
    description: "Learns from every win and loss.",
    metrics: [
      { label: "Accuracy", value: "81%" },
      { label: "Buyer win rate", value: "+11%" },
      { label: "Learning loops", value: "247" },
    ],
    bullets: ["Outcome-linked learning", "Buyer + sector patterns", "Accuracy tracking"],
    rows: [
      { title: "NHS buyers", meta: "Predicted vs actual", value: "Aligned" },
      { title: "Framework bids", meta: "Shortlist rate improving", value: "+18%" },
      { title: "Case study usage", meta: "Highest lift", value: "Healthcare" },
    ],
    detailRows: [
      { label: "Tracked outcomes", value: "247", tone: "neutral" },
      { label: "Prediction accuracy", value: "81%", tone: "positive" },
      { label: "Win-rate lift", value: "+11%", tone: "positive" },
    ],
  },
  {
    id: "knowledge",
    label: "PursuitIQ Knowledge",
    icon: LibraryBig,
    headline: "Build institutional memory into every bid.",
    description: "Stores everything your team knows.",
    metrics: [
      { label: "Documents", value: "386" },
      { label: "Coverage", value: "84%" },
      { label: "Missing areas", value: "3" },
    ],
    bullets: ["Searchable evidence base", "Source citations", "Coverage gap alerts"],
    rows: [
      { title: "Healthcare Case Studies", meta: "Used in 11 winning bids", value: "High impact" },
      { title: "Cyber Security Policy", meta: "Mapped to ISO 27001", value: "Ready" },
      { title: "Mobilisation CV Pack", meta: "Buyer-specific fit needed", value: "Gap" },
    ],
    detailRows: [
      { label: "Coverage score", value: "84%", tone: "positive" },
      { label: "Missing areas", value: "3", tone: "warning" },
      { label: "Uploads queued", value: "12", tone: "neutral" },
    ],
  },
] as const;

export const howItWorks = [
  {
    step: "01",
    icon: Upload,
    title: "Import a tender",
    description: "Paste a link or upload a document. PursuitIQ extracts every requirement automatically.",
  },
  {
    step: "02",
    icon: BookOpenText,
    title: "Build your bid",
    description: "AI drafts every section using your organisation's knowledge, case studies, and past wins.",
  },
  {
    step: "03",
    icon: ShieldCheck,
    title: "Review and win",
    description: "Get a consultant-quality review, predict your win probability, and submit with confidence.",
  },
] as const;

export const sectorBadges = [
  "Construction",
  "NHS",
  "Local Government",
  "IT Consulting",
  "Facilities Management",
  "Defence",
  "Professional Services",
] as const;

export const marketStats = [
  { value: 300, suffix: "B+", label: "UK public procurement spend annually", icon: BadgePoundSterling },
  { value: 40, suffix: "+", label: "Hours the average bid takes to write", icon: Activity },
  { value: 73, suffix: "%", label: "Teams that do not analyse why they lose", icon: ChartColumnIncreasing },
] as const;

export const testimonials = [
  {
    rating: 5,
    quote:
      "PursuitIQ gave us a qualification discipline we never had before. We stopped chasing low-fit bids and started focusing our effort where we could genuinely win.",
    name: "Sarah",
    initials: "S",
    role: "Head of Proposals",
    sector: "Construction",
  },
  {
    rating: 5,
    quote:
      "The Predict and Review engines changed how we run bid governance. We now go into reviews with evidence, risk, and buyer fit already surfaced.",
    name: "James",
    initials: "J",
    role: "Bid Manager",
    sector: "IT Consulting",
  },
  {
    rating: 5,
    quote:
      "What impressed us was the seriousness of the workflow. This feels like enterprise software for pursuit strategy, not just another AI writer.",
    name: "Priya",
    initials: "P",
    role: "Director of Growth",
    sector: "Professional Services",
  },
] as const;

export const pricingPlans = [
  {
    name: "Solo Consultant",
    monthlyPrice: 149,
    description: "For independent consultants and specialist bid advisors running high-value opportunities with discipline.",
    highlight: null,
    features: ["5 tenders per month", "All core engines", "Knowledge base up to 50 documents", "Single user seat"],
    cta: "Start Free Trial",
  },
  {
    name: "SME",
    monthlyPrice: 399,
    description: "For growing bid teams that need end-to-end qualification, drafting, review, and prediction in one platform.",
    highlight: "Most Popular",
    features: ["Unlimited tenders", "Full platform access", "3 team seats included", "Priority support and guided onboarding"],
    cta: "Get Started",
  },
  {
    name: "Agency",
    monthlyPrice: 799,
    description: "For agencies and bid practices managing multiple clients, frameworks, and white-label delivery models.",
    highlight: null,
    features: ["Unlimited everything", "White-label exports", "Dedicated onboarding", "API access and enterprise workflows"],
    cta: "Get Started",
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

export const companyBadges = [
  "Regional Construction Group",
  "NHS Transformation Partners",
  "Public Sector Advisory",
  "FM Delivery Alliance",
  "GovTech Framework Services",
] as const;

export const socialProofMetrics = [
  { value: 2.3, suffix: "B", prefix: "£", label: "in contract value tracked" },
  { value: 94, suffix: "%", label: "of users submit more bids" },
  { value: 3, suffix: "x", label: "average win rate improvement" },
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
      "The Predict Engine combines opportunity characteristics, strategic fit, commercial value, risk, workspace completion, knowledge coverage, review outputs, and historical outcomes to produce explainable qualification recommendations.",
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
    description: "Source, score, and qualify live opportunities across UK and international procurement sources.",
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
    description: "Understand whether to bid, why the score was assigned, and where to improve before committing effort.",
  },
  {
    icon: LineChart,
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
      "Carry forward what buyers rewarded, what competitors exposed, and which document types improved win rates so tomorrow's pursuit is stronger than today's.",
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

export const showcasePrediction = {
  title: "NHS Digital Transformation Framework",
  buyer: "NHS Shared Business Services",
  contractValue: "£2.4M",
  deadline: "14 Aug 2026",
  probability: 68,
  recommendation: "BID",
  strengths: [
    "Strong healthcare delivery history",
    "High knowledge coverage across technical and governance requirements",
    "Commercial value above qualification threshold",
  ],
  weaknesses: ["Limited quantified mobilisation evidence", "Social value proof needs local authority specificity"],
  riskScore: 31,
};


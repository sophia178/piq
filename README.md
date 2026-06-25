# PursuitIQ

PursuitIQ is a production-ready Win Intelligence Platform for qualification, pursuit strategy, bid efficiency, and submission execution. It includes multi-tenant organisations, opportunity intelligence, project workspaces, tender ingestion, AI analysis, knowledge coverage, review, prediction, exports, billing, and admin analytics.

## Stack

- Next.js App Router
- React and TypeScript
- Tailwind CSS
- Supabase PostgreSQL, Auth, and Storage
- Stripe Billing
- OpenAI
- Vercel deployment

## Key Capabilities

- Signup, login, password reset, and email verification flows through Supabase Auth
- Multi-tenant organisation model with projects, uploads, knowledge assets, and response library
- Tender upload and parsing for PDF, DOCX, and TXT
- Requirement extraction, compliance analysis, missing-information detection, and risk warnings
- AI-generated executive summaries, technical responses, social value content, and bid reviews
- Three-column bid workspace with room for autosave and realtime collaboration
- Export endpoints for DOCX and PDF
- Tender Opportunity Discovery Engine covering UK Contracts Finder, Find a Tender, TED Europe, and SAM.gov
- Revenue Engine with estimated contract value, win probability, expected revenue, bid effort, ROI scoring, and opportunity prioritization
- Bid Workspace Automation Engine that turns imported opportunities into structured bid workspaces, requirements, sections, tasks, timelines, and readiness scoring
- Auto-generated bid sections for Executive Summary, Company Overview, Technical Response, Methodology, Risk Management, Social Value, ESG Response, and Experience Response
- Missing Information Engine for missing documents, certifications, evidence, and references
- Dynamic bid completion and readiness scoring that feeds back into Revenue Engine win probability and ROI
- Organisation Knowledge Engine with uploads for case studies, previous bids, certifications, policies, staff CVs, method statements, framework agreements, service descriptions, and testimonials
- RAG-backed drafting that automatically retrieves organisation knowledge, injects evidence into response generation, stores supporting evidence, and cites source documents
- Tender-level knowledge coverage scoring with strong/moderate/weak coverage, missing evidence, missing certification, missing experience, and upload recommendations
- Knowledge usage and performance tracking for generated sections influenced, win-probability lift, revenue impact, and most valuable documents
- Bid Outcome Intelligence for submitted, won, and lost bids with contract value, competitor count, sector, tender type, client patterns, and revenue won/lost analytics
- Historical win/loss learning that feeds sector, client, and tender-type performance back into future win probability scoring
- PursuitIQ Predict Engine for explainable win probability, confidence, bid strength, evidence strength, compliance confidence, delivery confidence, commercial confidence, risk, and strategic fit scoring
- Explainable bid / no-bid recommendations with persisted strengths, weaknesses, opportunities, and risks surfaced across opportunity and workspace views
- Prediction learning loop with persisted prediction history, prediction factors, prediction metrics, and outcome-linked accuracy tracking by sector, buyer, service line, framework, and document type
- Dedicated Predict dashboard for probability distribution, strongest opportunities, weakest opportunities, strategic fit rankings, revenue-weighted opportunities, recommendation mix, and prediction accuracy
- AI Bid Review Engine that reviews Executive Summary, Company Overview, Technical Response, Methodology, Risk Management, Social Value, ESG Response, and Experience Response before submission
- Review findings, recommendations, and review history with severity levels for missing responses, weak responses, unsupported claims, missing evidence, and compliance gaps
- One-click improvement apply flow that turns review recommendations into updated workspace drafts while preserving the existing response library and section lifecycle
- Submission readiness, risk, confidence, overall bid, compliance, quality, and evidence scoring with win-probability adjustment fed back into the Revenue Engine
- Bid Review Dashboard with project-level review findings, improvement opportunities, readiness score, and submission recommendation
- Submission & Export Engine with branded Microsoft Word bid packs, PDF bid packs, executive summary PDFs, compliance pack PDFs, and evidence pack PDFs generated directly from completed workspaces
- Final submission validation with submission checklist, readiness/compliance/evidence thresholds, export risk score, and final submission recommendation before export
- Export template system for Public Sector, NHS, Local Government, Framework, and Custom export templates with organisation-specific thresholds
- Organisation branding settings for logo, company name, colours, header, footer, and contact information automatically applied to exports
- Export history for generated bid packs, export type tracking, final validation snapshot, and submission recommendation traceability
- AI bid recommendations with justification for `Bid Immediately`, `Worth Investigating`, `Low Probability`, and `Do Not Pursue`
- Opportunity pipeline tracking from discovery through import, bid creation, submission, and contract win
- Opportunity alerts with keyword, industry, location, and contract-value filters
- AI scoring for relevance score, win probability, and revenue potential
- Opportunity dashboard for new, saved, and high-match notices with one-click import into Bid Workspace
- Scheduled scan endpoint for cron-driven ingestion workflows
- LinkedIn growth engine with 8-post/day planning, regional targeting, 60-day topic lockout, and paid-conversion-first optimization
- Stripe checkout and webhook handling
- Admin analytics and audit logs

## Local Setup

1. Copy `.env.example` to `.env.local`.
2. Install dependencies with `npm install`.
3. Apply the SQL migration in `supabase/migrations/0001_bidpilot_init.sql`.
4. Start the app with `npm run dev`.
5. Configure a Stripe webhook for `/api/stripe/webhook`.
6. Configure `SAM_GOV_API_KEY` for SAM.gov ingestion and `OPPORTUNITY_SCAN_CRON_SECRET` for the scheduled scan endpoint.
7. Add an OpenAI API key if you want production embeddings; otherwise the Knowledge Engine falls back to deterministic local embeddings for demo-safe retrieval.

## Important Paths

- `src/app`: App Router pages and API route handlers
- `src/components`: shared UI, auth, and workspace components
- `src/lib/platform.ts`: domain types, Supabase helpers, AI pipeline, exports, and billing helpers
- `src/lib/opportunities.ts`: discovery ingestion, revenue scoring, prioritization, pipeline tracking, alerts, imports, and snapshot helpers
- `src/lib/opportunities.ts`: also includes bid outcome intelligence, historical performance learning, and outcome insight generation
- `src/lib/predict.ts`: explainable win-probability modelling, qualification recommendation logic, factor persistence, learning metrics, and Predict dashboard snapshots
- `src/lib/bid-workspace.ts`: workspace automation, bid drafting, missing-information analysis, progress scoring, and revenue feedback
- `src/lib/bid-review.ts`: pre-submission bid review scoring, findings, recommendations, apply actions, dashboard snapshots, and review-to-revenue feedback
- `src/lib/submission-export.ts`: submission validation, export templates, branding settings, bid pack assembly, PDF/DOCX generation, and export history
- `src/lib/knowledge.ts`: knowledge document indexing, chunking, embeddings, retrieval, citation evidence, coverage scoring, usage tracking, and impact attribution
- `src/prompts`: production prompt templates used by the AI services
- `supabase/migrations`: PostgreSQL schema, indexes, and RLS policies
- `docs/architecture.md`: system architecture and deployment guidance

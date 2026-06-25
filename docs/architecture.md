# PursuitIQ Architecture

## System Overview

PursuitIQ is designed as a multi-tenant B2B Win Intelligence Platform for tender, RFP, RFQ, grant, and procurement teams. The application uses Next.js App Router for the product UI and API surface, Supabase for authentication and data tenancy, Stripe for subscriptions, OpenAI for analysis and generation, and Vercel for deployment.

## Core Domains

- Authentication and organisation onboarding
- Tender project portfolio management
- Tender upload and parsing
- AI analysis and grounded response generation
- Knowledge base and reusable response library
- Submission workspace, automation, and exports
- Tender opportunity discovery, revenue scoring, and alerting
- Predictive win intelligence and bid qualification
- LinkedIn growth planning and conversion analytics
- Billing, analytics, and internal admin

## Application Layers

### Frontend

- Marketing site and SaaS console in Next.js
- Shared design primitives in `src/components/ui.tsx`
- App shell for B2B navigation and tenant context
- Workspace editor that is ready for autosave and realtime expansion

### Backend

- Route handlers in `src/app/api`
- Validation with Zod before processing
- Supabase Auth for identity and session management
- Supabase Storage for tender and knowledge asset files
- Stripe checkout and webhook sync
- OpenAI-backed analysis and drafting with deterministic fallback mode
- Procurement source ingestion, deduplication, and AI-assisted opportunity scoring
- Automated bid workspace bootstrapping, section drafting, missing-information detection, and readiness scoring
- Pre-submission bid review scoring with review history, findings, recommendations, one-click draft apply, and dashboard summaries
- Submission and export generation with branded bid packs, validation thresholds, export history, and template-driven output types
- Knowledge usage, coverage, and performance tracking tied to generated sections, win-probability lift, and revenue impact
- Predict Engine scoring, qualification, explainability factors, and learning metrics built on top of revenue, workspace, review, knowledge, and outcome signals
- Conversion-weighted LinkedIn planning and content generation

### Data

- PostgreSQL schema in `supabase/migrations/0001_bidpilot_init.sql`
- Row-level security for all tenant tables
- Audit logs for sensitive activity
- Analytics events for uploads, generation, export, and billing events
- Opportunity sources, alerts, normalized opportunities, match scoring records, ROI scores, priority rankings, and pipeline stages
- Bid outcome records for submitted, shortlisted, won, rejected, and lost bids with competitor counts, sector, tender type, client patterns, and revenue intelligence
- Bid automation requirements, sections, tasks, timelines, draft documents, and workspace completion metrics
- Bid review history, findings, and recommendations linked to projects and workspace sections
- Organisation branding settings, export templates, and export history linked to projects and final validation snapshots
- Knowledge documents, retrieval chunks, embeddings, usage analytics, knowledge coverage, supporting evidence, and knowledge performance metrics
- Prediction history, prediction factors, and prediction metrics for explainable win scoring and continuously improving qualification accuracy
- LinkedIn content plans, post history, and paid-conversion performance records

## AI Pipeline

1. User uploads a tender file into Supabase Storage.
2. The upload route extracts raw text from PDF, DOCX, or TXT.
3. The tender analysis service identifies requirements, mandatory criteria, and structural metadata.
4. The compliance engine computes readiness score, checklist states, and missing information.
5. The workspace generation route drafts response sections grounded by organisation assets.
6. The export route renders submission content to DOCX or PDF.
7. The discovery engine scans Contracts Finder, Find a Tender, TED Europe, and SAM.gov on a schedule or on demand.
8. Normalized notices are deduplicated, matched against organization alerts, and scored for fit and revenue.
9. The Revenue Engine calculates contract value, win probability, expected revenue, bid effort, ROI, priority, and AI recommendation for every discovered opportunity.
10. Imported opportunities flow through the tracked funnel from opportunity to imported, bid created, submitted, and won.
11. The Bid Workspace Automation Engine bootstraps a project, extracts requirements, drafts core bid sections, creates tasks and timelines, and detects missing information.
12. The Organisation Knowledge Engine indexes uploaded case studies, previous bids, certifications, policies, CVs, method statements, framework agreements, service descriptions, and testimonials into chunks and embeddings.
13. Retrieval augments both workspace generation and bid section drafting with evidence-backed organisation knowledge, source citations, and supporting evidence excerpts.
14. Knowledge usage is logged per generated section so the platform can attribute which assets influence drafting, readiness, win-probability lift, and revenue impact.
15. Tender-level knowledge coverage is recalculated during workspace automation and regeneration to expose strong, moderate, or weak coverage plus missing evidence, certifications, experience, and upload recommendations.
16. Bid Outcome Intelligence records submitted, shortlisted, won, rejected, and lost bids and generates win/loss patterns by sector and client.
17. Historical bid outcome performance feeds back into the Revenue Engine to improve future win probability scoring and recommendations.
18. The AI Bid Review Engine evaluates completed bid sections against requirements, mandatory criteria, knowledge coverage, and historical outcome signals to create severity-ranked findings and improvement recommendations.
19. One-click review apply actions update the existing workspace section documents and response library, then recalculate readiness, knowledge impact, and revenue scores.
20. The Predict Engine sits on top of opportunities, revenue, workspace, knowledge, review, and outcomes to compute explainable win probability, bid qualification, strategic fit, risk, evidence strength, and confidence.
21. Predict persists each scoring run in `prediction_history`, stores strengths, weaknesses, opportunities, and risks in `prediction_factors`, and rolls up learning signals into `prediction_metrics`.
22. Outcome recording closes the loop by updating prediction accuracy and dimension-level performance by sector, buyer, service line, framework, and document type.
23. Workspace and review recalculation trigger Predict refreshes so improved content, evidence, and review findings immediately update the pursuit recommendation.
24. The Submission & Export Engine validates readiness, compliance, and evidence thresholds before generating branded submission-ready bid packs and specialist export PDFs.
25. Export packs reuse existing workspace sections, Knowledge Engine citations, supporting evidence, and review findings rather than rebuilding document content.
26. Export history stores generated outputs, validation snapshots, export risk, and final submission recommendation for auditability.
27. Workspace completion, readiness, review-derived win-probability adjustment, Predict scoring, and export validation all feed back into the existing operating model without introducing a separate architecture.
28. High-value matches can be imported directly into the existing project workspace model.

## Security

- Supabase row-level security policies on tenant data
- Middleware security headers and API rate limiting
- Zod request validation
- Audit logging for auth, uploads, analysis, generation, billing, and exports
- Cron-protected scheduled opportunity scan endpoint
- Tenant-aware schema design using memberships and organisation ownership

## Deployment

- Deploy the Next.js app to Vercel
- Provision Supabase project with Auth, Storage bucket `tenders`, and SQL migration
- Add environment variables from `.env.example`
- Configure Stripe products and price IDs
- Register Stripe webhook to `/api/stripe/webhook`
- Register a cron or scheduler against `/api/opportunities/scheduled-scan` with `OPPORTUNITY_SCAN_CRON_SECRET`
- Point product email templates to the public app URL for auth redirects

## Scaling Notes

- Move in-memory rate limiting to Upstash Redis or a dedicated store
- Persist workspace editor content as structured document blocks instead of a single blob
- Add asynchronous job processing for long-form analysis and export generation
- Move source ingestion to background workers with retry and per-source backoff controls
- Expand retrieval beyond current prompt injection into a dedicated response-library search and reviewer evidence explorer

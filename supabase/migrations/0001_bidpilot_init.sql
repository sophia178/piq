create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  industry text not null,
  website text,
  employee_count text,
  certifications text[] not null default '{}',
  location text,
  plan_tier text not null default 'starter' check (plan_tier in ('starter', 'professional', 'agency')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member', 'reviewer')),
  created_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, user_id)
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  stripe_price_id text,
  status text not null default 'inactive',
  current_period_end timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  tender_name text not null,
  issuing_body text not null,
  submission_deadline timestamptz,
  estimated_contract_value numeric(14,2),
  status text not null default 'draft' check (status in ('draft', 'analyzing', 'in_progress', 'review', 'submitted', 'archived')),
  readiness_score integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.tender_uploads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  issuing_body text not null,
  file_name text not null,
  file_type text not null,
  storage_path text not null,
  extracted_text text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.tender_analyses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  tender_upload_id uuid references public.tender_uploads(id) on delete cascade,
  analysis_summary text,
  executive_summary text,
  scoring_criteria jsonb not null default '[]'::jsonb,
  deadlines jsonb not null default '[]'::jsonb,
  contacts jsonb not null default '[]'::jsonb,
  mandatory_documents jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.requirements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  tender_analysis_id uuid references public.tender_analyses(id) on delete cascade,
  heading text not null,
  requirement text not null,
  category text,
  mandatory boolean not null default false,
  owner_name text,
  response_status text not null default 'todo' check (response_status in ('todo', 'drafted', 'complete')),
  source_page text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.compliance_checks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  readiness_score integer not null default 0,
  completion_score integer not null default 0,
  readiness_state text not null default 'not_started' check (readiness_state in ('not_started', 'in_progress', 'ready_for_review', 'ready_for_submission')),
  missing_information jsonb not null default '[]'::jsonb,
  missing_documents jsonb not null default '[]'::jsonb,
  missing_certifications jsonb not null default '[]'::jsonb,
  missing_evidence jsonb not null default '[]'::jsonb,
  missing_references jsonb not null default '[]'::jsonb,
  risk_warnings jsonb not null default '[]'::jsonb,
  checklist jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (project_id)
);

create table if not exists public.knowledge_assets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  asset_type text not null check (asset_type in ('case_study', 'policy', 'certification', 'previous_response', 'staff_cv', 'method_statement', 'framework_agreement', 'service_description', 'testimonial')),
  title text not null,
  description text,
  storage_path text,
  extracted_text text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  legacy_knowledge_asset_id uuid references public.knowledge_assets(id) on delete set null,
  name text not null default '',
  document_type text not null check (document_type in ('case_study', 'previous_bid', 'certification', 'policy', 'staff_cv', 'method_statement', 'framework_agreement', 'service_description', 'testimonial')),
  title text not null,
  description text,
  source_file text,
  storage_path text,
  upload_date timestamptz not null default timezone('utc', now()),
  processing_status text not null default 'indexed' check (processing_status in ('queued', 'processing', 'indexed', 'failed')),
  confidence_score integer not null default 0 check (confidence_score between 0 and 100),
  extracted_text text not null default '',
  chunk_count integer not null default 0,
  times_referenced integer not null default 0,
  influenced_bids_count integer not null default 0,
  average_win_probability_lift numeric(8,2) not null default 0,
  searchable_metadata jsonb not null default '{}'::jsonb,
  last_referenced_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  knowledge_document_id uuid not null references public.knowledge_documents(id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  token_count integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  unique (knowledge_document_id, chunk_index)
);

create table if not exists public.knowledge_embeddings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  knowledge_chunk_id uuid not null references public.knowledge_chunks(id) on delete cascade,
  embedding_model text not null,
  embedding jsonb not null default '[]'::jsonb,
  dimensions integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  unique (knowledge_chunk_id)
);

create table if not exists public.knowledge_usage (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  knowledge_document_id uuid not null references public.knowledge_documents(id) on delete cascade,
  knowledge_chunk_id uuid references public.knowledge_chunks(id) on delete set null,
  section_name text not null,
  generation_type text not null default 'bid_section_generation' check (generation_type in ('workspace_generation', 'bid_section_generation', 'response_library_generation')),
  source_reference text not null default '',
  supporting_evidence text not null default '',
  confidence_score integer not null default 0 check (confidence_score between 0 and 100),
  win_probability_improvement numeric(8,2) not null default 0,
  revenue_impact numeric(14,2) not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.knowledge_coverage (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  coverage_score integer not null default 0 check (coverage_score between 0 and 100),
  missing_evidence_score integer not null default 0 check (missing_evidence_score between 0 and 100),
  missing_certification_score integer not null default 0 check (missing_certification_score between 0 and 100),
  missing_experience_score integer not null default 0 check (missing_experience_score between 0 and 100),
  coverage_strength text not null default 'weak' check (coverage_strength in ('strong', 'moderate', 'weak')),
  missing_knowledge_areas jsonb not null default '[]'::jsonb,
  upload_recommendations jsonb not null default '[]'::jsonb,
  supporting_document_ids jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, project_id)
);

create table if not exists public.knowledge_performance (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  knowledge_document_id uuid not null references public.knowledge_documents(id) on delete cascade,
  times_used integer not null default 0,
  generated_sections_influenced integer not null default 0,
  win_probability_improvement numeric(8,2) not null default 0,
  revenue_impact numeric(14,2) not null default 0,
  last_used_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, knowledge_document_id)
);

create table if not exists public.response_library (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  requirement_id uuid references public.requirements(id) on delete set null,
  section_name text not null,
  content text not null,
  source_references jsonb not null default '[]'::jsonb,
  supporting_evidence jsonb not null default '[]'::jsonb,
  confidence_score integer,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.workspace_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  document_type text not null check (document_type in ('workspace', 'executive_summary', 'company_overview', 'technical_response', 'methodology', 'experience', 'experience_response', 'social_value', 'esg_response', 'risk_management', 'requirement_checklist', 'submission_timeline', 'bid_draft')),
  content text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.bid_requirements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  requirement_id uuid references public.requirements(id) on delete cascade,
  heading text not null,
  requirement text not null,
  category text not null default 'general',
  mandatory boolean not null default false,
  checklist_status text not null default 'todo' check (checklist_status in ('todo', 'drafted', 'complete')),
  missing_information_type text check (missing_information_type in ('document', 'certification', 'evidence', 'reference')),
  evidence_guidance text,
  source_excerpt text,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.bid_sections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  section_key text not null,
  title text not null,
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'ready_for_review', 'complete')),
  completion_percentage integer not null default 0 check (completion_percentage between 0 and 100),
  section_order integer not null default 0,
  guidance text,
  latest_draft_id uuid references public.response_library(id) on delete set null,
  latest_workspace_document_id uuid references public.workspace_documents(id) on delete set null,
  last_generated_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, project_id, section_key)
);

create table if not exists public.bid_tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  bid_section_id uuid references public.bid_sections(id) on delete set null,
  bid_requirement_id uuid references public.bid_requirements(id) on delete set null,
  title text not null,
  description text,
  owner_name text,
  task_type text not null default 'task' check (task_type in ('task', 'document', 'review', 'approval')),
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'complete')),
  priority text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  due_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.bid_timeline (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  milestone_key text not null,
  title text not null,
  details text,
  due_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'active', 'complete')),
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, project_id, milestone_key)
);

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  event_name text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.linkedin_growth_strategies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  platform text not null default 'linkedin' check (platform = 'linkedin'),
  posts_per_day integer not null default 8,
  repetition_window_days integer not null default 60,
  optimization_goal text not null default 'paid_conversions' check (optimization_goal in ('paid_conversions')),
  target_regions text[] not null default '{uk,us,canada,australia,eu}',
  target_personas text[] not null default '{procurement_managers,bid_writers,consultants,construction_firms,it_consultancies}',
  content_mix jsonb not null default '{"tender_tips":0.30,"procurement_updates":0.20,"winning_bid_examples":0.20,"compliance_guidance":0.15,"product_demonstrations":0.15}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.linkedin_posts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  strategy_id uuid references public.linkedin_growth_strategies(id) on delete set null,
  topic_key text not null,
  pillar text not null check (pillar in ('tender_tips', 'procurement_updates', 'winning_bid_examples', 'compliance_guidance', 'product_demonstrations')),
  region text not null check (region in ('uk', 'us', 'canada', 'australia', 'eu')),
  persona text not null check (persona in ('procurement_managers', 'bid_writers', 'consultants', 'construction_firms', 'it_consultancies')),
  title text not null,
  angle text not null,
  hook text,
  cta text,
  landing_page text,
  post_copy text,
  publish_at timestamptz,
  published_at timestamptz,
  status text not null default 'planned' check (status in ('planned', 'generated', 'approved', 'published', 'archived')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, topic_key)
);

create table if not exists public.linkedin_post_performance (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  linkedin_post_id text not null,
  topic_key text not null,
  pillar text not null,
  region text not null,
  persona text not null,
  impressions integer not null default 0,
  clicks integer not null default 0,
  signups integer not null default 0,
  trials integer not null default 0,
  paid_conversions integer not null default 0,
  optimization_score numeric(12,2) not null default 0,
  captured_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.opportunity_sources (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique check (source_key in ('contracts_finder', 'find_a_tender', 'ted_europe', 'sam_gov')),
  name text not null,
  base_url text not null,
  api_url text not null,
  authentication_type text not null default 'none' check (authentication_type in ('none', 'api_key')),
  scan_frequency_minutes integer not null default 240,
  status text not null default 'active' check (status in ('active', 'inactive', 'error')),
  last_scanned_at timestamptz,
  last_success_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.opportunity_alerts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  keywords text[] not null default '{}',
  industries text[] not null default '{}',
  locations text[] not null default '{}',
  minimum_contract_value numeric(14,2),
  maximum_contract_value numeric(14,2),
  is_active boolean not null default true,
  last_scanned_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_key text not null references public.opportunity_sources(source_key) on delete restrict,
  source_names text[] not null default '{}',
  external_id text not null,
  dedupe_key text not null,
  title text not null,
  description text not null,
  buyer_name text not null,
  buyer_identifier text,
  source_url text,
  source_notice_number text,
  locations text[] not null default '{}',
  industry_tags text[] not null default '{}',
  cpv_codes text[] not null default '{}',
  currency text not null default 'GBP',
  minimum_value numeric(14,2),
  maximum_value numeric(14,2),
  estimated_value numeric(14,2),
  published_at timestamptz,
  submission_deadline timestamptz,
  opportunity_status text not null default 'active',
  ai_summary text,
  source_payload jsonb not null default '{}'::jsonb,
  last_seen_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, dedupe_key),
  unique (organization_id, source_key, external_id)
);

create table if not exists public.opportunity_matches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  alert_id uuid not null references public.opportunity_alerts(id) on delete cascade,
  relevance_score integer not null default 0 check (relevance_score between 0 and 100),
  win_probability integer not null default 0 check (win_probability between 0 and 100),
  revenue_potential numeric(14,2) not null default 0,
  combined_score integer not null default 0 check (combined_score between 0 and 100),
  rationale text not null default '',
  match_status text not null default 'new' check (match_status in ('new', 'saved', 'dismissed', 'imported', 'alerted')),
  imported_project_id uuid references public.projects(id) on delete set null,
  alerted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, opportunity_id, alert_id)
);

create table if not exists public.opportunity_roi_score (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  estimated_contract_value numeric(14,2) not null default 0,
  expected_win_probability integer not null default 0 check (expected_win_probability between 0 and 100),
  expected_revenue numeric(14,2) not null default 0,
  bid_effort_score integer not null default 0 check (bid_effort_score between 0 and 100),
  roi_score integer not null default 0 check (roi_score between 0 and 100),
  recommendation text not null default 'worth_investigating' check (recommendation in ('bid_immediately', 'worth_investigating', 'low_probability', 'do_not_pursue')),
  justification text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, opportunity_id)
);

create table if not exists public.opportunity_priority (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  priority_score integer not null default 0 check (priority_score between 0 and 100),
  priority_band text not null default 'medium' check (priority_band in ('critical', 'high', 'medium', 'low')),
  quick_win boolean not null default false,
  high_value boolean not null default false,
  best_opportunity boolean not null default false,
  reasoning text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, opportunity_id)
);

create table if not exists public.opportunity_pipeline (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  current_stage text not null default 'opportunity' check (current_stage in ('opportunity', 'imported', 'bid_created', 'submitted', 'won', 'lost')),
  imported_at timestamptz,
  bid_created_at timestamptz,
  submitted_at timestamptz,
  won_at timestamptz,
  lost_at timestamptz,
  contract_value_won numeric(14,2),
  stage_history jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, opportunity_id)
);

create table if not exists public.bid_outcomes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  opportunity_id uuid references public.opportunities(id) on delete set null,
  contract_value numeric(14,2),
  outcome text not null default 'submitted' check (outcome in ('submitted', 'won', 'lost', 'shortlisted', 'rejected')),
  competitor_count integer,
  sector text not null default 'General',
  tender_type text not null default 'tender',
  client_name text not null default '',
  outcome_summary text,
  decision_factors jsonb not null default '[]'::jsonb,
  submitted_at timestamptz,
  decided_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, project_id),
  unique (organization_id, opportunity_id)
);

create table if not exists public.prediction_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  opportunity_id uuid references public.opportunities(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  title text not null default '',
  buyer_name text not null default '',
  sector text not null default 'General',
  service_line text not null default 'General',
  framework_name text,
  tender_type text not null default 'tender',
  estimated_contract_value numeric(14,2) not null default 0,
  expected_revenue numeric(14,2) not null default 0,
  win_probability integer not null default 0 check (win_probability between 0 and 100),
  confidence_score integer not null default 0 check (confidence_score between 0 and 100),
  bid_strength_score integer not null default 0 check (bid_strength_score between 0 and 100),
  evidence_strength_score integer not null default 0 check (evidence_strength_score between 0 and 100),
  compliance_confidence integer not null default 0 check (compliance_confidence between 0 and 100),
  delivery_confidence integer not null default 0 check (delivery_confidence between 0 and 100),
  commercial_confidence integer not null default 0 check (commercial_confidence between 0 and 100),
  risk_score integer not null default 0 check (risk_score between 0 and 100),
  strategic_fit_score integer not null default 0 check (strategic_fit_score between 0 and 100),
  review_score integer not null default 0 check (review_score between 0 and 100),
  knowledge_coverage_score integer not null default 0 check (knowledge_coverage_score between 0 and 100),
  recommendation text not null default 'borderline' check (recommendation in ('strong_bid', 'bid', 'borderline', 'no_bid')),
  recommendation_rationale text not null default '',
  strategist_summary text not null default '',
  score_breakdown jsonb not null default '{}'::jsonb,
  evidence_snapshot jsonb not null default '{}'::jsonb,
  used_document_types jsonb not null default '[]'::jsonb,
  actual_outcome text check (actual_outcome in ('won', 'lost', 'shortlisted', 'rejected')),
  prediction_accuracy_score integer check (prediction_accuracy_score between 0 and 100),
  outcome_recorded_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.prediction_factors (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  prediction_history_id uuid not null references public.prediction_history(id) on delete cascade,
  opportunity_id uuid references public.opportunities(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  factor_category text not null check (factor_category in ('strength', 'weakness', 'opportunity', 'risk')),
  factor_code text not null default '',
  title text not null,
  explanation text not null default '',
  evidence text not null default '',
  impact_score integer not null default 0 check (impact_score between -100 and 100),
  remediation text not null default '',
  factor_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.prediction_metrics (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  dimension_type text not null check (dimension_type in ('overall', 'sector', 'buyer', 'service_line', 'framework', 'document_type')),
  dimension_key text not null default 'all',
  sample_size integer not null default 0,
  won_count integer not null default 0,
  lost_count integer not null default 0,
  shortlisted_count integer not null default 0,
  rejected_count integer not null default 0,
  actual_win_rate integer not null default 0 check (actual_win_rate between 0 and 100),
  average_predicted_win_probability integer not null default 0 check (average_predicted_win_probability between 0 and 100),
  average_accuracy_score integer not null default 0 check (average_accuracy_score between 0 and 100),
  last_outcome_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, dimension_type, dimension_key)
);

create table if not exists public.review_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  overall_bid_score integer not null default 0 check (overall_bid_score between 0 and 100),
  compliance_score integer not null default 0 check (compliance_score between 0 and 100),
  quality_score integer not null default 0 check (quality_score between 0 and 100),
  evidence_score integer not null default 0 check (evidence_score between 0 and 100),
  win_probability_adjustment integer not null default 0 check (win_probability_adjustment between -20 and 20),
  submission_readiness_score integer not null default 0 check (submission_readiness_score between 0 and 100),
  risk_score integer not null default 0 check (risk_score between 0 and 100),
  confidence_score integer not null default 0 check (confidence_score between 0 and 100),
  readiness_state text not null default 'needs_review' check (readiness_state in ('not_ready', 'needs_review', 'ready_for_submission')),
  submission_recommendation text not null default 'Needs Review',
  strengths jsonb not null default '[]'::jsonb,
  weaknesses jsonb not null default '[]'::jsonb,
  competitive_position text not null default '',
  section_scores jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.review_findings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  review_history_id uuid not null references public.review_history(id) on delete cascade,
  section_key text,
  severity text not null default 'medium' check (severity in ('critical', 'high', 'medium', 'low')),
  finding_type text not null check (finding_type in ('missing_response', 'weak_response', 'unsupported_claim', 'missing_evidence', 'compliance_gap')),
  issue text not null,
  reason text not null,
  evidence text not null default '',
  requirement_heading text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.review_recommendations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  review_history_id uuid not null references public.review_history(id) on delete cascade,
  review_finding_id uuid references public.review_findings(id) on delete set null,
  section_key text,
  issue text not null,
  reason text not null,
  suggested_fix text not null,
  improved_draft text not null,
  apply_status text not null default 'pending' check (apply_status in ('pending', 'applied')),
  applied_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.organization_branding_settings (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  logo_url text,
  company_name text not null default '',
  primary_color text not null default '#2DD4BF',
  secondary_color text not null default '#0F172A',
  header_text text not null default '',
  footer_text text not null default '',
  contact_information text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.export_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  template_type text not null check (template_type in ('public_sector', 'nhs', 'local_government', 'framework', 'custom')),
  description text not null default '',
  readiness_threshold integer not null default 80 check (readiness_threshold between 50 and 100),
  compliance_threshold integer not null default 80 check (compliance_threshold between 50 and 100),
  evidence_threshold integer not null default 70 check (evidence_threshold between 40 and 100),
  include_appendices boolean not null default true,
  include_supporting_evidence boolean not null default true,
  section_order jsonb not null default '[]'::jsonb,
  is_system boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.export_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  template_id uuid references public.export_templates(id) on delete set null,
  export_type text not null check (export_type in ('bid_pack_docx', 'bid_pack_pdf', 'executive_summary_pdf', 'compliance_pack_pdf', 'evidence_pack_pdf')),
  file_name text not null,
  content_type text not null,
  generated_by uuid references auth.users(id) on delete set null,
  final_submission_recommendation text not null default 'Needs Review' check (final_submission_recommendation in ('Not Ready', 'Needs Review', 'Ready For Submission')),
  export_risk_score integer not null default 0 check (export_risk_score between 0 and 100),
  validation_snapshot jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create or replace function public.current_user_organization_ids()
returns setof uuid
language sql
stable
as $$
  select organization_id
  from public.organization_members
  where user_id = auth.uid();
$$;

create index if not exists idx_org_members_user on public.organization_members (user_id);
create index if not exists idx_projects_org_deadline on public.projects (organization_id, submission_deadline desc);
create index if not exists idx_tender_uploads_project on public.tender_uploads (project_id, created_at desc);
create index if not exists idx_requirements_project on public.requirements (project_id, mandatory, response_status);
create index if not exists idx_compliance_checks_project on public.compliance_checks (project_id, readiness_state, readiness_score desc);
create index if not exists idx_knowledge_assets_org_type on public.knowledge_assets (organization_id, asset_type, created_at desc);
create index if not exists idx_knowledge_documents_org_type on public.knowledge_documents (organization_id, document_type, times_referenced desc);
create index if not exists idx_knowledge_documents_org_impact on public.knowledge_documents (organization_id, average_win_probability_lift desc, influenced_bids_count desc);
create index if not exists idx_knowledge_documents_org_status on public.knowledge_documents (organization_id, processing_status, upload_date desc);
create index if not exists idx_knowledge_chunks_doc_order on public.knowledge_chunks (knowledge_document_id, chunk_index);
create index if not exists idx_knowledge_embeddings_chunk on public.knowledge_embeddings (knowledge_chunk_id);
create index if not exists idx_knowledge_usage_org_project on public.knowledge_usage (organization_id, project_id, created_at desc);
create index if not exists idx_knowledge_usage_org_document on public.knowledge_usage (organization_id, knowledge_document_id, created_at desc);
create index if not exists idx_knowledge_coverage_org_project on public.knowledge_coverage (organization_id, project_id, coverage_score desc);
create index if not exists idx_knowledge_performance_org_impact on public.knowledge_performance (organization_id, revenue_impact desc, win_probability_improvement desc);
create index if not exists idx_response_library_org_section on public.response_library (organization_id, section_name);
create index if not exists idx_workspace_documents_project_type on public.workspace_documents (project_id, document_type, updated_at desc);
create index if not exists idx_bid_requirements_project_status on public.bid_requirements (project_id, mandatory, checklist_status);
create index if not exists idx_bid_sections_project_order on public.bid_sections (project_id, section_order, completion_percentage desc);
create index if not exists idx_bid_tasks_project_status on public.bid_tasks (project_id, status, due_at asc);
create index if not exists idx_bid_timeline_project_due on public.bid_timeline (project_id, due_at asc, sort_order);
create index if not exists idx_analytics_events_org_event on public.analytics_events (organization_id, event_name, created_at desc);
create index if not exists idx_linkedin_strategy_org on public.linkedin_growth_strategies (organization_id, created_at desc);
create index if not exists idx_linkedin_posts_org_publish on public.linkedin_posts (organization_id, publish_at desc);
create index if not exists idx_linkedin_posts_topic_key on public.linkedin_posts (organization_id, topic_key);
create index if not exists idx_linkedin_perf_org_score on public.linkedin_post_performance (organization_id, optimization_score desc, captured_at desc);
create index if not exists idx_opportunity_sources_status on public.opportunity_sources (status, last_scanned_at desc);
create index if not exists idx_opportunity_alerts_org_active on public.opportunity_alerts (organization_id, is_active, created_at desc);
create index if not exists idx_opportunities_org_published on public.opportunities (organization_id, published_at desc);
create index if not exists idx_opportunities_org_deadline on public.opportunities (organization_id, submission_deadline asc);
create index if not exists idx_opportunities_org_dedupe on public.opportunities (organization_id, dedupe_key);
create index if not exists idx_opportunity_matches_org_status on public.opportunity_matches (organization_id, match_status, combined_score desc);
create index if not exists idx_opportunity_matches_org_alert on public.opportunity_matches (organization_id, alert_id, combined_score desc);
create index if not exists idx_opportunity_roi_org_score on public.opportunity_roi_score (organization_id, roi_score desc, expected_revenue desc);
create index if not exists idx_opportunity_priority_org_score on public.opportunity_priority (organization_id, priority_score desc, priority_band);
create index if not exists idx_opportunity_pipeline_org_stage on public.opportunity_pipeline (organization_id, current_stage, updated_at desc);
create index if not exists idx_bid_outcomes_org_outcome on public.bid_outcomes (organization_id, outcome, decided_at desc);
create index if not exists idx_bid_outcomes_org_sector on public.bid_outcomes (organization_id, sector, outcome);
create index if not exists idx_bid_outcomes_org_client on public.bid_outcomes (organization_id, client_name, outcome);
create index if not exists idx_prediction_history_org_created on public.prediction_history (organization_id, created_at desc);
create index if not exists idx_prediction_history_org_opportunity on public.prediction_history (organization_id, opportunity_id, created_at desc);
create index if not exists idx_prediction_history_org_project on public.prediction_history (organization_id, project_id, created_at desc);
create index if not exists idx_prediction_history_org_recommendation on public.prediction_history (organization_id, recommendation, win_probability desc);
create index if not exists idx_prediction_history_org_accuracy on public.prediction_history (organization_id, actual_outcome, prediction_accuracy_score desc);
create index if not exists idx_prediction_factors_history_order on public.prediction_factors (prediction_history_id, factor_category, factor_order);
create index if not exists idx_prediction_factors_org_context on public.prediction_factors (organization_id, opportunity_id, project_id);
create index if not exists idx_prediction_metrics_org_dimension on public.prediction_metrics (organization_id, dimension_type, average_accuracy_score desc);
create index if not exists idx_review_history_project_created on public.review_history (project_id, created_at desc);
create index if not exists idx_review_history_org_readiness on public.review_history (organization_id, readiness_state, submission_readiness_score desc);
create index if not exists idx_review_findings_history_severity on public.review_findings (review_history_id, severity, created_at desc);
create index if not exists idx_review_findings_project_section on public.review_findings (project_id, section_key, severity);
create index if not exists idx_review_recommendations_history_status on public.review_recommendations (review_history_id, apply_status, created_at desc);
create index if not exists idx_review_recommendations_project_section on public.review_recommendations (project_id, section_key, apply_status);
create index if not exists idx_export_templates_org_type on public.export_templates (organization_id, template_type, created_at desc);
create index if not exists idx_export_history_project_generated on public.export_history (project_id, generated_at desc);
create index if not exists idx_export_history_org_type on public.export_history (organization_id, export_type, generated_at desc);
create index if not exists idx_audit_logs_org_action on public.audit_logs (organization_id, action, created_at desc);

create trigger set_organizations_updated_at before update on public.organizations for each row execute procedure public.set_updated_at();
create trigger set_subscriptions_updated_at before update on public.subscriptions for each row execute procedure public.set_updated_at();
create trigger set_projects_updated_at before update on public.projects for each row execute procedure public.set_updated_at();
create trigger set_tender_analyses_updated_at before update on public.tender_analyses for each row execute procedure public.set_updated_at();
create trigger set_requirements_updated_at before update on public.requirements for each row execute procedure public.set_updated_at();
create trigger set_compliance_checks_updated_at before update on public.compliance_checks for each row execute procedure public.set_updated_at();
create trigger set_knowledge_assets_updated_at before update on public.knowledge_assets for each row execute procedure public.set_updated_at();
create trigger set_knowledge_documents_updated_at before update on public.knowledge_documents for each row execute procedure public.set_updated_at();
create trigger set_knowledge_coverage_updated_at before update on public.knowledge_coverage for each row execute procedure public.set_updated_at();
create trigger set_knowledge_performance_updated_at before update on public.knowledge_performance for each row execute procedure public.set_updated_at();
create trigger set_response_library_updated_at before update on public.response_library for each row execute procedure public.set_updated_at();
create trigger set_workspace_documents_updated_at before update on public.workspace_documents for each row execute procedure public.set_updated_at();
create trigger set_bid_requirements_updated_at before update on public.bid_requirements for each row execute procedure public.set_updated_at();
create trigger set_bid_sections_updated_at before update on public.bid_sections for each row execute procedure public.set_updated_at();
create trigger set_bid_tasks_updated_at before update on public.bid_tasks for each row execute procedure public.set_updated_at();
create trigger set_bid_timeline_updated_at before update on public.bid_timeline for each row execute procedure public.set_updated_at();
create trigger set_linkedin_growth_strategies_updated_at before update on public.linkedin_growth_strategies for each row execute procedure public.set_updated_at();
create trigger set_linkedin_posts_updated_at before update on public.linkedin_posts for each row execute procedure public.set_updated_at();
create trigger set_opportunity_sources_updated_at before update on public.opportunity_sources for each row execute procedure public.set_updated_at();
create trigger set_opportunity_alerts_updated_at before update on public.opportunity_alerts for each row execute procedure public.set_updated_at();
create trigger set_opportunities_updated_at before update on public.opportunities for each row execute procedure public.set_updated_at();
create trigger set_opportunity_matches_updated_at before update on public.opportunity_matches for each row execute procedure public.set_updated_at();
create trigger set_opportunity_roi_score_updated_at before update on public.opportunity_roi_score for each row execute procedure public.set_updated_at();
create trigger set_opportunity_priority_updated_at before update on public.opportunity_priority for each row execute procedure public.set_updated_at();
create trigger set_opportunity_pipeline_updated_at before update on public.opportunity_pipeline for each row execute procedure public.set_updated_at();
create trigger set_bid_outcomes_updated_at before update on public.bid_outcomes for each row execute procedure public.set_updated_at();
create trigger set_prediction_history_updated_at before update on public.prediction_history for each row execute procedure public.set_updated_at();
create trigger set_prediction_factors_updated_at before update on public.prediction_factors for each row execute procedure public.set_updated_at();
create trigger set_prediction_metrics_updated_at before update on public.prediction_metrics for each row execute procedure public.set_updated_at();
create trigger set_review_history_updated_at before update on public.review_history for each row execute procedure public.set_updated_at();
create trigger set_review_findings_updated_at before update on public.review_findings for each row execute procedure public.set_updated_at();
create trigger set_review_recommendations_updated_at before update on public.review_recommendations for each row execute procedure public.set_updated_at();
create trigger set_organization_branding_settings_updated_at before update on public.organization_branding_settings for each row execute procedure public.set_updated_at();
create trigger set_export_templates_updated_at before update on public.export_templates for each row execute procedure public.set_updated_at();

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.subscriptions enable row level security;
alter table public.projects enable row level security;
alter table public.tender_uploads enable row level security;
alter table public.tender_analyses enable row level security;
alter table public.requirements enable row level security;
alter table public.compliance_checks enable row level security;
alter table public.knowledge_assets enable row level security;
alter table public.knowledge_documents enable row level security;
alter table public.knowledge_chunks enable row level security;
alter table public.knowledge_embeddings enable row level security;
alter table public.knowledge_usage enable row level security;
alter table public.knowledge_coverage enable row level security;
alter table public.knowledge_performance enable row level security;
alter table public.response_library enable row level security;
alter table public.workspace_documents enable row level security;
alter table public.bid_requirements enable row level security;
alter table public.bid_sections enable row level security;
alter table public.bid_tasks enable row level security;
alter table public.bid_timeline enable row level security;
alter table public.analytics_events enable row level security;
alter table public.linkedin_growth_strategies enable row level security;
alter table public.linkedin_posts enable row level security;
alter table public.linkedin_post_performance enable row level security;
alter table public.opportunity_sources enable row level security;
alter table public.opportunity_alerts enable row level security;
alter table public.opportunities enable row level security;
alter table public.opportunity_matches enable row level security;
alter table public.opportunity_roi_score enable row level security;
alter table public.opportunity_priority enable row level security;
alter table public.opportunity_pipeline enable row level security;
alter table public.bid_outcomes enable row level security;
alter table public.prediction_history enable row level security;
alter table public.prediction_factors enable row level security;
alter table public.prediction_metrics enable row level security;
alter table public.review_history enable row level security;
alter table public.review_findings enable row level security;
alter table public.review_recommendations enable row level security;
alter table public.organization_branding_settings enable row level security;
alter table public.export_templates enable row level security;
alter table public.export_history enable row level security;
alter table public.audit_logs enable row level security;

create policy "organizations_select_members" on public.organizations
for select using (id in (select public.current_user_organization_ids()));

create policy "organizations_update_admins" on public.organizations
for update using (
  id in (
    select organization_id from public.organization_members where user_id = auth.uid() and role in ('owner', 'admin')
  )
);

create policy "organization_members_select_members" on public.organization_members
for select using (organization_id in (select public.current_user_organization_ids()));

create policy "subscriptions_access_members" on public.subscriptions
for all using (organization_id in (select public.current_user_organization_ids()))
with check (organization_id in (select public.current_user_organization_ids()));

create policy "projects_access_members" on public.projects
for all using (organization_id in (select public.current_user_organization_ids()))
with check (organization_id in (select public.current_user_organization_ids()));

create policy "tender_uploads_access_members" on public.tender_uploads
for all using (organization_id in (select public.current_user_organization_ids()))
with check (organization_id in (select public.current_user_organization_ids()));

create policy "tender_analyses_access_members" on public.tender_analyses
for all using (organization_id in (select public.current_user_organization_ids()))
with check (organization_id in (select public.current_user_organization_ids()));

create policy "requirements_access_members" on public.requirements
for all using (organization_id in (select public.current_user_organization_ids()))
with check (organization_id in (select public.current_user_organization_ids()));

create policy "compliance_checks_access_members" on public.compliance_checks
for all using (organization_id in (select public.current_user_organization_ids()))
with check (organization_id in (select public.current_user_organization_ids()));

create policy "knowledge_assets_access_members" on public.knowledge_assets
for all using (organization_id in (select public.current_user_organization_ids()))
with check (organization_id in (select public.current_user_organization_ids()));

create policy "knowledge_documents_access_members" on public.knowledge_documents
for all using (organization_id in (select public.current_user_organization_ids()))
with check (organization_id in (select public.current_user_organization_ids()));

create policy "knowledge_chunks_access_members" on public.knowledge_chunks
for all using (organization_id in (select public.current_user_organization_ids()))
with check (organization_id in (select public.current_user_organization_ids()));

create policy "knowledge_embeddings_access_members" on public.knowledge_embeddings
for all using (organization_id in (select public.current_user_organization_ids()))
with check (organization_id in (select public.current_user_organization_ids()));

create policy "knowledge_usage_access_members" on public.knowledge_usage
for all using (organization_id in (select public.current_user_organization_ids()))
with check (organization_id in (select public.current_user_organization_ids()));

create policy "knowledge_coverage_access_members" on public.knowledge_coverage
for all using (organization_id in (select public.current_user_organization_ids()))
with check (organization_id in (select public.current_user_organization_ids()));

create policy "knowledge_performance_access_members" on public.knowledge_performance
for all using (organization_id in (select public.current_user_organization_ids()))
with check (organization_id in (select public.current_user_organization_ids()));

create policy "response_library_access_members" on public.response_library
for all using (organization_id in (select public.current_user_organization_ids()))
with check (organization_id in (select public.current_user_organization_ids()));

create policy "workspace_documents_access_members" on public.workspace_documents
for all using (organization_id in (select public.current_user_organization_ids()))
with check (organization_id in (select public.current_user_organization_ids()));

create policy "bid_requirements_access_members" on public.bid_requirements
for all using (organization_id in (select public.current_user_organization_ids()))
with check (organization_id in (select public.current_user_organization_ids()));

create policy "bid_sections_access_members" on public.bid_sections
for all using (organization_id in (select public.current_user_organization_ids()))
with check (organization_id in (select public.current_user_organization_ids()));

create policy "bid_tasks_access_members" on public.bid_tasks
for all using (organization_id in (select public.current_user_organization_ids()))
with check (organization_id in (select public.current_user_organization_ids()));

create policy "bid_timeline_access_members" on public.bid_timeline
for all using (organization_id in (select public.current_user_organization_ids()))
with check (organization_id in (select public.current_user_organization_ids()));

create policy "analytics_events_access_members" on public.analytics_events
for all using (organization_id in (select public.current_user_organization_ids()))
with check (organization_id in (select public.current_user_organization_ids()));

create policy "linkedin_growth_strategies_access_members" on public.linkedin_growth_strategies
for all using (organization_id in (select public.current_user_organization_ids()))
with check (organization_id in (select public.current_user_organization_ids()));

create policy "linkedin_posts_access_members" on public.linkedin_posts
for all using (organization_id in (select public.current_user_organization_ids()))
with check (organization_id in (select public.current_user_organization_ids()));

create policy "linkedin_post_performance_access_members" on public.linkedin_post_performance
for all using (organization_id in (select public.current_user_organization_ids()))
with check (organization_id in (select public.current_user_organization_ids()));

create policy "opportunity_sources_select_authenticated" on public.opportunity_sources
for select using (auth.uid() is not null);

create policy "opportunity_alerts_access_members" on public.opportunity_alerts
for all using (organization_id in (select public.current_user_organization_ids()))
with check (organization_id in (select public.current_user_organization_ids()));

create policy "opportunities_access_members" on public.opportunities
for all using (organization_id in (select public.current_user_organization_ids()))
with check (organization_id in (select public.current_user_organization_ids()));

create policy "opportunity_matches_access_members" on public.opportunity_matches
for all using (organization_id in (select public.current_user_organization_ids()))
with check (organization_id in (select public.current_user_organization_ids()));

create policy "opportunity_roi_score_access_members" on public.opportunity_roi_score
for all using (organization_id in (select public.current_user_organization_ids()))
with check (organization_id in (select public.current_user_organization_ids()));

create policy "opportunity_priority_access_members" on public.opportunity_priority
for all using (organization_id in (select public.current_user_organization_ids()))
with check (organization_id in (select public.current_user_organization_ids()));

create policy "opportunity_pipeline_access_members" on public.opportunity_pipeline
for all using (organization_id in (select public.current_user_organization_ids()))
with check (organization_id in (select public.current_user_organization_ids()));

create policy "bid_outcomes_access_members" on public.bid_outcomes
for all using (organization_id in (select public.current_user_organization_ids()))
with check (organization_id in (select public.current_user_organization_ids()));

create policy "prediction_history_access_members" on public.prediction_history
for all using (organization_id in (select public.current_user_organization_ids()))
with check (organization_id in (select public.current_user_organization_ids()));

create policy "prediction_factors_access_members" on public.prediction_factors
for all using (organization_id in (select public.current_user_organization_ids()))
with check (organization_id in (select public.current_user_organization_ids()));

create policy "prediction_metrics_access_members" on public.prediction_metrics
for all using (organization_id in (select public.current_user_organization_ids()))
with check (organization_id in (select public.current_user_organization_ids()));

create policy "review_history_access_members" on public.review_history
for all using (organization_id in (select public.current_user_organization_ids()))
with check (organization_id in (select public.current_user_organization_ids()));

create policy "review_findings_access_members" on public.review_findings
for all using (organization_id in (select public.current_user_organization_ids()))
with check (organization_id in (select public.current_user_organization_ids()));

create policy "review_recommendations_access_members" on public.review_recommendations
for all using (organization_id in (select public.current_user_organization_ids()))
with check (organization_id in (select public.current_user_organization_ids()));

create policy "organization_branding_settings_access_members" on public.organization_branding_settings
for all using (organization_id in (select public.current_user_organization_ids()))
with check (organization_id in (select public.current_user_organization_ids()));

create policy "export_templates_access_members" on public.export_templates
for all using (organization_id in (select public.current_user_organization_ids()))
with check (organization_id in (select public.current_user_organization_ids()));

create policy "export_history_access_members" on public.export_history
for all using (organization_id in (select public.current_user_organization_ids()))
with check (organization_id in (select public.current_user_organization_ids()));

create policy "audit_logs_access_admins" on public.audit_logs
for select using (
  organization_id in (
    select organization_id from public.organization_members where user_id = auth.uid() and role in ('owner', 'admin')
  )
);

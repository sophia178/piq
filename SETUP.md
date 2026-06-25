# PursuitIQ Setup

## 1) Create a Supabase project
- Create a project in the Supabase dashboard.
- Keep the project password safe.

## 2) Run the database migration SQL
- Open Supabase Dashboard → SQL Editor.
- Create a new query.
- Paste and run the full contents of:
  - `supabase/migrations/0001_bidpilot_init.sql`

## 3) Enable Row Level Security (RLS)
- The migration enables RLS on the core tables and creates policies.
- Verify in Supabase Dashboard → Table Editor:
  - Open a table (e.g. `organizations`) → RLS should be enabled.

## 4) Get Supabase API keys
- Supabase Dashboard → Project Settings → API
  - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
  - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

## 5) Configure local environment variables
- Copy `.env.local.example` to `.env.local`
- Fill in values.

## 6) Verify Supabase setup
- Start the app locally.
- Call:
  - `GET /api/health`
- Expect:
  - HTTP `200`
  - JSON showing `ok: true` and all required tables present.

## 7) Stripe product + webhook setup

### Products / prices
Create three recurring monthly prices in Stripe (GBP):
- Solo Consultant: £149/month
- SME: £399/month
- Agency: £799/month

Set the price IDs in `.env.local`:
- `STRIPE_SOLO_PRICE_ID`
- `STRIPE_SME_PRICE_ID`
- `STRIPE_AGENCY_PRICE_ID`

### Webhook endpoint
- Stripe Dashboard → Developers → Webhooks → Add endpoint
- Endpoint URL:
  - `https://<your-domain>/api/stripe/webhook`
- Events to send:
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
- Copy the signing secret into:
  - `STRIPE_WEBHOOK_SECRET`


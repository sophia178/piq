# PursuitIQ Deployment (Vercel + Supabase + Stripe)

## 1) Domain
- Buy a domain such as `pursuitiq.com` or `pursuitiq.ai`.

## 2) Vercel project
- Create a Vercel account.
- Import the GitHub repository into Vercel.
- Framework preset: Next.js
- Build command: `npm run build`
- Install command: `npm install`
- Output: default

## 3) Environment variables
- In Vercel Dashboard → Project → Settings → Environment Variables, add all values from `.env.local.example`.
- Use production values for:
  - Supabase project URL and keys
  - OpenAI API key
  - Stripe keys + webhook secret + price IDs
  - `NEXT_PUBLIC_APP_URL` set to your deployed domain

## 4) Supabase migrations
- In Supabase Dashboard → SQL Editor, run the contents of:
  - `supabase/migrations/0001_bidpilot_init.sql`
- Verify:
  - `GET https://<your-domain>/api/health` returns `200` and `ok: true`

## 5) Stripe products + webhook
- Create three GBP monthly subscription prices:
  - Solo Consultant: £149/month
  - SME: £399/month
  - Agency: £799/month
- Put the Stripe price IDs into Vercel env:
  - `STRIPE_SOLO_PRICE_ID`
  - `STRIPE_SME_PRICE_ID`
  - `STRIPE_AGENCY_PRICE_ID`
- Stripe webhook:
  - Endpoint: `https://<your-domain>/api/stripe/webhook`
  - Events:
    - `checkout.session.completed`
    - `customer.subscription.updated`
    - `customer.subscription.deleted`
  - Copy signing secret into `STRIPE_WEBHOOK_SECRET`

## 6) End-to-end production test
- Visit `https://<your-domain>/signup`
- Complete:
  - Signup → email verification → onboarding → plan selection → Stripe checkout → return to app
- Verify:
  - `https://<your-domain>/dashboard` loads after onboarding
  - `GET https://<your-domain>/api/health` returns `200`

## 7) Launch checklist
- Post your first LinkedIn announcement with the homepage OG preview.


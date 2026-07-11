import { z } from "zod";

const rawEnv = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  openAiApiKey: process.env.OPENAI_API_KEY,
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  stripePublishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  stripeSoloPriceId: process.env.STRIPE_SOLO_PRICE_ID ?? process.env.STRIPE_STARTER_PRICE_ID,
  stripeSmePriceId: process.env.STRIPE_SME_PRICE_ID ?? process.env.STRIPE_PROFESSIONAL_PRICE_ID,
  stripeAgencyPriceId: process.env.STRIPE_AGENCY_PRICE_ID,
  contractsFinderApiUrl: process.env.CONTRACTS_FINDER_API_URL,
  findATenderApiUrl: process.env.FIND_A_TENDER_API_URL,
  tedApiUrl: process.env.TED_API_URL,
  samGovApiUrl: process.env.SAM_GOV_API_URL,
  samGovApiKey: process.env.SAM_GOV_API_KEY,
  opportunityScanCronSecret: process.env.OPPORTUNITY_SCAN_CRON_SECRET,
};

const EnvSchemaDev = z.object({
  appUrl: z.string().url(),
  supabaseUrl: z.string().url().optional(),
  supabaseAnonKey: z.string().min(1).optional(),
  supabaseServiceRoleKey: z.string().min(1).optional(),
  openAiApiKey: z.string().min(1).optional(),
  stripeSecretKey: z.string().min(1).optional(),
  stripeWebhookSecret: z.string().min(1).optional(),
  stripePublishableKey: z.string().min(1).optional(),
  stripeSoloPriceId: z.string().min(1).optional(),
  stripeSmePriceId: z.string().min(1).optional(),
  stripeAgencyPriceId: z.string().min(1).optional(),
  contractsFinderApiUrl: z.string().url().optional(),
  findATenderApiUrl: z.string().url().optional(),
  tedApiUrl: z.string().url().optional(),
  samGovApiUrl: z.string().url().optional(),
  samGovApiKey: z.string().min(1).optional(),
  opportunityScanCronSecret: z.string().min(1).optional(),
});

const parsed = EnvSchemaDev.safeParse(rawEnv);

if (!parsed.success) {
  const keyToEnvVar: Record<string, string> = {
    appUrl: "NEXT_PUBLIC_APP_URL",
    supabaseUrl: "NEXT_PUBLIC_SUPABASE_URL",
    supabaseAnonKey: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    supabaseServiceRoleKey: "SUPABASE_SERVICE_ROLE_KEY",
    openAiApiKey: "OPENAI_API_KEY",
    contractsFinderApiUrl: "CONTRACTS_FINDER_API_URL",
    findATenderApiUrl: "FIND_A_TENDER_API_URL",
    tedApiUrl: "TED_API_URL",
    samGovApiUrl: "SAM_GOV_API_URL",
    samGovApiKey: "SAM_GOV_API_KEY",
    opportunityScanCronSecret: "OPPORTUNITY_SCAN_CRON_SECRET",
  };
  const details = parsed.error.issues
    .map((issue) => {
      const key = issue.path.join(".") || "env";
      const envVar = keyToEnvVar[key] ?? key;
      return `${envVar}: ${issue.message}`;
    })
    .join("\n");
  throw new Error(`Invalid environment configuration:\n${details}`);
}

export const env = parsed.data;

export function assertProductionEnv() {
  const isBuildPhase = (process.env.NEXT_PHASE ?? "").includes("build");
  if (isBuildPhase) return;
  if (process.env.NODE_ENV !== "production") return;

  const keyToEnvVar: Record<string, string> = {
    supabaseUrl: "NEXT_PUBLIC_SUPABASE_URL",
    supabaseAnonKey: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    supabaseServiceRoleKey: "SUPABASE_SERVICE_ROLE_KEY",
    openAiApiKey: "OPENAI_API_KEY",
  };

  const requiredKeys = Object.keys(keyToEnvVar) as Array<keyof typeof keyToEnvVar>;
  const missing = requiredKeys
    .map((key) => ({ key, value: (env as any)[key] as string | undefined }))
    .filter((item) => !item.value)
    .map((item) => keyToEnvVar[item.key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables:\n${missing.map((name) => `- ${name}`).join("\n")}`);
  }
}

export function hasSupabaseEnv() {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey && env.supabaseServiceRoleKey);
}

export function hasOpenAIEnv() {
  return Boolean(env.openAiApiKey);
}

export function hasStripeEnv() {
  return Boolean(env.stripeSecretKey && env.stripeWebhookSecret && env.stripeSoloPriceId && env.stripeSmePriceId && env.stripeAgencyPriceId);
}

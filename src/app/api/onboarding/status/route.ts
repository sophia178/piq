import { NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/platform";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userData.user.id)
    .limit(1)
    .maybeSingle();

  const organizationId = (membership?.organization_id as string | undefined) ?? null;
  if (!organizationId) {
    return NextResponse.json({
      user: { id: userData.user.id, email: userData.user.email ?? null, name: (userData.user.user_metadata?.full_name as string | undefined) ?? null },
      organization: null,
      subscription: null,
    });
  }

  const [{ data: organization }, { data: subscription }] = await Promise.all([
    supabase
      .from("organizations")
      .select("id, company_name, industry, website, employee_count, plan_tier")
      .eq("id", organizationId)
      .maybeSingle(),
    supabase.from("subscriptions").select("status, stripe_price_id, current_period_end").eq("organization_id", organizationId).maybeSingle(),
  ]);

  const service = createServiceSupabaseClient();
  const { data: latestSubscription } =
    service && !subscription
      ? await service.from("subscriptions").select("status, stripe_price_id, current_period_end").eq("organization_id", organizationId).maybeSingle()
      : { data: null };

  return NextResponse.json({
    user: { id: userData.user.id, email: userData.user.email ?? null, name: (userData.user.user_metadata?.full_name as string | undefined) ?? null },
    organization: organization
      ? {
          id: organization.id as string,
          companyName: organization.company_name as string,
          industry: organization.industry as string,
          website: (organization.website as string | null) ?? null,
          employeeCount: (organization.employee_count as string | null) ?? null,
          planTier: organization.plan_tier as string,
        }
      : null,
    subscription: (subscription ?? latestSubscription) ? (subscription ?? latestSubscription) : null,
  });
}


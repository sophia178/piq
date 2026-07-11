export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { createCheckoutSession, createServerSupabaseClient, createServiceSupabaseClient, trackAuditEvent } from "@/lib/platform";

export async function POST(request: NextRequest) {
  const tier = request.nextUrl.searchParams.get("tier");

  if (tier !== "starter" && tier !== "professional" && tier !== "agency") {
    return NextResponse.json({ error: "Unsupported plan tier." }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    return NextResponse.json({ error: "You must be logged in to start checkout." }, { status: 401 });
  }

  const service = createServiceSupabaseClient();
  if (!service) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const { data: membership } = await service
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userData.user.id)
    .limit(1)
    .maybeSingle();

  if (!membership?.organization_id) {
    return NextResponse.json({ error: "Organization setup is required before checkout." }, { status: 400 });
  }

  const session = await createCheckoutSession({ tier, organizationId: membership.organization_id as string, userId: userData.user.id });
  if (!session.url) {
    return NextResponse.json({ error: "Unable to create checkout redirect." }, { status: 500 });
  }

  await trackAuditEvent({ action: "billing.checkout_started", entityType: "subscription", metadata: { tier } });

  return NextResponse.redirect(session.url);
}

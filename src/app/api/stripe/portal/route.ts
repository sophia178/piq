export const dynamic = 'force-dynamic';
import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { env, hasStripeEnv } from "@/lib/env";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/platform";

export async function POST(request: NextRequest) {
  try {
    if (!hasStripeEnv()) {
      return NextResponse.json({ error: "Stripe is not configured." }, { status: 503 });
    }

    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return NextResponse.json({ error: "You must be logged in to manage billing." }, { status: 401 });
    }

    const { data: membership } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", userData.user.id)
      .limit(1)
      .maybeSingle();

    const organizationId = (membership?.organization_id as string | undefined) ?? null;
    if (!organizationId) {
      return NextResponse.json({ error: "Organization setup is required before billing portal access." }, { status: 400 });
    }

    const service = createServiceSupabaseClient();
    if (!service) {
      return NextResponse.json({ error: "Supabase service client could not be created." }, { status: 503 });
    }

    const { data: subscription } = await service
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (!subscription?.stripe_customer_id) {
      return NextResponse.json({ error: "No active Stripe customer found for this organization." }, { status: 400 });
    }

    const stripe = new Stripe(env.stripeSecretKey!);
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id as string,
      return_url: `${env.appUrl}/billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Billing portal error:', error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

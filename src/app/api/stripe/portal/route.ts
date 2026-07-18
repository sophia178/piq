export const dynamic = 'force-dynamic';
import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { env, hasStripeEnv } from "@/lib/env";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/platform";

function isValidStripeCustomerId(value: string | null | undefined) {
  return Boolean(value && value.startsWith("cus_") && !value.includes("test_manual"));
}

function getSubscriptionStatusRank(status: string | null | undefined) {
  switch (status) {
    case "trialing":
      return 0;
    case "active":
      return 1;
    case "past_due":
      return 2;
    case "unpaid":
      return 3;
    case "canceled":
      return 5;
    default:
      return 4;
  }
}

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

    const stripe = new Stripe(env.stripeSecretKey!);
    const { data: subscriptions, error: subscriptionsError } = await service
      .from("subscriptions")
      .select("stripe_customer_id, stripe_subscription_id, status, current_period_end, created_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });

    if (subscriptionsError) {
      return NextResponse.json({ error: subscriptionsError.message }, { status: 500 });
    }

    const prioritizedSubscriptions = [...(subscriptions ?? [])].sort((left: any, right: any) => {
      const statusRank = getSubscriptionStatusRank(left.status as string | null) - getSubscriptionStatusRank(right.status as string | null);
      if (statusRank !== 0) return statusRank;

      const leftPeriod = left.current_period_end ? new Date(left.current_period_end as string).getTime() : 0;
      const rightPeriod = right.current_period_end ? new Date(right.current_period_end as string).getTime() : 0;
      if (leftPeriod !== rightPeriod) return rightPeriod - leftPeriod;

      const leftCreated = left.created_at ? new Date(left.created_at as string).getTime() : 0;
      const rightCreated = right.created_at ? new Date(right.created_at as string).getTime() : 0;
      return rightCreated - leftCreated;
    });

    let customerId = prioritizedSubscriptions.find((subscription: any) =>
      isValidStripeCustomerId(subscription.stripe_customer_id as string | null | undefined),
    )?.stripe_customer_id as string | undefined;

    if (!customerId) {
      for (const subscription of prioritizedSubscriptions) {
        const stripeSubscriptionId = subscription.stripe_subscription_id as string | null | undefined;
        if (!stripeSubscriptionId) continue;

        const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
        const resolvedCustomerId =
          typeof stripeSubscription.customer === "string" ? stripeSubscription.customer : stripeSubscription.customer?.id ?? null;

        if (!isValidStripeCustomerId(resolvedCustomerId)) {
          continue;
        }

        await service
          .from("subscriptions")
          .update({ stripe_customer_id: resolvedCustomerId })
          .eq("organization_id", organizationId)
          .eq("stripe_subscription_id", stripeSubscriptionId);

        customerId = resolvedCustomerId;
        break;
      }
    }

    if (!customerId) {
      return NextResponse.json({ error: "No valid Stripe customer found for this organization. Please complete your subscription first." }, { status: 400 });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${env.appUrl}/billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Billing portal error:', error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

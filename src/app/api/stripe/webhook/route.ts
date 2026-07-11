export const dynamic = 'force-dynamic';
import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { env, hasStripeEnv } from "@/lib/env";
import { createServiceSupabaseClient, trackAuditEvent } from "@/lib/platform";

function resolvePlanTier(priceId: string | null | undefined) {
  if (!priceId) return null;
  if (priceId === env.stripeSoloPriceId) return "starter";
  if (priceId === env.stripeSmePriceId) return "professional";
  if (priceId === env.stripeAgencyPriceId) return "agency";
  return null;
}

export async function POST(request: NextRequest) {
  if (!hasStripeEnv()) {
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  const stripe = new Stripe(env.stripeSecretKey!);
  const body = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, env.stripeWebhookSecret!);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid Stripe signature." }, { status: 400 });
  }
  const supabase = createServiceSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const organizationId = (session.metadata?.organization_id as string | undefined) ?? null;
    const stripeCustomerId = typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;
    const stripeSubscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id ?? null;

    if (organizationId && stripeSubscriptionId) {
      const subscription = (await stripe.subscriptions.retrieve(stripeSubscriptionId)) as any;
      const priceId = subscription.items.data[0]?.price?.id ?? null;
      const tier = resolvePlanTier(priceId);
      const currentPeriodEnd = subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null;

      await supabase.from("subscriptions").upsert(
        {
          organization_id: organizationId,
          stripe_customer_id: stripeCustomerId,
          stripe_subscription_id: stripeSubscriptionId,
          stripe_price_id: priceId,
          status: subscription.status,
          current_period_end: currentPeriodEnd,
        },
        { onConflict: "stripe_subscription_id" },
      );

      if (tier) {
        await supabase.from("organizations").update({ plan_tier: tier }).eq("id", organizationId);
      }
    }
  }

  if (event.type === "customer.subscription.updated") {
    const subscription = event.data.object as any;
    const stripeSubscriptionId = subscription.id;
    const stripeCustomerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id ?? null;
    const organizationId = (subscription.metadata?.organization_id as string | undefined) ?? null;
    const priceId = subscription.items.data[0]?.price?.id ?? null;
    const tier = resolvePlanTier(priceId);
    const currentPeriodEnd = subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null;

    if (organizationId) {
      await supabase.from("subscriptions").upsert(
        {
          organization_id: organizationId,
          stripe_customer_id: stripeCustomerId,
          stripe_subscription_id: stripeSubscriptionId,
          stripe_price_id: priceId,
          status: subscription.status,
          current_period_end: currentPeriodEnd,
        },
        { onConflict: "stripe_subscription_id" },
      );

      if (tier) {
        await supabase.from("organizations").update({ plan_tier: tier }).eq("id", organizationId);
      }
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    const stripeSubscriptionId = subscription.id;
    const organizationId = (subscription.metadata?.organization_id as string | undefined) ?? null;

    await supabase.from("subscriptions").update({ status: "canceled" }).eq("stripe_subscription_id", stripeSubscriptionId);

    if (organizationId) {
      await supabase.from("organizations").update({ plan_tier: "starter" }).eq("id", organizationId);
    }
  }

  await trackAuditEvent({
    action: "billing.webhook_processed",
    entityType: "stripe_event",
    entityId: event.id,
    metadata: { type: event.type },
  });

  return NextResponse.json({ received: true });
}

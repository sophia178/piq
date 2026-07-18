export const dynamic = 'force-dynamic';
import { AppShell } from "@/components/app-shell";
import { Badge, Button, Card } from "@/components/ui";
import { getAuthenticatedAppContext, getUserSubscriptionStatus, planCatalog } from "@/lib/platform";

export default async function BillingPage() {
  const { organization } = await getAuthenticatedAppContext();
  
  let subscription: any = null;
  try {
    subscription = await Promise.race([
      getUserSubscriptionStatus(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
    ]);
  } catch (error) {
    console.error('Failed to load subscription status:', error);
  }

  return (
    <AppShell title="Billing" eyebrow="Revenue" organization={organization}>
      {!subscription?.isActive ? (
        <Card className="border-amber-500/30 bg-amber-500/10 p-6 mb-8">
          <p className="text-lg font-semibold text-amber-200">Complete your subscription</p>
          <p className="mt-2 text-sm text-amber-100">
            Select a plan below to access the full PursuitIQ platform. Your subscription will be activated immediately upon payment.
          </p>
        </Card>
      ) : (
        <Card className="border-teal-500/30 bg-teal-500/10 p-6 mb-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-lg font-semibold text-teal-200">Current Plan</p>
              <p className="mt-2 text-sm text-teal-100">
                You have an active subscription. You can upgrade or downgrade your plan at any time.
              </p>
            </div>
            <Badge className="whitespace-nowrap">{subscription.status === "active" ? "Active" : "Trialing"}</Badge>
          </div>
        </Card>
      )}

      <section className="grid gap-5 lg:grid-cols-3">
        {planCatalog.map((plan) => (
          <Card key={plan.tier} className="p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xl font-semibold capitalize text-white">{plan.tier}</p>
                {subscription && subscription.status && (
                  subscription.stripePriceId?.includes(plan.priceId || "") ? (
                    <Badge className="mt-2">Current plan</Badge>
                  ) : null
                )}
              </div>
            </div>
            <p className="mt-4 text-4xl font-semibold text-white">£{plan.price}</p>
            <p className="mt-2 text-sm text-slate-300">per month</p>
            <p className="mt-4 text-sm text-slate-300">
              {plan.monthlyTenderLimit === null ? "Unlimited tenders" : `${plan.monthlyTenderLimit} tenders per month`}
            </p>
            <form action={`/api/stripe/checkout?tier=${plan.tier}`} method="post" className="mt-6">
              <Button type="submit" className="w-full">
                {subscription?.stripePriceId?.includes(plan.priceId || "") ? "Current plan" : "Select plan"}
              </Button>
            </form>
          </Card>
        ))}
      </section>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <Card className="p-6">
          <p className="text-sm font-semibold text-white">Questions about billing?</p>
          <p className="mt-3 text-sm text-slate-300">
            Contact our support team at{" "}
            <a href="mailto:hello@pursuitiq.com" className="text-teal-300 hover:text-teal-200">
              hello@pursuitiq.com
            </a>
          </p>
        </Card>
        <Card className="p-6">
          <p className="text-sm font-semibold text-white">Manage subscription</p>
          <p className="mt-3 text-sm text-slate-300">
            To cancel or update your billing information, visit your{" "}
            <form action="/api/stripe/portal" method="post" className="inline">
              <button className="text-teal-300 hover:text-teal-200 underline">Stripe billing portal</button>
            </form>
          </p>
        </Card>
      </div>
    </AppShell>
  );
}

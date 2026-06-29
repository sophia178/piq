export const dynamic = 'force-dynamic';
import { AppShell } from "@/components/app-shell";
import { Button, Card } from "@/components/ui";
import { planCatalog } from "@/lib/platform";

export default function BillingPage() {
  return (
    <AppShell title="Billing" eyebrow="Revenue">
      <section className="grid gap-5 lg:grid-cols-3">
        {planCatalog.map((plan) => (
          <Card key={plan.tier} className="p-6">
            <p className="text-xl font-semibold capitalize text-white">{plan.tier}</p>
            <p className="mt-4 text-4xl font-semibold text-white">£{plan.price}</p>
            <p className="mt-2 text-sm text-slate-300">
              {plan.monthlyTenderLimit === null ? "Unlimited tenders" : `${plan.monthlyTenderLimit} tenders per month`}
            </p>
            <form action={`/api/stripe/checkout?tier=${plan.tier}`} method="post" className="mt-6">
              <Button type="submit" className="w-full">
                Upgrade to {plan.tier}
              </Button>
            </form>
          </Card>
        ))}
      </section>
    </AppShell>
  );
}

import { AppShell } from "@/components/app-shell";
import { BidOutcomeIntelligenceBoard } from "@/components/bid-outcome-intelligence-board";
import { Card } from "@/components/ui";
import { getBidOutcomeIntelligenceSnapshot } from "@/lib/opportunities";
import { getActiveOrganizationContext } from "@/lib/platform";
import { formatCurrency, formatPercent } from "@/lib/utils";

export default async function OutcomesPage() {
  const organization = await getActiveOrganizationContext();
  const organizationId = organization.id === "org_demo" ? undefined : organization.id;
  const snapshot = await getBidOutcomeIntelligenceSnapshot(organizationId);

  return (
    <AppShell title="Outcomes" eyebrow="Intelligence" organization={organization}>
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-6">
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Submitted</p>
          <p className="mt-3 text-3xl font-semibold text-white">{snapshot.metrics.submitted}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Shortlisted</p>
          <p className="mt-3 text-3xl font-semibold text-white">{snapshot.metrics.shortlisted}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Won</p>
          <p className="mt-3 text-3xl font-semibold text-white">{snapshot.metrics.won}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Rejected</p>
          <p className="mt-3 text-3xl font-semibold text-white">{snapshot.metrics.rejected}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Lost</p>
          <p className="mt-3 text-3xl font-semibold text-white">{snapshot.metrics.lost}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Win Rate</p>
          <p className="mt-3 text-3xl font-semibold text-white">{formatPercent(snapshot.metrics.winRate)}</p>
          <p className="mt-2 text-xs text-slate-500">
            Revenue won {formatCurrency(snapshot.metrics.revenueWon)} • Revenue lost {formatCurrency(snapshot.metrics.revenueLost)}
          </p>
        </Card>
      </section>

      <section className="mt-8">
        <BidOutcomeIntelligenceBoard snapshot={snapshot} organizationId={organizationId} />
      </section>
    </AppShell>
  );
}

import { OpportunityDiscoveryBoard } from "@/components/opportunity-discovery-board";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui";
import { getOpportunityDiscoverySnapshot } from "@/lib/opportunities";
import { getActiveOrganizationContext } from "@/lib/platform";
import { formatCurrency } from "@/lib/utils";

export default async function OpportunitiesPage() {
  const organization = await getActiveOrganizationContext();
  const organizationId = organization.id === "org_demo" ? undefined : organization.id;
  const snapshot = await getOpportunityDiscoverySnapshot(organizationId);

  return (
    <AppShell title="Opportunities" eyebrow="Discovery" organization={organization}>
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Opportunities Found</p>
          <p className="mt-3 text-3xl font-semibold text-white">{snapshot.organizationReport.opportunitiesFound}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Opportunities Pursued</p>
          <p className="mt-3 text-3xl font-semibold text-white">{snapshot.organizationReport.opportunitiesPursued}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Bids Submitted</p>
          <p className="mt-3 text-3xl font-semibold text-white">{snapshot.organizationReport.bidsSubmitted}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Contracts Won</p>
          <p className="mt-3 text-3xl font-semibold text-white">{snapshot.organizationReport.contractsWon}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Contract Value Won</p>
          <p className="mt-3 text-3xl font-semibold text-white">{formatCurrency(snapshot.organizationReport.totalContractValueWon)}</p>
        </Card>
      </section>

      <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">New Opportunities</p>
          <p className="mt-3 text-3xl font-semibold text-white">{snapshot.metrics.newOpportunities}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Saved Opportunities</p>
          <p className="mt-3 text-3xl font-semibold text-white">{snapshot.metrics.savedOpportunities}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">High Match Opportunities</p>
          <p className="mt-3 text-3xl font-semibold text-white">{snapshot.metrics.highMatchOpportunities}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Scans Last 7 Days</p>
          <p className="mt-3 text-3xl font-semibold text-white">{snapshot.metrics.scansLast7Days}</p>
        </Card>
      </section>

      <section className="mt-8">
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Conversion Funnel</p>
          <div className="mt-4 grid gap-4 md:grid-cols-5">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Opportunity</p>
              <p className="mt-2 text-2xl font-semibold text-white">{snapshot.funnel.opportunity}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Imported</p>
              <p className="mt-2 text-2xl font-semibold text-white">{snapshot.funnel.imported}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Bid Created</p>
              <p className="mt-2 text-2xl font-semibold text-white">{snapshot.funnel.bidCreated}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Submitted</p>
              <p className="mt-2 text-2xl font-semibold text-white">{snapshot.funnel.submitted}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Won</p>
              <p className="mt-2 text-2xl font-semibold text-white">{snapshot.funnel.won}</p>
            </div>
          </div>
        </Card>
      </section>

      <section className="mt-8">
        <OpportunityDiscoveryBoard initialSnapshot={snapshot} organizationId={organizationId} />
      </section>
    </AppShell>
  );
}

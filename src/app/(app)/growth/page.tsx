export const dynamic = 'force-dynamic';
import { AppShell } from "@/components/app-shell";
import { Button, Card } from "@/components/ui";
import { getAuthenticatedAppContext } from "@/lib/platform";
import { getOpportunityDiscoverySnapshot } from "@/lib/opportunities";
import { formatCurrency } from "@/lib/utils";

export default async function GrowthPage() {
  const { organization, organizationId } = await getAuthenticatedAppContext();
  const snapshot = await getOpportunityDiscoverySnapshot(organizationId);

  return (
    <AppShell title="Discovery Workflow" eyebrow="Pipeline" organization={organization}>
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">New opportunities</p>
          <p className="mt-3 text-3xl font-semibold text-white">{snapshot.metrics.newOpportunities}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Saved opportunities</p>
          <p className="mt-3 text-3xl font-semibold text-white">{snapshot.metrics.savedOpportunities}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">High fit opportunities</p>
          <p className="mt-3 text-3xl font-semibold text-white">{snapshot.metrics.highMatchOpportunities}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Scans last 7 days</p>
          <p className="mt-3 text-3xl font-semibold text-white">{snapshot.metrics.scansLast7Days}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Contracts won</p>
          <p className="mt-3 text-3xl font-semibold text-white">{snapshot.organizationReport.contractsWon}</p>
        </Card>
      </section>

      <section className="mt-8 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Best opportunities</p>
              <h2 className="mt-2 text-xl font-semibold text-white">Prioritise the next bids to qualify</h2>
            </div>
            <Button href="/opportunities">Open discovery board</Button>
          </div>
          <div className="mt-5 space-y-4">
            {(snapshot.bestOpportunities.length > 0 ? snapshot.bestOpportunities : snapshot.savedOpportunities).slice(0, 6).map((item) => (
              <div key={item.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{item.title}</p>
                    <p className="mt-2 text-sm text-slate-400">
                      {item.buyerName} • Deadline {item.submissionDeadline ? new Date(item.submissionDeadline).toLocaleDateString("en-GB") : "TBC"}
                    </p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-slate-950/60 px-3 py-1 text-xs text-slate-200">
                    {item.priority?.priorityBand ?? "Review"}
                  </span>
                </div>
                <p className="mt-3 text-sm text-slate-300">
                  Estimated value {formatCurrency(item.roi?.estimatedContractValue ?? item.estimatedValue ?? null)}
                </p>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Pipeline health</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Move imported opportunities into live bids</h2>
          <div className="mt-5 space-y-4">
            {[
              ["Opportunities found", snapshot.organizationReport.opportunitiesFound],
              ["Imported to workspace", snapshot.organizationReport.opportunitiesPursued],
              ["Bids submitted", snapshot.organizationReport.bidsSubmitted],
              ["Contracts won", snapshot.organizationReport.contractsWon],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-sm font-semibold text-white">{label}</p>
                <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-sm font-semibold text-white">Outcome value won</p>
            <p className="mt-2 text-sm text-slate-300">
              {formatCurrency(snapshot.organizationReport.totalContractValueWon)} recorded across bids marked won.
            </p>
          </div>
        </Card>
      </section>
    </AppShell>
  );
}

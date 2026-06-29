export const dynamic = 'force-dynamic';
import { GrowthEngineBoard } from "@/components/growth-engine-board";
import { AppShell } from "@/components/app-shell";
import { Badge, Card } from "@/components/ui";
import { getGrowthEngineSnapshot } from "@/lib/growth";
import { formatPercent } from "@/lib/utils";

export default function GrowthPage() {
  const snapshot = getGrowthEngineSnapshot();

  return (
    <AppShell title="Growth Engine" eyebrow="LinkedIn">
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Impressions</p>
          <p className="mt-3 text-3xl font-semibold text-white">{snapshot.metrics.impressions.toLocaleString()}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Clicks</p>
          <p className="mt-3 text-3xl font-semibold text-white">{snapshot.metrics.clicks.toLocaleString()}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Signups</p>
          <p className="mt-3 text-3xl font-semibold text-white">{snapshot.metrics.signups.toLocaleString()}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Trials</p>
          <p className="mt-3 text-3xl font-semibold text-white">{snapshot.metrics.trials.toLocaleString()}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Paid conversions</p>
          <p className="mt-3 text-3xl font-semibold text-white">{snapshot.metrics.paidConversions.toLocaleString()}</p>
        </Card>
      </section>

      <section className="mt-8 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Mix strategy</p>
              <h2 className="mt-2 text-xl font-semibold text-white">Content allocation</h2>
            </div>
            <Badge className="bg-emerald-500/10 text-emerald-200">Optimized for paid conversions</Badge>
          </div>
          <div className="mt-5 space-y-4">
            {snapshot.mixSummary.map((item) => (
              <div key={item.pillar} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-white">{item.label}</p>
                  <Badge>{item.scheduled} scheduled</Badge>
                </div>
                <p className="mt-2 text-sm text-slate-300">Target share: {formatPercent(item.target * 100)}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Winning patterns</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Highest-converting combinations</h2>
          <div className="mt-5 space-y-4">
            {snapshot.topPatterns.map((pattern) => (
              <div key={pattern.label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-sm font-semibold text-white">{pattern.label}</p>
                <p className="mt-2 text-sm text-slate-300">
                  {pattern.paidConversions} paid conversions • {pattern.trials} trials • {pattern.clickToPaidRate} click-to-paid rate
                </p>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-sm font-semibold text-white">Coverage</p>
            <p className="mt-2 text-sm text-slate-300">Regions: {snapshot.regions.join(", ")}</p>
            <p className="mt-2 text-sm text-slate-300">Audiences: {snapshot.audiences.join(", ")}</p>
            <p className="mt-2 text-sm text-slate-300">Repetition lockout: {snapshot.repetitionWindowDays} days</p>
          </div>
        </Card>
      </section>

      <section className="mt-8">
        <GrowthEngineBoard initialPosts={snapshot.plannedPosts} />
      </section>
    </AppShell>
  );
}

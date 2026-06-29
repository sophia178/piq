export const dynamic = 'force-dynamic';
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui";
import { getDashboardSnapshot } from "@/lib/platform";
import { formatCurrency, formatPercent } from "@/lib/utils";

export default function AdminPage() {
  const snapshot = getDashboardSnapshot();

  return (
    <AppShell title="Admin" eyebrow="Internal">
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <Card className="p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Users</p>
          <p className="mt-3 text-3xl font-semibold text-white">{snapshot.analytics.activeUsers}</p>
        </Card>
        <Card className="p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Revenue</p>
          <p className="mt-3 text-3xl font-semibold text-white">{formatCurrency(snapshot.analytics.revenue)}</p>
        </Card>
        <Card className="p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Conversion</p>
          <p className="mt-3 text-3xl font-semibold text-white">{formatPercent(snapshot.analytics.conversionRate)}</p>
        </Card>
      </section>
      <section className="mt-8 grid gap-5 xl:grid-cols-2">
        <Card className="p-6">
          <p className="text-lg font-semibold text-white">Tracked events</p>
          <ul className="mt-4 space-y-3 text-sm text-slate-300">
            <li>Uploads</li>
            <li>Generated responses</li>
            <li>Exports</li>
            <li>Active users</li>
            <li>Conversion rate</li>
            <li>Stripe revenue</li>
            <li>LinkedIn impressions, clicks, signups, trials, and paid conversions</li>
            <li>AI usage and audit trail activity</li>
          </ul>
        </Card>
        <Card className="p-6">
          <p className="text-lg font-semibold text-white">Security controls</p>
          <ul className="mt-4 space-y-3 text-sm text-slate-300">
            <li>Supabase RLS on every tenant-owned table</li>
            <li>API input validation with Zod</li>
            <li>Rate limiting middleware for route handlers</li>
            <li>Audit logs for sensitive actions and content exports</li>
          </ul>
        </Card>
      </section>
    </AppShell>
  );
}

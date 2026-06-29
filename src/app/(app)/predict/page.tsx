export const dynamic = 'force-dynamic';
import { AppShell } from "@/components/app-shell";
import { PredictBoard } from "@/components/predict-board";
import { Card } from "@/components/ui";
import { getActiveOrganizationContext } from "@/lib/platform";
import { getPredictEngineSnapshot } from "@/lib/predict";

export default async function PredictPage() {
  const organization = await getActiveOrganizationContext();
  const organizationId = organization.id === "org_demo" ? undefined : organization.id;
  const snapshot = await getPredictEngineSnapshot(organizationId);

  return (
    <AppShell title="Predict" eyebrow="Win Intelligence" organization={organization}>
      <div className="mb-5">
        <Card className="p-5">
          <p className="text-sm text-slate-300">
            PursuitIQ Predict combines revenue scoring, workspace progress, knowledge coverage, bid review findings, and historical outcomes to act like an AI bid strategist. Every recommendation is explainable, evidence-backed, and connected to the existing learning loop.
          </p>
        </Card>
      </div>
      <PredictBoard snapshot={snapshot} />
    </AppShell>
  );
}

export const dynamic = 'force-dynamic';
import { AppShell } from "@/components/app-shell";
import { PredictBoard } from "@/components/predict-board";
import { Card } from "@/components/ui";
import { getAuthenticatedAppContext } from "@/lib/platform";
import { getPredictEngineSnapshot } from "@/lib/predict";

export default async function PredictPage() {
  const { organization, organizationId } = await getAuthenticatedAppContext();
  
  let snapshot: any = { predictions: [], metrics: {} };
  
  try {
    snapshot = await Promise.race([
      getPredictEngineSnapshot(organizationId),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
    ]);
  } catch (error) {
    console.error('Failed to load predict snapshot:', error);
  }

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

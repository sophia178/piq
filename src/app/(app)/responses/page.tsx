export const dynamic = 'force-dynamic';
import { AppShell } from "@/components/app-shell";
import { Badge, Card } from "@/components/ui";
import { demoResponses } from "@/lib/platform";

export default function ResponsesPage() {
  return (
    <AppShell title="Response Library" eyebrow="Reuse">
      <section className="grid gap-5">
        {demoResponses.map((response) => (
          <Card key={response.section} className="p-6">
            <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
              <div>
                <p className="text-xl font-semibold text-white">{response.section}</p>
                <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-300">{response.content}</p>
              </div>
              <Badge className="w-fit bg-white/8">{response.confidence}% confidence</Badge>
            </div>
            <p className="mt-4 text-xs text-slate-500">Sources: {response.sourceReferences.join(", ")}</p>
            {response.supportingEvidence.length > 0 ? (
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Supporting Evidence</p>
                <p className="mt-2 text-sm text-slate-300">{response.supportingEvidence.join(" ")}</p>
              </div>
            ) : null}
          </Card>
        ))}
      </section>
    </AppShell>
  );
}

export const dynamic = 'force-dynamic';
import { AppShell } from "@/components/app-shell";
import { KnowledgeEngineBoard } from "@/components/knowledge-engine-board";
import { Card } from "@/components/ui";
import { getKnowledgeEngineSnapshot } from "@/lib/knowledge";
import { getActiveOrganizationContext } from "@/lib/platform";

export default async function KnowledgePage() {
  const organization = await getActiveOrganizationContext();
  const snapshot = await getKnowledgeEngineSnapshot(organization.id === "org_demo" ? undefined : organization.id);

  return (
    <AppShell title="Knowledge" eyebrow="RAG" organization={organization}>
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Coverage Score</p>
          <p className="mt-3 text-3xl font-semibold text-white">{snapshot.coverageScore}%</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Knowledge Documents</p>
          <p className="mt-3 text-3xl font-semibold text-white">{snapshot.totalDocuments}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Indexed Chunks</p>
          <p className="mt-3 text-3xl font-semibold text-white">{snapshot.totalChunks}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Valuable Documents</p>
          <p className="mt-3 text-3xl font-semibold text-white">{snapshot.mostValuableDocuments.length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Missing Areas</p>
          <p className="mt-3 text-3xl font-semibold text-white">{snapshot.missingKnowledgeAreas.length}</p>
        </Card>
      </section>

      <section className="mt-8">
        <KnowledgeEngineBoard snapshot={snapshot} organizationId={organization.id === "org_demo" ? undefined : organization.id} />
      </section>
    </AppShell>
  );
}

import { Card } from "@/components/ui";

export default function AppLoading() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-10 lg:px-10">
      <Card className="p-8">
        <p className="text-sm text-slate-300">Loading…</p>
      </Card>
    </div>
  );
}


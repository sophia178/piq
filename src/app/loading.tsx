import { Card, Logo } from "@/components/ui";

export default function Loading() {
  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col justify-center gap-8 px-6 py-12 lg:px-8">
      <Logo />
      <Card className="mx-auto w-full max-w-2xl p-10">
        <p className="text-sm text-slate-300">Loading…</p>
      </Card>
    </main>
  );
}


"use client";

import { useEffect } from "react";
import { Button, Card, Logo } from "@/components/ui";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    void error;
  }, [error]);

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col justify-center gap-8 px-6 py-12 lg:px-8">
      <Logo />
      <Card className="mx-auto w-full max-w-2xl p-10">
        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Error</p>
        <h1 className="mt-4 text-3xl font-semibold text-white">Something went wrong</h1>
        <p className="mt-3 text-sm leading-7 text-slate-300">Try again. If the issue persists, refresh the page.</p>
        <div className="mt-8 flex items-center gap-3">
          <Button onClick={() => reset()}>Try again</Button>
          <Button href="/" variant="secondary">
            Back to homepage
          </Button>
        </div>
      </Card>
    </main>
  );
}


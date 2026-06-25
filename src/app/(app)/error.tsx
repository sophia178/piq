"use client";

import { useEffect } from "react";
import { Button, Card } from "@/components/ui";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    void error;
  }, [error]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 lg:px-10">
      <Card className="p-8">
        <h1 className="text-2xl font-semibold text-white">We hit a problem loading this page</h1>
        <p className="mt-3 text-sm leading-7 text-slate-300">Try again. If the issue persists, return to the dashboard.</p>
        <div className="mt-6 flex items-center gap-3">
          <Button onClick={() => reset()}>Try again</Button>
          <Button href="/dashboard" variant="secondary">
            Back to dashboard
          </Button>
        </div>
      </Card>
    </div>
  );
}


"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import type { PlanTier } from "@/lib/platform";

export function BillingCheckoutButton({
  tier,
  label,
  disabled = false,
}: {
  tier: PlanTier;
  label: string;
  disabled?: boolean;
}) {
  const [submitting, setSubmitting] = useState(false);

  return (
    <Button
      type="button"
      className="w-full"
      disabled={disabled || submitting}
      onClick={async () => {
        if (disabled || submitting) {
          return;
        }

        setSubmitting(true);
        try {
          const response = await fetch(`/api/stripe/checkout?tier=${tier}`, { method: "POST" });
          const data = (await response.json()) as { url?: string; error?: string };

          if (!response.ok || !data.url) {
            throw new Error(data.error ?? "Unable to start checkout.");
          }

          window.location.assign(data.url);
        } catch (error) {
          console.error("Failed to start checkout:", error);
          setSubmitting(false);
        }
      }}
    >
      {submitting ? "Redirecting..." : label}
    </Button>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card, Input } from "@/components/ui";

type OnboardingStatus = {
  user: { id: string; email: string | null; name: string | null };
  organization: { id: string; companyName: string; industry: string; website: string | null; employeeCount: string | null; planTier: string } | null;
  subscription: { status?: string | null } | null;
};

const steps = [
  { id: 1, label: "Welcome" },
  { id: 2, label: "Organisation" },
  { id: 3, label: "Plan" },
  { id: 4, label: "Complete" },
] as const;

function clampStep(value: number) {
  if (value < 1) return 1;
  if (value > 4) return 4;
  return value;
}

export function OnboardingFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialStep = clampStep(Number(searchParams.get("step") ?? "1"));
  const statusParam = searchParams.get("status");
  const savingOrganizationRef = useRef(false);

  const [activeStep, setActiveStep] = useState<number>(initialStep);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setActiveStep(initialStep);
  }, [initialStep]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/onboarding/status", { cache: "no-store" });
      const payload = (await response.json()) as OnboardingStatus | { error?: string };
      if (cancelled) return;
      if (!response.ok) {
        setError("Please sign in to continue.");
        setStatus(null);
        setLoading(false);
        return;
      }
      setStatus(payload as OnboardingStatus);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (activeStep !== 4) return;
    let cancelled = false;
    (async () => {
      const response = await fetch("/api/onboarding/status", { cache: "no-store" });
      const payload = (await response.json()) as OnboardingStatus | { error?: string };
      if (cancelled) return;
      if (response.ok) {
        setStatus(payload as OnboardingStatus);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeStep]);

  useEffect(() => {
    if (!status) return;
    if (savingOrganizationRef.current) {
      savingOrganizationRef.current = false;
      return;
    }
    if (!status.organization && activeStep > 2) {
      router.replace("/onboarding?step=2");
    }
  }, [activeStep, router, status]);

  const isPaid = useMemo(() => {
    const subscriptionStatus = status?.subscription?.status ?? null;
    return subscriptionStatus === "active" || subscriptionStatus === "trialing";
  }, [status?.subscription?.status]);

  useEffect(() => {
    if (activeStep !== 4) return;
    if (!isPaid) return;
    router.replace("/dashboard");
    router.refresh();
  }, [activeStep, isPaid, router]);

  if (loading) {
    return (
      <Card className="mx-auto w-full max-w-2xl p-8">
        <p className="text-sm text-slate-300">Loading onboarding…</p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="mx-auto w-full max-w-2xl p-8">
        <p className="text-sm text-slate-200">{error}</p>
        <div className="mt-6">
          <Button href="/login">Go to login</Button>
        </div>
      </Card>
    );
  }

  const userLabel = status?.user?.name ?? status?.user?.email ?? "there";

  return (
    <Card className="mx-auto w-full max-w-2xl p-8">
      <div className="flex flex-wrap items-center gap-3">
        {steps.map((step) => (
          <div
            key={step.id}
            className={[
              "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs",
              step.id === activeStep ? "border-teal-300/30 bg-teal-300/10 text-teal-200" : "border-white/10 bg-white/5 text-slate-300",
            ].join(" ")}
          >
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/5 text-[11px]">{step.id}</span>
            <span>{step.label}</span>
          </div>
        ))}
      </div>

      {activeStep === 1 ? (
        <div className="mt-8">
          <h1 className="text-3xl font-semibold text-white">Welcome to PursuitIQ</h1>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            Hi {userLabel}. Set up your organisation, choose a plan, and you&apos;ll be ready to import tenders and start winning.
          </p>
          <div className="mt-8 flex items-center gap-3">
            <Button onClick={() => router.push("/onboarding?step=2")}>Continue</Button>
          </div>
        </div>
      ) : null}

      {activeStep === 2 ? (
        <div className="mt-8">
          <h1 className="text-2xl font-semibold text-white">Organisation setup</h1>
          <p className="mt-3 text-sm leading-7 text-slate-300">Tell us about your organisation. This step is required.</p>
          <form
            className="mt-6 space-y-4"
            onSubmit={async (event) => {
              event.preventDefault();
              setError(null);
              const form = event.currentTarget;
              const formData = new FormData(form);
              const response = await fetch("/api/onboarding/organization", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  companyName: String(formData.get("companyName") ?? ""),
                  industry: String(formData.get("industry") ?? ""),
                  website: String(formData.get("website") ?? ""),
                  employeeCount: String(formData.get("employeeCount") ?? ""),
                }),
              });
              if (!response.ok) {
                setError("Unable to save organisation details.");
                return;
              }
              savingOrganizationRef.current = true;
              if (status) {
                setStatus({
                  ...status,
                  organization: {
                    id: status.organization?.id ?? "temp-id",
                    companyName: String(formData.get("companyName") ?? ""),
                    industry: String(formData.get("industry") ?? ""),
                    website: String(formData.get("website") ?? "") || null,
                    employeeCount: String(formData.get("employeeCount") ?? ""),
                    planTier: status.organization?.planTier ?? "",
                  },
                });
              }
              router.push("/onboarding?step=3");
            }}
          >
            <Input name="companyName" placeholder="Company name" defaultValue={status?.organization?.companyName ?? ""} required />
            <Input name="industry" placeholder="Industry" defaultValue={status?.organization?.industry ?? ""} required />
            <Input name="website" placeholder="Website (optional)" defaultValue={status?.organization?.website ?? ""} />
            <select
              name="employeeCount"
              defaultValue={status?.organization?.employeeCount ?? "1-10"}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
              required
            >
              <option value="1-10">1-10</option>
              <option value="11-50">11-50</option>
              <option value="51-200">51-200</option>
              <option value="200+">200+</option>
            </select>
            <div className="mt-6 flex items-center gap-3">
              <Button type="submit">Save and continue</Button>
              <Button href="/onboarding?step=1" variant="ghost">
                Back
              </Button>
            </div>
          </form>
        </div>
      ) : null}

      {activeStep === 3 ? (
        <div className="mt-8">
          <h1 className="text-2xl font-semibold text-white">Choose your plan</h1>
          <p className="mt-3 text-sm leading-7 text-slate-300">Select a plan to start your subscription.</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              { tier: "starter", name: "Solo Consultant", price: "£149/mo" },
              { tier: "professional", name: "SME", price: "£399/mo" },
              { tier: "agency", name: "Agency", price: "£799/mo" },
            ].map((plan) => (
              <div key={plan.tier} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-semibold text-white">{plan.name}</p>
                <p className="mt-3 text-2xl font-semibold text-white">{plan.price}</p>
                <form action={`/api/stripe/checkout?tier=${plan.tier}`} method="post" className="mt-6">
                  <Button type="submit" className="w-full">
                    Get Started
                  </Button>
                </form>
              </div>
            ))}
          </div>
          <div className="mt-6 flex items-center gap-3">
            <Button href="/onboarding?step=2" variant="ghost">
              Back
            </Button>
          </div>
        </div>
      ) : null}

      {activeStep === 4 ? (
        <div className="mt-8">
          <h1 className="text-2xl font-semibold text-white">You&apos;re all set</h1>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            {statusParam === "success" && !isPaid ? "Payment received. Finalising access…" : "Your workspace is ready."}
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <Button href="/knowledge" variant="secondary">
              Upload knowledge
            </Button>
            <Button href="/opportunities" variant="secondary">
              Import a tender
            </Button>
            <Button href="/dashboard">Go to dashboard</Button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}

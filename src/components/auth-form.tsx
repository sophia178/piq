"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input } from "@/components/ui";

export function AuthForm({
  mode,
  title,
  description,
}: {
  mode: "login" | "signup" | "forgot-password";
  title: string;
  description: string;
}) {
  const [status, setStatus] = useState<string | null>(null);
  const router = useRouter();
  const action = mode === "forgot-password" ? "reset-password" : mode;

  async function onSubmit(formData: FormData) {
    setStatus("Submitting...");
    const response = await fetch(`/api/auth/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(formData.entries())),
    });
    const payload = (await response.json()) as { message?: string; error?: string };
    setStatus(payload.message ?? payload.error ?? "Request completed.");

    if (response.ok && mode === "login") {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <Card className="mx-auto w-full max-w-lg p-8">
      <h1 className="text-3xl font-semibold text-white">{title}</h1>
      <p className="mt-3 text-sm leading-7 text-slate-300">{description}</p>
      <form
        className="mt-8 space-y-4"
        action={async (formData) => {
          await onSubmit(formData);
        }}
      >
        {mode === "signup" ? <Input name="companyName" placeholder="Company name" required /> : null}
        <Input name="email" type="email" placeholder="Work email" required />
        {mode !== "forgot-password" ? <Input name="password" type="password" placeholder="Password" required /> : null}
        <Button type="submit" className="w-full">
          {mode === "login" ? "Login" : mode === "signup" ? "Create account" : "Send reset link"}
        </Button>
      </form>
      {status ? <p className="mt-4 text-sm text-teal-200">{status}</p> : null}
    </Card>
  );
}

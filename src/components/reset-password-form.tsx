"use client";

import { useState } from "react";
import { Button, Card, Input } from "@/components/ui";

export function ResetPasswordForm() {
  const [status, setStatus] = useState<string | null>(null);

  return (
    <Card className="mx-auto w-full max-w-lg p-8">
      <h1 className="text-3xl font-semibold text-white">Set a new password</h1>
      <p className="mt-3 text-sm leading-7 text-slate-300">Choose a strong password to secure your account.</p>
      <form
        className="mt-8 space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setStatus("Updating password…");
          const formData = new FormData(event.currentTarget);
          const response = await fetch("/api/auth/update-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password: String(formData.get("password") ?? "") }),
          });
          const payload = (await response.json().catch(() => ({}))) as { message?: string; error?: string };
          setStatus(payload.message ?? payload.error ?? "Request completed.");
        }}
      >
        <Input name="password" type="password" placeholder="New password" required />
        <Button type="submit" className="w-full">
          Update password
        </Button>
      </form>
      {status ? <p className="mt-4 text-sm text-teal-200">{status}</p> : null}
    </Card>
  );
}


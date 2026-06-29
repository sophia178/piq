export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { AuthSchema, createServerSupabaseClient, trackAuditEvent } from "@/lib/platform";
import { env } from "@/lib/env";

export async function POST(request: NextRequest, context: { params: Promise<{ action: string }> }) {
  const { action } = await context.params;
  const rawBody = await request.json();

  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return NextResponse.json({ message: `Supabase not configured. ${action} accepted in demo mode.` });
  }

  if (action === "signup") {
    const payload = AuthSchema.pick({ email: true, password: true, companyName: true }).safeParse(rawBody);
    if (!payload.success) {
      return NextResponse.json({ error: "Invalid authentication payload.", issues: payload.error.flatten() }, { status: 400 });
    }

    const { error } = await supabase.auth.signUp({
      email: payload.data.email!,
      password: payload.data.password!,
      options: {
        emailRedirectTo: `${env.appUrl}/auth/callback?next=/onboarding`,
        data: { company_name: payload.data.companyName ?? "New organisation" },
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await trackAuditEvent({ action: "auth.signup", entityType: "user", metadata: { email: payload.data.email } });
    return NextResponse.json({ message: "Account created. Please verify your email to continue." });
  }

  if (action === "login") {
    const payload = AuthSchema.pick({ email: true, password: true }).safeParse(rawBody);
    if (!payload.success) {
      return NextResponse.json({ error: "Invalid authentication payload.", issues: payload.error.flatten() }, { status: 400 });
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: payload.data.email!,
      password: payload.data.password!,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await trackAuditEvent({ action: "auth.login", entityType: "user", metadata: { email: payload.data.email } });
    return NextResponse.json({ message: "Login successful." });
  }

  if (action === "reset-password") {
    const payload = AuthSchema.pick({ email: true }).safeParse(rawBody);
    if (!payload.success) {
      return NextResponse.json({ error: "Invalid authentication payload.", issues: payload.error.flatten() }, { status: 400 });
    }

    const { error } = await supabase.auth.resetPasswordForEmail(payload.data.email!, {
      redirectTo: `${env.appUrl}/auth/callback?next=/reset-password`,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await trackAuditEvent({ action: "auth.reset_password", entityType: "user", metadata: { email: payload.data.email } });
    return NextResponse.json({ message: "Password reset email sent." });
  }

  if (action === "update-password") {
    const payload = AuthSchema.pick({ password: true }).safeParse(rawBody);
    if (!payload.success) {
      return NextResponse.json({ error: "Invalid authentication payload.", issues: payload.error.flatten() }, { status: 400 });
    }

    const { error } = await supabase.auth.updateUser({ password: payload.data.password! });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await trackAuditEvent({ action: "auth.update_password", entityType: "user" });
    return NextResponse.json({ message: "Password updated." });
  }

  return NextResponse.json({ error: "Unsupported auth action." }, { status: 404 });
}

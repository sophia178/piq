import { AuthForm } from "@/components/auth-form";
import { Logo } from "@/components/ui";

export default function ForgotPasswordPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col justify-center gap-8 px-6 py-12 lg:px-8">
      <Logo />
      <AuthForm
        mode="forgot-password"
        title="Reset password"
        description="Send a secure password reset email through Supabase Auth with email verification support."
      />
    </main>
  );
}

import { AuthForm } from "@/components/auth-form";
import { Logo } from "@/components/ui";

export default function SignupPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col justify-center gap-8 px-6 py-12 lg:px-8">
      <Logo />
      <AuthForm
        mode="signup"
        title="Create your organisation"
        description="Provision a secure BidPilot AI workspace with multi-user collaboration, tenant isolation, audit logging, and billing-ready subscriptions."
      />
    </main>
  );
}

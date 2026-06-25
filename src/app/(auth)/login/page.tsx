import { AuthForm } from "@/components/auth-form";
import { Logo } from "@/components/ui";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col justify-center gap-8 px-6 py-12 lg:px-8">
      <Logo />
      <AuthForm
        mode="login"
        title="Login to BidPilot AI"
        description="Access your organisation workspace, response library, compliance engine, and billing controls."
      />
    </main>
  );
}

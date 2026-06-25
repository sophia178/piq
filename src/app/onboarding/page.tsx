import { Logo } from "@/components/ui";
import { OnboardingFlow } from "@/components/onboarding-flow";

export default function OnboardingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col justify-center gap-8 px-6 py-12 lg:px-8">
      <Logo />
      <OnboardingFlow />
    </main>
  );
}


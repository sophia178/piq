import { Button, Card, Logo } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col justify-center gap-8 px-6 py-12 lg:px-8">
      <Logo />
      <Card className="mx-auto w-full max-w-2xl p-10">
        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">404</p>
        <h1 className="mt-4 text-3xl font-semibold text-white">Page not found</h1>
        <p className="mt-3 text-sm leading-7 text-slate-300">The page you were looking for doesn’t exist or has moved.</p>
        <div className="mt-8">
          <Button href="/">Back to homepage</Button>
        </div>
      </Card>
    </main>
  );
}


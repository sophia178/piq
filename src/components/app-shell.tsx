import Link from "next/link";
import type { Route } from "next";
import type { ComponentProps, ReactNode } from "react";
import { BookOpen, BrainCircuit, CreditCard, FileOutput, FileSearch, FolderKanban, LayoutDashboard, LogOut, Search, ShieldCheck, Trophy } from "lucide-react";
import { type OrganizationProfile, getRecentProject } from "@/lib/platform";
import { cn } from "@/lib/utils";
import { Badge, Logo } from "@/components/ui";

type LinkHref = ComponentProps<typeof Link>["href"];

export function AppShell({
  title,
  eyebrow,
  organization,
  workspaceHref,
  children,
}: {
  title: string;
  eyebrow: string;
  organization: OrganizationProfile;
  workspaceHref?: LinkHref;
  children: ReactNode;
}) {
  const activeOrganization = organization;

  return (
    <div className="app-shell-grid min-h-screen">
      <aside className="border-r border-white/10 bg-slate-950/70 p-6 flex flex-col">
        <div className="flex-1">
          <Logo />
          <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Organisation</p>
            <p className="mt-3 text-sm font-semibold text-white">{activeOrganization.companyName}</p>
            <p className="mt-1 text-xs text-slate-400">{activeOrganization.industry}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {activeOrganization.certifications.map((item) => (
                <Badge key={item}>{item}</Badge>
              ))}
            </div>
          </div>
          <nav className="mt-8 space-y-1">
            <NavigationLinks title={title} workspaceHref={workspaceHref} />
          </nav>
          <div className="mt-8 rounded-3xl border border-teal-300/10 bg-teal-400/5 p-4">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-teal-300" />
              <div>
                <p className="text-sm font-semibold text-white">Security</p>
                <p className="text-xs text-slate-400">RLS, audit logs, rate limiting</p>
              </div>
            </div>
          </div>
        </div>
        <form action="/api/auth/logout" method="post" className="mt-8 border-t border-white/10 pt-4">
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            <span>Log out</span>
          </button>
        </form>
      </aside>
      <main className="px-6 py-6 lg:px-10">
        <header className="mb-8 flex flex-col gap-3 border-b border-white/10 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-teal-200">{eyebrow}</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">{title}</h1>
          </div>
          <Badge className="w-fit bg-white/8 text-slate-200">AI bid workflow for discovery, drafting, review, prediction, and export</Badge>
        </header>
        {children}
      </main>
    </div>
  );
}

async function NavigationLinks({ title, workspaceHref }: { title: string; workspaceHref?: LinkHref }) {
  let workspaceLink = workspaceHref ?? null;
  let hasNoProjects = false;

  if (!workspaceHref) {
    try {
      const recentProject = await getRecentProject();
      if (recentProject) {
        workspaceLink = `/projects/${recentProject.id}/workspace` as Route;
      } else {
        hasNoProjects = true;
        workspaceLink = "/opportunities";
      }
    } catch (error) {
      console.error("Failed to get recent project:", error);
      hasNoProjects = true;
      workspaceLink = "/opportunities";
    }
  }

  const navigation: Array<{ href: LinkHref; label: string; icon: typeof LayoutDashboard; subtitle?: string }> = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/opportunities", label: "Opportunities", icon: Search },
    { href: "/predict", label: "Predict", icon: BrainCircuit },
    { href: "/outcomes", label: "Outcomes", icon: Trophy },
    { href: workspaceLink as LinkHref, label: "Workspace", icon: FolderKanban, subtitle: hasNoProjects ? "Create your first opportunity to get started" : undefined },
    { href: "/reviews", label: "Reviews", icon: FileSearch },
    { href: "/exports", label: "Exports", icon: FileOutput },
    { href: "/knowledge", label: "Knowledge", icon: BookOpen },
    { href: "/growth", label: "Discovery Workflow", icon: Search },
    { href: "/billing", label: "Billing", icon: CreditCard },
  ];

  return (
    <>
      {navigation.map(({ href, label, icon: Icon, subtitle }) => (
        <Link
          key={label}
          href={href}
          className={cn(
            "flex flex-col gap-1 rounded-2xl px-4 py-3 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white",
            title === label ? "bg-teal-400/10 text-white ring-1 ring-teal-300/20" : "",
          )}
        >
          <div className="flex items-center gap-3">
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </div>
          {subtitle ? (
            <span className="text-[10px] text-slate-500 ml-7">{subtitle}</span>
          ) : null}
        </Link>
      ))}
    </>
  );
}

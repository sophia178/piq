"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { navLinks, siteTagline } from "@/lib/marketing-content";
import { MarketingButton, MarketingLink, PursuitIQMark } from "@/components/marketing/primitives";
import { cn } from "@/lib/utils";

function useHydrationSafeReducedMotion() {
  const reducedMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted ? reducedMotion : false;
}

export function MarketingSiteShell({
  children,
  currentPath = "/",
}: {
  children: React.ReactNode;
  currentPath?: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const reducedMotion = useHydrationSafeReducedMotion();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 18);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(37,99,235,0.16),transparent_34%),radial-gradient(circle_at_80%_12%,rgba(59,130,246,0.14),transparent_30%),linear-gradient(180deg,#0a0a0f_0%,#0d1118_46%,#0a0a0f_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[620px] bg-[linear-gradient(180deg,rgba(37,99,235,0.08),transparent_78%)]" />

      <header
        className={cn(
          "sticky top-0 z-50 transition duration-300",
          scrolled ? "border-b border-white/10 bg-[rgba(10,10,15,0.78)] backdrop-blur-2xl" : "border-b border-transparent bg-[rgba(10,10,15,0.38)] backdrop-blur-xl",
        )}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <MarketingLink href="/" className="shrink-0">
            <PursuitIQMark />
          </MarketingLink>

          <nav className="hidden items-center gap-7 lg:flex">
            {navLinks.map((link) => (
              <MarketingLink
                key={link.href}
                href={link.href}
                className={cn(
                  "text-sm text-slate-300 transition hover:text-white",
                  currentPath === link.href || currentPath.startsWith(link.href.replace("/#", "/"))
                    ? "text-white"
                    : "",
                )}
              >
                {link.label}
              </MarketingLink>
            ))}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <MarketingButton href="/login" variant="ghost">
              Sign in
            </MarketingButton>
            <MarketingButton href="/signup" variant="primary" trailingArrow pulse>
              Get Started Free
            </MarketingButton>
          </div>

          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white lg:hidden"
            onClick={() => setMenuOpen((value) => !value)}
            aria-label="Toggle navigation"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        <AnimatePresence>
          {menuOpen ? (
            <motion.div
              initial={reducedMotion ? false : { opacity: 0, height: 0 }}
              animate={reducedMotion ? undefined : { opacity: 1, height: "auto" }}
              exit={reducedMotion ? undefined : { opacity: 0, height: 0 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden border-t border-white/8 bg-[rgba(10,10,15,0.94)] lg:hidden"
            >
              <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-4">
                {navLinks.map((link) => (
                  <MarketingLink
                    key={link.href}
                    href={link.href}
                    className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-slate-200"
                  >
                    {link.label}
                  </MarketingLink>
                ))}
                <div className="mt-2 grid gap-3">
                  <MarketingButton href="/login" variant="ghost" className="w-full">
                    Sign in
                  </MarketingButton>
                  <MarketingButton href="/signup" trailingArrow pulse className="w-full">
                    Get Started Free
                  </MarketingButton>
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </header>

      <div className="relative z-10">{children}</div>

      <footer className="relative z-10 overflow-hidden border-t border-white/8 bg-[rgba(7,8,12,0.88)]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-4 text-center text-[clamp(4rem,16vw,16rem)] font-semibold uppercase tracking-[-0.08em] text-white/[0.03]"
        >
          PursuitIQ
        </div>
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 lg:grid-cols-[1.2fr_0.8fr] lg:px-8">
          <div>
            <PursuitIQMark />
            <p className="mt-5 max-w-xl text-sm leading-7 text-slate-400">
              {siteTagline} PursuitIQ brings together discovery, drafting, review, prediction, and outcome learning for teams that take procurement seriously.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <MarketingLink
                href="https://www.linkedin.com"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-slate-300 transition hover:border-brand/20 hover:bg-brand/10 hover:text-white"
              >
                <span className="text-sm font-semibold">in</span>
              </MarketingLink>
              <MarketingLink
                href="https://x.com"
                className="inline-flex h-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 text-sm text-slate-300 transition hover:border-brand/20 hover:bg-brand/10 hover:text-white"
              >
                X
              </MarketingLink>
            </div>
          </div>

          <div className="grid gap-8 sm:grid-cols-2">
            <div>
              <p className="text-sm font-semibold text-white">Product</p>
              <div className="mt-4 grid gap-3 text-sm text-slate-400">
                <MarketingLink href="/features">Features</MarketingLink>
                <MarketingLink href="/pricing">Pricing</MarketingLink>
                <MarketingLink href="/#product-tour">How it works</MarketingLink>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Company</p>
              <div className="mt-4 grid gap-3 text-sm text-slate-400">
                <MarketingLink href="/privacy">Privacy Policy</MarketingLink>
                <MarketingLink href="/terms">Terms</MarketingLink>
                <MarketingLink href="/signup">Start free trial</MarketingLink>
              </div>
            </div>
          </div>
        </div>
        <div className="border-t border-white/8 px-5 py-5 text-center text-xs text-slate-500 lg:px-8">
          Copyright {new Date().getFullYear()} PursuitIQ. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

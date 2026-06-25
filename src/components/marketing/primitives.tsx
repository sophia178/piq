"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

function useHydrationSafeReducedMotion() {
  const reducedMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted ? reducedMotion : false;
}

type MotionLinkProps = {
  href: string;
  children: React.ReactNode;
  className?: string;
};

export function MarketingLink({ href, children, className }: MotionLinkProps) {
  if (href.startsWith("#") || href.startsWith("http")) {
    return (
      <a href={href} className={className} target={href.startsWith("http") ? "_blank" : undefined} rel={href.startsWith("http") ? "noreferrer" : undefined}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href as Route} className={className}>
      {children}
    </Link>
  );
}

export function MarketingButton({
  href,
  children,
  variant = "primary",
  className,
  trailingArrow = false,
  pulse = false,
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
  trailingArrow?: boolean;
  pulse?: boolean;
}) {
  return (
    <MarketingLink
      href={href}
      className={cn(
        "group inline-flex items-center justify-center rounded-full border px-5 py-3 text-sm font-semibold tracking-[-0.01em] transition duration-300",
        variant === "primary" &&
          "border-brand bg-brand text-white shadow-[0_14px_42px_rgba(37,99,235,0.32)] hover:-translate-y-0.5 hover:bg-brand-strong hover:shadow-[0_18px_56px_rgba(37,99,235,0.42)]",
        variant === "secondary" &&
          "border-white/12 bg-white/[0.04] text-white hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.08]",
        variant === "ghost" &&
          "border-white/10 bg-transparent text-slate-200 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.04] hover:text-white",
        pulse && "animate-[pulseGlow_3.2s_ease-in-out_infinite]",
        className,
      )}
    >
      {children}
      {trailingArrow ? <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-0.5" /> : null}
    </MarketingLink>
  );
}

export function PursuitIQMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
        <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_30%_20%,rgba(96,165,250,0.28),transparent_48%),radial-gradient(circle_at_70%_70%,rgba(37,99,235,0.32),transparent_52%)]" />
        <svg viewBox="0 0 48 48" className="relative h-6 w-6">
          <path d="M11 31c3-9 11-16 22-18" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="3" strokeLinecap="round" />
          <path d="M14 35c5-7 10-11 20-14" fill="none" stroke="rgba(96,165,250,0.95)" strokeWidth="4" strokeLinecap="round" />
          <circle cx="33" cy="14" r="5" fill="rgba(96,165,250,0.92)" />
        </svg>
      </div>
      {!compact ? (
        <div>
          <p className="text-[15px] font-semibold tracking-[-0.03em] text-white">PursuitIQ</p>
          <p className="text-xs text-slate-400">Win Intelligence Platform</p>
        </div>
      ) : null}
    </div>
  );
}

export function SectionReveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const reducedMotion = useHydrationSafeReducedMotion();

  if (reducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </motion.div>
  );
}

export function WordReveal({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const words = useMemo(() => text.split(" "), [text]);
  const reducedMotion = useHydrationSafeReducedMotion();

  if (reducedMotion) {
    return <h1 className={className}>{text}</h1>;
  }

  return (
    <motion.h1
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: { staggerChildren: 0.08, delayChildren: 0.08 },
        },
      }}
    >
      {words.map((word, index) => (
        <motion.span
          key={`${word}-${index}`}
          className="mr-[0.28em] inline-block"
          variants={{
            hidden: { opacity: 0, y: 18, filter: "blur(8px)" },
            visible: { opacity: 1, y: 0, filter: "blur(0px)" },
          }}
          transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
        >
          {word}
        </motion.span>
      ))}
    </motion.h1>
  );
}

export function CountUp({
  value,
  suffix = "",
  prefix = "",
  className,
}: {
  value: number;
  suffix?: string;
  prefix?: string;
  className?: string;
}) {
  const reducedMotion = useHydrationSafeReducedMotion();
  const ref = useRef<HTMLSpanElement | null>(null);
  const isInView = useInView(ref, { once: true, amount: 0.55 });
  const [displayValue, setDisplayValue] = useState(reducedMotion ? value : 0);

  useEffect(() => {
    if (reducedMotion) {
      setDisplayValue(value);
      return;
    }

    if (!isInView) return;

    let frame = 0;
    const duration = 1400;
    const start = performance.now();

    const tick = (time: number) => {
      const progress = Math.min((time - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(value * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [isInView, reducedMotion, value]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {displayValue}
      {suffix}
    </span>
  );
}

export function CursorGlow() {
  const reducedMotion = useHydrationSafeReducedMotion();
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);

  if (reducedMotion) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      onMouseMove={(event) => {
        const bounds = event.currentTarget.getBoundingClientRect();
        setPosition({ x: event.clientX - bounds.left, y: event.clientY - bounds.top });
        setActive(true);
      }}
      onMouseLeave={() => setActive(false)}
      aria-hidden="true"
    >
      <motion.div
        className="absolute h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(37,99,235,0.18),rgba(37,99,235,0.06)_35%,transparent_70%)] blur-3xl"
        animate={{
          opacity: active ? 1 : 0,
          x: position.x - 160,
          y: position.y - 160,
        }}
        transition={{ type: "spring", damping: 26, stiffness: 140, mass: 0.8 }}
      />
    </div>
  );
}

export function NoiseOverlay({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 opacity-[0.13] mix-blend-soft-light",
        "bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:160px_160px]",
        className,
      )}
    />
  );
}

export function DividerGlow() {
  return (
    <div
      aria-hidden="true"
      className="mx-auto h-px w-full max-w-7xl bg-[linear-gradient(90deg,transparent,rgba(37,99,235,0.38),transparent)] opacity-80"
    />
  );
}

const particleSeed = Array.from({ length: 18 }, (_, index) => ({
  left: `${(index * 17) % 100}%`,
  top: `${(index * 23) % 100}%`,
  size: 2 + (index % 4),
  duration: 10 + (index % 5) * 2,
  delay: (index % 6) * 0.35,
}));

export function ParticleField() {
  const reducedMotion = useHydrationSafeReducedMotion();

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {particleSeed.map((particle, index) => (
        <motion.span
          key={index}
          className="absolute rounded-full bg-white/40 shadow-[0_0_18px_rgba(96,165,250,0.25)]"
          style={{
            left: particle.left,
            top: particle.top,
            width: particle.size,
            height: particle.size,
          }}
          animate={
            reducedMotion
              ? undefined
              : {
                  y: [-12, 18, -8],
                  opacity: [0.25, 0.85, 0.25],
                }
          }
          transition={
            reducedMotion
              ? undefined
              : {
                  repeat: Number.POSITIVE_INFINITY,
                  repeatType: "mirror",
                  duration: particle.duration,
                  delay: particle.delay,
                  ease: "easeInOut",
                }
          }
        />
      ))}
    </div>
  );
}

export function FloatingPanel({
  children,
  className,
  depth = 10,
}: {
  children: React.ReactNode;
  className?: string;
  depth?: number;
}) {
  const reducedMotion = useHydrationSafeReducedMotion();

  if (reducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      animate={{ y: [-depth * 0.5, depth, -depth * 0.5] }}
      transition={{ duration: 8, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
    >
      {children}
    </motion.div>
  );
}

export function TabTransition({ tabKey, children }: { tabKey: string; children: React.ReactNode }) {
  const reducedMotion = useHydrationSafeReducedMotion();

  if (reducedMotion) {
    return <div>{children}</div>;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={tabKey}
        initial={{ opacity: 0, x: 24, y: 10 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        exit={{ opacity: 0, x: -24, y: -10 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export function CircularProgress({
  value,
  size = 156,
  strokeWidth = 12,
  label,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
}) {
  const reducedMotion = useHydrationSafeReducedMotion();
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true, amount: 0.45 });
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const [progress, setProgress] = useState(reducedMotion ? value : 0);

  useEffect(() => {
    if (reducedMotion) {
      setProgress(value);
      return;
    }
    if (!inView) return;

    let frame = 0;
    const start = performance.now();
    const duration = 1250;

    const animate = (time: number) => {
      const t = Math.min((time - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setProgress(Math.round(value * eased));
      if (t < 1) frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [inView, reducedMotion, value]);

  const offset = circumference - (progress / 100) * circumference;

  return (
    <div ref={ref} className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#brand-progress)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        />
        <defs>
          <linearGradient id="brand-progress" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-semibold tracking-[-0.06em] text-white">{progress}%</span>
        {label ? <span className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">{label}</span> : null}
      </div>
    </div>
  );
}

export function ActivityTicker({ items }: { items: readonly string[] }) {
  const reducedMotion = useHydrationSafeReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reducedMotion || items.length <= 1) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % items.length);
    }, 4000);
    return () => window.clearInterval(timer);
  }, [items, reducedMotion]);

  return (
    <div className="relative mt-7 overflow-hidden rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 backdrop-blur">
      <div className="flex items-center gap-3 text-xs uppercase tracking-[0.22em] text-brand-subtle">
        <span className="inline-flex h-2 w-2 rounded-full bg-brand shadow-[0_0_20px_rgba(37,99,235,0.85)]" />
        Live pursuit activity
      </div>
      <div className="relative mt-3 min-h-6 text-sm text-slate-200">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={reducedMotion ? false : { opacity: 0, y: 8 }}
            animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
            exit={reducedMotion ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            {items[index]}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

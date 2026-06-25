import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps, HTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type LinkHref = ComponentProps<typeof Link>["href"];

export function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand/15 text-sm font-semibold text-brand-subtle ring-1 ring-white/10">
        PI
      </div>
      <div>
        <p className="text-sm font-semibold text-white">PursuitIQ</p>
        <p className="text-xs text-slate-400">Win Intelligence Platform</p>
      </div>
    </div>
  );
}

export function Badge({ children, className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      {...props}
      className={cn(
        "inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-slate-200",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Button({
  children,
  className,
  href,
  variant = "primary",
  type = "button",
  ...props
}: {
  children: ReactNode;
  className?: string;
  href?: LinkHref;
  variant?: "primary" | "secondary" | "ghost";
  type?: "button" | "submit" | "reset";
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const variantClassName = {
    primary: "bg-teal-400 text-slate-950 hover:bg-teal-300",
    secondary: "bg-white/10 text-white hover:bg-white/15",
    ghost: "text-slate-200 hover:bg-white/5",
  }[variant];
  const classes = cn(
    "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-teal-300/50",
    variantClassName,
    className,
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} className={classes} {...props}>
      {children}
    </button>
  );
}

export function Card({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn("rounded-3xl border border-white/10 bg-slate-950/60 shadow-[0_24px_80px_rgba(2,6,23,0.32)] backdrop-blur", className)}
    >
      {children}
    </div>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none ring-0 placeholder:text-slate-500 focus:border-teal-300/40",
        props.className,
      )}
    />
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "min-h-32 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-teal-300/40",
        props.className,
      )}
    />
  );
}

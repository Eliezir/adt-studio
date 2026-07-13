import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost";
type Size = "md" | "lg";

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...rest
}: ComponentPropsWithoutRef<"a"> & {
  variant?: Variant;
  size?: Size;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-ring)] focus-visible:ring-offset-2";
  const sizes: Record<Size, string> = {
    md: "h-10 px-5 text-sm",
    lg: "h-12 px-7 text-sm",
  };
  const variants: Record<Variant, string> = {
    primary:
      "bg-[color:var(--color-primary)] text-[color:var(--color-primary-foreground)] hover:brightness-110 shadow-[0_1px_2px_rgba(0,0,0,0.08),0_8px_24px_-8px_color-mix(in_oklch,var(--color-primary)_45%,transparent)]",
    secondary:
      "border border-[color:var(--color-border)] bg-[color:var(--color-card)] text-[color:var(--color-foreground)] hover:bg-[color:var(--color-accent)]",
    ghost:
      "text-[color:var(--color-muted-foreground)] hover:text-[color:var(--color-foreground)] hover:bg-[color:var(--color-accent)]",
  };
  return (
    <a
      className={cn(base, sizes[size], variants[variant], className)}
      {...rest}
    />
  );
}

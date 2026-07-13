import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Keyboard key, styled after shadcn/ui's Kbd: a borderless muted chip with a
 * fixed height and minimum width so single glyphs (⌘, K) read as even keys.
 */
export function Kbd({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <kbd
      className={cn(
        "pointer-events-none inline-flex h-5 w-fit min-w-5 select-none items-center justify-center gap-1 rounded-sm bg-fd-muted px-1 font-sans text-xs font-medium text-fd-muted-foreground",
        className,
      )}
    >
      {children}
    </kbd>
  );
}

/** Groups multiple <Kbd> keys with consistent spacing. */
export function KbdGroup({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      {children}
    </span>
  );
}

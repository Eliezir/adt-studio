import { cn } from "@/lib/cn";

export function SectionEyebrow({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[color:var(--color-muted-foreground)]",
        className,
      )}
    >
      <span className="inline-block h-px w-6 bg-[color:var(--color-muted-foreground)]" />
      {label}
    </div>
  );
}

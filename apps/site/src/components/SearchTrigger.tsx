import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Trans, useLingui } from "@lingui/react/macro";
import { useSearchContext } from "fumadocs-ui/contexts/search";
import { cn } from "@/lib/cn";
import { trackEvent } from "@/lib/matomo";

function Key({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-6 min-w-6 select-none items-center justify-center rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-background)] px-1.5 font-sans text-xs font-medium text-[color:var(--color-muted-foreground)] shadow-[0_1px_0_rgba(0,0,0,0.04)]">
      {children}
    </kbd>
  );
}

export function SearchTrigger({
  source,
  className,
}: {
  source: string;
  className?: string;
}) {
  const { t } = useLingui();
  const { setOpenSearch } = useSearchContext();
  const [mod, setMod] = useState("⌘");

  useEffect(() => {
    const ua = `${navigator.platform} ${navigator.userAgent}`;
    setMod(/mac|iphone|ipad|ipod/i.test(ua) ? "⌘" : "Ctrl");
  }, []);

  return (
    <button
      type="button"
      onClick={() => {
        setOpenSearch(true);
        trackEvent("nav", "docs_search", source);
      }}
      aria-label={t`Search the documentation`}
      className={cn(
        "group flex h-12 cursor-pointer items-center gap-2.5 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-card)] px-3.5 text-left transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-[color:var(--color-primary)]/40 hover:shadow-[0_1px_2px_rgba(0,0,0,0.04),0_14px_30px_-20px_color-mix(in_oklch,var(--color-primary)_45%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-ring)] focus-visible:ring-offset-2",
        className,
      )}
    >
      <Search className="h-4 w-4 shrink-0 text-[color:var(--color-muted-foreground)] transition-colors duration-200 group-hover:text-[color:var(--color-primary)]" />
      <span className="flex-1 whitespace-nowrap text-sm text-[color:var(--color-muted-foreground)]">
        <Trans>Search docs</Trans>
      </span>
      <span className="flex shrink-0 items-center gap-1">
        <Key>{mod}</Key>
        <Key>K</Key>
      </span>
    </button>
  );
}

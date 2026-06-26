import { Search } from "lucide-react";
import { useSearchContext } from "fumadocs-ui/contexts/search";

/** Search trigger rendered at the top of the docs sidebar (Kaneo-style). */
export function SidebarSearch() {
  const { setOpenSearch, hotKey } = useSearchContext();

  return (
    <button
      type="button"
      onClick={() => setOpenSearch(true)}
      className="group flex w-full items-center gap-2 rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-card)] px-2.5 py-2 text-start text-sm text-[color:var(--color-muted-foreground)] transition-colors hover:border-[color:var(--color-primary)]/40 hover:text-[color:var(--color-foreground)]"
    >
      <Search className="size-4" />
      <span className="flex-1">Search</span>
      <kbd className="inline-flex items-center gap-0.5 rounded border border-[color:var(--color-border)] bg-[color:var(--color-background)] px-1.5 text-[11px]">
        {hotKey.map((k, i) => (
          <span key={i}>{k.display}</span>
        ))}
      </kbd>
    </button>
  );
}

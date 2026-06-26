import { Search } from "lucide-react";
import { useSearchContext } from "fumadocs-ui/contexts/search";
import { Kbd, KbdGroup } from "@/components/docs/Kbd";
import { useModKey } from "@/lib/useModKey";

/** Search trigger at the top of the docs sidebar — OS-aware ⌘/Ctrl + K hint. */
export function SidebarSearch() {
  const { setOpenSearch } = useSearchContext();
  const mod = useModKey();

  return (
    <button
      type="button"
      onClick={() => setOpenSearch(true)}
      className="group flex w-full items-center gap-2 rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-card)] px-2.5 py-2 text-start text-sm text-[color:var(--color-muted-foreground)] transition-colors hover:border-[color:var(--color-primary)]/40 hover:text-[color:var(--color-foreground)]"
    >
      <Search className="size-4" />
      <span className="flex-1">Search</span>
      <KbdGroup>
        <Kbd>{mod}</Kbd>
        <Kbd>K</Kbd>
      </KbdGroup>
    </button>
  );
}

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { useSearchContext } from "fumadocs-ui/contexts/search";

const KBD =
  "inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded border border-[color:var(--color-border)] bg-[color:var(--color-background)] px-1 text-[11px] font-medium text-[color:var(--color-muted-foreground)]";

/** Search trigger at the top of the docs sidebar — OS-aware ⌘/Ctrl + K hint. */
export function SidebarSearch() {
  const { setOpenSearch } = useSearchContext();
  // Default to the macOS symbol so SSR and the first client render agree; the
  // effect corrects it to "Ctrl" on Windows/Linux after mount.
  const [mod, setMod] = useState("⌘");

  useEffect(() => {
    const ua = `${navigator.platform} ${navigator.userAgent}`;
    setMod(/mac|iphone|ipad|ipod/i.test(ua) ? "⌘" : "Ctrl");
  }, []);

  return (
    <button
      type="button"
      onClick={() => setOpenSearch(true)}
      className="group flex w-full items-center gap-2 rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-card)] px-2.5 py-2 text-start text-sm text-[color:var(--color-muted-foreground)] transition-colors hover:border-[color:var(--color-primary)]/40 hover:text-[color:var(--color-foreground)]"
    >
      <Search className="size-4" />
      <span className="flex-1">Search</span>
      <span className="flex items-center gap-1">
        <kbd className={KBD}>{mod}</kbd>
        <kbd className={KBD}>K</kbd>
      </span>
    </button>
  );
}

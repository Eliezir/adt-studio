import { Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useSearchContext } from "fumadocs-ui/contexts/search";

const POPULAR: { label: string; splat: string }[] = [
  { label: "Quick Start", splat: "quickstart" },
  { label: "Installation", splat: "install" },
  { label: "The Pipeline", splat: "pipeline" },
];

/** Hero for the docs Overview: eyebrow, headline, value prop, search, popular links. */
export function DocsHero() {
  const { setOpenSearch } = useSearchContext();

  return (
    <div className="not-prose relative flex flex-col items-center pb-2 pt-6 text-center sm:pt-10">
      {/* Layered glows for depth */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-28 left-1/2 -z-10 h-[24rem] w-[46rem] max-w-[140%] -translate-x-1/2 rounded-full bg-fd-primary/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 left-1/2 -z-10 h-64 w-72 -translate-x-1/2 rounded-full bg-[oklch(0.7_0.16_220)]/20 blur-3xl"
      />

      <span className="inline-flex items-center gap-2 rounded-full border border-fd-border bg-fd-card px-3 py-1 text-xs font-semibold text-fd-muted-foreground shadow-sm">
        <span className="size-1.5 rounded-full bg-fd-primary" />
        ADT Studio Documentation
      </span>

      <h1 className="mt-6 max-w-2xl text-pretty text-4xl font-bold tracking-tight text-fd-foreground sm:text-5xl lg:text-6xl">
        Turn any PDF into an{" "}
        <span className="bg-gradient-to-r from-[oklch(0.58_0.2_262)] to-[oklch(0.7_0.16_222)] bg-clip-text text-transparent">
          accessible book
        </span>
      </h1>

      <p className="mt-5 max-w-xl text-pretty text-lg leading-relaxed text-fd-muted-foreground">
        Extract, structure, translate, narrate, and package — all on your
        machine and fully inspectable. Go from install to your first finished
        book.
      </p>

      <button
        type="button"
        onClick={() => setOpenSearch(true)}
        className="group mt-8 flex w-full max-w-md items-center gap-3 rounded-xl border border-fd-border bg-fd-card px-4 py-3 text-left text-sm text-fd-muted-foreground shadow-sm transition-all hover:border-fd-primary/50 hover:text-fd-foreground hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-primary/50"
      >
        <Search className="size-4 transition-colors group-hover:text-fd-primary" />
        <span className="flex-1">Search the documentation…</span>
        <kbd className="hidden rounded border border-fd-border bg-fd-background px-1.5 py-0.5 text-[11px] sm:inline">
          ⌘ K
        </kbd>
      </button>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5 text-sm text-fd-muted-foreground">
        <span>Popular:</span>
        {POPULAR.map(({ label, splat }) => (
          <Link
            key={splat}
            to="/docs/$"
            params={{ _splat: splat }}
            className="rounded-md px-1.5 py-0.5 font-medium text-fd-foreground/80 underline-offset-4 transition-colors hover:text-fd-primary hover:underline"
          >
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}

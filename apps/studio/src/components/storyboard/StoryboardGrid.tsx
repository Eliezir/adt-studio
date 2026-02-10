import { cn } from "@/lib/utils"
import { PageCard } from "./PageCard"
import type { PageSummaryItem } from "@/api/client"

interface StoryboardGridProps {
  label: string
  pages: PageSummaryItem[]
  viewMode: "grid" | "list"
}

export function StoryboardGrid({
  label,
  pages,
  viewMode,
}: StoryboardGridProps) {
  if (pages.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        No pages found. Run the pipeline first to extract pages.
      </div>
    )
  }

  return (
    <div
      className={cn(
        viewMode === "grid"
          ? "grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
          : "flex flex-col gap-2"
      )}
    >
      {pages.map((page) => (
        <PageCard
          key={page.pageId}
          label={label}
          pageId={page.pageId}
          pageNumber={page.pageNumber}
          hasRendering={page.hasRendering}
          viewMode={viewMode}
        />
      ))}
    </div>
  )
}

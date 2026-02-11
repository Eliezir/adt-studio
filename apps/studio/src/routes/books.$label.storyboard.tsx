import { createFileRoute, Link } from "@tanstack/react-router"
import { Grid, List } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useBook } from "@/hooks/use-books"
import { usePages } from "@/hooks/use-pages"
import { StoryboardGrid } from "@/components/storyboard/StoryboardGrid"

export const Route = createFileRoute("/books/$label/storyboard")({
  component: StoryboardPage,
})

function StoryboardPage() {
  const { label } = Route.useParams()
  const { data: book } = useBook(label)
  const { data: pages, isLoading, error } = usePages(label)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

  if (isLoading) {
    return <div className="p-4 text-muted-foreground">Loading pages...</div>
  }

  if (error) {
    return (
      <div className="p-4 text-destructive">
        Failed to load pages: {error.message}
      </div>
    )
  }

  return (
    <div className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0">
            ADT Studio
          </Link>
          <span className="text-muted-foreground/50">/</span>
          <Link to="/books/$label" params={{ label }} search={{ autoRun: undefined, startPage: undefined, endPage: undefined }} className="text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0">
            {book?.title ?? label}
          </Link>
          <span className="text-muted-foreground/50">/</span>
          <h1 className="text-lg font-semibold">Storyboard</h1>
          <span className="text-xs text-muted-foreground ml-1">
            {pages?.length ?? 0} pages
            {pages && ` (${pages.filter((p) => p.hasRendering).length} rendered)`}
          </span>
        </div>
        <div className="flex gap-1 rounded-md border p-0.5">
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("grid")}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <StoryboardGrid
        label={label}
        pages={pages ?? []}
        viewMode={viewMode}
      />
    </div>
  )
}

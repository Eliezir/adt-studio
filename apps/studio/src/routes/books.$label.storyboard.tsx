import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { ArrowLeft, Grid, List } from "lucide-react"
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
  const navigate = useNavigate()
  const { data: book } = useBook(label)
  const { data: pages, isLoading, error } = usePages(label)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

  if (isLoading) {
    return <div className="text-muted-foreground">Loading pages...</div>
  }

  if (error) {
    return (
      <div className="text-destructive">
        Failed to load pages: {error.message}
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <Button
          variant="ghost"
          onClick={() =>
            navigate({ to: "/books/$label", params: { label } })
          }
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Book
        </Button>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {book?.title ?? label} — Storyboard
          </h1>
          <p className="text-sm text-muted-foreground">
            {pages?.length ?? 0} pages
            {pages &&
              ` (${pages.filter((p) => p.hasRendering).length} rendered)`}
          </p>
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

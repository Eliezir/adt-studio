import { useState, useEffect } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { BookOpen, LayoutGrid, Play, Settings2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useBook } from "@/hooks/use-books"
import { usePipelineSSE, usePipelineStatus, useRunPipeline } from "@/hooks/use-pipeline"
import { useApiKey } from "@/hooks/use-api-key"
import { PipelineProgress } from "@/components/pipeline/PipelineProgress"
import { PagePreviewGrid } from "@/components/pipeline/PagePreviewGrid"

export const Route = createFileRoute("/books/$label/")({
  component: BookDetailPage,
})

function BookDetailPage() {
  const { label } = Route.useParams()
  const { data: book, isLoading, error } = useBook(label)
  const { apiKey, setApiKey, hasApiKey } = useApiKey()

  const runPipeline = useRunPipeline()
  const [sseEnabled, setSseEnabled] = useState(false)
  const { progress, reset } = usePipelineSSE(label, sseEnabled)
  const { data: pipelineStatus } = usePipelineStatus(label)

  // Pipeline config options
  const [startPage, setStartPage] = useState("")
  const [endPage, setEndPage] = useState("")
  const [concurrency, setConcurrency] = useState("16")

  // Auto-reconnect to SSE if pipeline is already running
  useEffect(() => {
    if (pipelineStatus?.status === "running" && !sseEnabled) {
      setSseEnabled(true)
    }
  }, [pipelineStatus?.status, sseEnabled])

  const handleRun = () => {
    reset()
    setSseEnabled(true)

    const options: { startPage?: number; endPage?: number; concurrency?: number } = {}
    if (startPage) options.startPage = Number(startPage)
    if (endPage) options.endPage = Number(endPage)
    const c = Number(concurrency)
    if (c && c !== 16) options.concurrency = c

    runPipeline.mutate(
      { label, apiKey, options: Object.keys(options).length > 0 ? options : undefined },
      {
        onError: () => {
          setSseEnabled(false)
        },
      }
    )
  }

  if (isLoading) {
    return <div className="p-4 text-muted-foreground">Loading book...</div>
  }

  if (error) {
    return (
      <div className="p-4 text-destructive">
        Failed to load book: {error.message}
      </div>
    )
  }

  if (!book) return null

  const showPipelineRunning = progress.isRunning || progress.isComplete || progress.error

  return (
    <div className="p-4 space-y-4">
      {/* Header row */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0">
            ADT Studio
          </Link>
          <span className="text-muted-foreground/50 shrink-0">/</span>
          <h1 className="text-lg font-semibold truncate">
            {book.title ?? book.label}
          </h1>
        </div>
        {book.needsRebuild ? (
          <Badge variant="destructive">Needs rebuild</Badge>
        ) : (
          <Badge variant={book.pageCount > 0 ? "default" : "secondary"}>
            {book.pageCount > 0 ? `${book.pageCount} pages` : "New"}
          </Badge>
        )}
        {book.pageCount > 0 && (
          <Link to="/books/$label/storyboard" params={{ label }}>
            <Button variant="outline" size="sm">
              <LayoutGrid className="mr-2 h-4 w-4" />
              Storyboard
            </Button>
          </Link>
        )}
      </div>

      {/* Rebuild warning */}
      {book.needsRebuild && (
        <Card>
          <CardHeader>
            <CardTitle>Rebuild Required</CardTitle>
            <CardDescription>
              {book.rebuildReason ??
                "This book was created with an older storage schema and must be rebuilt."}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Book Details */}
        <Card className="h-full">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <BookOpen className="h-4 w-4" />
              Book Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            {book.metadata ? (
              <dl className="space-y-3 text-sm">
                {book.metadata.title && (
                  <div>
                    <dt className="text-xs text-muted-foreground">Title</dt>
                    <dd>{book.metadata.title}</dd>
                  </div>
                )}
                {book.metadata.authors.length > 0 && (
                  <div>
                    <dt className="text-xs text-muted-foreground">Authors</dt>
                    <dd>{book.metadata.authors.join(", ")}</dd>
                  </div>
                )}
                {book.metadata.publisher && (
                  <div>
                    <dt className="text-xs text-muted-foreground">Publisher</dt>
                    <dd>{book.metadata.publisher}</dd>
                  </div>
                )}
                {book.metadata.language_code && (
                  <div>
                    <dt className="text-xs text-muted-foreground">Language</dt>
                    <dd>{book.metadata.language_code}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs text-muted-foreground">Pages</dt>
                  <dd>{book.pageCount > 0 ? `${book.pageCount} extracted` : "None yet"}</dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">
                No metadata extracted yet. Run the pipeline to extract book details.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Right: Pipeline Config or Pipeline Progress */}
        {showPipelineRunning ? (
          <div className="h-full">
            <PipelineProgress
              progress={progress}
              onRun={handleRun}
              isStarting={runPipeline.isPending}
              hasApiKey={hasApiKey}
            />
          </div>
        ) : (
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Settings2 className="h-4 w-4" />
                Pipeline Configuration
              </CardTitle>
              <CardDescription>
                Configure options before running the pipeline.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* API Key */}
                <div className="space-y-1.5">
                  <Label htmlFor="api-key" className="text-xs">OpenAI API Key</Label>
                  <Input
                    id="api-key"
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-..."
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Stored in your browser only. Never sent to our servers.
                  </p>
                </div>

                {/* Page Range + Concurrency in a row */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Page Range</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={1}
                        value={startPage}
                        onChange={(e) => setStartPage(e.target.value)}
                        placeholder="First"
                        className="w-20"
                      />
                      <span className="text-xs text-muted-foreground">to</span>
                      <Input
                        type="number"
                        min={1}
                        value={endPage}
                        onChange={(e) => setEndPage(e.target.value)}
                        placeholder="Last"
                        className="w-20"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Leave empty for all pages
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="concurrency" className="text-xs">Concurrency</Label>
                    <Input
                      id="concurrency"
                      type="number"
                      min={1}
                      max={64}
                      value={concurrency}
                      onChange={(e) => setConcurrency(e.target.value)}
                      className="w-20"
                    />
                    <p className="text-xs text-muted-foreground">
                      Parallel LLM calls
                    </p>
                  </div>
                </div>

                {/* Run button */}
                <div className="flex items-center gap-3 pt-1">
                  <Button
                    onClick={handleRun}
                    disabled={runPipeline.isPending || !hasApiKey}
                  >
                    <Play className="mr-2 h-4 w-4" />
                    {runPipeline.isPending ? "Starting..." : book.pageCount > 0 ? "Re-run Pipeline" : "Run Pipeline"}
                  </Button>
                  {!hasApiKey && (
                    <span className="text-xs text-muted-foreground">
                      Enter your API key above to run.
                    </span>
                  )}
                </div>

                {runPipeline.isError && (
                  <p className="text-sm text-destructive">
                    Failed to start pipeline: {runPipeline.error.message}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Full-width page preview grid */}
      {(progress.isRunning || progress.isComplete || book.pageCount > 0) && (
        <PagePreviewGrid label={label} isRunning={progress.isRunning} />
      )}
    </div>
  )
}

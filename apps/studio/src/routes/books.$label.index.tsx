import { useState, useEffect } from "react"
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router"
import { ArrowLeft, BookOpen, Key, LayoutGrid, Play, Settings2 } from "lucide-react"
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
  const navigate = useNavigate()
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
    return <div className="text-muted-foreground">Loading book...</div>
  }

  if (error) {
    return (
      <div className="text-destructive">
        Failed to load book: {error.message}
      </div>
    )
  }

  if (!book) return null

  const showPipelineRunning = progress.isRunning || progress.isComplete || progress.error

  return (
    <div className="mx-auto max-w-3xl">
      <Button
        variant="ghost"
        className="mb-4"
        onClick={() => navigate({ to: "/" })}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Books
      </Button>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {book.title ?? book.label}
          </h1>
          {book.title && (
            <p className="text-sm text-muted-foreground">{book.label}</p>
          )}
        </div>
        <Badge variant={book.pageCount > 0 ? "default" : "secondary"}>
          {book.pageCount > 0 ? `${book.pageCount} pages` : "New"}
        </Badge>
      </div>

      <div className="space-y-4">
        {book.metadata && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Metadata
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-2 text-sm">
                {book.metadata.title && (
                  <>
                    <dt className="text-muted-foreground">Title</dt>
                    <dd>{book.metadata.title}</dd>
                  </>
                )}
                {book.metadata.authors.length > 0 && (
                  <>
                    <dt className="text-muted-foreground">Authors</dt>
                    <dd>{book.metadata.authors.join(", ")}</dd>
                  </>
                )}
                {book.metadata.publisher && (
                  <>
                    <dt className="text-muted-foreground">Publisher</dt>
                    <dd>{book.metadata.publisher}</dd>
                  </>
                )}
                {book.metadata.language_code && (
                  <>
                    <dt className="text-muted-foreground">Language</dt>
                    <dd>{book.metadata.language_code}</dd>
                  </>
                )}
              </dl>
            </CardContent>
          </Card>
        )}

        {/* Pipeline: config form (pre-run) or progress (running/done) */}
        {showPipelineRunning ? (
          <PipelineProgress
            progress={progress}
            onRun={handleRun}
            isStarting={runPipeline.isPending}
            hasApiKey={hasApiKey}
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                Pipeline Configuration
              </CardTitle>
              <CardDescription>
                Configure options before running the pipeline.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* API Key */}
              <div className="space-y-2">
                <Label htmlFor="api-key">OpenAI API Key</Label>
                <Input
                  id="api-key"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="max-w-md font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Stored in your browser only. Never sent to our servers.
                </p>
              </div>

              {/* Page Range */}
              <div className="space-y-2">
                <Label>Page Range</Label>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      value={startPage}
                      onChange={(e) => setStartPage(e.target.value)}
                      placeholder="First"
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">to</span>
                    <Input
                      type="number"
                      min={1}
                      value={endPage}
                      onChange={(e) => setEndPage(e.target.value)}
                      placeholder="Last"
                      className="w-24"
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Leave empty to process all pages
                  </span>
                </div>
              </div>

              {/* Concurrency */}
              <div className="space-y-2">
                <Label htmlFor="concurrency">Concurrency</Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="concurrency"
                    type="number"
                    min={1}
                    max={64}
                    value={concurrency}
                    onChange={(e) => setConcurrency(e.target.value)}
                    className="w-24"
                  />
                  <span className="text-xs text-muted-foreground">
                    Parallel LLM calls (higher = faster but more API usage)
                  </span>
                </div>
              </div>

              {/* Run button + error */}
              <div className="flex items-center gap-3 pt-2">
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
            </CardContent>
          </Card>
        )}

        {(progress.isRunning || progress.isComplete || book.pageCount > 0) && (
          <PagePreviewGrid label={label} isRunning={progress.isRunning} />
        )}

        {book.pageCount > 0 && (
          <Link
            to="/books/$label/storyboard"
            params={{ label }}
            className="block"
          >
            <Button variant="outline" className="w-full">
              <LayoutGrid className="mr-2 h-4 w-4" />
              View Storyboard ({book.pageCount} pages)
            </Button>
          </Link>
        )}
      </div>
    </div>
  )
}

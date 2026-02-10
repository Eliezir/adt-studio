import { useState } from "react"
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router"
import { ArrowLeft, BookOpen, Key, LayoutGrid } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useBook } from "@/hooks/use-books"
import { usePipelineSSE, useRunPipeline } from "@/hooks/use-pipeline"
import { useApiKey } from "@/hooks/use-api-key"
import { PipelineProgress } from "@/components/pipeline/PipelineProgress"

export const Route = createFileRoute("/books/$label/")({
  component: BookDetailPage,
})

function BookDetailPage() {
  const { label } = Route.useParams()
  const navigate = useNavigate()
  const { data: book, isLoading, error } = useBook(label)
  const { apiKey, setApiKey, hasApiKey } = useApiKey()
  const [showApiKeyInput, setShowApiKeyInput] = useState(false)

  const runPipeline = useRunPipeline()
  const [sseEnabled, setSseEnabled] = useState(false)
  const { progress, reset } = usePipelineSSE(label, sseEnabled)

  const handleRun = () => {
    if (!hasApiKey) {
      setShowApiKeyInput(true)
      return
    }
    reset()
    setSseEnabled(true)
    runPipeline.mutate(
      { label, apiKey },
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

        <PipelineProgress
          progress={progress}
          onRun={handleRun}
          isStarting={runPipeline.isPending}
          hasApiKey={hasApiKey}
        />

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

        {(showApiKeyInput || !hasApiKey) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                API Key
              </CardTitle>
              <CardDescription>
                Your OpenAI API key is stored in your browser only.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="max-w-md font-mono"
                />
                {apiKey && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowApiKeyInput(false)}
                  >
                    Done
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {runPipeline.isError && (
          <p className="text-sm text-destructive">
            Failed to start pipeline: {runPipeline.error.message}
          </p>
        )}
      </div>
    </div>
  )
}

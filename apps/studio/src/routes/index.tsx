import { useState } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import {
  Plus,
  ArrowRight,
  BookOpen,
  Trash2,
  FileText,
  Building2,
  User,
  Globe,
  Settings,
  Home,
  Pencil,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSettingsDialog } from "@/routes/__root"
import { Badge } from "@/components/ui/badge"
import { DeleteBookDialog } from "@/components/books/DeleteBookDialog"
import { useBooks, useDeleteBook } from "@/hooks/use-books"
import {
  getPipelineStages,
  type PipelineStageLabelKey,
  type PipelineStageDescriptionKey,
} from "@/components/pipeline/stage-config"
import type { BookSummary } from "@/api/client"
import { LocaleSwitcher } from "@/components/LocaleSwitcher"
import { m } from "@/paraglide/messages"

type MessageKey = PipelineStageLabelKey | PipelineStageDescriptionKey

function translateStageMessage(key: MessageKey): string {
  return (m[key as keyof typeof m] as () => string)()
}

export const Route = createFileRoute("/")({
  component: HomePage,
})

/** Pipeline stages shown in the sidebar (skip the "book" overview entry) */
const PIPELINE_STEPS = getPipelineStages()

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="truncate">{value}</span>
    </div>
  )
}

function BookRow({
  book,
  onDelete,
}: {
  book: BookSummary
  onDelete: (label: string) => void
}) {
  const hasMetadata = book.title || book.authors.length > 0
  return (
    <div className="group rounded-xl border bg-card transition-all duration-200 hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5">
      <div className="flex items-stretch">
        {/* Main content — clickable */}
        <Link
          to="/books/$label/$step"
          params={{ label: book.label, step: "extract" }}
          className="flex-1 min-w-0 p-5"
        >
          {/* Top: title + badges */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <BookOpen className="h-5 w-5 text-muted-foreground shrink-0" />
              <h3 className="font-semibold text-base truncate">
                {book.title ?? book.label}
              </h3>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {book.needsRebuild && (
                <Badge variant="destructive" className="text-[11px] px-2 py-0.5">
                  {m.book_row_needs_rebuild()}
                </Badge>
              )}
              {book.languageCode && (
                <Badge variant="outline" className="text-[11px] px-2 py-0.5">
                  {book.languageCode.toUpperCase()}
                </Badge>
              )}
              {!book.needsRebuild && (
                <Badge
                  variant={book.pageCount > 0 ? "default" : "secondary"}
                  className="text-[11px] px-2 py-0.5"
                >
                  {book.pageCount > 0
                    ? `${book.pageCount} ${
                        book.pageCount === 1
                          ? m.book_row_page_label_singular()
                          : m.book_row_page_label_plural()
                      }`
                    : m.book_row_new()}
                </Badge>
              )}
              {!book.hasSourcePdf && (
                <Badge variant="secondary" className="text-[11px] px-2 py-0.5">
                  {m.book_row_no_pdf()}
                </Badge>
              )}
            </div>
          </div>

          {/* Rebuild warning */}
          {book.needsRebuild && (
            <p className="text-sm text-destructive mb-2">
              {book.rebuildReason ?? m.book_row_default_rebuild_reason()}
            </p>
          )}

          {/* Details */}
          {hasMetadata ? (
            <div className="space-y-1.5">
              {book.title && (
                <DetailRow icon={FileText} label={m.book_row_label()} value={book.label} />
              )}
              {book.authors.length > 0 && (
                <DetailRow
                  icon={User}
                  label={book.authors.length > 1 ? m.book_row_authors() : m.book_row_author()}
                  value={book.authors.join(", ")}
                />
              )}
              {book.publisher && (
                <DetailRow
                  icon={Building2}
                  label={m.book_row_publisher()}
                  value={book.publisher}
                />
              )}
              {book.languageCode && (
                <DetailRow
                  icon={Globe}
                  label={m.book_row_language()}
                  value={book.languageCode.toUpperCase()}
                />
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              {m.book_row_no_metadata()}
            </p>
          )}
        </Link>

        {/* Actions — always visible */}
        <div className="flex flex-col items-center justify-center gap-1 border-l px-3 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-primary"
            asChild
          >
            <Link to="/books/$label/$step" params={{ label: book.label, step: "extract" }}>
              <Pencil className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(book.label)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

function HomePage() {
  const { data: books, isLoading, error } = useBooks()
  const deleteMutation = useDeleteBook()
  const [deleteLabel, setDeleteLabel] = useState<string | null>(null)
  const { openSettings } = useSettingsDialog()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center flex-1 text-muted-foreground">
        {m.index_loading_books()}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center flex-1 text-destructive">
        {m.index_failed_to_load_books({ message: error.message })}
      </div>
    )
  }

  const bookList = books ?? []

  return (
    <div className="flex flex-1 min-h-0 flex-col">
      {/* Top bar — matches book page header */}
      <div className="shrink-0 min-h-11 py-1 flex items-center bg-gray-700 text-white px-4">
        <div className="flex items-center gap-2.5">
          <Home className="w-4 h-4 shrink-0" />
          <span className="text-sm font-semibold">ADT Studio</span>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <LocaleSwitcher />
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0 text-white/70 hover:text-white hover:bg-gray-600"
            onClick={openSettings}
            title={m.index_header_api_key_settings()}
          >
            <Settings className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
      {/* Left — pipeline stages (30%) */}
      <div className="w-[30%] shrink-0 border-r bg-muted/30 flex flex-col overflow-auto">
        <div className="px-5 pt-5 pb-5 flex-1">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            {m.index_pipeline_stages()}
          </h2>
          <div className="space-y-1">
            {PIPELINE_STEPS.map((step, i) => {
              const Icon = step.icon
              const label = translateStageMessage(step.labelKey)
              const description = translateStageMessage(step.descriptionKey)

              return (
                <div
                  key={step.slug}
                  className="flex gap-3 p-2.5 rounded-lg"
                >
                  <div className="flex flex-col items-center gap-1">
                    <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${step.color} text-white`}>
                      <Icon className="h-3 w-3" />
                    </div>
                    {i < PIPELINE_STEPS.length - 1 && (
                      <div className="w-px flex-1 bg-border" />
                    )}
                  </div>
                  <div className="min-w-0 pb-1">
                    <span className="text-sm font-medium">{label}</span>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>

          <Link
            to="/books/new"
            className="mt-4 flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 shadow-sm transition-colors"
          >
            {m.index_pipeline_get_started()} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Right — books list (70%) */}
      <div className="flex-1 min-w-0 overflow-auto p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-muted-foreground">
            {m.index_books_heading()}
            {bookList.length > 0 && ` (${bookList.length})`}
          </h2>
          <Button variant="outline" size="sm" asChild>
            <Link to="/books/new" className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              {m.index_books_add_book()}
            </Link>
          </Button>
        </div>
        <div className="space-y-3">
          {bookList.map((book) => (
            <BookRow
              key={book.label}
              book={book}
              onDelete={setDeleteLabel}
            />
          ))}
          {bookList.length === 0 && (
            <Link to="/books/new" className="block">
              <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed bg-muted/30 py-16 transition-all hover:border-primary/40 hover:bg-primary/5 cursor-pointer">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-3">
                  <Plus className="h-6 w-6 text-primary" />
                </div>
                <span className="text-sm font-medium">
                  {m.index_books_empty_title()}
                </span>
                <span className="text-xs text-muted-foreground mt-1">
                  {m.index_books_empty_subtitle()}
                </span>
              </div>
            </Link>
          )}
        </div>
      </div>
      </div>

      <DeleteBookDialog
        label={deleteLabel}
        isPending={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteLabel) {
            deleteMutation.mutate(deleteLabel, {
              onSuccess: () => setDeleteLabel(null),
            })
          }
        }}
        onCancel={() => setDeleteLabel(null)}
      />
    </div>
  )
}

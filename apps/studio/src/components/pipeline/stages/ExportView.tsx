import { FileDown, Loader2, BookOpen, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useExportBook, useExportWebpub } from "@/hooks/use-books"
import { useBookRun } from "@/hooks/use-book-run"
import * as m from "@/paraglide/messages"
import { cn } from "@/lib/utils"

export function ExportView({ bookLabel }: { bookLabel: string }) {
  const exportBook = useExportBook()
  const exportWebpub = useExportWebpub()
  const { stageState } = useBookRun()
  const storyboardDone = stageState("storyboard") === "done"

  const adtError = exportBook.isError
    ? exportBook.error.name === "TimeoutError"
      ? m.export_timeout()
      : exportBook.error.message
    : null

  const webpubError = exportWebpub.isError
    ? exportWebpub.error.name === "TimeoutError"
      ? m.export_timeout()
      : exportWebpub.error.message
    : null

  if (!storyboardDone) {
    return (
      <div className="p-6 max-w-xl flex flex-col items-center gap-3 text-center">
        <AlertCircle className="w-8 h-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">
          {m.export_requires_storyboard_line1()}
        </p>
        <p className="text-sm text-muted-foreground">
          {m.export_requires_storyboard_line2_prefix()}{" "}
          <span className="font-medium text-foreground">{m.pipeline_stage_storyboard_label()}</span>{" "}
          {m.export_requires_storyboard_line2_suffix()}
        </p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-xl flex flex-col gap-6">
      {/* ADT Export */}
      <section className="rounded-lg border p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <FileDown className="w-5 h-5 text-emerald-600" />
          <h3 className="text-sm font-semibold">{m.export_adt_title()}</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          {m.export_adt_description()}
        </p>
        <div className="flex flex-col gap-1">
          <Button
            variant="outline"
            size="sm"
            className={
              cn(
                "w-fit cursor-pointer",
                exportBook.isError
                  ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100 hover:text-red-600"
                  : "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 hover:text-emerald-600"
              )
            }
            onClick={() => exportBook.mutate(bookLabel)}
            disabled={exportBook.isPending}
          >
            {exportBook.isPending ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileDown className="mr-1.5 h-3.5 w-3.5" />
            )}
            {exportBook.isError ? m.export_retry() : m.export_adt_action()}
          </Button>
          {adtError && (
            <p className="text-[11px] leading-tight text-red-500">
              {adtError}
            </p>
          )}
        </div>
      </section>

      {/* WebPub Export */}
      <section className="rounded-lg border p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-600" />
          <h3 className="text-sm font-semibold">{m.export_webpub_title()}</h3>
          <span className="ml-auto text-[10px] font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5 leading-none">
            {m.export_beta_badge()}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          {m.export_webpub_description()}
        </p>
        <div className="flex flex-col gap-1">
          <Button
            variant="outline"
            size="sm"
            className={
              cn(
                "w-fit cursor-pointer",
                exportWebpub.isError
                  ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100 hover:text-red-600"
                  : "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 hover:text-blue-600"
              )
            }
            onClick={() => exportWebpub.mutate(bookLabel)}
            disabled={exportWebpub.isPending}
          >
            {exportWebpub.isPending ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <BookOpen className="mr-1.5 h-3.5 w-3.5" />
            )}
            {exportWebpub.isError ? m.export_retry() : m.export_webpub_action()}
          </Button>
          {webpubError && (
            <p className="text-[11px] leading-tight text-red-500">
              {webpubError}
            </p>
          )}
        </div>
      </section>
    </div>
  )
}

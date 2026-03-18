import { FileDown, Loader2, BookOpen, AlertCircle, GraduationCap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useExportBook, useExportWebpub, useExportScorm } from "@/hooks/use-books"
import { useBookRun } from "@/hooks/use-book-run"

export function ExportView({ bookLabel }: { bookLabel: string }) {
  const exportBook = useExportBook()
  const exportWebpub = useExportWebpub()
  const exportScorm = useExportScorm()
  const { stageState } = useBookRun()
  const storyboardDone = stageState("storyboard") === "done"

  const adtError = exportBook.isError
    ? exportBook.error.name === "TimeoutError"
      ? "Export timed out — the book may be too large"
      : exportBook.error.message
    : null

  const webpubError = exportWebpub.isError
    ? exportWebpub.error.name === "TimeoutError"
      ? "Export timed out — the book may be too large"
      : exportWebpub.error.message
    : null

  const scormError = exportScorm.isError
    ? exportScorm.error.name === "TimeoutError"
      ? "Export timed out — the book may be too large"
      : exportScorm.error.message
    : null

  if (!storyboardDone) {
    return (
      <div className="p-6 max-w-xl flex flex-col items-center gap-3 text-center">
        <AlertCircle className="w-8 h-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">
          A storyboard must be built before exporting.
        </p>
        <p className="text-sm text-muted-foreground">
          Run the pipeline through
          at least the <span className="font-medium text-foreground">Storyboard</span> stage first.
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
          <h3 className="text-sm font-semibold">ADT Export</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Export the complete Accessible Digital Textbook as a ZIP archive. Includes
          all HTML pages, images, audio files, quizzes, and the compiled web
          application — ready to upload to a distribution platform or open locally.
        </p>
        <div className="flex flex-col gap-1">
          <Button
            variant="outline"
            size="sm"
            className={
              exportBook.isError
                ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100 w-fit"
                : "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 w-fit"
            }
            onClick={() => exportBook.mutate(bookLabel)}
            disabled={exportBook.isPending}
          >
            {exportBook.isPending ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileDown className="mr-1.5 h-3.5 w-3.5" />
            )}
            {exportBook.isError ? "Retry Export" : "Export ADT"}
          </Button>
          {adtError && (
            <p className="text-[11px] leading-tight text-red-500">
              {adtError}
            </p>
          )}
        </div>
      </section>

      {/* SCORM Export */}
      <section className="rounded-lg border p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-amber-600" />
          <h3 className="text-sm font-semibold">SCORM Export</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Export as a SCORM 1.2 package for upload to a Learning Management System (LMS).
          Includes activity completion tracking and offline support.
        </p>
        <div className="flex flex-col gap-1">
          <Button
            variant="outline"
            size="sm"
            className={
              exportScorm.isError
                ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100 w-fit"
                : "bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100 w-fit"
            }
            onClick={() => exportScorm.mutate(bookLabel)}
            disabled={exportScorm.isPending}
          >
            {exportScorm.isPending ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <GraduationCap className="mr-1.5 h-3.5 w-3.5" />
            )}
            {exportScorm.isError ? "Retry Export" : "Export SCORM"}
          </Button>
          {scormError && (
            <p className="text-[11px] leading-tight text-red-500">
              {scormError}
            </p>
          )}
        </div>
      </section>

      {/* WebPub Export */}
      <section className="rounded-lg border p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-600" />
          <h3 className="text-sm font-semibold">WebPub Export</h3>
          <span className="ml-auto text-[10px] font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5 leading-none">
            Beta
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Export the book as a Readium WebPub package — a standards-based format for
          distributing digital publications on the web. Suitable for reading systems
          that support the Readium Web Publication Manifest specification.
        </p>
        <div className="flex flex-col gap-1">
          <Button
            variant="outline"
            size="sm"
            className={
              exportWebpub.isError
                ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100 w-fit"
                : "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 w-fit"
            }
            onClick={() => exportWebpub.mutate(bookLabel)}
            disabled={exportWebpub.isPending}
          >
            {exportWebpub.isPending ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <BookOpen className="mr-1.5 h-3.5 w-3.5" />
            )}
            {exportWebpub.isError ? "Retry Export" : "Export WebPub"}
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

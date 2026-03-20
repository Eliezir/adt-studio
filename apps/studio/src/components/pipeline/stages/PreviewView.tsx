import { useState, useEffect, useRef, useCallback } from "react"
import { Loader2, AlertCircle } from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"
import { api, getAdtUrl } from "@/api/client"
import { useBookRun } from "@/hooks/use-book-run"
import { useBookTasks } from "@/hooks/use-book-tasks"
import { Trans } from "@lingui/react/macro"
import { useLingui } from "@lingui/react/macro"

export function PreviewView({ bookLabel }: { bookLabel: string }) {
  const { t } = useLingui()
  const queryClient = useQueryClient()
  const { stageState } = useBookRun()
  const { isTaskRunning, tasks } = useBookTasks(bookLabel)
  const storyboardDone = stageState("storyboard") === "done"
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const ranRef = useRef(false)

  const packaging = isTaskRunning("package-adt")

  // Track task completion to trigger ready state
  const prevPackagingRef = useRef(false)
  useEffect(() => {
    if (prevPackagingRef.current && !packaging) {
      // Packaging just finished — check if it succeeded
      const packagingTask = tasks.find((t) => t.kind === "package-adt")
      if (packagingTask?.status === "failed") {
        setError(packagingTask.error ?? "Packaging failed")
      } else {
        // completed (or removed) — show preview
        queryClient.invalidateQueries({ queryKey: ["books", bookLabel, "step-status"] })
        setReady(true)
      }
    }
    prevPackagingRef.current = packaging
  }, [packaging, tasks, bookLabel, queryClient])

  const runPackage = useCallback(async () => {
    setError(null)
    setReady(false)
    try {
      await api.packageAdt(bookLabel)
      // Task is now submitted — SSE events will update the packaging state
    } catch (e) {
      setError(e instanceof Error ? e.message : "Packaging failed")
    }
  }, [bookLabel])

  // Only trigger packaging when storyboard is done
  useEffect(() => {
    if (!storyboardDone || ranRef.current) return
    ranRef.current = true
    runPackage()
  }, [bookLabel, storyboardDone])

  // Listen for re-package requests from the sidebar refresh button
  useEffect(() => {
    if (!storyboardDone) return
    const handler = () => { runPackage() }
    window.addEventListener("adt:repackage", handler)
    return () => window.removeEventListener("adt:repackage", handler)
  }, [runPackage, storyboardDone])

  if (!storyboardDone) {
    return (
      <div className="p-6 max-w-xl flex flex-col items-center gap-3 text-center">
        <AlertCircle className="w-8 h-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">
          A storyboard must be built before previewing.
        </p>
        <p className="text-sm text-muted-foreground">
          Run the pipeline through
          at least the <span className="font-medium text-foreground">Storyboard</span> stage first.
        </p>
      </div>
    )
  }

  if (packaging) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
        <span className="text-sm"><Trans>Packaging preview...</Trans></span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 max-w-xl">
        <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2">
          <p className="text-xs text-red-700 whitespace-pre-wrap break-words">{error}</p>
        </div>
      </div>
    )
  }

  if (ready) {
    return (
      <iframe
        src={`${getAdtUrl(bookLabel)}/v-${Date.now()}/`}
        className="w-full h-full border-0"
        title={t`ADT Preview`}
      />
    )
  }

  return null
}

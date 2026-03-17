import { useState, useEffect, useRef, useCallback } from "react"
import { Loader2, AlertCircle } from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"
import { api, getAdtUrl } from "@/api/client"
import { useBookRun } from "@/hooks/use-book-run"

export function PreviewView({ bookLabel }: { bookLabel: string }) {
  const queryClient = useQueryClient()
  const { stageState } = useBookRun()
  const storyboardDone = stageState("storyboard") === "done"
  const [packaging, setPackaging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [version, setVersion] = useState(0)
  const ranRef = useRef(false)

  const runPackage = useCallback(async () => {
    setPackaging(true)
    setError(null)
    setReady(false)
    try {
      await api.packageAdt(bookLabel)
      await queryClient.invalidateQueries({ queryKey: ["books", bookLabel, "step-status"] })
      setVersion((v) => v + 1)
      setReady(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Packaging failed")
    } finally {
      setPackaging(false)
    }
  }, [bookLabel, queryClient])

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
        <span className="text-sm">Packaging preview...</span>
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
        title="ADT Preview"
      />
    )
  }

  return null
}

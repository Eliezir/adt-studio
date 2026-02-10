import { useState, useEffect } from "react"
import { Check, Loader2, Circle, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { StepName, StepProgress } from "@/hooks/use-pipeline"

type StepState = "pending" | "active" | "completed" | "error"

interface StepIndicatorProps {
  step: StepName
  label: string
  state: StepState
  progress?: StepProgress
}

const STEP_ORDER: StepName[] = [
  "extract",
  "metadata",
  "text-classification",
  "image-classification",
  "page-sectioning",
  "web-rendering",
]

const STEP_LABELS: Record<StepName, string> = {
  extract: "Extract PDF",
  metadata: "Extract Metadata",
  "text-classification": "Classify Text",
  "image-classification": "Classify Images",
  "page-sectioning": "Section Pages",
  "web-rendering": "Render Pages",
}

export { STEP_ORDER, STEP_LABELS }

function StepIcon({ state }: { state: StepState }) {
  switch (state) {
    case "completed":
      return <Check className="h-4 w-4 text-green-600" />
    case "active":
      return <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
    case "error":
      return <AlertCircle className="h-4 w-4 text-destructive" />
    default:
      return <Circle className="h-4 w-4 text-muted-foreground/40" />
  }
}

/** Ticking elapsed timer for active steps */
function ElapsedTimer() {
  const [start] = useState(() => Date.now())
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setElapsed(Date.now() - start), 1000)
    return () => clearInterval(id)
  }, [start])

  const secs = Math.floor(elapsed / 1000)
  const mins = Math.floor(secs / 60)
  const display = mins > 0 ? `${mins}m ${secs % 60}s` : `${secs}s`

  return <span className="text-xs text-muted-foreground">{display}</span>
}

export function StepIndicator({
  label,
  state,
  progress,
}: StepIndicatorProps) {
  return (
    <div
      className={cn(
        "rounded-lg border p-3 transition-colors",
        state === "active" && "border-primary/40 bg-primary/5",
        state === "completed" && "border-border bg-muted/40",
        state === "error" && "border-destructive/30 bg-destructive/5",
        state === "pending" && "border-border/50 bg-transparent"
      )}
    >
      <div className="flex items-center gap-2">
        <StepIcon state={state} />
        <span
          className={cn(
            "text-sm",
            state === "active" && "font-medium text-foreground",
            state === "completed" && "text-muted-foreground",
            state === "pending" && "text-muted-foreground/50",
            state === "error" && "font-medium text-destructive"
          )}
        >
          {label}
        </span>
        {state === "active" && <ElapsedTimer />}
      </div>
      {state === "active" && progress?.totalPages && (
        <div className="mt-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              {progress.page ?? 0} / {progress.totalPages}
            </span>
            <span>
              {Math.round(
                ((progress.page ?? 0) / progress.totalPages) * 100
              )}
              %
            </span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{
                width: `${((progress.page ?? 0) / progress.totalPages) * 100}%`,
              }}
            />
          </div>
          {progress.page != null && progress.totalPages && progress.page < progress.totalPages && (
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Remaining pages may need multiple LLM attempts...
            </p>
          )}
        </div>
      )}
    </div>
  )
}

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

export function StepIndicator({
  label,
  state,
  progress,
}: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <StepIcon state={state} />
      <div className="flex-1">
        <div
          className={cn(
            "text-sm",
            state === "active" && "font-medium text-foreground",
            state === "completed" && "text-muted-foreground",
            state === "pending" && "text-muted-foreground/60",
            state === "error" && "text-destructive"
          )}
        >
          {label}
        </div>
        {state === "active" && progress?.totalPages && (
          <div className="mt-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                {progress.page ?? 0} / {progress.totalPages} pages
              </span>
              <span>
                {Math.round(
                  ((progress.page ?? 0) / progress.totalPages) * 100
                )}
                %
              </span>
            </div>
            <div className="mt-0.5 h-1.5 rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-blue-600 transition-all"
                style={{
                  width: `${((progress.page ?? 0) / progress.totalPages) * 100}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

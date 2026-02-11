import { useState } from "react"
import { LayoutGrid, Pencil, RefreshCw, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

const STEPS = [
  {
    icon: LayoutGrid,
    title: "Browse & Filter Pages",
    description:
      "Use the sidebar to browse all extracted pages. Filter by Rendered or Pending status. Use arrow keys for quick navigation.",
  },
  {
    icon: Pencil,
    title: "Edit Page Content",
    description:
      "Click Edit Page on any page to modify its text and images. Toggle pruning to exclude content from the final render.",
  },
  {
    icon: RefreshCw,
    title: "Re-render Pages",
    description:
      "After editing, Re-render a single page, or open Settings \u2192 Save & Rebuild to regenerate all pages with new config.",
  },
  {
    icon: CheckCircle2,
    title: "Accept & Continue",
    description:
      "Once all pages are rendered and reviewed, click Accept Storyboard to lock in your baseline for downstream steps.",
  },
] as const

interface StoryboardGuideDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function StoryboardGuideDialog({
  open,
  onOpenChange,
}: StoryboardGuideDialogProps) {
  const [step, setStep] = useState(0)

  const current = STEPS[step]
  const Icon = current.icon
  const isLast = step === STEPS.length - 1

  function handleClose() {
    onOpenChange(false)
    // Reset to first step for next open
    setStep(0)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Storyboard Review</DialogTitle>
          <DialogDescription>
            Review and refine your book pages in 4 steps.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Icon className="h-7 w-7 text-primary" />
          </div>
          <h3 className="text-base font-semibold">{current.title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
            {current.description}
          </p>
        </div>

        {/* Step indicator dots */}
        <div className="flex justify-center gap-1.5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 w-1.5 rounded-full transition-colors ${
                i === step ? "bg-primary" : "bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>

        <DialogFooter className="sm:justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 0}
          >
            Back
          </Button>
          {isLast ? (
            <Button size="sm" onClick={handleClose}>
              Got it
            </Button>
          ) : (
            <Button size="sm" onClick={() => setStep((s) => s + 1)}>
              Next
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

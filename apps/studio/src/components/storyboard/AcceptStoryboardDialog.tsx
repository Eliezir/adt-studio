import { useNavigate } from "@tanstack/react-router"
import { CheckCircle2, BookOpen, Languages, HelpCircle, FileDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface AcceptStoryboardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  renderedCount: number
  totalCount: number
  label: string
}

const NEXT_STEPS = [
  { icon: BookOpen, label: "Glossary Generation", description: "Extract and define key terms" },
  { icon: Languages, label: "Easy Read Version", description: "Simplified language variant" },
  { icon: HelpCircle, label: "Quiz Generation", description: "Comprehension questions per section" },
  { icon: FileDown, label: "Export Bundle", description: "Package for print and digital distribution" },
]

export function AcceptStoryboardDialog({
  open,
  onOpenChange,
  renderedCount,
  totalCount,
  label,
}: AcceptStoryboardDialogProps) {
  const navigate = useNavigate()

  const handleAccept = () => {
    onOpenChange(false)
    navigate({
      to: "/books/$label",
      params: { label },
      search: { autoRun: undefined, startPage: undefined, endPage: undefined },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Accept Storyboard
          </DialogTitle>
          <DialogDescription>
            All {totalCount} pages have been rendered and reviewed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <p className="text-sm text-muted-foreground">
            Next steps in the production pipeline:
          </p>
          <div className="space-y-2">
            {NEXT_STEPS.map((step) => (
              <div
                key={step.label}
                className="flex items-center gap-3 rounded-lg border p-3 opacity-60"
              >
                <step.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{step.label}</span>
                    <Badge variant="secondary" className="text-[10px]">Coming Soon</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            These features are actively being built. Accepting the storyboard locks in
            your current rendering as the baseline for downstream generation steps.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAccept}>
            Accept & Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

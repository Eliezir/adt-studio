import { Link } from "@tanstack/react-router"
import { ChevronDown } from "lucide-react"
import { STEPS } from "../StepSidebar"

interface ViewProps {
  bookLabel: string
  selectedPageId?: string
  onSelectPage?: (pageId: string | null) => void
}

const STEP_DESCRIPTIONS: Record<string, string> = {
  extract: "Extract text and images from each page of the PDF using AI-powered analysis.",
  storyboard: "Arrange extracted content into a structured storyboard with pages, sections, and layouts.",
  quizzes: "Generate comprehension quizzes and activities based on the book content.",
  captions: "Create descriptive captions for images to improve accessibility.",
  glossary: "Build a glossary of key terms and definitions found in the text.",
  translations: "Translate the book content into additional languages.",
  "text-to-speech": "Generate audio narration for the book using text-to-speech.",
}

export function BookView({ bookLabel }: ViewProps) {
  const pipelineSteps = STEPS.filter((s) => s.slug !== "book")

  return (
    <div className="flex flex-col items-start max-w-xl">
      {pipelineSteps.map((step, index) => {
        const Icon = step.icon
        const isLast = index === pipelineSteps.length - 1
        return (
          <div key={step.slug} className="w-full">
            <Link
              to="/books/$label/v2/$step"
              params={{ label: bookLabel, step: step.slug }}
              className={`rounded-lg border ${step.borderColor} ${step.bgLight} p-3 flex gap-3 items-center h-[76px] overflow-hidden hover:shadow-sm transition-shadow w-full`}
            >
              <div className={`flex items-center justify-center w-8 h-8 rounded-full shrink-0 ${step.color} text-white`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className={`text-sm font-semibold ${step.textColor}`}>{step.label}</h3>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
                  {STEP_DESCRIPTIONS[step.slug]}
                </p>
              </div>
            </Link>
            {!isLast && (
              <div className="flex flex-col items-center w-8 ml-3 py-0.5">
                <div className={`w-1 h-2 rounded-full ${step.color} opacity-25`} />
                <ChevronDown className={`w-4 h-4 ${step.textColor} opacity-50`} strokeWidth={3} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

import {
  BookMarked,
  FileText,
  LayoutGrid,
  HelpCircle,
  Image,
  BookOpen,
  Languages,
  Eye,
  FileDown,
  type LucideIcon,
} from "lucide-react"

export type PipelineStageLabelKey =
  | "pipeline_stage_extract_label"
  | "pipeline_stage_storyboard_label"
  | "pipeline_stage_quizzes_label"
  | "pipeline_stage_captions_label"
  | "pipeline_stage_glossary_label"
  | "pipeline_stage_text_and_speech_label"
  | "pipeline_stage_preview_label"

export type PipelineStageDescriptionKey =
  | "pipeline_stage_extract_description"
  | "pipeline_stage_storyboard_description"
  | "pipeline_stage_quizzes_description"
  | "pipeline_stage_captions_description"
  | "pipeline_stage_glossary_description"
  | "pipeline_stage_text_and_speech_description"
  | "pipeline_stage_preview_description"

export const STAGES = [
  {
    slug: "book",
    label: "Book",
    runningLabel: "Loading Book",
    icon: BookMarked,
    color: "bg-gray-600",
    hex: "#4b5563",
    textColor: "text-gray-600",
    bgLight: "bg-gray-50",
    borderColor: "border-gray-200",
    borderDark: "border-gray-600",
    labelKey: null,
    descriptionKey: null,
  },
  {
    slug: "extract",
    label: "Extract",
    runningLabel: "Extracting",
    icon: FileText,
    color: "bg-blue-600",
    hex: "#2563eb",
    textColor: "text-blue-600",
    bgLight: "bg-blue-50",
    borderColor: "border-blue-200",
    borderDark: "border-blue-600",
    labelKey: "pipeline_stage_extract_label",
    descriptionKey: "pipeline_stage_extract_description",
  },
  {
    slug: "storyboard",
    label: "Storyboard",
    runningLabel: "Building Storyboard",
    icon: LayoutGrid,
    color: "bg-violet-600",
    hex: "#7c3aed",
    textColor: "text-violet-600",
    bgLight: "bg-violet-50",
    borderColor: "border-violet-200",
    borderDark: "border-violet-600",
    labelKey: "pipeline_stage_storyboard_label",
    descriptionKey: "pipeline_stage_storyboard_description",
  },
  {
    slug: "quizzes",
    label: "Quizzes",
    runningLabel: "Generating Quizzes",
    icon: HelpCircle,
    color: "bg-orange-600",
    hex: "#ea580c",
    textColor: "text-orange-600",
    bgLight: "bg-orange-50",
    borderColor: "border-orange-200",
    borderDark: "border-orange-600",
    labelKey: "pipeline_stage_quizzes_label",
    descriptionKey: "pipeline_stage_quizzes_description",
  },
  {
    slug: "captions",
    label: "Captions",
    runningLabel: "Captioning Images",
    icon: Image,
    color: "bg-teal-600",
    hex: "#0d9488",
    textColor: "text-teal-600",
    bgLight: "bg-teal-50",
    borderColor: "border-teal-200",
    borderDark: "border-teal-600",
    labelKey: "pipeline_stage_captions_label",
    descriptionKey: "pipeline_stage_captions_description",
  },
  {
    slug: "glossary",
    label: "Glossary",
    runningLabel: "Generating Glossary",
    icon: BookOpen,
    color: "bg-lime-600",
    hex: "#65a30d",
    textColor: "text-lime-600",
    bgLight: "bg-lime-50",
    borderColor: "border-lime-200",
    borderDark: "border-lime-600",
    labelKey: "pipeline_stage_glossary_label",
    descriptionKey: "pipeline_stage_glossary_description",
  },
  {
    slug: "text-and-speech",
    label: "Text & Speech",
    runningLabel: "Generating Text & Speech",
    icon: Languages,
    color: "bg-pink-600",
    hex: "#db2777",
    textColor: "text-pink-600",
    bgLight: "bg-pink-50",
    borderColor: "border-pink-200",
    borderDark: "border-pink-600",
    labelKey: "pipeline_stage_text_and_speech_label",
    descriptionKey: "pipeline_stage_text_and_speech_description",
  },
  {
    slug: "preview",
    label: "Preview",
    runningLabel: "Building Preview",
    icon: Eye,
    color: "bg-gray-600",
    hex: "#4b5563",
    textColor: "text-gray-600",
    bgLight: "bg-gray-50",
    borderColor: "border-gray-200",
    borderDark: "border-gray-600",
    labelKey: "pipeline_stage_preview_label",
    descriptionKey: "pipeline_stage_preview_description",
  },
  {
    slug: "export",
    label: "Export",
    runningLabel: "Exporting",
    icon: FileDown,
    color: "bg-emerald-600",
    hex: "#059669",
    textColor: "text-emerald-600",
    bgLight: "bg-emerald-50",
    borderColor: "border-emerald-200",
    borderDark: "border-emerald-600",
    labelKey: null,
    descriptionKey: null,
  },
] as const satisfies ReadonlyArray<{
  slug: string
  label: string
  runningLabel: string
  icon: LucideIcon
  color: string
  hex: string
  textColor: string
  bgLight: string
  borderColor: string
  borderDark: string
  labelKey: PipelineStageLabelKey | null
  descriptionKey: PipelineStageDescriptionKey | null
}>

export type StageSlug = (typeof STAGES)[number]["slug"]
export type PipelineStageSlug = Exclude<StageSlug, "book" | "export">
export type StageDefinition = (typeof STAGES)[number]
export type PipelineStageDefinition = Extract<StageDefinition, { slug: PipelineStageSlug }>

export const STAGE_DESCRIPTIONS: Record<PipelineStageSlug, string> = {
  extract: "Extract text and images from each page of the PDF using AI-powered analysis.",
  storyboard: "Arrange extracted content into a structured storyboard with pages, sections, and layouts.",
  quizzes: "Generate comprehension quizzes and activities based on the book content.",
  captions: "Create descriptive captions for images to improve accessibility.",
  glossary: "Build a glossary of key terms and definitions found in the text.",
  "text-and-speech": "Translate the book content and generate audio narration.",
  preview: "Package and preview the final ADT web application.",
}

/** Stages that have a per-page navigation panel. */
export const STAGES_WITH_PAGES = new Set<StageSlug>([
  "storyboard",
  "quizzes",
  "captions",
  "text-and-speech",
])

const STAGE_SLUG_SET = new Set<StageSlug>(STAGES.map((stage) => stage.slug))

export function isStageSlug(slug: string): slug is StageSlug {
  return STAGE_SLUG_SET.has(slug as StageSlug)
}

export function hasStagePages(slug: string): boolean {
  return isStageSlug(slug) && STAGES_WITH_PAGES.has(slug)
}

export function isPipelineStage(stage: StageDefinition): stage is PipelineStageDefinition {
  return stage.slug !== "book" && stage.slug !== "export"
}

export function getPipelineStages(): PipelineStageDefinition[] {
  return STAGES.filter(isPipelineStage)
}

export function toCamelLabel(label: string): string {
  return label
    .split(/[-_]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("")
}

export function isStageCompleted(slug: string, completedStages: Record<string, boolean>): boolean {
  return !!completedStages[slug]
}

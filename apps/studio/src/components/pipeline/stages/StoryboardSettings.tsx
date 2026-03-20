import { useState, useEffect, useMemo } from "react"
import { createPortal } from "react-dom"
import { useNavigate } from "@tanstack/react-router"
import { Play, Plus, X, Eye, Wand2, Loader2, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PruneToggle } from "@/components/pipeline/PruneToggle"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { useBookConfig, useUpdateBookConfig } from "@/hooks/use-book-config"
import { useActiveConfig } from "@/hooks/use-debug"
import { useApiKey } from "@/hooks/use-api-key"
import { useStyleguides, useStyleguidePreview, useTemplates, useGenerateStyleguide } from "@/hooks/use-presets"
import { usePages, usePageImage } from "@/hooks/use-pages"
import { api } from "@/api/client"
import { PromptViewer } from "@/components/pipeline/PromptViewer"
import { TemplateViewer } from "@/components/pipeline/TemplateViewer"
import { useBookRun } from "@/hooks/use-book-run"
import { useStepConfig } from "@/hooks/use-step-config"
import { Trans } from "@lingui/react/macro"
import { msg } from "@lingui/core/macro"
import { useLingui } from "@lingui/react/macro"
import { i18n } from "@lingui/core"
import {
  listSelectableRenderStrategies,
  normalizeDefaultRenderStrategy,
} from "@/lib/render-strategy"
import { getSectionTypeLabel } from "@/lib/section-constants"
import { hasSectioningChanges, hasSectioningData } from "./storyboard-rerun-policy"

/** "two_column_story" → "Two Column Story" */
function titleCase(slug: string): string {
  return slug.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
}

const STRATEGY_LABEL_MSGS: Record<string, ReturnType<typeof msg>> = {
  llm: msg`AI Generated`,
  "llm-overlay": msg`AI Overlay`,
}

function strategyDisplayName(slug: string): string {
  const descriptor = STRATEGY_LABEL_MSGS[slug]
  if (descriptor) return i18n._(descriptor)
  return titleCase(slug.replace(/_/g, " "))
}

function getSectionTypeDisplayLabel(value: string): string {
  const label = getSectionTypeLabel(value)
  return label || value.replace(/_/g, " ")
}

const STRATEGY_DESCRIPTION_MSGS: Record<string, ReturnType<typeof msg>> = {
  llm: msg`LLM generates HTML from section content`,
  "llm-overlay": msg`LLM positions text over background images`,
  two_column: msg`Fixed two-column template layout`,
  two_column_story: msg`Two-column template for story content`,
}

function strategyDescription(name: string): string {
  const descriptor = STRATEGY_DESCRIPTION_MSGS[name]
  if (!descriptor) return ""
  return i18n._(descriptor)
}

function getActivityLabel(name: string): string {
  const label = getSectionTypeLabel(name)
  return label || titleCase(name.replace(/^activity_/, ""))
}

function PageThumb({
  bookLabel,
  page,
  selected,
  disabled,
  onClick,
}: {
  bookLabel: string
  page: { pageId: string; pageNumber: number }
  selected: boolean
  disabled: boolean
  onClick: () => void
}) {
  const { t } = useLingui()
  const { data: imageData } = usePageImage(bookLabel, page.pageId)

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`relative flex flex-col rounded-md border overflow-hidden transition-colors text-left ${
        selected
          ? "border-blue-500 ring-2 ring-blue-500/30"
          : disabled
            ? "opacity-40 cursor-not-allowed border-border"
            : "hover:border-blue-300 cursor-pointer border-border"
      }`}
    >
      <div className="w-full bg-muted/30">
        {imageData ? (
          <img
            src={`data:image/png;base64,${imageData.imageBase64}`}
            alt={t`Page ${String(page.pageNumber)}`}
            className="w-full h-auto block"
          />
        ) : (
          <div className="flex aspect-[3/4] items-center justify-center text-[10px] text-muted-foreground">
            ...
          </div>
        )}
      </div>
      <div className="px-1.5 py-1 border-t text-center">
        <span className="text-[10px] font-medium">{t`Page ${String(page.pageNumber)}`}</span>
      </div>
      {selected && (
        <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
          <Check className="h-3 w-3 text-white" />
        </div>
      )}
    </button>
  )
}

export function StoryboardSettings({ bookLabel, headerTarget, tab = "general" }: { bookLabel: string; headerTarget?: HTMLDivElement | null; tab?: string }) {
  const { t } = useLingui()
  const { data: bookConfigData } = useBookConfig(bookLabel)
  const { data: activeConfigData } = useActiveConfig(bookLabel)
  const updateConfig = useUpdateBookConfig()
  const { apiKey, hasApiKey } = useApiKey()
  const { queueRun, stepState } = useBookRun()
  const navigate = useNavigate()
  const [showRerunDialog, setShowRerunDialog] = useState(false)
  const [savingImageGenPrompt, setSavingImageGenPrompt] = useState(false)

  // Form state
  const [sectionTypes, setSectionTypes] = useState<Record<string, string>>({})
  const [prunedSectionTypes, setPrunedSectionTypes] = useState<Set<string>>(new Set())
  const [disabledSectionTypes, setDisabledSectionTypes] = useState<Set<string>>(new Set())
  const [sectionRenderStrategies, setSectionRenderStrategies] = useState<Record<string, string>>({})
  const [defaultRenderStrategy, setDefaultRenderStrategy] = useState("")
  const [allStrategyNames, setAllStrategyNames] = useState<string[]>([])
  const [renderStrategyNames, setRenderStrategyNames] = useState<string[]>([])
  const [activityModel, setActivityModel] = useState("")
  const [activityRetries, setActivityRetries] = useState("")
  const [sectioningMode, setSectioningMode] = useState("dynamic")
  const [renderingModel, setRenderingModel] = useState("")
  const [renderingRetries, setRenderingRetries] = useState("")
  const [renderingPromptName, setRenderingPromptName] = useState("web_generation_html")
  const [renderingRenderType, setRenderingRenderType] = useState<string>("llm")
  const [renderingTemplateName, setRenderingTemplateName] = useState("")
  const [renderingTemperature, setRenderingTemperature] = useState("")
  const [styleguide, setStyleguide] = useState("")
  const [applyBodyBackground, setApplyBodyBackground] = useState(true)
  const [sectioningPromptDraft, setSectioningPromptDraft] = useState<string | null>(null)
  const [renderingPromptDraft, setRenderingPromptDraft] = useState<string | null>(null)
  const [renderingTemplateDraft, setRenderingTemplateDraft] = useState<string | null>(null)
  const [templateTabName, setTemplateTabName] = useState("")
  const [templateTabDraft, setTemplateTabDraft] = useState<string | null>(null)
  const [activityStrategyName, setActivityStrategyName] = useState("")
  const [activityPromptDraft, setActivityPromptDraft] = useState<string | null>(null)
  const [activityAnswerDraft, setActivityAnswerDraft] = useState<string | null>(null)
  const [imageGenPromptDraft, setImageGenPromptDraft] = useState<string | null>(null)
  const [imageEditPromptDraft, setImageEditPromptDraft] = useState<string | null>(null)
  const [imagePromptSubTab, setImagePromptSubTab] = useState<"generate" | "edit">("generate")

  // Derive activity strategies directly from merged config (synchronous)
  const activityStrategies = useMemo(() => {
    if (!activeConfigData) return {} as Record<string, { prompt: string; answer_prompt?: string; model?: string; max_retries?: number }>
    const merged = activeConfigData.merged as Record<string, unknown>
    const strategies = merged.render_strategies as Record<string, { render_type?: string; config?: { prompt?: string; answer_prompt?: string; model?: string; max_retries?: number } }> | undefined
    if (!strategies || typeof strategies !== "object") return {} as Record<string, { prompt: string; answer_prompt?: string; model?: string; max_retries?: number }>
    const activityMap: Record<string, { prompt: string; answer_prompt?: string; model?: string; max_retries?: number }> = {}
    for (const [name, strat] of Object.entries(strategies)) {
      if (strat.render_type === "activity" && strat.config?.prompt) {
        activityMap[name] = {
          prompt: strat.config.prompt,
          answer_prompt: strat.config.answer_prompt,
          model: strat.config.model,
          max_retries: strat.config.max_retries,
        }
      }
    }
    return activityMap
  }, [activeConfigData])
  const selectedActivity = activityStrategies[activityStrategyName]

  // Derive render types from merged config (synchronous)
  const strategyRenderTypes = useMemo(() => {
    if (!activeConfigData) return {} as Record<string, string>
    const merged = activeConfigData.merged as Record<string, unknown>
    const strategies = merged.render_strategies as Record<string, { render_type?: string }> | undefined
    if (!strategies || typeof strategies !== "object") return {} as Record<string, string>
    const typeMap: Record<string, string> = {}
    for (const [name, strat] of Object.entries(strategies)) {
      typeMap[name] = strat.render_type ?? "llm"
    }
    return typeMap
  }, [activeConfigData])

  const { data: styleguidesData } = useStyleguides()
  const { data: templatesData } = useTemplates()
  const availableTemplates = templatesData?.templates ?? []
  const availableStyleguides = styleguidesData?.styleguides ?? []

  // Styleguide generation
  const { data: pagesData } = usePages(bookLabel)
  const generateStyleguideMutation = useGenerateStyleguide()
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false)
  const [selectedPageIds, setSelectedPageIds] = useState<Set<string>>(new Set())

  const togglePageSelection = (pageId: string) => {
    setSelectedPageIds((prev) => {
      const next = new Set(prev)
      if (next.has(pageId)) {
        next.delete(pageId)
      } else if (next.size < 5) {
        next.add(pageId)
      }
      return next
    })
  }

  const handleGenerate = () => {
    if (selectedPageIds.size === 0 || !hasApiKey) return
    generateStyleguideMutation.mutate(
      { label: bookLabel, pageIds: Array.from(selectedPageIds), apiKey },
      {
        onSuccess: (data) => {
          setStyleguide(data.name)
          markDirty("styleguide")
          setGenerateDialogOpen(false)
          setSelectedPageIds(new Set())
        },
      }
    )
  }

  // Styleguide preview
  const [styleguidePreviewOpen, setStyleguidePreviewOpen] = useState(false)
  const [previewName, setPreviewName] = useState<string | null>(null)
  const { data: previewData, isLoading: styleguidePreviewLoading } = useStyleguidePreview(previewName)

  const openStyleguidePreview = () => {
    if (!styleguide) return
    setPreviewName(styleguide)
    setStyleguidePreviewOpen(true)
  }

  // Track which field groups the user has actually touched
  const [dirty, setDirty] = useState<Record<string, boolean>>({})
  const markDirty = (field: string) => setDirty((prev) => ({ ...prev, [field]: true }))

  const merged = activeConfigData?.merged as Record<string, unknown> | undefined
  const sectioning = useStepConfig(merged, "page_sectioning", markDirty)

  // Whether sectioning data already exists (storyboard has been run at least once)
  const hasExistingSectioningData = hasSectioningData(stepState("page-sectioning"))

  // Load section types, pruned types, render strategy, and models from active (merged) config
  useEffect(() => {
    if (!activeConfigData) return
    const merged = activeConfigData.merged as Record<string, unknown>
    if (merged.section_types && typeof merged.section_types === "object") {
      setSectionTypes(merged.section_types as Record<string, string>)
    }
    if (Array.isArray(merged.pruned_section_types)) {
      setPrunedSectionTypes(new Set(merged.pruned_section_types as string[]))
    }
    if (Array.isArray(merged.disabled_section_types)) {
      setDisabledSectionTypes(new Set(merged.disabled_section_types as string[]))
    }
    if (merged.section_render_strategies && typeof merged.section_render_strategies === "object") {
      setSectionRenderStrategies(merged.section_render_strategies as Record<string, string>)
    }
    const strategies = (
      merged.render_strategies && typeof merged.render_strategies === "object"
        ? merged.render_strategies
        : {}
    ) as Record<string, { render_type?: string; config?: { prompt?: string; answer_prompt?: string; model?: string; template?: string; temperature?: number; max_retries?: number } }>
    const strategyNames = Object.keys(strategies)
    const normalizedDefaultRenderStrategy = normalizeDefaultRenderStrategy(
      typeof merged.default_render_strategy === "string"
        ? String(merged.default_render_strategy)
        : "",
      strategies
    )
    setDefaultRenderStrategy(normalizedDefaultRenderStrategy)

    setAllStrategyNames(strategyNames)
    setRenderStrategyNames(listSelectableRenderStrategies(strategies))

    if (merged.page_sectioning && typeof merged.page_sectioning === "object") {
      const ps = merged.page_sectioning as Record<string, unknown>
      if (ps.mode) setSectioningMode(String(ps.mode))
    }
    // Styleguide
    setStyleguide(typeof merged.styleguide === "string" ? merged.styleguide : "")
    // Body background
    setApplyBodyBackground(merged.apply_body_background !== false)
    // Rendering config comes from the default render strategy
    const defaultStrategy = normalizedDefaultRenderStrategy
      ? strategies[normalizedDefaultRenderStrategy]
      : undefined
    if (defaultStrategy?.render_type) setRenderingRenderType(defaultStrategy.render_type)
    else setRenderingRenderType("")
    if (defaultStrategy?.config?.model) setRenderingModel(String(defaultStrategy.config.model))
    else setRenderingModel("")
    if (defaultStrategy?.config?.prompt) setRenderingPromptName(String(defaultStrategy.config.prompt))
    else setRenderingPromptName("")
    if (defaultStrategy?.config?.template) {
      setRenderingTemplateName(String(defaultStrategy.config.template))
      setTemplateTabName(String(defaultStrategy.config.template))
    } else {
      setRenderingTemplateName("")
      setTemplateTabName("")
    }
    setRenderingTemperature(defaultStrategy?.config?.temperature != null ? String(defaultStrategy.config.temperature) : "")
    setRenderingRetries(defaultStrategy?.config?.max_retries != null ? String(defaultStrategy.config.max_retries) : "")
  }, [activeConfigData])

  const [newTypeKey, setNewTypeKey] = useState("")
  const [newTypeDesc, setNewTypeDesc] = useState("")

  const togglePruned = (key: string) => {
    markDirty("pruned_section_types")
    setPrunedSectionTypes((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const updateDescription = (key: string, description: string) => {
    markDirty("section_types")
    setSectionTypes((prev) => ({ ...prev, [key]: description }))
  }

  const updateRenderOverride = (key: string, strategy: string) => {
    markDirty("section_render_strategies")
    setSectionRenderStrategies((prev) => {
      if (!strategy) {
        const next = { ...prev }
        delete next[key]
        return next
      }
      return { ...prev, [key]: strategy }
    })
  }

  const toggleDisabled = (key: string) => {
    markDirty("disabled_section_types")
    setDisabledSectionTypes((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const addSectionType = () => {
    const key = newTypeKey.trim().toLowerCase().replace(/\s+/g, "_")
    if (!key || key in sectionTypes) return
    markDirty("section_types")
    setSectionTypes((prev) => ({ ...prev, [key]: newTypeDesc.trim() }))
    setNewTypeKey("")
    setNewTypeDesc("")
  }

  // Helper: only write a field if the user changed it or the book config already had it
  const shouldWrite = (field: string) =>
    dirty[field] || (bookConfigData?.config && field in bookConfigData.config)

  const buildOverrides = () => {
    const overrides: Record<string, unknown> = {}
    const merged = (activeConfigData?.merged as Record<string, unknown> | undefined)

    // Preserve all existing book config keys we don't manage
    if (bookConfigData?.config) {
      Object.assign(overrides, bookConfigData.config)
    }

    // Only write managed fields if touched or already in book config
    if (shouldWrite("section_types")) {
      // Explicitly null-out deleted keys so deepMerge removes them from base
      const baseSectionTypes = (merged?.section_types ?? {}) as Record<string, string>
      const withDeletions: Record<string, string | null> = { ...sectionTypes }
      for (const key of Object.keys(baseSectionTypes)) {
        if (!(key in sectionTypes)) withDeletions[key] = null
      }
      overrides.section_types = withDeletions
    }
    if (shouldWrite("pruned_section_types")) {
      overrides.pruned_section_types = Array.from(prunedSectionTypes)
    }
    if (shouldWrite("disabled_section_types")) {
      overrides.disabled_section_types = Array.from(disabledSectionTypes)
    }
    const mergedStrategies = (merged?.render_strategies ?? {}) as Record<
      string,
      { render_type?: string }
    >
    const normalizedDefaultRenderStrategy = normalizeDefaultRenderStrategy(
      defaultRenderStrategy,
      mergedStrategies
    )
    if (shouldWrite("default_render_strategy")) {
      overrides.default_render_strategy = normalizedDefaultRenderStrategy || undefined
    }
    if (shouldWrite("section_render_strategies")) {
      const baseStrategies = (merged?.section_render_strategies ?? {}) as Record<string, string>
      const stratWithDeletions: Record<string, string | null> = { ...sectionRenderStrategies }
      for (const key of Object.keys(baseStrategies)) {
        if (!(key in sectionRenderStrategies)) stratWithDeletions[key] = null
      }
      overrides.section_render_strategies = Object.keys(stratWithDeletions).length > 0
        ? stratWithDeletions
        : undefined
    }
    if (shouldWrite("page_sectioning")) {
      const existing = (bookConfigData?.config?.page_sectioning ?? {}) as Record<string, unknown>
      overrides.page_sectioning = { ...existing, ...sectioning.configOverrides, mode: sectioningMode }
    }
    if (shouldWrite("styleguide")) {
      overrides.styleguide = styleguide || undefined
    }
    if (shouldWrite("apply_body_background")) {
      overrides.apply_body_background = applyBodyBackground
    }
    // Write rendering temperature / retries into the default render strategy config
    if ((shouldWrite("rendering_temperature") || shouldWrite("rendering_retries")) && defaultRenderStrategy) {
      const existingStrategies = (overrides.render_strategies ?? merged?.render_strategies ?? {}) as Record<string, Record<string, unknown>>
      const stratCopy = JSON.parse(JSON.stringify(existingStrategies)) as Record<string, Record<string, unknown>>
      if (stratCopy[defaultRenderStrategy]) {
        const cfg = (stratCopy[defaultRenderStrategy].config ?? {}) as Record<string, unknown>
        if (shouldWrite("rendering_temperature")) cfg.temperature = renderingTemperature.trim() ? Number(renderingTemperature) : undefined
        if (shouldWrite("rendering_retries")) cfg.max_retries = renderingRetries.trim() ? Number(renderingRetries) : undefined
        stratCopy[defaultRenderStrategy].config = cfg
        overrides.render_strategies = stratCopy
      }
    }
    // Write activity model / retries into the activity render strategy config
    if ((shouldWrite("activity_model") || shouldWrite("activity_retries")) && activityStrategyName) {
      if (!overrides.render_strategies) {
        overrides.render_strategies = JSON.parse(JSON.stringify(merged?.render_strategies ?? {}))
      }
      const stratCopy = overrides.render_strategies as Record<string, Record<string, unknown>>
      if (stratCopy[activityStrategyName]) {
        const cfg = (stratCopy[activityStrategyName].config ?? {}) as Record<string, unknown>
        if (shouldWrite("activity_model")) cfg.model = activityModel.trim() || undefined
        if (shouldWrite("activity_retries")) cfg.max_retries = activityRetries.trim() ? Number(activityRetries) : undefined
        stratCopy[activityStrategyName].config = cfg
      }
    }

    return overrides
  }

  const needsResectioning = hasSectioningChanges(dirty, sectioningPromptDraft)

  const confirmSaveAndRerun = async () => {
    // Save any edited prompts/templates first
    const contentSaves: Promise<unknown>[] = []
    if (sectioningPromptDraft != null) contentSaves.push(api.updatePrompt("page_sectioning", sectioningPromptDraft, bookLabel))
    if (renderingPromptDraft != null) contentSaves.push(api.updatePrompt(renderingPromptName, renderingPromptDraft, bookLabel))
    if (renderingTemplateDraft != null) contentSaves.push(api.updateTemplate(renderingTemplateName, renderingTemplateDraft, bookLabel))
    if (templateTabDraft != null && templateTabName) contentSaves.push(api.updateTemplate(templateTabName, templateTabDraft, bookLabel))
    if (activityPromptDraft != null && selectedActivity?.prompt) contentSaves.push(api.updatePrompt(selectedActivity.prompt, activityPromptDraft, bookLabel))
    if (activityAnswerDraft != null && selectedActivity?.answer_prompt) contentSaves.push(api.updatePrompt(selectedActivity.answer_prompt, activityAnswerDraft, bookLabel))
    if (imageGenPromptDraft != null) contentSaves.push(api.updatePrompt("ai_image_generation", imageGenPromptDraft, bookLabel))
    if (imageEditPromptDraft != null) contentSaves.push(api.updatePrompt("ai_image_edit", imageEditPromptDraft, bookLabel))
    if (contentSaves.length > 0) await Promise.all(contentSaves)

    // Only re-render (preserve sections) when sectioning data exists and
    // no sectioning-related settings were changed.
    const renderOnly = hasExistingSectioningData && !needsResectioning

    const overrides = buildOverrides()
    updateConfig.mutate(
      { label: bookLabel, config: overrides },
      {
        onSuccess: async () => {
          setDirty({})
          setSectioningPromptDraft(null)
          setRenderingPromptDraft(null)
          setRenderingTemplateDraft(null)
          setTemplateTabDraft(null)
          setActivityPromptDraft(null)
          setActivityAnswerDraft(null)
          setImageGenPromptDraft(null)
          setShowRerunDialog(false)
          queueRun({ fromStage: "storyboard", toStage: "storyboard", apiKey, renderOnly })
          navigate({ to: "/books/$label/$step", params: { label: bookLabel, step: "storyboard" } })
        },
      }
    )
  }

  // Image prompts are on-demand (not pipeline) — save without triggering a rerun
  const saveImagePrompts = async () => {
    setSavingImageGenPrompt(true)
    try {
      const saves: Promise<unknown>[] = []
      if (imageGenPromptDraft != null) saves.push(api.updatePrompt("ai_image_generation", imageGenPromptDraft, bookLabel))
      if (imageEditPromptDraft != null) saves.push(api.updatePrompt("ai_image_edit", imageEditPromptDraft, bookLabel))
      if (saves.length > 0) await Promise.all(saves)
      setImageGenPromptDraft(null)
      setImageEditPromptDraft(null)
    } finally {
      setSavingImageGenPrompt(false)
    }
  }

  return (
    <div className={tab === "sectioning-prompt" || tab === "rendering-prompt" || tab === "rendering-template" || tab === "activity-prompts" || tab === "image-generation" ? "h-full" : "p-4 space-y-6"}>
      {tab === "general" && (
        <>
          {/* Default Render Strategy */}
          <div>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              {<Trans>Default Render Strategy</Trans>}
            </h3>
            <Select
              value={defaultRenderStrategy}
              onValueChange={(v) => {
                setDefaultRenderStrategy(v)
                markDirty("default_render_strategy")
                // Update rendering config to match the newly selected strategy
                const merged = activeConfigData?.merged as Record<string, unknown> | undefined
                const strategies = (merged?.render_strategies ?? {}) as Record<string, { render_type?: string; config?: { model?: string; prompt?: string; template?: string } }>
                const strat = strategies[v]
                if (strat) {
                  if (strat.render_type) setRenderingRenderType(strat.render_type)
                  if (strat.config?.prompt) setRenderingPromptName(strat.config.prompt)
                  if (strat.config?.model) setRenderingModel(strat.config.model)
                  if (strat.config?.template) {
                    setRenderingTemplateName(strat.config.template)
                    setTemplateTabName(strat.config.template)
                    setTemplateTabDraft(null)
                  }
                } else {
                  // Strategy not in render_strategies — clear stale rendering config
                  setRenderingRenderType("")
                  setRenderingModel("")
                  setRenderingPromptName("")
                  setRenderingTemplateName("")
                  setTemplateTabName("")
                  setTemplateTabDraft(null)
                }
              }}
            >
              <SelectTrigger className="w-72">
                <SelectValue placeholder={t`Select strategy...`}>
                  {defaultRenderStrategy && (
                    <>
                      {strategyDisplayName(defaultRenderStrategy)}
                      {strategyRenderTypes[defaultRenderStrategy] === "template" && (
                        <span className="text-muted-foreground ml-1">{<Trans>(template)</Trans>}</span>
                      )}
                    </>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent align="start">
                {renderStrategyNames.map((name) => {
                  const isTemplate = strategyRenderTypes[name] === "template"
                  return (
                    <SelectItem key={name} value={name}>
                      <div className="flex flex-col items-start">
                        <span>
                          {strategyDisplayName(name)}
                          {isTemplate && <span className="text-muted-foreground ml-1">{<Trans>(template)</Trans>}</span>}
                        </span>
                        {strategyDescription(name) && (
                          <span className="text-xs text-muted-foreground">
                            {strategyDescription(name)}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1.5">
              {<Trans>The rendering strategy used for sections without an explicit mapping.</Trans>}
            </p>
          </div>

          {/* Section Types */}
          <div>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              {<Trans>Section Types</Trans>}
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              {<Trans>Types used during page sectioning. Pruned types are classified but excluded from rendering. Disabled types are hidden from the LLM entirely.</Trans>}
            </p>
            <div className="rounded-md border divide-y">
              {/* Header */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50">
                <span className="h-3.5 w-3.5 shrink-0" />
                <span className="text-xs font-medium text-muted-foreground shrink-0 w-40">{<Trans>Type</Trans>}</span>
                <span className="text-xs font-medium text-muted-foreground flex-1 min-w-0">{<Trans>Description</Trans>}</span>
                <span className="text-xs font-medium text-muted-foreground shrink-0 w-48 text-left">{<Trans>Render Strategy</Trans>}</span>
                <span className="shrink-0 w-5" />
              </div>
              {Object.entries(sectionTypes).map(([key, description]) => {
                const pruned = prunedSectionTypes.has(key)
                const disabled = disabledSectionTypes.has(key)
                const renderOverride = sectionRenderStrategies[key] ?? ""
                return (
                  <div
                    key={key}
                    className={`flex items-center gap-2 px-3 py-1.5 group ${disabled ? "opacity-50" : pruned ? "bg-muted/30" : ""}`}
                  >
                    <PruneToggle pruned={pruned} onToggle={() => togglePruned(key)} />
                    <span className={`text-xs shrink-0 w-40 truncate font-mono ${disabled ? "text-muted-foreground line-through" : pruned ? "text-muted-foreground line-through" : "font-medium"}`}>
                      {getSectionTypeDisplayLabel(key)}
                    </span>
                    <Input
                      value={description}
                      onChange={(e) => updateDescription(key, e.target.value)}
                      className="h-7 text-xs flex-1 min-w-0"
                      placeholder={t`Description...`}
                    />
                    <Select
                      value={renderOverride || "__default__"}
                      onValueChange={(v) => updateRenderOverride(key, v === "__default__" ? "" : v)}
                    >
                      <SelectTrigger className="h-7 w-48 shrink-0 text-xs text-left">
                        <SelectValue>
                          {renderOverride ? strategyDisplayName(renderOverride) : <Trans>Default</Trans>}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent align="start">
                        <SelectItem value="__default__">
                          <span className="text-muted-foreground">{<Trans>Default</Trans>}</span>
                        </SelectItem>
                        {allStrategyNames.map((name) => (
                          <SelectItem key={name} value={name}>
                            {strategyDisplayName(name)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <button
                      type="button"
                      onClick={() => toggleDisabled(key)}
                      className={`shrink-0 p-0.5 rounded transition-colors ${disabled ? "text-amber-500 hover:text-amber-600" : "text-muted-foreground/0 group-hover:text-muted-foreground hover:!text-destructive"}`}
                      title={disabled ? t`Re-enable type` : t`Disable type`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )
              })}
              {/* Add new type */}
              <div className="flex items-center gap-2 px-3 py-1.5">
                <Plus className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <Input
                  value={newTypeKey}
                  onChange={(e) => setNewTypeKey(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addSectionType()}
                  className="h-7 text-xs w-40 shrink-0"
                  placeholder={t`new_type_key`}
                />
                <Input
                  value={newTypeDesc}
                  onChange={(e) => setNewTypeDesc(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addSectionType()}
                  className="h-7 text-xs flex-1 min-w-0"
                  placeholder={t`Description...`}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs shrink-0"
                  onClick={addSectionType}
                  disabled={!newTypeKey.trim() || newTypeKey.trim().toLowerCase().replace(/\s+/g, "_") in sectionTypes}
                >
                  {<Trans>Add</Trans>}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {tab === "sectioning-prompt" && (
        <div className="flex flex-col h-full">
          <div className="shrink-0 p-4 pb-0 space-y-4">
            <div>
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                {<Trans>Sectioning Mode</Trans>}
              </h3>
              <Select
                value={sectioningMode}
                onValueChange={(v) => {
                  setSectioningMode(v)
                  markDirty("page_sectioning")
                }}
              >
                <SelectTrigger className="w-72 h-fit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="start">
                  <SelectItem value="dynamic">
                    <div className="flex flex-col items-start">
                      <span>{<Trans>Dynamic</Trans>}</span>
                      <span className="text-xs text-muted-foreground">
                        {<Trans>Keeps pages whole unless mixed activity types require splitting</Trans>}
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="section">
                    <div className="flex flex-col items-start">
                      <span>{<Trans>By Section</Trans>}</span>
                      <span className="text-xs text-muted-foreground">
                        {<Trans>Groups content into logical sections</Trans>}
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="page">
                    <div className="flex flex-col items-start">
                      <span>{<Trans>By Page</Trans>}</span>
                      <span className="text-xs text-muted-foreground">
                        {<Trans>Treats each page as a single section</Trans>}
                      </span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1.5">
                {<Trans>Controls how page content is grouped during the sectioning step.</Trans>}
              </p>
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <PromptViewer
              promptName="page_sectioning"
              bookLabel={bookLabel}
              title={t`Page Sectioning Prompt`}
              description={t`The prompt template used to split each page into logical sections. This is a Liquid template processed with page context.`}
              model={sectioning.model}
              onModelChange={sectioning.onModelChange}
              maxRetries={sectioning.maxRetries}
              onMaxRetriesChange={sectioning.onMaxRetriesChange}
              onContentChange={setSectioningPromptDraft}
            />
          </div>
        </div>
      )}

      {tab === "rendering-prompt" && (
        <div className="flex flex-col h-full">
          {/* Styleguide + Temperature settings */}
          <div className="shrink-0 p-4 pb-0 space-y-4">
            <div>
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                {<Trans>Styleguide</Trans>}
              </h3>
              <div className="flex items-center gap-2">
                <Select
                  value={styleguide || "__none__"}
                  onValueChange={(v) => {
                    setStyleguide(v === "__none__" ? "" : v)
                    markDirty("styleguide")
                  }}
                >
                  <SelectTrigger className="w-72">
                    <SelectValue placeholder={t`Select styleguide...`}>
                      {styleguide ? titleCase(styleguide) : <Trans>None</Trans>}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent align="start">
                    <SelectItem value="__none__">
                      <span className="text-muted-foreground">{<Trans>None</Trans>}</span>
                    </SelectItem>
                    {availableStyleguides.map((sg) => (
                      <SelectItem key={sg} value={sg}>
                        {titleCase(sg)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {styleguide && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 px-2.5 shrink-0"
                    onClick={openStyleguidePreview}
                  >
                    <Eye className="h-3.5 w-3.5 mr-1" />
                    {<Trans>Preview</Trans>}
                  </Button>
                )}
                {pagesData && pagesData.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 px-2.5 shrink-0"
                    onClick={() => {
                      setSelectedPageIds(new Set())
                      setGenerateDialogOpen(true)
                    }}
                    disabled={generateStyleguideMutation.isPending}
                  >
                    <Wand2 className="h-3.5 w-3.5 mr-1" />
                    {<Trans>Generate from pages</Trans>}
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                {<Trans>Provides consistent HTML/CSS patterns for LLM-generated pages.</Trans>}
              </p>
            </div>

            <div>
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                {<Trans>Temperature</Trans>}
              </h3>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  max={2}
                  step={0.1}
                  value={renderingTemperature}
                  onChange={(e) => {
                    setRenderingTemperature(e.target.value)
                    markDirty("rendering_temperature")
                  }}
                  placeholder="0.3"
                  className="h-9 w-24 text-sm"
                />
                <Label className="text-xs text-muted-foreground">
                  {<Trans>0 = deterministic, 2 = max creativity</Trans>}
                </Label>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                {<Trans>Lower values produce more consistent styling across pages.</Trans>}
              </p>
            </div>

            <div>
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                {<Trans>Display</Trans>}
              </h3>
              <div className="flex items-center gap-3">
                <Switch
                  id="apply-body-background"
                  checked={applyBodyBackground}
                  onCheckedChange={(v) => { setApplyBodyBackground(v); markDirty("apply_body_background") }}
                />
                <Label htmlFor="apply-body-background" className="text-sm font-normal">
                  {<Trans>Apply page background colors</Trans>}
                </Label>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                {<Trans>When enabled, background colors from the styleguide are applied to the full page body.</Trans>}
              </p>
            </div>
          </div>

          {/* Prompt editor */}
          <div className="flex-1 min-h-0">
            <PromptViewer
              promptName={renderingPromptName}
              bookLabel={bookLabel}
              title={t`Rendering Prompt`}
              description={t`The prompt template used to generate HTML for each section. This is a Liquid template processed with section context.`}
              model={renderingModel}
              onModelChange={(v) => { setRenderingModel(v); markDirty("rendering_model") }}
              maxRetries={renderingRetries}
              onMaxRetriesChange={(v) => { setRenderingRetries(v); markDirty("rendering_retries") }}
              onContentChange={setRenderingPromptDraft}
            />
          </div>
        </div>
      )}

      {tab === "rendering-template" && (
        <div className="flex flex-col h-full p-4 gap-4">
          <div className="shrink-0">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              {<Trans>Template Rendering</Trans>}
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              {<Trans>Browse and edit Liquid templates used for template-based rendering strategies.</Trans>}
            </p>
            <Select
              value={templateTabName || "__none__"}
              onValueChange={(v) => {
                setTemplateTabName(v === "__none__" ? "" : v)
                setTemplateTabDraft(null)
              }}
            >
              <SelectTrigger className="w-72">
                <SelectValue placeholder={t`Select template...`}>
                  {templateTabName ? (
                    <>
                      {titleCase(templateTabName)}
                      {renderingRenderType === "template" && templateTabName === renderingTemplateName && (
                        <span className="text-emerald-600 ml-1">{<Trans>(active)</Trans>}</span>
                      )}
                    </>
                  ) : t`Select template...`}
                </SelectValue>
              </SelectTrigger>
              <SelectContent align="start">
                {availableTemplates.map((name) => {
                  const isActive = renderingRenderType === "template" && name === renderingTemplateName
                  return (
                    <SelectItem key={name} value={name}>
                      {titleCase(name)}
                      {isActive && <span className="text-emerald-600 ml-1">{<Trans>(active)</Trans>}</span>}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
          {templateTabName && (
            <div className="flex-1 min-h-0">
              <TemplateViewer
                templateName={templateTabName}
                bookLabel={bookLabel}
                title={titleCase(templateTabName)}
                description={t`Edit the Liquid/HTML template below. Changes are saved when you click Save & Rerun.`}
                onContentChange={setTemplateTabDraft}
              />
            </div>
          )}
        </div>
      )}

      {tab === "activity-prompts" && (() => {
        const activityNames = Object.keys(activityStrategies)
        // Activities are enabled when their section types are NOT pruned and render strategies are mapped
        const anyEnabled = activityNames.length > 0 &&
          activityNames.some((name) => !disabledSectionTypes.has(name))
        return (
        <div className="flex flex-col h-full">
          <div className="shrink-0 p-4 pb-2">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              {<Trans>Activity Rendering</Trans>}
            </h3>

            {/* Universal enable/disable toggle */}
            <div className="flex items-center gap-3 mb-4">
              <Switch
                checked={anyEnabled}
                onCheckedChange={(checked) => {
                  markDirty("disabled_section_types")
                  setDisabledSectionTypes((prev) => {
                    const next = new Set(prev)
                    for (const name of activityNames) {
                      if (checked) {
                        next.delete(name)
                      } else {
                        next.add(name)
                      }
                    }
                    return next
                  })
                }}
              />
              <Label className="text-xs">
                {anyEnabled ? <Trans>Activities enabled</Trans> : <Trans>Activities disabled</Trans>}
              </Label>
              <p className="text-xs text-muted-foreground">
                {anyEnabled
                  ? <Trans>Activity section types are available for classification and rendering.</Trans>
                  : <Trans>Activity section types are hidden from the classifier and skipped during rendering.</Trans>}
              </p>
            </div>

            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              {<Trans>Edit Prompts</Trans>}
            </h3>
            <Select
              value={activityStrategyName || "__none__"}
              onValueChange={(v) => {
                const name = v === "__none__" ? "" : v
                setActivityStrategyName(name)
                setActivityPromptDraft(null)
                setActivityAnswerDraft(null)
                setActivityModel(name ? (activityStrategies[name]?.model ?? "") : "")
                setActivityRetries(name && activityStrategies[name]?.max_retries != null ? String(activityStrategies[name].max_retries) : "")
              }}
            >
              <SelectTrigger className="w-72">
                <SelectValue placeholder={t`Select activity type...`}>
                  {activityStrategyName ? getActivityLabel(activityStrategyName) : t`Select activity type...`}
                </SelectValue>
              </SelectTrigger>
              <SelectContent align="start">
                {activityNames.map((name) => (
                  <SelectItem key={name} value={name}>
                    {getActivityLabel(name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedActivity && (
            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="min-h-[400px] h-[50vh]">
                <PromptViewer
                  key={`${activityStrategyName}-gen`}
                  promptName={selectedActivity.prompt}
                  bookLabel={bookLabel}
                  title={t`Generation Prompt`}
                  description={t`Generates the interactive HTML for this activity type.`}
                  model={activityModel}
                  onModelChange={(v) => { setActivityModel(v); markDirty("activity_model") }}
                  maxRetries={activityRetries}
                  onMaxRetriesChange={(v) => { setActivityRetries(v); markDirty("activity_retries") }}
                  onContentChange={setActivityPromptDraft}
                />
              </div>
              {selectedActivity.answer_prompt && (
                <div className="min-h-[400px] h-[50vh] border-t">
                  <PromptViewer
                    key={`${activityStrategyName}-ans`}
                    promptName={selectedActivity.answer_prompt}
                    bookLabel={bookLabel}
                  title={t`Answer Prompt`}
                  description={t`Extracts the correct answer key from the generated activity HTML.`}
                    model={activityModel}
                    onModelChange={(v) => { setActivityModel(v); markDirty("activity_model") }}
                    maxRetries={activityRetries}
                    onMaxRetriesChange={(v) => { setActivityRetries(v); markDirty("activity_retries") }}
                    onContentChange={setActivityAnswerDraft}
                  />
                </div>
              )}
            </div>
          )}
        </div>
        )
      })()}

      {tab === "image-generation" && (
        <div className="h-full flex flex-col">
          {/* Sub-tabs for Generate vs Edit prompt */}
          <div className="flex items-center gap-1 px-4 pt-3 pb-0 shrink-0">
            <button
              type="button"
              onClick={() => setImagePromptSubTab("generate")}
              className={`text-xs font-medium px-3 py-1.5 rounded-t border border-b-0 cursor-pointer transition-colors ${
                imagePromptSubTab === "generate"
                  ? "bg-background border-border"
                  : "bg-muted/50 border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {<Trans>Generate Prompt</Trans>}
            </button>
            <button
              type="button"
              onClick={() => setImagePromptSubTab("edit")}
              className={`text-xs font-medium px-3 py-1.5 rounded-t border border-b-0 cursor-pointer transition-colors ${
                imagePromptSubTab === "edit"
                  ? "bg-background border-border"
                  : "bg-muted/50 border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {<Trans>Edit Prompt</Trans>}
            </button>
          </div>
          <div className="flex-1 min-h-0">
            {imagePromptSubTab === "generate" ? (
              <PromptViewer
                key="ai_image_generation"
                promptName="ai_image_generation"
                bookLabel={bookLabel}
                title={t`Image Generation Prompt`}
                description={t`Wraps 'Generate new' requests. Supports user_prompt, style, and image_type variables. Uses Liquid syntax for conditionals.`}
                hideModel
                onContentChange={setImageGenPromptDraft}
              />
            ) : (
              <PromptViewer
                key="ai_image_edit"
                promptName="ai_image_edit"
                bookLabel={bookLabel}
                title={t`Image Edit Prompt`}
                description={t`Wraps 'Edit this image' requests. The AI receives the original image alongside this prompt. Supports user_prompt and style variables.`}
                hideModel
                onContentChange={setImageEditPromptDraft}
              />
            )}
          </div>
        </div>
      )}

      {headerTarget && createPortal(
        tab === "image-generation" ? (
          <Button
            size="sm"
            className="h-7 px-2.5 text-xs bg-black/15 text-white hover:bg-black/25"
            onClick={saveImagePrompts}
            disabled={savingImageGenPrompt || (imageGenPromptDraft == null && imageEditPromptDraft == null)}
          >
            {savingImageGenPrompt ? t`Saving...` : t`Save`}
          </Button>
        ) : (
          <Button
            size="sm"
            className="h-7 px-2.5 text-xs bg-black/15 text-white hover:bg-black/25"
            onClick={() => setShowRerunDialog(true)}
            disabled={updateConfig.isPending || !hasApiKey}
          >
            <Play className="mr-1.5 h-3.5 w-3.5" />
            {<Trans>Save & Rerun</Trans>}
          </Button>
        ),
        headerTarget
      )}

      <Dialog open={styleguidePreviewOpen} onOpenChange={setStyleguidePreviewOpen}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-0">
            <DialogTitle>{t`Styleguide Preview — ${styleguide}`}</DialogTitle>
            <DialogDescription>
              {<Trans>Preview of the HTML/CSS patterns used for LLM-generated pages.</Trans>}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 px-6 pb-6">
            {styleguidePreviewLoading ? (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                {<Trans>Loading preview...</Trans>}
              </div>
            ) : (
              <iframe
                srcDoc={previewData?.html ?? ""}
                className="w-full h-full rounded-md border"
                sandbox="allow-scripts"
                title={t`Styleguide Preview`}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={generateDialogOpen} onOpenChange={(open) => {
        if (!generateStyleguideMutation.isPending) {
          setGenerateDialogOpen(open)
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{<Trans>Generate Styleguide from Pages</Trans>}</DialogTitle>
            <DialogDescription>
              {<Trans>Select up to 5 pages to use as visual references. The LLM will analyze them and generate a styleguide.</Trans>}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 p-1">
              {(pagesData ?? []).map((page) => {
                const isSelected = selectedPageIds.has(page.pageId)
                const isDisabled = !isSelected && selectedPageIds.size >= 5
                return (
                  <PageThumb
                    key={page.pageId}
                    bookLabel={bookLabel}
                    page={page}
                    selected={isSelected}
                    disabled={isDisabled}
                    onClick={() => togglePageSelection(page.pageId)}
                  />
                )
              })}
            </div>
          </div>
          <DialogFooter className="flex items-center justify-between sm:justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">
                {t`${String(selectedPageIds.size)}/5 pages selected`}
              </span>
              {generateStyleguideMutation.isError && (
                <span className="text-xs text-red-500">
                  {generateStyleguideMutation.error instanceof Error
                    ? generateStyleguideMutation.error.message
                    : <Trans>Generation failed. Please try again.</Trans>}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setGenerateDialogOpen(false)}
                disabled={generateStyleguideMutation.isPending}
              >
                {<Trans>Cancel</Trans>}
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={selectedPageIds.size === 0 || !hasApiKey || generateStyleguideMutation.isPending}
              >
                {generateStyleguideMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    {<Trans>Generating...</Trans>}
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4 mr-1.5" />
                    {<Trans>Generate</Trans>}
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRerunDialog} onOpenChange={setShowRerunDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{<Trans>Save & Rerun Storyboard</Trans>}</DialogTitle>
            <DialogDescription>
              {hasExistingSectioningData && !needsResectioning
                ? <Trans>This will save your settings and re-run the storyboard pipeline. Only rendering will be regenerated — your existing sections will be preserved.</Trans>
                : <Trans>This will save your settings and re-run the storyboard pipeline. Sectioning and rendering will be regenerated for all pages.</Trans>}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRerunDialog(false)}>
              {<Trans>Cancel</Trans>}
            </Button>
            <Button onClick={confirmSaveAndRerun} disabled={updateConfig.isPending}>
              {updateConfig.isPending ? t`Saving...` : t`Confirm Rerun`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

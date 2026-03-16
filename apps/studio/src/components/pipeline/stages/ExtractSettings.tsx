import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { useNavigate } from "@tanstack/react-router"
import { Play, Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { LanguagePicker } from "@/components/LanguagePicker"
import { useBookConfig, useUpdateBookConfig } from "@/hooks/use-book-config"
import { useActiveConfig } from "@/hooks/use-debug"
import { useApiKey } from "@/hooks/use-api-key"
import { api } from "@/api/client"
import { PromptViewer } from "@/components/pipeline/PromptViewer"
import { PruneToggle } from "@/components/pipeline/PruneToggle"
import { useBookRun } from "@/hooks/use-book-run"
import { useStepConfig } from "@/hooks/use-step-config"
import { normalizeLocale } from "@/lib/languages"
import * as m from "@/paraglide/messages"
import { getTextTypeLabel } from "@/lib/text-type-labels"

export function ExtractSettings({ bookLabel, headerTarget, tab = "general" }: { bookLabel: string; headerTarget?: HTMLDivElement | null; tab?: string }) {
  const { data: bookConfigData } = useBookConfig(bookLabel)
  const { data: activeConfigData } = useActiveConfig(bookLabel)
  const updateConfig = useUpdateBookConfig()
  const { apiKey, hasApiKey } = useApiKey()
  const { queueRun } = useBookRun()
  const navigate = useNavigate()
  const [showRerunDialog, setShowRerunDialog] = useState(false)

  // Form state
  const [startPage, setStartPage] = useState("")
  const [endPage, setEndPage] = useState("")
  const [spreadMode, setSpreadMode] = useState(false)
  const [editingLanguage, setEditingLanguage] = useState("")
  const [textTypes, setTextTypes] = useState<Record<string, string>>({})
  const [prunedTextTypes, setPrunedTextTypes] = useState<Set<string>>(new Set())
  const [minSide, setMinSide] = useState("")
  const [maxSide, setMaxSide] = useState("")
  const [minStddev, setMinStddev] = useState("")
  const [meaningfulness, setMeaningfulness] = useState(true)
  const [cropping, setCropping] = useState(false)
  const [segmentation, setSegmentation] = useState(false)
  const [segmentationMinSide, setSegmentationMinSide] = useState("")
  const [metadataPromptDraft, setMetadataPromptDraft] = useState<string | null>(null)
  const [extractionPromptDraft, setExtractionPromptDraft] = useState<string | null>(null)
  const [meaningfulnessPromptDraft, setMeaningfulnessPromptDraft] = useState<string | null>(null)
  const [croppingPromptDraft, setCroppingPromptDraft] = useState<string | null>(null)
  const [segmentationPromptDraft, setSegmentationPromptDraft] = useState<string | null>(null)
  const [bookSummaryPromptDraft, setBookSummaryPromptDraft] = useState<string | null>(null)

  // Track which field groups the user has actually touched
  const [dirty, setDirty] = useState<Record<string, boolean>>({})
  const markDirty = (field: string) => setDirty((prev) => ({ ...prev, [field]: true }))

  const merged = activeConfigData?.merged as Record<string, unknown> | undefined
  const metadata = useStepConfig(merged, "metadata", markDirty)
  const textClassification = useStepConfig(merged, "text_classification", markDirty)
  const imageMeaningfulness = useStepConfig(merged, "image_meaningfulness", markDirty)
  const imageCropping = useStepConfig(merged, "image_cropping", markDirty)
  const imageSegmentation = useStepConfig(merged, "image_segmentation", markDirty)
  const bookSummary = useStepConfig(merged, "book_summary", markDirty)

  // Load config into form state
  useEffect(() => {
    if (!bookConfigData) return
    const c = bookConfigData.config
    setSpreadMode(c.spread_mode === true)
    if (c.editing_language) setEditingLanguage(normalizeLocale(String(c.editing_language)))
    if (c.start_page != null) setStartPage(String(c.start_page))
    if (c.end_page != null) setEndPage(String(c.end_page))
  }, [bookConfigData])

  // Load text types, pruned types, image filters, and segmentation min_side from active (merged) config
  useEffect(() => {
    if (!activeConfigData) return
    const m = activeConfigData.merged as Record<string, unknown>
    if (m.text_types && typeof m.text_types === "object") {
      setTextTypes(m.text_types as Record<string, string>)
    }
    if (Array.isArray(m.pruned_text_types)) {
      setPrunedTextTypes(new Set(m.pruned_text_types as string[]))
    }
    if (m.image_filters && typeof m.image_filters === "object") {
      const filters = m.image_filters as Record<string, unknown>
      if (filters.min_side != null) setMinSide(String(filters.min_side))
      if (filters.max_side != null) setMaxSide(String(filters.max_side))
      if (filters.min_stddev != null) setMinStddev(String(filters.min_stddev))
      if (filters.meaningfulness != null) setMeaningfulness(filters.meaningfulness !== false)
      if (filters.cropping != null) setCropping(filters.cropping === true)
      if (filters.segmentation != null) setSegmentation(filters.segmentation === true)
    }
    if (m.image_segmentation && typeof m.image_segmentation === "object") {
      const is = m.image_segmentation as Record<string, unknown>
      if (is.min_side != null) setSegmentationMinSide(String(is.min_side))
    }
  }, [activeConfigData])

  const [newTypeKey, setNewTypeKey] = useState("")
  const [newTypeDesc, setNewTypeDesc] = useState("")

  const togglePruned = (key: string) => {
    markDirty("pruned_text_types")
    setPrunedTextTypes((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const updateDescription = (key: string, description: string) => {
    markDirty("text_types")
    setTextTypes((prev) => ({ ...prev, [key]: description }))
  }

  const removeTextType = (key: string) => {
    markDirty("text_types")
    markDirty("pruned_text_types")
    setTextTypes((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
    setPrunedTextTypes((prev) => {
      const next = new Set(prev)
      next.delete(key)
      return next
    })
  }

  const addTextType = () => {
    const key = newTypeKey.trim().toLowerCase().replace(/\s+/g, "_")
    if (!key || key in textTypes) return
    markDirty("text_types")
    setTextTypes((prev) => ({ ...prev, [key]: newTypeDesc.trim() }))
    setNewTypeKey("")
    setNewTypeDesc("")
  }

  // Helper: only write a field if the user changed it or the book config already had it
  const shouldWrite = (field: string) =>
    dirty[field] || (bookConfigData?.config && field in bookConfigData.config)

  const buildOverrides = () => {
    const overrides: Record<string, unknown> = {}

    // Preserve all existing book config keys we don't manage
    if (bookConfigData?.config) {
      Object.assign(overrides, bookConfigData.config)
    }

    // Only write managed fields if touched or already in book config
    if (shouldWrite("spread_mode")) {
      overrides.spread_mode = spreadMode
    }
    if (shouldWrite("start_page")) {
      overrides.start_page = startPage.trim() ? Number(startPage) : undefined
    }
    if (shouldWrite("end_page")) {
      overrides.end_page = endPage.trim() ? Number(endPage) : undefined
    }
    if (shouldWrite("editing_language") || editingLanguage.trim()) {
      const normalized = normalizeLocale(editingLanguage.trim())
      overrides.editing_language = normalized || undefined
    }
    if (shouldWrite("text_types")) {
      overrides.text_types = textTypes
    }
    if (shouldWrite("pruned_text_types")) {
      overrides.pruned_text_types = Array.from(prunedTextTypes)
    }
    if (shouldWrite("image_filters")) {
      const filters: Record<string, unknown> = {}
      if (minSide) filters.min_side = Number(minSide)
      if (maxSide) filters.max_side = Number(maxSide)
      if (minStddev) filters.min_stddev = Number(minStddev)
      filters.meaningfulness = meaningfulness
      filters.cropping = cropping
      filters.segmentation = segmentation
      overrides.image_filters = filters
    }
    if (shouldWrite("metadata")) {
      const existing = (bookConfigData?.config?.metadata ?? {}) as Record<string, unknown>
      overrides.metadata = { ...existing, ...metadata.configOverrides }
    }
    if (shouldWrite("text_classification")) {
      const existing = (bookConfigData?.config?.text_classification ?? {}) as Record<string, unknown>
      overrides.text_classification = { ...existing, ...textClassification.configOverrides }
    }
    if (shouldWrite("image_meaningfulness")) {
      const existing = (bookConfigData?.config?.image_meaningfulness ?? {}) as Record<string, unknown>
      overrides.image_meaningfulness = { ...existing, ...imageMeaningfulness.configOverrides }
    }
    if (shouldWrite("image_cropping")) {
      const existing = (bookConfigData?.config?.image_cropping ?? {}) as Record<string, unknown>
      overrides.image_cropping = { ...existing, ...imageCropping.configOverrides }
    }
    if (shouldWrite("image_segmentation")) {
      const existing = (bookConfigData?.config?.image_segmentation ?? {}) as Record<string, unknown>
      overrides.image_segmentation = {
        ...existing,
        ...imageSegmentation.configOverrides,
        min_side: segmentationMinSide.trim() ? Number(segmentationMinSide) : undefined,
      }
    }
    if (shouldWrite("book_summary")) {
      const existing = (bookConfigData?.config?.book_summary ?? {}) as Record<string, unknown>
      overrides.book_summary = { ...existing, ...bookSummary.configOverrides }
    }

    return overrides
  }

  const confirmSaveAndRerun = async () => {
    // Save any edited prompts first
    const promptSaves: Promise<unknown>[] = []
    if (metadataPromptDraft != null) promptSaves.push(api.updatePrompt("metadata_extraction", metadataPromptDraft, bookLabel))
    if (extractionPromptDraft != null) promptSaves.push(api.updatePrompt("text_classification", extractionPromptDraft, bookLabel))
    if (meaningfulnessPromptDraft != null) promptSaves.push(api.updatePrompt("image_meaningfulness", meaningfulnessPromptDraft, bookLabel))
    if (croppingPromptDraft != null) promptSaves.push(api.updatePrompt("image_cropping", croppingPromptDraft, bookLabel))
    if (segmentationPromptDraft != null) promptSaves.push(api.updatePrompt("image_segmentation", segmentationPromptDraft, bookLabel))
    if (bookSummaryPromptDraft != null) promptSaves.push(api.updatePrompt("book_summary", bookSummaryPromptDraft, bookLabel))
    if (promptSaves.length > 0) await Promise.all(promptSaves)

    const overrides = buildOverrides()
    updateConfig.mutate(
      { label: bookLabel, config: overrides },
      {
        onSuccess: async () => {
          setDirty({})
          setMetadataPromptDraft(null)
          setExtractionPromptDraft(null)
          setMeaningfulnessPromptDraft(null)
          setCroppingPromptDraft(null)
          setSegmentationPromptDraft(null)
          setBookSummaryPromptDraft(null)
          setShowRerunDialog(false)
          queueRun({ fromStage: "extract", toStage: "extract", apiKey })
          navigate({ to: "/books/$label/$step", params: { label: bookLabel, step: "extract" } })
        },
      }
    )
  }

  return (
    <div className={tab === "metadata-prompt" || tab === "prompt" || tab === "meaningfulness-prompt" || tab === "cropping-prompt" || tab === "segmentation-prompt" || tab === "book-summary-prompt" ? "h-full max-w-4xl" : "p-4 space-y-6"}>
      {tab === "general" && (
        <>
          {/* Page Range */}
          <div>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              {m.extract_settings_page_range_heading()}
            </h3>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                value={startPage}
                onChange={(e) => { setStartPage(e.target.value); markDirty("start_page") }}
                placeholder={m.extract_settings_page_range_first()}
                className="w-24"
              />
              <span className="text-xs text-muted-foreground">{m.extract_settings_page_range_to()}</span>
              <Input
                type="number"
                min={1}
                value={endPage}
                onChange={(e) => { setEndPage(e.target.value); markDirty("end_page") }}
                placeholder={m.extract_settings_page_range_last()}
                className="w-24"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              {m.extract_settings_page_range_hint()}
            </p>
          </div>

          {/* Spread Mode */}
          <div>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              {m.extract_settings_spread_heading()}
            </h3>
            <div className="flex items-center gap-2">
              <Switch
                id="spread-mode"
                checked={spreadMode}
                onCheckedChange={(v) => { setSpreadMode(v); markDirty("spread_mode") }}
              />
              <Label htmlFor="spread-mode" className="text-sm font-normal">
                {m.extract_settings_spread_label()}
              </Label>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              {m.extract_settings_spread_hint()}
            </p>
          </div>

          {/* Editing Language */}
          <div className="max-w-sm">
            <LanguagePicker
              selected={editingLanguage}
              onSelect={(v) => { setEditingLanguage(v); markDirty("editing_language") }}
              label={m.extract_settings_editing_language_label()}
              hint={m.extract_settings_editing_language_hint()}
            />
          </div>

          {/* Image Filters */}
          <div>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              {m.extract_settings_image_filters_heading()}
            </h3>
            <div className="flex items-center gap-2">
              <div className="space-y-1">
                <Label className="text-xs">{m.extract_settings_min_side_label()}</Label>
                <Input
                  type="number"
                  min={0}
                  value={minSide}
                  onChange={(e) => { setMinSide(e.target.value); markDirty("image_filters") }}
                  placeholder={m.extract_settings_none_placeholder()}
                  className="w-28"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{m.extract_settings_max_side_label()}</Label>
                <Input
                  type="number"
                  min={0}
                  value={maxSide}
                  onChange={(e) => { setMaxSide(e.target.value); markDirty("image_filters") }}
                  placeholder={m.extract_settings_none_placeholder()}
                  className="w-28"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              {m.extract_settings_image_filters_hint()}
            </p>
            <div className="space-y-1 mt-3">
              <Label className="text-xs">{m.extract_settings_min_complexity_label()}</Label>
              <Input
                type="number"
                min={0}
                step={0.1}
                value={minStddev}
                onChange={(e) => { setMinStddev(e.target.value); markDirty("image_filters") }}
                placeholder="2"
                className="w-28"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              {m.extract_settings_complexity_hint()}
            </p>
            <div className="flex items-center gap-2 mt-4">
              <Switch
                id="meaningfulness-filter"
                checked={meaningfulness}
                onCheckedChange={(v) => {
                  setMeaningfulness(v)
                  markDirty("image_filters")
                }}
              />
              <Label htmlFor="meaningfulness-filter" className="text-sm font-normal">
                {m.extract_settings_meaningfulness_label()}
              </Label>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              {m.extract_settings_meaningfulness_hint()}
            </p>
            <div className="flex items-center gap-2 mt-4">
              <Switch
                id="cropping-filter"
                checked={cropping}
                onCheckedChange={(v) => {
                  setCropping(v)
                  markDirty("image_filters")
                }}
              />
              <Label htmlFor="cropping-filter" className="text-sm font-normal">
                {m.extract_settings_cropping_label()}
              </Label>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              {m.extract_settings_cropping_hint()}
            </p>
            <div className="flex items-center gap-2 mt-4">
              <Switch
                id="segmentation-filter"
                checked={segmentation}
                onCheckedChange={(v) => {
                  setSegmentation(v)
                  markDirty("image_filters")
                }}
              />
              <Label htmlFor="segmentation-filter" className="text-sm font-normal">
                {m.extract_settings_segmentation_label()}
              </Label>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              {m.extract_settings_segmentation_hint()}
            </p>
          </div>
        </>
      )}

      {tab === "text-types" && (
        <div>
          <p className="text-xs text-muted-foreground mb-3">
            {m.extract_settings_text_types_description()}
          </p>
          <div className="rounded-md border divide-y">
            {/* Header */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50">
              <span className="shrink-0 w-5" />
              <span className="text-xs font-medium text-muted-foreground shrink-0 w-40">{m.extract_settings_text_types_type_header()}</span>
              <span className="text-xs font-medium text-muted-foreground flex-1 min-w-0">{m.extract_settings_text_types_desc_header()}</span>
              <span className="shrink-0 w-5" />
            </div>
            {Object.entries(textTypes).map(([key, description]) => {
              const pruned = prunedTextTypes.has(key)
              return (
                <div
                  key={key}
                  className={`flex items-center gap-2 px-3 py-1.5 group ${pruned ? "bg-muted/30" : ""}`}
                >
                  <PruneToggle pruned={pruned} onToggle={() => togglePruned(key)} />
                  <span className={`text-xs shrink-0 w-40 truncate font-mono ${pruned ? "text-muted-foreground line-through" : "font-medium"}`}>
                    {getTextTypeLabel(key)}
                  </span>
                  <Input
                    value={description}
                    onChange={(e) => updateDescription(key, e.target.value)}
                    className="h-7 text-xs flex-1 min-w-0"
                    placeholder={m.extract_settings_text_types_desc_placeholder()}
                  />
                  <button
                    type="button"
                    onClick={() => removeTextType(key)}
                    className="shrink-0 p-0.5 rounded text-muted-foreground/0 group-hover:text-muted-foreground hover:!text-destructive transition-colors"
                    title={m.extract_settings_text_types_remove()}
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
                onKeyDown={(e) => e.key === "Enter" && addTextType()}
                className="h-7 text-xs w-40 shrink-0"
                placeholder="new_type_key"
              />
              <Input
                value={newTypeDesc}
                onChange={(e) => setNewTypeDesc(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTextType()}
                className="h-7 text-xs flex-1 min-w-0"
                placeholder={m.extract_settings_text_types_desc_placeholder()}
              />
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs shrink-0"
                onClick={addTextType}
                disabled={!newTypeKey.trim() || newTypeKey.trim().toLowerCase().replace(/\s+/g, "_") in textTypes}
              >
                {m.extract_settings_text_types_add()}
              </Button>
            </div>
          </div>
        </div>
      )}

      {tab === "metadata-prompt" && (
        <PromptViewer
          promptName="metadata_extraction"
          bookLabel={bookLabel}
          title={m.extract_settings_metadata_prompt_title()}
          description={m.extract_settings_metadata_prompt_desc()}
          model={metadata.model}
          onModelChange={metadata.onModelChange}
          maxRetries={metadata.maxRetries}
          onMaxRetriesChange={metadata.onMaxRetriesChange}
          onContentChange={setMetadataPromptDraft}
          enabled={tab === "metadata-prompt"}
        />
      )}

      {tab === "prompt" && (
        <PromptViewer
          promptName="text_classification"
          bookLabel={bookLabel}
          title={m.extract_settings_classification_prompt_title()}
          description={m.extract_settings_classification_prompt_desc()}
          model={textClassification.model}
          onModelChange={textClassification.onModelChange}
          maxRetries={textClassification.maxRetries}
          onMaxRetriesChange={textClassification.onMaxRetriesChange}
          onContentChange={setExtractionPromptDraft}
          enabled={tab === "prompt"}
        />
      )}

      {tab === "meaningfulness-prompt" && (
        <PromptViewer
          promptName="image_meaningfulness"
          bookLabel={bookLabel}
          title={m.extract_settings_meaningfulness_prompt_title()}
          description={m.extract_settings_meaningfulness_prompt_desc()}
          model={imageMeaningfulness.model}
          onModelChange={imageMeaningfulness.onModelChange}
          maxRetries={imageMeaningfulness.maxRetries}
          onMaxRetriesChange={imageMeaningfulness.onMaxRetriesChange}
          onContentChange={setMeaningfulnessPromptDraft}
          enabled={tab === "meaningfulness-prompt"}
        />
      )}

      {tab === "cropping-prompt" && (
        <PromptViewer
          promptName="image_cropping"
          bookLabel={bookLabel}
          title={m.extract_settings_cropping_prompt_title()}
          description={m.extract_settings_cropping_prompt_desc()}
          model={imageCropping.model}
          onModelChange={imageCropping.onModelChange}
          maxRetries={imageCropping.maxRetries}
          onMaxRetriesChange={imageCropping.onMaxRetriesChange}
          onContentChange={setCroppingPromptDraft}
          enabled={tab === "cropping-prompt"}
        />
      )}

      {tab === "segmentation-prompt" && (
        <div className="flex flex-col h-full">
          <div className="shrink-0 px-4 pt-4 pb-3 space-y-1.5 border-b">
            <Label className="text-xs">{m.extract_settings_seg_min_side_label()}</Label>
            <Input
              type="number"
              min={0}
              value={segmentationMinSide}
              onChange={(e) => { setSegmentationMinSide(e.target.value); markDirty("image_segmentation") }}
              placeholder={m.extract_settings_none_placeholder()}
              className="w-32"
            />
            <p className="text-xs text-muted-foreground">
              {m.extract_settings_seg_min_side_hint()}
            </p>
          </div>
          <div className="flex-1 min-h-0">
            <PromptViewer
              promptName="image_segmentation"
              bookLabel={bookLabel}
              title={m.extract_settings_segmentation_prompt_title()}
              description={m.extract_settings_segmentation_prompt_desc()}
              model={imageSegmentation.model}
              onModelChange={imageSegmentation.onModelChange}
              maxRetries={imageSegmentation.maxRetries}
              onMaxRetriesChange={imageSegmentation.onMaxRetriesChange}
              onContentChange={setSegmentationPromptDraft}
              enabled={tab === "segmentation-prompt"}
            />
          </div>
        </div>
      )}

      {tab === "book-summary-prompt" && (
        <PromptViewer
          promptName="book_summary"
          bookLabel={bookLabel}
          title={m.extract_settings_summary_prompt_title()}
          description={m.extract_settings_summary_prompt_desc()}
          model={bookSummary.model}
          onModelChange={bookSummary.onModelChange}
          maxRetries={bookSummary.maxRetries}
          onMaxRetriesChange={bookSummary.onMaxRetriesChange}
          onContentChange={setBookSummaryPromptDraft}
          enabled={tab === "book-summary-prompt"}
        />
      )}

      {headerTarget && createPortal(
        <Button
          size="sm"
          className="h-7 px-2.5 text-xs bg-black/15 text-white hover:bg-black/25"
          onClick={() => setShowRerunDialog(true)}
          disabled={updateConfig.isPending || !hasApiKey}
        >
          <Play className="mr-1.5 h-3.5 w-3.5" />
          {m.extract_settings_save_rerun()}
        </Button>,
        headerTarget
      )}

      <Dialog open={showRerunDialog} onOpenChange={setShowRerunDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{m.extract_settings_save_rerun_title()}</DialogTitle>
            <DialogDescription>
              {m.extract_settings_save_rerun_desc()}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRerunDialog(false)}>
              {m.extract_settings_cancel()}
            </Button>
            <Button onClick={confirmSaveAndRerun} disabled={updateConfig.isPending}>
              {updateConfig.isPending ? m.extract_settings_saving() : m.extract_settings_confirm_rerun()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

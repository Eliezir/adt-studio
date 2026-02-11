import { useState, useEffect } from "react"
import { Link } from "@tanstack/react-router"
import { Save, Play, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useBookConfig, useUpdateBookConfig } from "@/hooks/use-book-config"
import { useActiveConfig } from "@/hooks/use-debug"
import { ALL_TEXT_TYPES, ALL_SECTION_TYPES } from "@/lib/config-constants"

interface StoryboardSettingsSheetProps {
  label: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onRebuild: () => void
  isRebuilding: boolean
  pageCount?: number
}

export function StoryboardSettingsSheet({
  label,
  open,
  onOpenChange,
  onRebuild,
  isRebuilding,
  pageCount,
}: StoryboardSettingsSheetProps) {
  const { data: bookConfigData } = useBookConfig(label)
  const { data: activeConfigData } = useActiveConfig(label)
  const updateConfig = useUpdateBookConfig()

  const [minSide, setMinSide] = useState("")
  const [maxSide, setMaxSide] = useState("")
  const [prunedTextTypes, setPrunedTextTypes] = useState<Set<string>>(new Set())
  const [prunedSectionTypes, setPrunedSectionTypes] = useState<Set<string>>(new Set())
  const [configDirty, setConfigDirty] = useState(false)
  const [confirmingRebuild, setConfirmingRebuild] = useState(false)

  // Load book-level overrides when sheet opens
  useEffect(() => {
    if (!open || !bookConfigData) return
    const c = bookConfigData.config
    if (c.image_filters && typeof c.image_filters === "object") {
      const f = c.image_filters as Record<string, unknown>
      if (f.min_side != null) setMinSide(String(f.min_side))
      if (f.max_side != null) setMaxSide(String(f.max_side))
    }
    if (Array.isArray(c.pruned_text_types)) {
      setPrunedTextTypes(new Set(c.pruned_text_types as string[]))
    }
    if (Array.isArray(c.pruned_section_types)) {
      setPrunedSectionTypes(new Set(c.pruned_section_types as string[]))
    }
    setConfigDirty(false)
    setConfirmingRebuild(false)
  }, [open, bookConfigData])

  const getDefaultPrunedTextTypes = (): Set<string> => {
    if (!activeConfigData) return new Set()
    const arr = (activeConfigData.merged as Record<string, unknown>).pruned_text_types
    return Array.isArray(arr) ? new Set(arr as string[]) : new Set()
  }

  const getDefaultPrunedSectionTypes = (): Set<string> => {
    if (!activeConfigData) return new Set()
    const arr = (activeConfigData.merged as Record<string, unknown>).pruned_section_types
    return Array.isArray(arr) ? new Set(arr as string[]) : new Set()
  }

  const effectivePrunedTextTypes = configDirty ? prunedTextTypes : (
    bookConfigData?.config.pruned_text_types ? prunedTextTypes : getDefaultPrunedTextTypes()
  )
  const effectivePrunedSectionTypes = configDirty ? prunedSectionTypes : (
    bookConfigData?.config.pruned_section_types ? prunedSectionTypes : getDefaultPrunedSectionTypes()
  )

  const togglePrunedText = (t: string) => {
    setConfigDirty(true)
    setPrunedTextTypes((prev) => {
      const base = configDirty ? prev : (
        bookConfigData?.config.pruned_text_types ? prev : getDefaultPrunedTextTypes()
      )
      const next = new Set(base)
      if (next.has(t)) next.delete(t)
      else next.add(t)
      return next
    })
  }

  const togglePrunedSection = (t: string) => {
    setConfigDirty(true)
    setPrunedSectionTypes((prev) => {
      const base = configDirty ? prev : (
        bookConfigData?.config.pruned_section_types ? prev : getDefaultPrunedSectionTypes()
      )
      const next = new Set(base)
      if (next.has(t)) next.delete(t)
      else next.add(t)
      return next
    })
  }

  const buildOverrides = (): Record<string, unknown> => {
    const overrides: Record<string, unknown> = {}

    // Image filters
    const imageFilters: Record<string, unknown> = {}
    if (minSide.trim()) imageFilters.min_side = Number(minSide)
    if (maxSide.trim()) imageFilters.max_side = Number(maxSide)
    if (Object.keys(imageFilters).length > 0) overrides.image_filters = imageFilters

    // Pruned types
    if (configDirty || bookConfigData?.config.pruned_text_types) {
      overrides.pruned_text_types = Array.from(effectivePrunedTextTypes)
    }
    if (configDirty || bookConfigData?.config.pruned_section_types) {
      overrides.pruned_section_types = Array.from(effectivePrunedSectionTypes)
    }

    // Preserve existing book config fields we don't manage here
    if (bookConfigData?.config) {
      const bc = bookConfigData.config
      if (bc.editing_language) overrides.editing_language = bc.editing_language
      if (bc.output_languages) overrides.output_languages = bc.output_languages
      if (bc.book_format) overrides.book_format = bc.book_format
      if (bc.concurrency != null) overrides.concurrency = bc.concurrency
      if (bc.rate_limit) overrides.rate_limit = bc.rate_limit
      if (bc.metadata) overrides.metadata = bc.metadata
      if (bc.text_classification) overrides.text_classification = bc.text_classification
      if (bc.page_sectioning) overrides.page_sectioning = bc.page_sectioning
      if (bc.web_rendering) overrides.web_rendering = bc.web_rendering
    }

    return overrides
  }

  const handleSave = () => {
    const overrides = buildOverrides()
    updateConfig.mutate(
      { label, config: overrides },
      {
        onSuccess: () => {
          setConfigDirty(false)
          onOpenChange(false)
        },
      }
    )
  }

  const handleSaveAndRebuild = () => {
    if (!confirmingRebuild) {
      setConfirmingRebuild(true)
      return
    }
    const overrides = buildOverrides()
    updateConfig.mutate(
      { label, config: overrides },
      {
        onSuccess: () => {
          setConfigDirty(false)
          setConfirmingRebuild(false)
          onOpenChange(false)
          onRebuild()
        },
      }
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col overflow-hidden sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Storyboard Settings</SheetTitle>
          <SheetDescription>
            Adjust rendering settings for this book. Changes affect future pipeline runs.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto space-y-5 py-4">
          {/* Pruned Text Types */}
          <div>
            <h4 className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Pruned Text Types
            </h4>
            <p className="mb-2 text-xs text-muted-foreground">
              Pruned types are excluded from rendering.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {ALL_TEXT_TYPES.map((t) => {
                const pruned = effectivePrunedTextTypes.has(t)
                return (
                  <Badge
                    key={t}
                    variant={pruned ? "default" : "outline"}
                    className="cursor-pointer text-xs"
                    onClick={() => togglePrunedText(t)}
                  >
                    {t.replace(/_/g, " ")}
                  </Badge>
                )
              })}
            </div>
          </div>

          {/* Pruned Section Types */}
          <div>
            <h4 className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Pruned Section Types
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {ALL_SECTION_TYPES.map((t) => {
                const pruned = effectivePrunedSectionTypes.has(t)
                return (
                  <Badge
                    key={t}
                    variant={pruned ? "default" : "outline"}
                    className="cursor-pointer text-xs"
                    onClick={() => togglePrunedSection(t)}
                  >
                    {t.replace(/_/g, " ")}
                  </Badge>
                )
              })}
            </div>
          </div>

          {/* Image Filters */}
          <div>
            <h4 className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Image Filters
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Min Side (px)</Label>
                <Input
                  type="number"
                  min={1}
                  value={minSide}
                  onChange={(e) => { setMinSide(e.target.value); setConfigDirty(true) }}
                  placeholder="100"
                  className="w-24"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Max Side (px)</Label>
                <Input
                  type="number"
                  min={1}
                  value={maxSide}
                  onChange={(e) => { setMaxSide(e.target.value); setConfigDirty(true) }}
                  placeholder="5000"
                  className="w-24"
                />
              </div>
            </div>
          </div>

          {/* Advanced link */}
          <div className="pt-2 border-t">
            <Link
              to="/books/$label"
              params={{ label }}
              search={{ autoRun: undefined, startPage: undefined, endPage: undefined }}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Advanced settings
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>

        <SheetFooter className="border-t pt-4">
          {pageCount != null && pageCount > 0 && (
            <p className="text-xs text-amber-700 mb-2">
              Rebuilding will re-render all {pageCount} pages with the updated settings.
            </p>
          )}
          <div className="flex w-full items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              disabled={updateConfig.isPending}
            >
              <Save className="mr-1.5 h-3 w-3" />
              {updateConfig.isPending ? "Saving..." : "Save"}
            </Button>
            <Button
              size="sm"
              onClick={handleSaveAndRebuild}
              disabled={updateConfig.isPending || isRebuilding}
              variant={confirmingRebuild ? "destructive" : "default"}
            >
              <Play className="mr-1.5 h-3 w-3" />
              {confirmingRebuild ? "Confirm Rebuild" : "Save & Rebuild"}
            </Button>
            {confirmingRebuild && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmingRebuild(false)}
              >
                Cancel
              </Button>
            )}
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

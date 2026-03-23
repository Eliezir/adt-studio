import { useState } from "react"
import { createPortal } from "react-dom"
import { useNavigate } from "@tanstack/react-router"
import { Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useBookConfig, useUpdateBookConfig } from "@/hooks/use-book-config"
import { useActiveConfig } from "@/hooks/use-debug"
import { useApiKey } from "@/hooks/use-api-key"
import { api } from "@/api/client"
import { PromptViewer } from "@/components/pipeline/PromptViewer"
import { useBookRun } from "@/hooks/use-book-run"
import { useStepConfig } from "@/hooks/use-step-config"
import { useLingui } from "@lingui/react/macro"

export function TocSettings({ bookLabel, headerTarget }: { bookLabel: string; headerTarget?: HTMLDivElement | null }) {
  const { t } = useLingui()
  const { data: bookConfigData } = useBookConfig(bookLabel)
  const { data: activeConfigData } = useActiveConfig(bookLabel)
  const updateConfig = useUpdateBookConfig()
  const { apiKey, hasApiKey } = useApiKey()
  const { queueRun } = useBookRun()
  const navigate = useNavigate()
  const [showRerunDialog, setShowRerunDialog] = useState(false)
  const [generationPromptDraft, setGenerationPromptDraft] = useState<string | null>(null)

  const [dirty, setDirty] = useState<Record<string, boolean>>({})
  const markDirty = (field: string) => setDirty((prev) => ({ ...prev, [field]: true }))

  const merged = activeConfigData?.merged as Record<string, unknown> | undefined
  const tocGen = useStepConfig(merged, "toc_generation", markDirty)

  const shouldWrite = (field: string) =>
    dirty[field] || (bookConfigData?.config && field in bookConfigData.config)

  const buildOverrides = () => {
    const overrides: Record<string, unknown> = {}
    if (bookConfigData?.config) Object.assign(overrides, bookConfigData.config)

    if (shouldWrite("toc_generation")) {
      const existing = (bookConfigData?.config?.toc_generation ?? {}) as Record<string, unknown>
      overrides.toc_generation = { ...existing, ...tocGen.configOverrides }
    }
    return overrides
  }

  const confirmSaveAndRerun = async () => {
    if (generationPromptDraft != null) {
      await api.updatePrompt("toc_generation", generationPromptDraft, bookLabel)
    }

    const overrides = buildOverrides()
    updateConfig.mutate(
      { label: bookLabel, config: overrides },
      {
        onSuccess: async () => {
          setDirty({})
          setGenerationPromptDraft(null)
          setShowRerunDialog(false)
          queueRun({ fromStage: "toc", toStage: "toc", apiKey })
          navigate({ to: "/books/$label/$step", params: { label: bookLabel, step: "toc" } })
        },
      },
    )
  }

  return (
    <div className="h-full max-w-4xl">
      <PromptViewer
        promptName="toc_generation"
        bookLabel={bookLabel}
        title={t`TOC Generation Prompt`}
        description={t`The prompt template used to generate the table of contents from book headings.`}
        model={tocGen.model}
        onModelChange={tocGen.onModelChange}
        maxRetries={tocGen.maxRetries}
        onMaxRetriesChange={tocGen.onMaxRetriesChange}
        onContentChange={setGenerationPromptDraft}
      />

      {headerTarget && createPortal(
        <Button
          size="sm"
          className="h-7 px-2.5 text-xs bg-black/15 text-white hover:bg-black/25"
          onClick={() => setShowRerunDialog(true)}
          disabled={updateConfig.isPending || !hasApiKey}
        >
          <Play className="mr-1.5 h-3.5 w-3.5" />
          {t`Save & Rerun`}
        </Button>,
        headerTarget,
      )}

      <Dialog open={showRerunDialog} onOpenChange={setShowRerunDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t`Save & Rerun TOC Generation`}</DialogTitle>
            <DialogDescription>
              {t`This will save your settings and re-generate the table of contents.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRerunDialog(false)}>
              {t`Cancel`}
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

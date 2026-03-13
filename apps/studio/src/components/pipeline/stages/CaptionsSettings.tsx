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
import * as m from "@/paraglide/messages"

export function CaptionsSettings({ bookLabel, headerTarget }: { bookLabel: string; headerTarget?: HTMLDivElement | null; tab?: string }) {
  const { data: bookConfigData } = useBookConfig(bookLabel)
  const { data: activeConfigData } = useActiveConfig(bookLabel)
  const updateConfig = useUpdateBookConfig()
  const { apiKey, hasApiKey } = useApiKey()
  const { queueRun } = useBookRun()
  const navigate = useNavigate()
  const [showRerunDialog, setShowRerunDialog] = useState(false)
  const [promptDraft, setPromptDraft] = useState<string | null>(null)

  const [dirty, setDirty] = useState<Record<string, boolean>>({})
  const markDirty = (field: string) => setDirty((prev) => ({ ...prev, [field]: true }))

  const merged = activeConfigData?.merged as Record<string, unknown> | undefined
  const caption = useStepConfig(merged, "image_captioning", markDirty)

  const shouldWrite = (field: string) =>
    dirty[field] || (bookConfigData?.config && field in bookConfigData.config)

  const buildOverrides = () => {
    const overrides: Record<string, unknown> = {}
    if (bookConfigData?.config) Object.assign(overrides, bookConfigData.config)

    if (shouldWrite("image_captioning")) {
      const existing = (bookConfigData?.config?.image_captioning ?? {}) as Record<string, unknown>
      overrides.image_captioning = { ...existing, ...caption.configOverrides }
    }
    return overrides
  }

  const confirmSaveAndRerun = async () => {
    const promptSaves: Promise<unknown>[] = []
    if (promptDraft != null) promptSaves.push(api.updatePrompt("image_captioning", promptDraft, bookLabel))
    if (promptSaves.length > 0) await Promise.all(promptSaves)

    const overrides = buildOverrides()
    updateConfig.mutate(
      { label: bookLabel, config: overrides },
      {
        onSuccess: async () => {
          setDirty({})
          setPromptDraft(null)
          setShowRerunDialog(false)
          queueRun({ fromStage: "captions", toStage: "captions", apiKey })
          navigate({ to: "/books/$label/$step", params: { label: bookLabel, step: "captions" } })
        },
      }
    )
  }

  return (
    <div className="h-full max-w-4xl">
      <PromptViewer
        promptName="image_captioning"
        bookLabel={bookLabel}
        title={m.captions_settings_prompt_title()}
        description={m.captions_settings_prompt_desc()}
        model={caption.model}
        onModelChange={caption.onModelChange}
        maxRetries={caption.maxRetries}
        onMaxRetriesChange={caption.onMaxRetriesChange}
        onContentChange={setPromptDraft}
      />

      {headerTarget && createPortal(
        <Button
          size="sm"
          className="h-7 px-2.5 text-xs bg-black/15 text-white hover:bg-black/25"
          onClick={() => setShowRerunDialog(true)}
          disabled={updateConfig.isPending || !hasApiKey}
        >
          <Play className="mr-1.5 h-3.5 w-3.5" />
          {m.captions_settings_save_rerun()}
        </Button>,
        headerTarget
      )}

      <Dialog open={showRerunDialog} onOpenChange={setShowRerunDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{m.captions_settings_save_rerun_title()}</DialogTitle>
            <DialogDescription>
              {m.captions_settings_save_rerun_desc()}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRerunDialog(false)}>
              {m.captions_settings_cancel()}
            </Button>
            <Button onClick={confirmSaveAndRerun} disabled={updateConfig.isPending}>
              {updateConfig.isPending ? m.captions_settings_saving() : m.captions_settings_confirm_rerun()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

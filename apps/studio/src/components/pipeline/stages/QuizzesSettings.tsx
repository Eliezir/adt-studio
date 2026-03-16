import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { useNavigate } from "@tanstack/react-router"
import { Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { getSectionTypeDescKey, getSectionTypeLabelKey } from "@/lib/section-constants"

function getSectionTypeDisplayLabel(value: string): string {
  const labelKey = getSectionTypeLabelKey(value)
  if (labelKey && labelKey in m) return (m as unknown as Record<string, () => string>)[labelKey]()
  return value.replace(/_/g, " ")
}

function getSectionTypeDisplayDescription(value: string, configDesc: string): string {
  const descKey = getSectionTypeDescKey(value)
  if (descKey && descKey in m) return (m as unknown as Record<string, () => string>)[descKey]()
  return configDesc
}

export function QuizzesSettings({ bookLabel, headerTarget, tab = "general" }: { bookLabel: string; headerTarget?: HTMLDivElement | null; tab?: string }) {
  const { data: bookConfigData } = useBookConfig(bookLabel)
  const { data: activeConfigData } = useActiveConfig(bookLabel)
  const updateConfig = useUpdateBookConfig()
  const { apiKey, hasApiKey } = useApiKey()
  const { queueRun } = useBookRun()
  const navigate = useNavigate()
  const [showRerunDialog, setShowRerunDialog] = useState(false)

  const [pagesPerQuiz, setPagesPerQuiz] = useState("")
  const [promptDraft, setPromptDraft] = useState<string | null>(null)
  const [sectionTypes, setSectionTypes] = useState<Record<string, string>>({})
  const [quizSectionTypes, setQuizSectionTypes] = useState<Set<string>>(new Set())

  const [dirty, setDirty] = useState<Record<string, boolean>>({})
  const markDirty = (field: string) => setDirty((prev) => ({ ...prev, [field]: true }))

  const merged = activeConfigData?.merged as Record<string, unknown> | undefined
  const quiz = useStepConfig(merged, "quiz_generation", markDirty)

  useEffect(() => {
    if (!activeConfigData) return
    setSectionTypes({})
    setQuizSectionTypes(new Set())
    const m = activeConfigData.merged as Record<string, unknown>
    if (m.quiz_generation && typeof m.quiz_generation === "object") {
      const qg = m.quiz_generation as Record<string, unknown>
      if (qg.pages_per_quiz != null) setPagesPerQuiz(String(qg.pages_per_quiz))
      if (Array.isArray(qg.quiz_section_types)) {
        setQuizSectionTypes(new Set(qg.quiz_section_types as string[]))
      }
    }
    if (m.section_types && typeof m.section_types === "object") {
      const all = m.section_types as Record<string, string>
      const disabled = new Set(Array.isArray(m.disabled_section_types) ? m.disabled_section_types as string[] : [])
      setSectionTypes(Object.fromEntries(Object.entries(all).filter(([k]) => !disabled.has(k))))
    }
  }, [activeConfigData])

  const toggleQuizSectionType = (key: string) => {
    markDirty("quiz_generation")
    markDirty("quiz_section_types")
    setQuizSectionTypes((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const shouldWrite = (field: string) =>
    dirty[field] || (bookConfigData?.config && field in bookConfigData.config)

  const buildOverrides = () => {
    const overrides: Record<string, unknown> = {}
    if (bookConfigData?.config) Object.assign(overrides, bookConfigData.config)

    if (shouldWrite("quiz_generation")) {
      const existing = (bookConfigData?.config?.quiz_generation ?? {}) as Record<string, unknown>
      const nextQuizGeneration: Record<string, unknown> = {
        ...existing,
        ...quiz.configOverrides,
        pages_per_quiz: pagesPerQuiz ? Number(pagesPerQuiz) : undefined,
      }
      if (dirty.quiz_section_types || "quiz_section_types" in existing) {
        nextQuizGeneration.quiz_section_types = Array.from(quizSectionTypes)
      }
      overrides.quiz_generation = nextQuizGeneration
    }
    return overrides
  }

  const confirmSaveAndRerun = async () => {
    const promptSaves: Promise<unknown>[] = []
    if (promptDraft != null) promptSaves.push(api.updatePrompt("quiz_generation", promptDraft, bookLabel))
    if (promptSaves.length > 0) await Promise.all(promptSaves)

    const overrides = buildOverrides()
    updateConfig.mutate(
      { label: bookLabel, config: overrides },
      {
        onSuccess: async () => {
          setDirty({})
          setPromptDraft(null)
          setShowRerunDialog(false)
          queueRun({ fromStage: "quizzes", toStage: "quizzes", apiKey })
          navigate({ to: "/books/$label/$step", params: { label: bookLabel, step: "quizzes" } })
        },
      }
    )
  }

  const sectionTypeKeys = Object.keys(sectionTypes).filter((k) => !k.startsWith("activity_"))

  return (
    <div className={tab === "prompt" ? "h-full max-w-4xl" : "p-4 max-w-2xl space-y-6"}>
      {tab === "general" && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs">{m.quizzes_settings_pages_per_quiz()}</Label>
            <Input
              type="number"
              min={1}
              value={pagesPerQuiz}
              onChange={(e) => { setPagesPerQuiz(e.target.value); markDirty("quiz_generation") }}
              placeholder="3"
              className="w-32 h-8 text-xs"
            />
            <p className="text-xs text-muted-foreground">
              {m.quizzes_settings_pages_per_quiz_hint()}
            </p>
          </div>

          {sectionTypeKeys.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs">{m.quizzes_settings_section_types()}</Label>
              <p className="text-xs text-muted-foreground">
                {m.quizzes_settings_section_types_hint()}
              </p>
              <div className="rounded-md border divide-y">
                {sectionTypeKeys.map((key) => {
                  const checked = quizSectionTypes.has(key)
                  return (
                    <label
                      key={key}
                      className="flex items-center gap-2.5 px-3 py-1.5 cursor-pointer hover:bg-muted/50 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleQuizSectionType(key)}
                        className="h-3.5 w-3.5 rounded border-border accent-primary"
                      />
                      <span className="text-xs font-mono">{getSectionTypeDisplayLabel(key)}</span>
                      <span className="text-xs text-muted-foreground truncate">
                        {getSectionTypeDisplayDescription(key, sectionTypes[key])}
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      {tab === "prompt" && (
        <PromptViewer
          promptName="quiz_generation"
          bookLabel={bookLabel}
          title={m.quizzes_settings_prompt_title()}
          description={m.quizzes_settings_prompt_desc()}
          model={quiz.model}
          onModelChange={quiz.onModelChange}
          maxRetries={quiz.maxRetries}
          onMaxRetriesChange={quiz.onMaxRetriesChange}
          onContentChange={setPromptDraft}
          enabled={tab === "prompt"}
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
          {m.quizzes_settings_save_rerun()}
        </Button>,
        headerTarget
      )}

      <Dialog open={showRerunDialog} onOpenChange={setShowRerunDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{m.quizzes_settings_save_rerun_title()}</DialogTitle>
            <DialogDescription>
              {m.quizzes_settings_save_rerun_desc()}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRerunDialog(false)}>
              {m.quizzes_settings_cancel()}
            </Button>
            <Button onClick={confirmSaveAndRerun} disabled={updateConfig.isPending}>
              {updateConfig.isPending ? m.quizzes_settings_saving() : m.quizzes_settings_confirm_rerun()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

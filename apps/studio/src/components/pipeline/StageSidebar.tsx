import { useState, useEffect, useRef, useCallback } from "react"
import { createPortal } from "react-dom"
import { Link, useMatchRoute, useSearch } from "@tanstack/react-router"
import {
  Loader2,
  RotateCcw,
  Settings,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Trans, useLingui } from "@lingui/react"
import { msg } from "@lingui/core/macro"
import type { MessageDescriptor } from "@lingui/core"
import { Button } from "@/components/ui/button"
import { useBookRun } from "@/hooks/use-book-run"
import { useBookTasks } from "@/hooks/use-book-tasks"
import { StepProgressRing } from "./StepProgressRing"
import { usePages, usePageImage } from "@/hooks/use-pages"
import {
  STAGES,
  hasStagePages,
  toCamelLabel,
} from "./stage-config"
import { useSettingsDialog } from "@/routes/__root"
import type { TaskInfoResponse } from "@/api/client"
import { getStageLabelI18n } from "./pipeline-i18n"

const SETTINGS_TAB_MESSAGE: Record<string, MessageDescriptor> = {
  general: msg`General`,
  "text-types": msg`Text Types`,
  "metadata-prompt": msg`Metadata Prompt`,
  prompt: msg`Extraction Prompt`,
  "meaningfulness-prompt": msg`Meaningfulness Prompt`,
  "cropping-prompt": msg`Cropping Prompt`,
  "segmentation-prompt": msg`Segmentation Prompt`,
  "book-summary-prompt": msg`Summary Prompt`,
  "sectioning-prompt": msg`Sectioning Mode`,
  "rendering-prompt": msg`AI Rendering`,
  "rendering-template": msg`Template Rendering`,
  "activity-prompts": msg`Activity Rendering`,
  "image-generation": msg`Image Generation`,
  "quiz-prompt": msg`Quiz Prompt`,
  "glossary-prompt": msg`Glossary Prompt`,
  "caption-prompt": msg`Caption Prompt`,
  languages: msg`Languages`,
  "translation-prompt": msg`Translation Prompt`,
  speech: msg`Speech`,
  "speech-prompts": msg`Speech Prompts`,
  voices: msg`Voices`,
  "toc-prompt": msg`Generation Prompt`,
}

function getSettingsTabs(
  slug: string,
  i18n: ReturnType<typeof useLingui>["i18n"],
): { key: string; label: string }[] | undefined {
  const tabs: Record<string, { key: string; label: string }[]> = {
    extract: [
      { key: "general", label: i18n._(SETTINGS_TAB_MESSAGE.general) },
      { key: "text-types", label: i18n._(SETTINGS_TAB_MESSAGE["text-types"]) },
      { key: "metadata-prompt", label: i18n._(SETTINGS_TAB_MESSAGE["metadata-prompt"]) },
      { key: "prompt", label: i18n._(SETTINGS_TAB_MESSAGE.prompt) },
      { key: "meaningfulness-prompt", label: i18n._(SETTINGS_TAB_MESSAGE["meaningfulness-prompt"]) },
      { key: "cropping-prompt", label: i18n._(SETTINGS_TAB_MESSAGE["cropping-prompt"]) },
      { key: "segmentation-prompt", label: i18n._(SETTINGS_TAB_MESSAGE["segmentation-prompt"]) },
      { key: "book-summary-prompt", label: i18n._(SETTINGS_TAB_MESSAGE["book-summary-prompt"]) },
    ],
    storyboard: [
      { key: "general", label: i18n._(SETTINGS_TAB_MESSAGE.general) },
      { key: "sectioning-prompt", label: i18n._(SETTINGS_TAB_MESSAGE["sectioning-prompt"]) },
      { key: "rendering-prompt", label: i18n._(SETTINGS_TAB_MESSAGE["rendering-prompt"]) },
      { key: "rendering-template", label: i18n._(SETTINGS_TAB_MESSAGE["rendering-template"]) },
      { key: "activity-prompts", label: i18n._(SETTINGS_TAB_MESSAGE["activity-prompts"]) },
      { key: "image-generation", label: i18n._(SETTINGS_TAB_MESSAGE["image-generation"]) },
    ],
    quizzes: [
      { key: "general", label: i18n._(SETTINGS_TAB_MESSAGE.general) },
      { key: "prompt", label: i18n._(SETTINGS_TAB_MESSAGE["quiz-prompt"]) },
    ],
    glossary: [
      { key: "general", label: i18n._(SETTINGS_TAB_MESSAGE["glossary-prompt"]) },
    ],
    toc: [
      { key: "general", label: i18n._(SETTINGS_TAB_MESSAGE["toc-prompt"]) },
    ],
    captions: [
      { key: "general", label: i18n._(SETTINGS_TAB_MESSAGE["caption-prompt"]) },
    ],
    "text-and-speech": [
      { key: "general", label: i18n._(SETTINGS_TAB_MESSAGE.languages) },
      { key: "prompt", label: i18n._(SETTINGS_TAB_MESSAGE["translation-prompt"]) },
      { key: "speech", label: i18n._(SETTINGS_TAB_MESSAGE.speech) },
      { key: "speech-prompts", label: i18n._(SETTINGS_TAB_MESSAGE["speech-prompts"]) },
      { key: "voices", label: i18n._(SETTINGS_TAB_MESSAGE.voices) },
    ],
  }
  return tabs[slug]
}

export function StageSidebar({
  bookLabel,
  activeStep,
  selectedPageId,
  onSelectPage,
  sectionIndex,
  onSelectSection,
}: {
  bookLabel: string
  activeStep: string
  selectedPageId?: string
  onSelectPage?: (pageId: string | null) => void
  sectionIndex?: number
  onSelectSection?: (index: number) => void
}) {
  const { i18n } = useLingui()
  const matchRoute = useMatchRoute()
  const search = useSearch({ strict: false }) as { tab?: string }
  const { stageState } = useBookRun()
  const { openSettings } = useSettingsDialog()

  const effectivePagesOpen =
    hasStagePages(activeStep) &&
    stageState(activeStep) === "done"

  const isSettings = !!matchRoute({
    to: "/books/$label/$step/settings",
    params: { label: bookLabel, step: activeStep },
  })
  const activeTab = search.tab ?? "general"

  // The rail collapses (icon-only, hover to expand) only when pages are showing
  // and we're not in settings. Otherwise it's always expanded with labels visible.
  const railCollapsed = effectivePagesOpen && !isSettings
  // When the rail is collapsed, labels/buttons are always in the DOM but clipped
  // by overflow-hidden on the inner panel. This avoids display toggling which
  // would flash before the width transition completes.
  const x = {
    gap:       "gap-2.5",
    showLabel: "inline",
    showFlex:  "flex",
    flex1:     "flex-1",
  }

  const storyboardDone = stageState("storyboard") === "done"

  const stageItems = STAGES.map((step, index) => {
    const isActive = step.slug === activeStep
    const Icon = step.icon
    const settingsTabs = getSettingsTabs(step.slug, i18n)
    const showSubTabs = isActive && isSettings && !!settingsTabs
    const state = stageState(step.slug)
    const stageCompleted = state === "done"
    const ringState = state

    // "book" is always filled; "preview" and "export" fill once storyboard is done;
    // pipeline stages fill when their own stage is completed.
    const iconFilled =
      step.slug === "book"
        ? true
        : step.slug === "preview" || step.slug === "export"
          ? storyboardDone
          : stageCompleted

    const stepLabel = step.slug === "book" ? toCamelLabel(bookLabel) : getStageLabelI18n(step.slug)

    return (
      <div key={step.slug} className="relative">
        {/* Connector line */}
        {index < STAGES.length - 1 && (
          <div className="absolute left-[24px] top-[36px] bottom-[-10px] w-0.5 bg-border z-10" />
        )}

        {/* Step row */}
        <div
          className={cn(
            "group/row flex items-center py-2 text-sm transition-colors overflow-hidden",
            x.gap,
            isActive
              ? cn(step.color, "text-white font-medium rounded-l-[14px] ml-0.5 pl-2 pr-2.5")
              : "text-muted-foreground hover:text-foreground hover:bg-muted px-2.5"
          )}
        >
          <Link
            to={selectedPageId && hasStagePages(step.slug) ? "/books/$label/$step/$pageId" : "/books/$label/$step"}
            params={selectedPageId && hasStagePages(step.slug)
              ? { label: bookLabel, step: step.slug, pageId: selectedPageId }
              : { label: bookLabel, step: step.slug }}
            className={cn("flex items-center gap-2.5 min-w-7", x.flex1)}
            title={stepLabel}
          >
            <div className="relative shrink-0">
              <div
                className={cn(
                  "flex items-center justify-center w-7 h-7 rounded-full transition-colors",
                  iconFilled
                    ? isActive
                      ? "bg-white/20 text-white"
                      : cn(step.color, "text-white")
                    : "bg-muted text-muted-foreground ring-1 ring-border"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
              </div>
              <StepProgressRing size={28} state={ringState} colorClass={isActive ? "bg-white" : step.color} />
            </div>
            <span className={cn("truncate hidden", x.showLabel)}>
              {stepLabel}
            </span>
          </Link>

          {settingsTabs ? (
            <Link
              to="/books/$label/$step/settings"
              params={{ label: bookLabel, step: step.slug }}
              search={{ tab: "general" }}
              title={`${stepLabel} ${i18n._("Settings")}`}
              className={cn(
                "shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full transition-colors ",
                isActive
                  ? "text-white/60 hover:text-white hover:bg-white/20"
                  : "opacity-0 group-hover/row:opacity-100 text-muted-foreground/50 group-hover/row:bg-muted hover:text-foreground hover:bg-muted-foreground/20"
              )}
            >
              <Settings className="w-3.5 h-3.5" />
            </Link>
          ) : step.slug === "book" ? (
            <button
              type="button"
              onClick={openSettings}
              title={i18n._("API Key Settings")}
              className={cn(
                "shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full transition-colors cursor-pointer",
                isActive
                  ? "text-white/60 hover:text-white hover:bg-white/20"
                  : "opacity-0 group-hover/row:opacity-100 text-muted-foreground/50 group-hover/row:bg-muted hover:text-foreground hover:bg-muted-foreground/20"
              )}
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          ) : step.slug === "preview" ? (
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent("adt:repackage"))}
              title={i18n._("Re-package ADT")}
              className={cn(
                "shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full transition-colors cursor-pointer",
                isActive
                  ? "text-white/60 hover:text-white hover:bg-white/20"
                  : "opacity-0 group-hover/row:opacity-100 text-muted-foreground/50 group-hover/row:bg-muted hover:text-foreground hover:bg-muted-foreground/20"
              )}
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          ) : null}
        </div>

        {/* Settings sub-tabs */}
        {showSubTabs && (
          <div className={cn("ml-[42px] mr-2 mt-0.5 mb-1 flex-col gap-0.5 hidden", x.showFlex)}>
            {settingsTabs!.map((tab) => (
              <Button
                key={tab.key}
                variant="ghost"
                size="sm"
                asChild
                className={cn(
                  "h-auto justify-start rounded text-xs px-2 py-1 whitespace-nowrap",
                  activeTab === tab.key
                    ? cn(step.textColor, "font-medium", step.bgLight)
                    : "font-normal text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <Link
                  to="/books/$label/$step/settings"
                  params={{ label: bookLabel, step: step.slug }}
                  search={{ tab: tab.key }}
                >
                  {tab.label}
                </Link>
              </Button>
            ))}
          </div>
        )}
      </div>
    )
  })

  return (
    <nav className="flex flex-col flex-1 min-h-0">
      <div className="flex flex-1 min-h-0">
        {/* Stage rail */}
        <div className={cn(
          "shrink-0 relative group/rail",
          railCollapsed ? "w-12" : "flex-1"
        )}>
          <div className={cn(
            "absolute inset-y-0 left-0 flex flex-col bg-background overflow-hidden",
            railCollapsed
              ? "w-12 group-hover/rail:w-[220px] z-20 transition-[width] duration-150 delay-150 group-hover/rail:delay-100 group-hover/rail:shadow-lg"
              : "inset-x-0"
          )}>
            <div className="flex flex-col pt-1.5 pb-2 gap-0.5 flex-1 overflow-y-auto overflow-x-hidden">
              {stageItems}
            </div>
            {/* Task indicator */}
            <TaskIndicator bookLabel={bookLabel} />
            {/* Right edge — follows the expanding rail */}
            <div className="absolute inset-y-0 right-0 w-px border-r" />
          </div>
        </div>

        {/* Pages panel — only when pages are open and not in settings */}
        {effectivePagesOpen && !isSettings && (
          <div className="flex-1 min-w-0 flex flex-col overflow-hidden border-l">
            <div className="flex-1 overflow-y-auto">
              <PageIndex
                bookLabel={bookLabel}
                activeStep={activeStep}
                selectedPageId={selectedPageId}
                onSelectPage={onSelectPage}
                sectionIndex={sectionIndex}
                onSelectSection={onSelectSection}
              />
            </div>
          </div>
        )}
      </div>

    </nav>
  )
}

/* ---------- TaskIndicator ---------- */

const TASK_KIND_LABELS: Record<string, string> = {
  "package-adt": "Packaging",
  "image-generate": "Image Gen",
  "re-render": "Re-render",
  "ai-edit": "AI Edit",
}

function TaskIndicator({ bookLabel }: { bookLabel: string }) {
  const { runningTasks, runningCount } = useBookTasks(bookLabel)

  if (runningCount === 0) return null

  return (
    <div className="border-t group/tasks">
      {/* Task list — visible on hover */}
      <div className="hidden group-hover/tasks:block px-2 pt-1.5 pb-0.5 flex-col gap-0.5">
        {runningTasks.map((task) => (
          <TaskRow key={task.taskId} task={task} />
        ))}
      </div>

      {/* Indicator row */}
      <div className="flex items-center gap-2.5 px-2.5 py-2 overflow-hidden">
        <div className="relative shrink-0 flex items-center justify-center w-7 h-7">
          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-violet-600 text-white">
            <span className="text-xs font-bold leading-none">{runningCount}</span>
          </div>
          <StepProgressRing size={28} state="running" colorClass="bg-violet-600" />
        </div>
        <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
          {runningCount === 1 ? "Task" : "Tasks"} Running
        </span>
      </div>
    </div>
  )
}

function TaskRow({ task }: { task: TaskInfoResponse }) {
  const kindLabel = TASK_KIND_LABELS[task.kind] ?? task.kind
  const [, tick] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => tick((n) => n + 1), 1000)
    return () => window.clearInterval(id)
  }, [])
  const elapsed = task.startedAt ? Math.round((Date.now() - task.startedAt) / 1000) : 0
  const elapsedStr = elapsed < 60 ? `${elapsed}s` : `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`

  const content = (
    <>
      <Loader2 className="w-3 h-3 animate-spin text-violet-500 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{kindLabel}</p>
        <p className="text-[10px] text-muted-foreground truncate">{task.description}</p>
      </div>
      <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">{elapsedStr}</span>
    </>
  )

  if (task.url) {
    return (
      <Link to={task.url} className="flex items-center gap-2 px-1 py-1 rounded hover:bg-muted/50 transition-colors">
        {content}
      </Link>
    )
  }

  return (
    <div className="flex items-center gap-2 px-1 py-1">
      {content}
    </div>
  )
}

/* ---------- PageIndex ---------- */

function PageIndex({
  bookLabel,
  activeStep,
  selectedPageId,
  onSelectPage,
  sectionIndex,
  onSelectSection,
}: {
  bookLabel: string
  activeStep: string
  selectedPageId?: string
  onSelectPage?: (pageId: string) => void
  sectionIndex?: number
  onSelectSection?: (index: number) => void
}) {
  const { data: pages } = usePages(bookLabel)
  const activeStepDef = STAGES.find((s) => s.slug === activeStep)

  if (!pages?.length) {
    return (
      <div className="px-3 py-4 text-xs text-muted-foreground text-center">
        <Trans id="No pages extracted yet" />
      </div>
    )
  }

  return (
    <div className="flex flex-col py-1">
      {pages.map((page) => {
        const isActive = page.pageId === selectedPageId
        return (
          <PageRow
            key={page.pageId}
            bookLabel={bookLabel}
            page={page}
            isActive={isActive}
            activeStepDef={activeStepDef}
            onSelect={() => onSelectPage?.(page.pageId)}
            sectionIndex={isActive ? sectionIndex : undefined}
            onSelectSection={isActive ? onSelectSection : undefined}
          />
        )
      })}
    </div>
  )
}

/* ---------- PageRow ---------- */

function PageRow({
  bookLabel,
  page,
  isActive,
  activeStepDef,
  onSelect,
  sectionIndex,
  onSelectSection,
}: {
  bookLabel: string
  page: { pageId: string; textPreview: string; pageNumber: number; sectionCount: number; prunedSections?: number[] }
  isActive: boolean
  activeStepDef?: (typeof STAGES)[number]
  onSelect: () => void
  sectionIndex?: number
  onSelectSection?: (index: number) => void
}) {
  const { i18n } = useLingui()
  const { data, isLoading } = usePageImage(bookLabel, page.pageId)
  const [showPreview, setShowPreview] = useState(false)
  const [previewPos, setPreviewPos] = useState({ top: 0, left: 0 })
  const rowRef = useRef<HTMLButtonElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null)

  const handleEnter = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      if (!rowRef.current) return
      const rect = rowRef.current.getBoundingClientRect()
      const previewH = 400
      const previewW = 300
      const gap = 20
      const margin = 8
      const top = Math.max(margin, Math.min(rect.top, window.innerHeight - previewH - margin))
      const rightEdge = window.innerWidth - margin
      const rightSideLeft = rect.right + gap
      const leftSideLeft = rect.left - previewW - gap
      const unclampedLeft =
        rightSideLeft + previewW <= rightEdge
          ? rightSideLeft
          : leftSideLeft
      const left = Math.max(margin, Math.min(unclampedLeft, rightEdge - previewW))
      setPreviewPos({ top, left })
      setShowPreview(true)
    }, 600)
  }, [])

  const handleLeave = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setShowPreview(false)
  }, [])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const imgSrc = data?.imageBase64 ? `data:image/png;base64,${data.imageBase64}` : null

  const showSections = isActive && page.sectionCount > 1 && onSelectSection

  return (
    <div>
      <button
        ref={rowRef}
        type="button"
        onClick={onSelect}
        className={cn(
          "flex items-start gap-2 px-2 py-1.5 text-left transition-colors w-full",
          isActive
            ? cn(activeStepDef?.bgLight ?? "bg-violet-50", activeStepDef?.textColor ?? "text-violet-600", "font-medium")
            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
        )}
      >
        {isLoading || !imgSrc ? (
          <div className="shrink-0 w-16 h-12 bg-muted rounded ring-1 ring-border" />
        ) : (
          <img
            src={imgSrc}
            alt=""
            onMouseEnter={handleEnter}
            onMouseLeave={handleLeave}
            className="shrink-0 w-16 h-12 rounded object-cover object-center ring-1 ring-border"
          />
        )}
        <div className="flex flex-col gap-0.5 min-w-0 flex-1 pt-0.5">
          <span className="text-[11px] leading-snug line-clamp-2">
            {page.textPreview || i18n._("Untitled")}
          </span>
          <span className="text-[9px] font-mono opacity-50 leading-none">
            {`pg ${String(page.pageNumber)}`}
            {page.sectionCount > 1 && (
              <span className="ml-1 inline-flex items-center justify-center min-w-[14px] h-[12px] px-0.5 rounded bg-black/10 text-[8px] font-semibold not-italic leading-none">
                {page.sectionCount}
              </span>
            )}
          </span>
        </div>
        {showPreview && imgSrc && createPortal(
          <div
            className="fixed z-50 pointer-events-none animate-in fade-in duration-150"
            style={{ top: previewPos.top, left: previewPos.left }}
          >
            <img
              src={imgSrc}
              alt=""
              className="h-[400px] w-auto rounded-lg shadow-xl ring-1 ring-border"
            />
          </div>,
          document.body
        )}
      </button>
      {showSections && (
        <div className={cn(
          "flex flex-wrap gap-0.5 px-2 pb-1.5 -mt-0.5",
          activeStepDef?.bgLight ?? "bg-violet-50"
        )}>
          {Array.from({ length: page.sectionCount }, (_, i) => {
            const pruned = page.prunedSections?.includes(i)
            return (
              <button
                key={i}
                type="button"
                onClick={() => onSelectSection(i)}
                className={cn(
                  "flex items-center justify-center min-w-[18px] h-[18px] px-0.5 rounded text-[9px] font-medium transition-colors",
                  i === (sectionIndex ?? 0)
                    ? cn(activeStepDef?.color ?? "bg-violet-600", pruned ? "text-white/50 line-through" : "text-white")
                    : pruned ? "bg-black/5 text-black/20 line-through hover:bg-black/10 hover:text-black/40" : "bg-black/5 text-black/40 hover:bg-black/10 hover:text-black/60"
                )}
                title={pruned ? `Section ${String(i + 1)} (pruned)` : `Section ${String(i + 1)}`}
              >
                {i + 1}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

import { useState, useEffect, useRef, useCallback } from "react"
import { Check, ChevronDown, ChevronRight, ChevronLeft, ExternalLink, Loader2, Plus, Trash2 } from "lucide-react"
import { useQueryClient, useQuery } from "@tanstack/react-query"
import { useLingui } from "@lingui/react/macro"
import { api } from "@/api/client"
import type { TocGenerationOutput, TocEntry, TocSection, VersionEntry } from "@/api/client"
import { useToc } from "@/hooks/use-toc"
import { useStepHeader } from "../StepViewRouter"
import { useBookRun } from "@/hooks/use-book-run"
import { useApiKey } from "@/hooks/use-api-key"
import { StageRunCard } from "../StageRunCard"

type TocData = Omit<TocGenerationOutput, "version">

function VersionPicker({
  currentVersion,
  saving,
  dirty,
  bookLabel,
  onPreview,
  onSave,
  onDiscard,
}: {
  currentVersion: number | null
  saving: boolean
  dirty: boolean
  bookLabel: string
  onPreview: (data: unknown) => void
  onSave: () => void
  onDiscard: () => void
}) {
  const { t } = useLingui()
  const [open, setOpen] = useState(false)
  const [versions, setVersions] = useState<VersionEntry[] | null>(null)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open])

  const handleOpen = async () => {
    if (saving || currentVersion == null) return
    setOpen(true)
    setLoading(true)
    const res = await api.getVersionHistory(bookLabel, "toc-generation", "book", true)
    setVersions(res.versions)
    setLoading(false)
  }

  const handlePick = (v: VersionEntry) => {
    if (v.version === currentVersion && !dirty) {
      setOpen(false)
      return
    }
    setOpen(false)
    onPreview(v.data)
  }

  if (saving) {
    return <Loader2 className="h-3 w-3 animate-spin" />
  }

  if (currentVersion == null) return null

  if (dirty) {
    return (
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onDiscard}
          className="text-[10px] font-medium rounded px-2 py-0.5 bg-black/15 text-black hover:bg-black/25 cursor-pointer transition-colors"
        >
          {t`Discard`}
        </button>
        <button
          type="button"
          onClick={onSave}
          className="flex items-center gap-1 text-[10px] font-medium rounded px-2 py-0.5 bg-white text-green-800 hover:bg-white/80 cursor-pointer transition-colors"
        >
          <Check className="h-3 w-3" />
          {t`Save`}
        </button>
      </div>
    )
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={handleOpen}
        className="flex items-center gap-0.5 text-[10px] font-normal normal-case tracking-normal bg-white/20 text-white hover:bg-white/30 rounded px-1.5 py-0.5 transition-colors"
      >
        v{currentVersion}
        <ChevronDown className="h-2.5 w-2.5" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 bg-popover border rounded shadow-md min-w-[80px] py-1">
          {loading ? (
            <div className="flex items-center justify-center py-2 px-3">
              <Loader2 className="h-3 w-3 animate-spin" />
            </div>
          ) : versions && versions.length > 0 ? (
            versions.map((v) => (
              <button
                key={v.version}
                type="button"
                onClick={() => handlePick(v)}
                className={`w-full text-left px-3 py-1 text-xs hover:bg-accent transition-colors ${
                  v.version === currentVersion ? "font-semibold text-foreground" : "text-muted-foreground"
                }`}
              >
                v{v.version}
              </button>
            ))
          ) : (
            <div className="px-3 py-1 text-xs text-muted-foreground">{t`No versions`}</div>
          )}
        </div>
      )}
    </div>
  )
}

function SectionPicker({
  value,
  sections,
  onChange,
  bookLabel,
}: {
  value: string
  sections: TocSection[]
  onChange: (sectionId: string, href: string) => void
  bookLabel: string
}) {
  const { t } = useLingui()
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState("")
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open])

  const filtered = filter
    ? sections.filter((s) =>
        s.title.toLowerCase().includes(filter.toLowerCase()) ||
        s.sectionId.toLowerCase().includes(filter.toLowerCase()),
      )
    : sections

  const current = sections.find((s) => s.sectionId === value)
  const previewUrl = `/api/books/${bookLabel}/adt-preview/${value}.html?embed=1`

  return (
    <div ref={ref} className="relative shrink-0">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => { setOpen(!open); setFilter("") }}
          className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted hover:bg-muted/80 rounded px-1.5 py-0.5 transition-colors max-w-[180px] truncate"
          title={value ? t`Linked to: ${value}` : t`No page linked`}
        >
          {current ? `p${current.pageNumber}` : value ? value.slice(0, 12) : t`No link`}
          <ChevronDown className="h-2.5 w-2.5 shrink-0" />
        </button>
        {value && (
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-0.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            title={t`Preview linked page`}
          >
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-30 bg-popover border rounded shadow-lg w-72 py-1">
          <div className="px-2 pb-1">
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder={t`Search sections...`}
              className="w-full text-xs border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-ring"
              autoFocus
            />
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filtered.length > 0 ? (
              filtered.map((s) => (
                <button
                  key={s.sectionId}
                  type="button"
                  onClick={() => {
                    onChange(s.sectionId, s.href)
                    setOpen(false)
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs hover:bg-accent transition-colors flex items-center gap-2 ${
                    s.sectionId === value ? "bg-accent/50 font-medium" : ""
                  }`}
                >
                  <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums w-6">p{s.pageNumber}</span>
                  <span className="truncate">{s.title}</span>
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-xs text-muted-foreground">{t`No matching sections`}</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const LEVEL_INDENT: Record<number, string> = {
  1: "pl-0",
  2: "pl-6",
  3: "pl-12",
}

export function TocView({ bookLabel }: { bookLabel: string }) {
  const { t } = useLingui()
  const queryClient = useQueryClient()
  const { data, isLoading } = useToc(bookLabel)
  const { setExtra } = useStepHeader()
  const { stageState, queueRun } = useBookRun()
  const { apiKey, hasApiKey } = useApiKey()
  const tocState = stageState("toc")
  const tocDone = tocState === "done"
  const tocRunning = tocState === "running" || tocState === "queued"
  const showRunCard = !tocDone || tocRunning

  const { data: sections } = useQuery({
    queryKey: ["books", bookLabel, "toc-sections"],
    queryFn: () => api.getTocSections(bookLabel),
    enabled: !!bookLabel && tocDone,
  })

  const handleRunToc = useCallback(() => {
    if (!hasApiKey || tocRunning) return
    queueRun({ fromStage: "toc", toStage: "toc", apiKey })
  }, [hasApiKey, tocRunning, apiKey, queueRun])

  const [pending, setPending] = useState<TocData | null>(null)
  const [saving, setSaving] = useState(false)

  // Reset pending when data changes
  useEffect(() => {
    setPending(null)
  }, [data?.version])

  const effective = pending ?? data
  const entries = effective?.entries ?? []
  const dirty = pending != null

  const saveToc = useCallback(async () => {
    if (!pending) return
    setSaving(true)
    const minDelay = new Promise((r) => setTimeout(r, 400))
    try {
      await api.updateToc(bookLabel, pending)
      setPending(null)
      await queryClient.invalidateQueries({ queryKey: ["books", bookLabel, "toc"] })
    } finally {
      await minDelay
      setSaving(false)
    }
  }, [pending, bookLabel, queryClient])

  const saveRef = useRef(saveToc)
  saveRef.current = saveToc

  useEffect(() => {
    if (!data) return
    setExtra(
      <div className="flex items-center gap-1.5 ml-auto">
        <span className="text-[10px] bg-white/20 rounded-full px-2 py-0.5">
          {t`${entries.length} entries`}
        </span>
        <VersionPicker
          currentVersion={data.version}
          saving={saving}
          dirty={dirty}
          bookLabel={bookLabel}
          onPreview={(d) => setPending(d as TocData)}
          onSave={() => saveRef.current()}
          onDiscard={() => setPending(null)}
        />
      </div>,
    )
    return () => setExtra(null)
  }, [data, entries.length, saving, dirty, bookLabel, setExtra])

  const updateEntry = (id: string, updates: Partial<TocEntry>) => {
    const base = pending ?? data
    if (!base) return
    setPending({
      ...base,
      entries: base.entries.map((e) =>
        e.id === id ? { ...e, ...updates } : e,
      ),
    })
  }

  const removeEntry = (id: string) => {
    const base = pending ?? data
    if (!base) return
    setPending({
      ...base,
      entries: base.entries.filter((e) => e.id !== id),
    })
  }

  const addEntryAfter = (afterId: string, level: number) => {
    const base = pending ?? data
    if (!base) return
    const idx = base.entries.findIndex((e) => e.id === afterId)
    if (idx === -1) return
    const nextNum = Date.now() // unique id
    const newEntry: TocEntry = {
      id: `toc_new_${nextNum}`,
      title: t`New Entry`,
      sectionId: "",
      href: "",
      chapterId: "",
      level,
    }
    const updated = [...base.entries]
    updated.splice(idx + 1, 0, newEntry)
    setPending({ ...base, entries: updated })
  }

  const changeLevel = (id: string, delta: number) => {
    const base = pending ?? data
    if (!base) return
    const entry = base.entries.find((e) => e.id === id)
    if (!entry) return
    const newLevel = Math.max(1, Math.min(3, entry.level + delta))
    if (newLevel === entry.level) return
    updateEntry(id, { level: newLevel })
  }

  if (!showRunCard && isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
        <span className="text-sm">{t`Loading table of contents...`}</span>
      </div>
    )
  }

  if (showRunCard || entries.length === 0) {
    return (
      <div className="p-4">
        <StageRunCard
          stageSlug="toc"
          isRunning={tocRunning}
          completed={tocDone}
          onRun={handleRunToc}
          disabled={!hasApiKey || tocRunning}
        />
      </div>
    )
  }

  return (
    <div className="space-y-0.5">
      {entries.map((entry) => (
        <div
          key={entry.id}
          className={`flex items-center gap-2 px-3 py-2 rounded-md border bg-card ${LEVEL_INDENT[entry.level] ?? "pl-0"}`}
        >
          {/* Level controls */}
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              onClick={() => changeLevel(entry.id, 1)}
              className="p-0.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              title={t`Increase indent`}
            >
              <ChevronRight className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={() => changeLevel(entry.id, -1)}
              className="p-0.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              title={t`Decrease indent`}
            >
              <ChevronLeft className="h-3 w-3" />
            </button>
          </div>

          {/* Level badge */}
          <span className="text-[10px] font-medium text-muted-foreground bg-muted rounded px-1.5 py-0.5 shrink-0">
            {t`L${entry.level}`}
          </span>

          {/* Editable title */}
          <input
            type="text"
            value={entry.title}
            onChange={(e) => updateEntry(entry.id, { title: e.target.value })}
            className="flex-1 min-w-0 text-sm text-foreground rounded border border-transparent bg-transparent px-1.5 py-0.5 hover:border-border hover:bg-muted/30 focus:border-ring focus:bg-white focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
          />

          {/* Section picker + preview link */}
          {sections && (
            <SectionPicker
              value={entry.sectionId}
              sections={sections}
              bookLabel={bookLabel}
              onChange={(sectionId, href) => updateEntry(entry.id, { sectionId, href })}
            />
          )}

          {/* Add + Delete */}
          <button
            type="button"
            onClick={() => addEntryAfter(entry.id, entry.level)}
            className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground shrink-0"
            title={t`Add entry below`}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => removeEntry(entry.id)}
            className="p-1 rounded hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive shrink-0"
            title={t`Remove entry`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}

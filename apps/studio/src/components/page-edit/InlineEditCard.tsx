import { useRef, useEffect, useCallback, type ReactNode } from "react"
import { Pencil } from "lucide-react"

interface InlineEditCardProps {
  isEditing: boolean
  isDirty: boolean
  onStartEdit: () => void
  onStopEdit: () => void
  viewContent: ReactNode
  editContent: ReactNode
}

export function InlineEditCard({
  isEditing,
  isDirty,
  onStartEdit,
  onStopEdit,
  viewContent,
  editContent,
}: InlineEditCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)

  const handleClickOutside = useCallback(
    (e: MouseEvent) => {
      if (!isEditing) return
      const target = e.target as HTMLElement

      // Don't close if click is inside a Radix portal (Select dropdown, Dialog, etc.)
      if (target.closest("[data-radix-popper-content-wrapper]")) return
      if (target.closest("[role='listbox']")) return
      if (target.closest("[data-radix-select-viewport]")) return

      if (cardRef.current && !cardRef.current.contains(target)) {
        onStopEdit()
      }
    },
    [isEditing, onStopEdit]
  )

  useEffect(() => {
    if (!isEditing) return
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isEditing, handleClickOutside])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape" && isEditing) {
        e.stopPropagation()
        onStopEdit()
      }
    },
    [isEditing, onStopEdit]
  )

  if (isEditing) {
    return (
      <div
        ref={cardRef}
        onKeyDown={handleKeyDown}
        className={`rounded border-2 p-3 transition-colors ${isDirty ? "border-blue-400 bg-blue-50/30" : "border-primary/30 bg-muted/20"}`}
      >
        {editContent}
      </div>
    )
  }

  return (
    <div
      ref={cardRef}
      className={`group relative cursor-pointer rounded border p-3 transition-colors hover:bg-muted/30 ${isDirty ? "border-l-4 border-l-blue-400" : ""}`}
      onClick={onStartEdit}
    >
      <div className="pointer-events-none absolute right-2 top-2 rounded bg-background/80 p-1 opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      {viewContent}
    </div>
  )
}

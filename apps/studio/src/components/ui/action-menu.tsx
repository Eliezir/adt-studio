import { useState, type ComponentType, type ReactNode } from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"
import { cn } from "@/lib/utils"

export interface ActionMenuItem {
  icon?: ComponentType<{ className?: string }>
  iconClassName?: string
  label: ReactNode
  onClick: () => void
  danger?: boolean
  hidden?: boolean
  disabled?: boolean
}

/** Entries are items or separators; separators collapse when hiding leaves
 * them leading, trailing, or adjacent. */
export type ActionMenuEntry = ActionMenuItem | { separator: true }

function isSeparator(entry: ActionMenuEntry): entry is { separator: true } {
  return "separator" in entry
}

/**
 * Minimal dropdown menu. Its content is portalled so menus stay visible when
 * their triggers live inside a scrolling or overflow-clipped container.
 * Shared by the tree editor row menus, the editor footer buttons, and the
 * section actions menu.
 */
export function ActionMenu({
  trigger,
  triggerClassName,
  triggerDisabled,
  note,
  items,
  itemsDisabled,
  align = "right",
  menuClassName,
}: {
  /** Content of the toggle button. */
  trigger: ReactNode
  triggerClassName: string
  triggerDisabled?: boolean
  /** Optional block shown above the items (e.g. why actions are disabled). */
  note?: ReactNode
  items: ActionMenuEntry[]
  /** Disables every item (per-item `disabled` also applies). */
  itemsDisabled?: boolean
  align?: "left" | "right"
  menuClassName?: string
}) {
  const [open, setOpen] = useState(false)

  // Drop hidden items, then collapse separators left dangling by the filter.
  const entries: ActionMenuEntry[] = []
  for (const entry of items) {
    if (isSeparator(entry)) {
      if (entries.length === 0 || isSeparator(entries[entries.length - 1])) continue
      entries.push(entry)
    } else if (!entry.hidden) {
      entries.push(entry)
    }
  }
  while (entries.length > 0 && isSeparator(entries[entries.length - 1])) {
    entries.pop()
  }
  if (entries.length === 0) return null

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
        <PopoverPrimitive.Trigger asChild>
          <button
            type="button"
            disabled={triggerDisabled}
            className={triggerClassName}
          >
            {trigger}
          </button>
        </PopoverPrimitive.Trigger>
        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            align={align === "right" ? "end" : "start"}
            sideOffset={4}
            collisionPadding={8}
            className={cn(
              "z-50 min-w-[160px] rounded-md border bg-popover py-1 text-xs shadow-md",
              menuClassName
            )}
          >
            {note}
            {entries.map((entry, i) =>
              isSeparator(entry) ? (
                <div key={i} className="my-1 border-t" />
              ) : (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setOpen(false)
                    entry.onClick()
                  }}
                  disabled={itemsDisabled || entry.disabled}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-accent transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-default",
                    entry.danger && "text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                  )}
                >
                  {entry.icon ? (
                    <entry.icon className={cn("h-3.5 w-3.5", entry.iconClassName)} />
                  ) : null}
                  {entry.label}
                </button>
              )
            )}
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
    </div>
  )
}

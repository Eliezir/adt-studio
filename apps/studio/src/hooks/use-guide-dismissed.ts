import { useState, useCallback } from "react"

/**
 * Hook to track whether a guide/tutorial has been dismissed via localStorage.
 * Returns [isDismissed, dismiss] — call dismiss() to permanently hide.
 */
export function useGuideDismissed(key: string): [boolean, () => void] {
  const storageKey = `adt-studio-guide-${key}-dismissed`

  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(storageKey) === "1"
    } catch {
      return false
    }
  })

  const dismiss = useCallback(() => {
    setIsDismissed(true)
    try {
      localStorage.setItem(storageKey, "1")
    } catch {
      // localStorage unavailable
    }
  }, [storageKey])

  return [isDismissed, dismiss]
}

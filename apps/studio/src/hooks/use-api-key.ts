import { useState, useCallback } from "react"

const STORAGE_KEY = "adt-studio-openai-key"

/**
 * Hook to manage the OpenAI API key in localStorage.
 */
export function useApiKey() {
  const [apiKey, setApiKeyState] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) ?? ""
    } catch {
      return ""
    }
  })

  const setApiKey = useCallback((key: string) => {
    setApiKeyState(key)
    try {
      if (key) {
        localStorage.setItem(STORAGE_KEY, key)
      } else {
        localStorage.removeItem(STORAGE_KEY)
      }
    } catch {
      // localStorage unavailable
    }
  }, [])

  return { apiKey, setApiKey, hasApiKey: apiKey.length > 0 }
}

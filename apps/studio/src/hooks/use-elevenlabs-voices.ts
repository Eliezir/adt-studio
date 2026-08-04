import { useQuery } from "@tanstack/react-query"
import { useMemo } from "react"
import { api, type ElevenLabsVoice } from "@/api/client"
import { useApiKey } from "./use-api-key"

/**
 * ElevenLabs voices for the current API key, so the UI can show
 * "Rachel (premade, american)" instead of `21m00Tcm4TlvDq8ikWAM`.
 *
 * The list is optional polish: with no key the endpoint returns an empty array
 * and callers fall back to a free-text voice ID input, so this never blocks the
 * Speech settings from loading.
 */
export function useElevenLabsVoices() {
  const { elevenLabsKey } = useApiKey()

  const query = useQuery({
    queryKey: ["elevenlabs-voices", elevenLabsKey ? "keyed" : "anonymous"],
    queryFn: () => api.getElevenLabsVoices(elevenLabsKey || undefined),
    // Voice lists change rarely and the API server caches too; avoid refetching
    // every time the settings panel mounts.
    staleTime: 10 * 60_000,
    // Without a key the response is always empty — don't retry that.
    retry: elevenLabsKey ? 1 : false,
  })

  const voices = query.data?.voices ?? []

  const byId = useMemo(
    () => new Map(voices.map((voice) => [voice.voice_id, voice])),
    [voices],
  )

  return {
    voices,
    /** Look up a voice by ID; undefined for an ID not in this account. */
    getVoice: (voiceId: string): ElevenLabsVoice | undefined => byId.get(voiceId),
    isLoading: query.isLoading,
    /** True when we have no list to offer, so callers should fall back to
     *  free-text entry rather than render an empty picker. */
    isUnavailable: !query.isLoading && voices.length === 0,
    hasKey: elevenLabsKey.length > 0,
  }
}

/** "Rachel (premade, american)" — the label shown for a resolved voice. */
export function formatElevenLabsVoiceLabel(voice: ElevenLabsVoice): string {
  const accent = voice.labels?.accent
  const details = [voice.category, accent].filter(Boolean).join(", ")
  const name = voice.name || voice.voice_id
  return details ? `${name} (${details})` : name
}

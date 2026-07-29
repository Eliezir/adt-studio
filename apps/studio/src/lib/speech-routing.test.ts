import { describe, expect, it } from "vitest"
import {
  languageUsesSpeechProvider,
  resolveSpeechProviderForLanguage,
} from "./speech-routing"

describe("speech-routing", () => {
  const speechConfig = {
    default_provider: "openai",
    providers: {
      gemini: {
        languages: ["en", "hi-IN"],
      },
      azure: {
        languages: ["es"],
      },
      elevenlabs: {
        languages: ["pt-BR"],
      },
    },
  }

  it("resolves exact language matches", () => {
    expect(resolveSpeechProviderForLanguage("hi-IN", speechConfig)).toBe(
      "gemini"
    )
  })

  it("resolves base language matches", () => {
    expect(resolveSpeechProviderForLanguage("en-US", speechConfig)).toBe(
      "gemini"
    )
    expect(resolveSpeechProviderForLanguage("es-MX", speechConfig)).toBe(
      "azure"
    )
  })

  it("falls back to the default provider", () => {
    expect(resolveSpeechProviderForLanguage("fr", speechConfig)).toBe("openai")
  })

  it("detects whether a language uses Gemini", () => {
    expect(languageUsesSpeechProvider("en-GB", "gemini", speechConfig)).toBe(
      true
    )
    expect(languageUsesSpeechProvider("fr", "gemini", speechConfig)).toBe(
      false
    )
  })

  it("resolves ElevenLabs-routed languages", () => {
    expect(resolveSpeechProviderForLanguage("pt-BR", speechConfig)).toBe(
      "elevenlabs"
    )
    expect(languageUsesSpeechProvider("pt-BR", "elevenlabs", speechConfig)).toBe(
      true
    )
    expect(languageUsesSpeechProvider("fr", "elevenlabs", speechConfig)).toBe(
      false
    )
  })
})

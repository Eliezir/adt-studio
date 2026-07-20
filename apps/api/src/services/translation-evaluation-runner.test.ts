import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createBookStorage } from "@adt/storage"
import type { LLMModel } from "@adt/llm"
import type { TranslationEvaluationRunRequest } from "@adt/types"
import { DEFAULT_TRANSLATION_EVALUATION_JUDGE_MODEL } from "@adt/types"
import { evaluateTranslationInApi, translationEvaluationRunnerInternals } from "./translation-evaluation-runner.js"

let tmpDir = ""

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "translation-evaluation-runner-"))
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
  tmpDir = ""
})

function seedBook(label: string): void {
  const storage = createBookStorage(label, tmpDir)
  storage.close()
}

function buildRequest(label: string): TranslationEvaluationRunRequest {
  return {
    book_label: label,
    language: "es",
    source_language: "en",
    source_catalog_version: 1,
    translation_version: 2,
    eval_config_hash: "hash",
    judge_model: "openai:/gpt-5.4",
    max_retries: 1,
    batch_size: 1,
    judge_instructions: "Review translations.",
    book_metadata: {
      title: "Forest Book",
      language_code: "en",
    },
    pages: [
      {
        page_id: "pg001",
        entries: [
          {
            entry_id: "pg001_t001",
            source_text: "Do you?",
            translated_text: "Y a ti?",
            source_hash: "source-hash",
            translated_hash: "translated-hash",
          },
        ],
      },
    ],
  }
}

describe("judge model defaults", () => {
  // The shipped default was "openai:/gpt-5.4" — the stray slash made resolveModel
  // parse the model as "/gpt-5.4", and only normalizeJudgeModel hid it.
  it("uses the provider:model form the rest of the config uses", () => {
    expect(DEFAULT_TRANSLATION_EVALUATION_JUDGE_MODEL).toBe("openai:gpt-5.4")
    expect(DEFAULT_TRANSLATION_EVALUATION_JUDGE_MODEL).not.toContain(":/")
  })

  // Books configured while the malformed default shipped still have it persisted,
  // so the normalizer has to keep tolerating it.
  it("still normalizes a legacy slashed model id", () => {
    expect(
      translationEvaluationRunnerInternals.normalizeJudgeModel("openai:/gpt-5.4"),
    ).toBe("openai:gpt-5.4")
  })
})

describe("evaluateTranslationInApi", () => {
  it("evaluates entries with page context and stores item-level results", async () => {
    const label = "eval-runner"
    seedBook(label)
    const generateObject = vi.fn<LLMModel["generateObject"]>()
      .mockResolvedValueOnce({
        object: {
          items: [
            {
              entry_id: "pg001_t001",
              acceptable: false,
              rationale: "The translation changes the implied question.",
              issue_types: ["meaning"],
              severity: "high",
              suggested_text: "¿Lo haces tú?",
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        object: {
          acceptable: true,
          rationale: "The suggestion preserves the source meaning.",
          repaired_suggested_text: null,
        },
      })
    const model: LLMModel = {
      generateObject,
      renderPrompt: vi.fn(),
    }

    const result = await evaluateTranslationInApi(
      buildRequest(label),
      {
        booksDir: tmpDir,
        apiKey: "sk-test",
        createModel: () => model,
      },
    )

    expect(result.summary).toEqual({ total: 1, acceptable: 0, unacceptable: 1 })
    expect(result.metadata?.page_id).toBe("pg001")
    expect(result.metadata?.book_metadata?.title).toBe("Forest Book")
    expect(result.items[0]).toMatchObject({
      entry_id: "pg001_t001",
      page_id: "pg001",
      acceptable: false,
      severity: "high",
      suggested_text: "¿Lo haces tú?",
      suggestion_validated: true,
      source_hash: "source-hash",
      translated_hash: "translated-hash",
    })
    expect(generateObject).toHaveBeenCalledWith(expect.objectContaining({
      log: expect.objectContaining({ pageId: "pg001" }),
    }))
    const prompt = generateObject.mock.calls[0][0].messages?.[0]?.content
    expect(String(prompt)).toContain("Forest Book")
    expect(String(prompt)).toContain("Y a ti?")
  })

  it("withholds a suggested fix when validation finds that it drops source meaning", async () => {
    const label = "eval-runner-invalid-suggestion"
    seedBook(label)
    const generateObject = vi.fn<LLMModel["generateObject"]>()
      .mockResolvedValueOnce({
        object: {
          items: [
            {
              entry_id: "pg001_t001",
              acceptable: false,
              rationale: "Railway terminology is inconsistent.",
              issue_types: ["terminology", "context"],
              severity: "medium",
              suggested_text: "El revisor irá contigo».",
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        object: {
          acceptable: false,
          rationale: "The suggestion omits the engine driver.",
          repaired_suggested_text: null,
        },
      })
    const model: LLMModel = {
      generateObject,
      renderPrompt: vi.fn(),
    }

    const result = await evaluateTranslationInApi(
      {
        ...buildRequest(label),
        pages: [
          {
            page_id: "pg001",
            entries: [
              {
                entry_id: "pg001_t001",
                source_text: "The engine driver and the guard will be with you.”",
                translated_text: "El maquinista y el guardia irán contigo».",
              },
            ],
          },
        ],
      },
      {
        booksDir: tmpDir,
        apiKey: "sk-test",
        createModel: () => model,
      },
    )

    expect(result.items[0]).toMatchObject({
      entry_id: "pg001_t001",
      acceptable: false,
      suggestion_validated: false,
      suggestion_validation_rationale: "The suggestion omits the engine driver.",
    })
    expect(result.items[0]?.suggested_text).toBeUndefined()
  })

  it("uses one repaired suggestion when the first suggestion fails validation and the repair passes", async () => {
    const label = "eval-runner-repaired-suggestion"
    seedBook(label)
    const generateObject = vi.fn<LLMModel["generateObject"]>()
      .mockResolvedValueOnce({
        object: {
          items: [
            {
              entry_id: "pg001_t001",
              acceptable: false,
              rationale: "Railway terminology is inconsistent.",
              issue_types: ["terminology", "context"],
              severity: "medium",
              suggested_text: "El revisor irá contigo».",
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        object: {
          acceptable: false,
          rationale: "The suggestion omits the engine driver.",
          repaired_suggested_text: "La maquinista y el revisor estarán contigo».",
        },
      })
      .mockResolvedValueOnce({
        object: {
          acceptable: true,
          rationale: "The repaired suggestion preserves both railway roles.",
          repaired_suggested_text: null,
        },
      })
    const model: LLMModel = {
      generateObject,
      renderPrompt: vi.fn(),
    }

    const result = await evaluateTranslationInApi(
      {
        ...buildRequest(label),
        pages: [
          {
            page_id: "pg001",
            entries: [
              {
                entry_id: "pg001_t001",
                source_text: "The engine driver and the guard will be with you.”",
                translated_text: "El maquinista y el guardia irán contigo».",
              },
            ],
          },
        ],
      },
      {
        booksDir: tmpDir,
        apiKey: "sk-test",
        createModel: () => model,
      },
    )

    expect(result.items[0]).toMatchObject({
      entry_id: "pg001_t001",
      acceptable: false,
      suggested_text: "La maquinista y el revisor estarán contigo».",
      suggestion_validated: true,
      suggestion_validation_rationale: "The repaired suggestion preserves both railway roles.",
    })
    expect(generateObject).toHaveBeenCalledTimes(3)
  })

  it("passes repeated page terminology evidence to suggestion validation", () => {
    const page = {
      page_id: "pg006007",
      entries: [
        {
          entry_id: "pg006007_n0009",
          source_text: "The engine driver and the guard will be with you.”",
          translated_text: "La maquinista y el guardia estarán contigo».",
        },
        {
          entry_id: "pg006007_n0011",
          source_text: "Loco knew the guard.",
          translated_text: "Loco conocía al revisor.",
        },
        {
          entry_id: "pg006007_n0013",
          source_text: "Loco saw that the guard was quite small.",
          translated_text: "Loco vio que el revisor era bastante pequeño.",
        },
        {
          entry_id: "pg006007_n0015",
          source_text: "But, Loco also knew the engine driver Babu and trusted her kind face.",
          translated_text: "Pero Loco también conocía a Babu, la maquinista, y confiaba en su cara amable.",
        },
      ],
    }
    const item = {
      entry_id: "pg006007_n0009",
      acceptable: false,
      source_text: "The engine driver and the guard will be with you.”",
      translated_text: "La maquinista y el guardia estarán contigo».",
      rationale: "Railway terminology is inconsistent.",
      issue_types: ["terminology" as const],
      severity: "medium" as const,
      suggested_text: "El guarda y la maquinista estarán contigo».",
    }

    const prompt = JSON.parse(translationEvaluationRunnerInternals.buildSuggestionValidationPrompt(
      page,
      buildRequest("terminology-evidence"),
      item,
      item.suggested_text,
    ))

    expect(prompt.candidate.terminology_evidence).toEqual(expect.arrayContaining([
      expect.objectContaining({
        source_term: "guard",
        neighboring_entries: expect.arrayContaining([
          expect.objectContaining({
            entry_id: "pg006007_n0011",
            translated_text: "Loco conocía al revisor.",
          }),
          expect.objectContaining({
            entry_id: "pg006007_n0013",
            translated_text: "Loco vio que el revisor era bastante pequeño.",
          }),
        ]),
      }),
      expect.objectContaining({
        source_term: "engine",
        neighboring_entries: expect.arrayContaining([
          expect.objectContaining({
            entry_id: "pg006007_n0015",
            translated_text: "Pero Loco también conocía a Babu, la maquinista, y confiaba en su cara amable.",
          }),
        ]),
      }),
    ]))
  })

  it("normalizes acceptable judge items when issue metadata is null", async () => {
    const label = "eval-runner-acceptable"
    seedBook(label)
    const generateObject = vi.fn<LLMModel["generateObject"]>().mockResolvedValue({
      object: {
        items: [
          {
            entry_id: "pg001_t001",
            acceptable: true,
            rationale: null,
            issue_types: null,
            severity: null,
            suggested_text: null,
          },
        ],
      },
    })
    const model: LLMModel = {
      generateObject,
      renderPrompt: vi.fn(),
    }

    const result = await evaluateTranslationInApi(
      buildRequest(label),
      {
        booksDir: tmpDir,
        apiKey: "sk-test",
        createModel: () => model,
      },
    )

    expect(result.summary).toEqual({ total: 1, acceptable: 1, unacceptable: 0 })
    expect(result.items[0]).toMatchObject({
      entry_id: "pg001_t001",
      acceptable: true,
      issue_types: [],
      rationale: "Translation is acceptable.",
    })
  })

  it("uses judge preferences for severity threshold and suggestions", async () => {
    const label = "eval-runner-preferences"
    seedBook(label)
    const generateObject = vi.fn<LLMModel["generateObject"]>().mockResolvedValue({
      object: {
        items: [
          {
            entry_id: "pg001_t001",
            acceptable: false,
            rationale: "Minor wording issue.",
            issue_types: ["fluency"],
            severity: "low",
            suggested_text: "¿Lo haces tú?",
          },
        ],
      },
    })
    const model: LLMModel = {
      generateObject,
      renderPrompt: vi.fn(),
    }

    const result = await evaluateTranslationInApi(
      {
        ...buildRequest(label),
        temperature: 0.2,
        severity_threshold: "medium",
        issue_types: ["meaning", "fluency"],
        generate_suggestions: false,
        only_suggest_when_confident: true,
        context: {
          book_metadata: false,
          visible_page_entries: true,
          source_language: true,
          target_language: true,
        },
      },
      {
        booksDir: tmpDir,
        apiKey: "sk-test",
        createModel: () => model,
      },
    )

    expect(result.summary).toEqual({ total: 1, acceptable: 1, unacceptable: 0 })
    expect(result.items[0]).toMatchObject({
      entry_id: "pg001_t001",
      acceptable: true,
      issue_types: [],
    })
    expect(result.items[0]?.suggested_text).toBeUndefined()
    expect(result.judge).toMatchObject({
      temperature: 0.2,
      severity_threshold: "medium",
      issue_types: ["meaning", "fluency"],
      generate_suggestions: false,
      only_suggest_when_confident: true,
    })
    expect(generateObject).toHaveBeenCalledWith(expect.objectContaining({
      temperature: 0.2,
      system: expect.stringContaining("Do not return suggested_text."),
    }))
    const prompt = generateObject.mock.calls[0][0].messages?.[0]?.content
    expect(String(prompt)).toContain("\"metadata\": null")
  })
})

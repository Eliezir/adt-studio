import crypto from "node:crypto"
import { Hono } from "hono"
import { HTTPException } from "hono/http-exception"
import { z } from "zod"
import { createBookStorage } from "@adt/storage"
import { loadBookConfig } from "@adt/pipeline"
import {
  TextCatalogOutput,
  parseBookLabel,
  resolveTranslationEvaluationConfig,
  type TranslationEvaluationResult,
  type TranslationEvaluationRunRequest,
} from "@adt/types"
import type { TaskProgressEmitter, TaskService } from "../services/task-service.js"
import {
  getTranslationEvaluationStatus,
  listTranslationEvaluationStatuses,
  saveTranslationEvaluationResult,
} from "../services/translation-evaluation-service.js"
import { evaluateTranslationInApi } from "../services/translation-evaluation-runner.js"

const TranslationEvaluationLanguageParam = z.string().min(1)
const TranslationEvaluationRunBody = z.object({
  page_id: z.string().min(1).optional(),
  entry_ids: z.array(z.string().min(1)).min(1).optional(),
  /** Re-run even when the cached result already matches this scope and config. */
  force: z.boolean().optional(),
}).optional()
const TranslationCatalogEntries = z.object({
  entries: z.array(z.object({ id: z.string(), text: z.string() })),
})

function safeParseLabel(label: string): string {
  try {
    return parseBookLabel(label)
  } catch (err) {
    throw new HTTPException(400, {
      message: err instanceof Error ? err.message : String(err),
    })
  }
}

function parseLanguage(language: string): string {
  const parsed = TranslationEvaluationLanguageParam.safeParse(language)
  if (!parsed.success) {
    throw new HTTPException(400, {
      message: parsed.error.message,
    })
  }
  return parsed.data
}

function getBearerToken(authorizationHeader: string | undefined): string {
  const match = authorizationHeader?.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() ?? ""
}

/**
 * Provider credentials for the run. The judge model is configurable, so the key
 * that matters depends on which provider it names — the runner picks.
 */
function getProviderCredentialsFromRequest(c: {
  req: { header: (name: string) => string | undefined }
}): {
  anthropicApiKey?: string
  googleApiKey?: string
  customBaseUrl?: string
  customApiKey?: string
} {
  return {
    anthropicApiKey: c.req.header("X-Anthropic-API-Key")?.trim() || undefined,
    googleApiKey: c.req.header("X-Google-API-Key")?.trim() || undefined,
    customBaseUrl: c.req.header("X-Custom-Base-URL")?.trim() || undefined,
    customApiKey: c.req.header("X-Custom-API-Key")?.trim() || undefined,
  }
}

function getOpenAIApiKeyFromRequest(c: { req: { header: (name: string) => string | undefined } }): string {
  return c.req.header("X-OpenAI-Key")?.trim()
    || c.req.header("X-ADT-OpenAI-Key")?.trim()
    || getBearerToken(c.req.header("Authorization"))
    || process.env.OPENAI_API_KEY?.trim()
    || ""
}

function hashText(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex")
}

function buildEvalConfigHash(config: {
  judge_model?: string
  max_retries?: number
  batch_size?: number
  temperature?: number
  judge_instructions?: string
  additional_guidance?: string | null
  strictness?: string
  severity_threshold?: string
  issue_types?: string[]
  generate_suggestions?: boolean
  only_suggest_when_confident?: boolean
  context?: Record<string, unknown>
  target_audience?: string | null
  style_guidance?: string | null
  terminology_guidance?: string | null
}): string {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify({
      judge_model: config.judge_model ?? null,
      max_retries: config.max_retries ?? null,
      batch_size: config.batch_size ?? null,
      temperature: config.temperature ?? null,
      judge_instructions: config.judge_instructions ?? null,
      additional_guidance: config.additional_guidance ?? null,
      strictness: config.strictness ?? null,
      severity_threshold: config.severity_threshold ?? null,
      issue_types: config.issue_types ?? null,
      generate_suggestions: config.generate_suggestions ?? null,
      only_suggest_when_confident: config.only_suggest_when_confident ?? null,
      context: config.context ?? null,
      target_audience: config.target_audience ?? null,
      style_guidance: config.style_guidance ?? null,
      terminology_guidance: config.terminology_guidance ?? null,
    }))
    .digest("hex")
}

function getCurrentEvalConfigHash(booksDir: string, configPath: string | undefined, label: string): string | null {
  if (!configPath) return null
  const config = loadBookConfig(label, booksDir, configPath)
  const resolvedConfig = resolveTranslationEvaluationConfig(config.translation_evaluation)
  return buildEvalConfigHash({
    judge_model: resolvedConfig.judge_model,
    max_retries: resolvedConfig.max_retries,
    batch_size: resolvedConfig.batch_size,
    temperature: resolvedConfig.temperature,
    judge_instructions: resolvedConfig.judge_instructions,
    additional_guidance: resolvedConfig.additional_guidance,
    strictness: resolvedConfig.strictness,
    severity_threshold: resolvedConfig.severity_threshold,
    issue_types: resolvedConfig.issue_types,
    generate_suggestions: resolvedConfig.generate_suggestions,
    only_suggest_when_confident: resolvedConfig.only_suggest_when_confident,
    context: resolvedConfig.context,
    target_audience: resolvedConfig.target_audience,
    style_guidance: resolvedConfig.style_guidance,
    terminology_guidance: resolvedConfig.terminology_guidance,
  })
}

function withCurrentConfigStaleness<T extends { evaluation: { eval_config_hash: string } | null; isStale: boolean }>(
  status: T,
  currentEvalConfigHash: string | null,
): T {
  if (!status.evaluation || currentEvalConfigHash === null) {
    return status
  }
  return {
    ...status,
    isStale: status.isStale || status.evaluation.eval_config_hash !== currentEvalConfigHash,
  }
}

function entryBelongsToPage(entryId: string, pageId: string): boolean {
  return entryId === pageId || entryId.startsWith(`${pageId}_`) || entryId.startsWith(`${pageId}:`)
}

function equalEntryIds(left: string[] | undefined, right: string[]): boolean {
  if (!left || left.length !== right.length) return false
  const leftSet = new Set(left)
  return right.every((entryId) => leftSet.has(entryId))
}

async function parseRunBody(c: { req: { json: () => Promise<unknown> } }) {
  const raw = await c.req.json().catch(() => undefined)
  const parsed = TranslationEvaluationRunBody.safeParse(raw)
  if (!parsed.success) {
    throw new HTTPException(400, {
      message: `Invalid translation evaluation request: ${parsed.error.message}`,
    })
  }
  return parsed.data ?? {}
}

function buildTranslationEvaluationRunRequest(options: {
  booksDir: string
  configPath?: string
  label: string
  language: string
  pageId?: string
  entryIds?: string[]
}): TranslationEvaluationRunRequest {
  const storage = createBookStorage(options.label, options.booksDir)
  try {
    const config = options.configPath
      ? loadBookConfig(options.label, options.booksDir, options.configPath)
      : null

    const sourceRow = storage.getLatestNodeData("text-catalog", "book")
    if (!sourceRow) {
      throw new Error("Text catalog not found for this book")
    }
    const parsedSource = TextCatalogOutput.safeParse(sourceRow.data)
    if (!parsedSource.success) {
      throw new Error("Stored text catalog data is invalid")
    }

    const translationRow = storage.getLatestNodeData("text-catalog-translation", options.language)
    if (!translationRow) {
      throw new Error(`Translated text catalog not found for language: ${options.language}`)
    }
    const parsedTranslation = TranslationCatalogEntries.safeParse(translationRow.data)
    if (!parsedTranslation.success) {
      throw new Error(`Stored translated text catalog data is invalid for language: ${options.language}`)
    }

    const resolvedConfig = resolveTranslationEvaluationConfig(config?.translation_evaluation)
    const metadataRow = storage.getLatestNodeData("metadata", "book")
    const metadata = metadataRow?.data as Record<string, unknown> | null
    const sourceLanguage = config?.editing_language
      ?? (typeof metadata?.language_code === "string" ? metadata.language_code : undefined)
      ?? undefined
    const translationEntries = new Map(
      parsedTranslation.data.entries.map((entry) => [entry.id, entry.text]),
    )
    const selectedEntryIds = options.entryIds ? new Set(options.entryIds) : null

    const selectedSourceEntries = parsedSource.data.entries.filter((entry) => {
      if (selectedEntryIds) return selectedEntryIds.has(entry.id)
      if (options.pageId) return entryBelongsToPage(entry.id, options.pageId)
      return true
    })

    if (selectedSourceEntries.length === 0) {
      throw new Error("No text-catalog entries matched the requested translation review scope")
    }

    const pageId = options.pageId ?? "visible"
    const entries = selectedSourceEntries.map((entry) => {
      const translatedText = translationEntries.get(entry.id) ?? ""
      return {
        entry_id: entry.id,
        source_text: entry.text,
        translated_text: translatedText,
        source_hash: hashText(entry.text),
        translated_hash: hashText(translatedText),
      }
    })

    return {
      book_label: options.label,
      language: options.language,
      source_language: sourceLanguage,
      source_catalog_version: sourceRow.version,
      translation_version: translationRow.version,
      eval_config_hash: buildEvalConfigHash({
        judge_model: resolvedConfig.judge_model,
        max_retries: resolvedConfig.max_retries,
        batch_size: resolvedConfig.batch_size,
        temperature: resolvedConfig.temperature,
        judge_instructions: resolvedConfig.judge_instructions,
        additional_guidance: resolvedConfig.additional_guidance,
        strictness: resolvedConfig.strictness,
        severity_threshold: resolvedConfig.severity_threshold,
        issue_types: resolvedConfig.issue_types,
        generate_suggestions: resolvedConfig.generate_suggestions,
        only_suggest_when_confident: resolvedConfig.only_suggest_when_confident,
        context: resolvedConfig.context,
        target_audience: resolvedConfig.target_audience,
        style_guidance: resolvedConfig.style_guidance,
        terminology_guidance: resolvedConfig.terminology_guidance,
      }),
      judge_model: resolvedConfig.judge_model,
      max_retries: resolvedConfig.max_retries,
      batch_size: resolvedConfig.batch_size,
      temperature: resolvedConfig.temperature,
      judge_instructions: resolvedConfig.judge_instructions,
      ...(resolvedConfig.additional_guidance
        ? { additional_guidance: resolvedConfig.additional_guidance }
        : {}),
      strictness: resolvedConfig.strictness,
      severity_threshold: resolvedConfig.severity_threshold,
      issue_types: resolvedConfig.issue_types,
      generate_suggestions: resolvedConfig.generate_suggestions,
      only_suggest_when_confident: resolvedConfig.only_suggest_when_confident,
      context: resolvedConfig.context,
      ...(resolvedConfig.target_audience ? { target_audience: resolvedConfig.target_audience } : {}),
      ...(resolvedConfig.style_guidance ? { style_guidance: resolvedConfig.style_guidance } : {}),
      ...(resolvedConfig.terminology_guidance ? { terminology_guidance: resolvedConfig.terminology_guidance } : {}),
      book_metadata: metadata,
      pages: [{ page_id: pageId, entries }],
    }
  } finally {
    storage.close()
  }
}

function assertMatchingEvaluationResult(
  request: TranslationEvaluationRunRequest,
  result: {
    language: string
    source_catalog_version: number
    translation_version: number
    eval_config_hash: string
  },
): void {
  if (result.language !== request.language) {
    throw new Error("Translation evaluator returned a mismatched language")
  }
  if (result.source_catalog_version !== request.source_catalog_version) {
    throw new Error("Translation evaluator returned a mismatched source catalog version")
  }
  if (result.translation_version !== request.translation_version) {
    throw new Error("Translation evaluator returned a mismatched translation version")
  }
  if (result.eval_config_hash !== request.eval_config_hash) {
    throw new Error("Translation evaluator returned a mismatched evaluation config hash")
  }
}

function withAcceptedAnyway(
  evaluation: TranslationEvaluationResult,
  entryId: string,
): TranslationEvaluationResult {
  const acceptedAt = new Date().toISOString()
  let changed = false
  const items = evaluation.items.map((item) => {
    if (item.entry_id !== entryId) return item
    changed = true
    return {
      ...item,
      accepted_anyway: true,
      accepted_anyway_at: acceptedAt,
    }
  })

  if (!changed) {
    throw new HTTPException(404, { message: `Translation evaluation item not found: ${entryId}` })
  }

  return {
    ...evaluation,
    generated_at: acceptedAt,
    items,
    summary: {
      ...evaluation.summary,
      accepted_anyway: items.filter((item) => item.accepted_anyway).length,
    },
  }
}

export type TranslationEvaluationRunner = (
  request: TranslationEvaluationRunRequest,
  options: { booksDir: string; apiKey: string },
  emitProgress?: TaskProgressEmitter,
) => Promise<TranslationEvaluationResult>

export function createTranslationEvaluationRoutes(
  booksDir: string,
  configPath?: string,
  taskService?: TaskService,
  evaluateTranslation: TranslationEvaluationRunner = evaluateTranslationInApi,
): Hono {
  const app = new Hono()

  app.get("/books/:label/evaluations/translations", (c) => {
    const { label } = c.req.param()
    const safeLabel = safeParseLabel(label)
    const currentEvalConfigHash = getCurrentEvalConfigHash(booksDir, configPath, safeLabel)
    const evaluations = listTranslationEvaluationStatuses(safeLabel, booksDir)
      .map((status) => withCurrentConfigStaleness(status, currentEvalConfigHash))
    return c.json({ evaluations })
  })

  app.get("/books/:label/evaluations/translations/:language", (c) => {
    const { label, language } = c.req.param()
    const safeLabel = safeParseLabel(label)
    const safeLanguage = parseLanguage(language)
    const currentEvalConfigHash = getCurrentEvalConfigHash(booksDir, configPath, safeLabel)
    const evaluation = getTranslationEvaluationStatus(safeLabel, booksDir, safeLanguage)
    if (!evaluation) {
      throw new HTTPException(404, {
        message: `Translation evaluation not found for language: ${safeLanguage}`,
      })
    }
    return c.json(withCurrentConfigStaleness(evaluation, currentEvalConfigHash))
  })

  app.post("/books/:label/evaluations/translations/:language/items/:entryId/accept-anyway", (c) => {
    const { label, language, entryId } = c.req.param()
    const safeLabel = safeParseLabel(label)
    const safeLanguage = parseLanguage(language)
    const evaluation = getTranslationEvaluationStatus(safeLabel, booksDir, safeLanguage)
    if (!evaluation?.evaluation) {
      throw new HTTPException(404, {
        message: `Translation evaluation not found for language: ${safeLanguage}`,
      })
    }

    const saved = saveTranslationEvaluationResult(
      safeLabel,
      booksDir,
      withAcceptedAnyway(evaluation.evaluation, decodeURIComponent(entryId)),
    )
    return c.json({ version: saved.version, evaluation: saved.evaluation })
  })

  app.post("/books/:label/evaluations/translations/:language/run", async (c) => {
    const { label, language } = c.req.param()
    const safeLabel = safeParseLabel(label)
    const safeLanguage = parseLanguage(language)
    const apiKey = getOpenAIApiKeyFromRequest(c)
    const providerCredentials = getProviderCredentialsFromRequest(c)
    const body = await parseRunBody(c)

    const evaluation = getTranslationEvaluationStatus(safeLabel, booksDir, safeLanguage)
    if (!evaluation || evaluation.currentTranslationVersion === null) {
      throw new HTTPException(404, {
        message: `Translated text catalog not found for language: ${safeLanguage}`,
      })
    }
    if (evaluation.currentSourceCatalogVersion === null) {
      throw new HTTPException(409, {
        message: "Text catalog not found for this book",
      })
    }

    const hasAnyCredential =
      !!apiKey ||
      !!providerCredentials.anthropicApiKey ||
      !!providerCredentials.googleApiKey ||
      !!providerCredentials.customApiKey
    if (!hasAnyCredential) {
      throw new HTTPException(400, {
        message: "An API key is required for translation evaluation. Set X-OpenAI-Key (or the header matching your judge model's provider) or OPENAI_API_KEY on the API server.",
      })
    }

    if (!taskService) {
      throw new HTTPException(501, {
        message: "Translation evaluation task submission is not implemented yet",
      })
    }

    const request = buildTranslationEvaluationRunRequest({
      booksDir,
      configPath,
      label: safeLabel,
      language: safeLanguage,
      pageId: body.page_id,
      entryIds: body.entry_ids,
    })
    const requestedEntryIds = request.pages.flatMap((page) => page.entries.map((entry) => entry.entry_id))

    // Without `force` an identical scope+config returns the cached result, so
    // there is otherwise no way to ask for a fresh judgement.
    if (
      !body.force &&
      evaluation.evaluation &&
      evaluation.evaluation.source_catalog_version === request.source_catalog_version &&
      evaluation.evaluation.translation_version === request.translation_version &&
      evaluation.evaluation.eval_config_hash === request.eval_config_hash &&
      evaluation.evaluation.metadata?.page_id === request.pages[0]?.page_id &&
      equalEntryIds(evaluation.evaluation.metadata?.selected_entry_ids, requestedEntryIds) &&
      (evaluation.evaluation.metadata?.failed_pages ?? 0) === 0
    ) {
      return c.json({
        status: "current",
        taskId: null,
        label: safeLabel,
        language: safeLanguage,
        version: evaluation.evaluationVersion,
      })
    }

    const { taskId } = taskService.submitTask(
      safeLabel,
      "translation-evaluation",
      `Running translation evaluation for ${safeLanguage}`,
      async (emitProgress) => {
        emitProgress("Preparing translation evaluation payload", 10)

        emitProgress("Evaluating visible translations", 40)
        const result = await evaluateTranslation(
          request,
          { booksDir, apiKey, ...providerCredentials },
          emitProgress,
        )
        assertMatchingEvaluationResult(request, result)

        emitProgress("Saving translation evaluation result", 85)
        const saved = saveTranslationEvaluationResult(safeLabel, booksDir, result)

        emitProgress("Translation evaluation completed", 100)
        return {
          language: safeLanguage,
          version: saved.version,
          pageId: request.pages[0]?.page_id,
        }
      },
      {
        pageId: request.pages[0]?.page_id,
        url: `/books/${safeLabel}/translate`,
      },
    )

    return c.json({
      status: "submitted",
      taskId,
      label: safeLabel,
      language: safeLanguage,
    })
  })

  return app
}

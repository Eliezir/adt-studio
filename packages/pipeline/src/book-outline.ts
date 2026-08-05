import {
  BookOutlineOutput,
  DEFAULT_LLM_MAX_RETRIES,
  DEFAULT_LLM_MODEL_ID,
  type AppConfig,
  type BookOutlineEntry,
  type BookOutlineStyleCluster,
} from "@adt/types"
import type { LLMModel, ValidationResult } from "@adt/llm"
import type { Storage } from "@adt/storage"
import type { BookOutlineEvidence } from "./book-outline-evidence.js"

export const BOOK_OUTLINE_NODE = "book-outline"
export const BOOK_OUTLINE_ITEM = "book"

export interface BookOutlineConfig {
  promptName: string
  modelId: string
  maxRetries: number
  timeoutMs: number
}

export interface PageOutlineContext {
  entries: BookOutlineEntry[]
  ancestors: BookOutlineEntry[]
  styleClusters: BookOutlineStyleCluster[]
}

export function buildBookOutlineConfig(appConfig: AppConfig): BookOutlineConfig {
  const config = appConfig.book_outline
  return {
    promptName: config?.prompt ?? "book_outline",
    modelId: config?.model ?? appConfig.default_model ?? DEFAULT_LLM_MODEL_ID,
    maxRetries: config?.max_retries ?? DEFAULT_LLM_MAX_RETRIES,
    timeoutMs: (config?.timeout ?? 300) * 1000,
  }
}

function validateBookOutline(
  raw: unknown,
  evidence: BookOutlineEvidence,
): ValidationResult {
  const parsed = BookOutlineOutput.safeParse(raw)
  if (!parsed.success) {
    return {
      valid: false,
      errors: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`),
    }
  }

  const errors: string[] = []
  const output = parsed.data
  const pages = new Map(evidence.pages.map((page) => [page.pageId, page]))
  const candidates = new Map(evidence.candidates.map((candidate) => [candidate.candidateId, candidate]))
  const candidateOrder = new Map(
    evidence.candidates.map((candidate, index) => [candidate.candidateId, index]),
  )
  const clusters = new Map<string, BookOutlineStyleCluster>()
  const entryIds = new Set<string>()
  const usedCandidates = new Set<string>()
  let previousPageNumber = 0

  for (const cluster of output.styleClusters) {
    if (clusters.has(cluster.styleClusterId)) {
      errors.push(`Duplicate styleClusterId "${cluster.styleClusterId}".`)
    }
    clusters.set(cluster.styleClusterId, cluster)
  }

  for (const entry of output.entries) {
    if (entryIds.has(entry.outlineId)) {
      errors.push(`Duplicate outlineId "${entry.outlineId}".`)
    }
    const page = pages.get(entry.pageId)
    if (!page) {
      errors.push(`Outline entry "${entry.outlineId}" references unknown pageId "${entry.pageId}".`)
    } else if (page.pageNumber !== entry.pageNumber) {
      errors.push(
        `Outline entry "${entry.outlineId}" has pageNumber ${entry.pageNumber}; ` +
          `${entry.pageId} is page ${page.pageNumber}.`,
      )
    }
    if (entry.pageNumber < previousPageNumber) {
      errors.push("Outline entries must be in page order.")
    }
    previousPageNumber = Math.max(previousPageNumber, entry.pageNumber)

    const sourceCandidates: typeof evidence.candidates = []
    for (const candidateId of entry.sourceCandidateIds) {
      const candidate = candidates.get(candidateId)
      if (!candidate) {
        errors.push(`Outline entry "${entry.outlineId}" references unknown candidate "${candidateId}".`)
        continue
      }
      if (candidate.pageId !== entry.pageId) {
        errors.push(
          `Candidate "${candidateId}" belongs to ${candidate.pageId}, not ${entry.pageId}.`,
        )
      }
      sourceCandidates.push(candidate)
      if (usedCandidates.has(candidateId)) {
        errors.push(`Candidate "${candidateId}" is used by more than one outline entry.`)
      }
      usedCandidates.add(candidateId)
    }
    if (sourceCandidates.length === entry.sourceCandidateIds.length) {
      const visibleTitle = sourceCandidates
        .sort(
          (a, b) =>
            (candidateOrder.get(a.candidateId) ?? 0) -
            (candidateOrder.get(b.candidateId) ?? 0),
        )
        .map((candidate) => candidate.text)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim()
      if (entry.title.replace(/\s+/g, " ").trim() !== visibleTitle) {
        errors.push(
          `Outline entry "${entry.outlineId}" title must exactly match its source candidates: ` +
            `"${visibleTitle}".`,
        )
      }
    }

    if (entry.parentId !== null) {
      if (!entryIds.has(entry.parentId)) {
        errors.push(
          `Parent "${entry.parentId}" for "${entry.outlineId}" must reference an earlier outline entry.`,
        )
      } else {
        const parent = output.entries.find((candidate) => candidate.outlineId === entry.parentId)
        if (parent && parent.level >= entry.level) {
          errors.push(
            `Parent "${entry.parentId}" must have a shallower level than "${entry.outlineId}".`,
          )
        }
      }
    }

    const cluster = clusters.get(entry.styleClusterId)
    if (!cluster) {
      errors.push(
        `Outline entry "${entry.outlineId}" references unknown style cluster "${entry.styleClusterId}".`,
      )
    } else if (cluster.level !== entry.level) {
      errors.push(
        `Style cluster "${entry.styleClusterId}" is level ${cluster.level}, ` +
          `but "${entry.outlineId}" is level ${entry.level}.`,
      )
    }

    entryIds.add(entry.outlineId)
  }

  return { valid: errors.length === 0, errors }
}

/** Generate one authoritative hierarchy from all extracted book evidence. */
export async function generateBookOutline(
  evidence: BookOutlineEvidence,
  config: BookOutlineConfig,
  llmModel: LLMModel,
): Promise<BookOutlineOutput> {
  const result = await llmModel.generateObject<BookOutlineOutput>({
    schema: BookOutlineOutput,
    prompt: config.promptName,
    context: {
      pages: evidence.pages,
      candidates: evidence.candidates,
      proof_sheets: evidence.proofSheets.map((sheet) => ({
        sheet_id: sheet.sheetId,
        page_ids: sheet.pageIds,
        page_numbers: sheet.pageNumbers,
        image_base64: sheet.imageBase64,
      })),
      type_scale: evidence.typeScale,
    },
    validate: (raw) => validateBookOutline(raw, evidence),
    maxRetries: config.maxRetries,
    maxTokens: 32768,
    timeoutMs: config.timeoutMs,
    log: {
      taskType: "book-outline",
      promptName: config.promptName,
    },
  })

  return result.object
}

export function readBookOutline(storage: Storage): BookOutlineOutput | null {
  const row = storage.getLatestNodeData(BOOK_OUTLINE_NODE, BOOK_OUTLINE_ITEM)
  if (!row) return null
  const parsed = BookOutlineOutput.safeParse(row.data)
  return parsed.success ? parsed.data : null
}

/** Small authoritative slice supplied to a page-level sectioning call. */
export function outlineContextForPage(
  outline: BookOutlineOutput | null,
  pageId: string,
): PageOutlineContext | null {
  if (!outline) return null
  const entries = outline.entries.filter((entry) => entry.pageId === pageId)
  if (entries.length === 0) return null

  const byId = new Map(outline.entries.map((entry) => [entry.outlineId, entry]))
  const ancestorIds = new Set<string>()
  for (const entry of entries) {
    let parentId = entry.parentId
    while (parentId) {
      if (ancestorIds.has(parentId)) break
      ancestorIds.add(parentId)
      parentId = byId.get(parentId)?.parentId ?? null
    }
  }
  const ancestors = outline.entries.filter((entry) => ancestorIds.has(entry.outlineId))
  const clusterIds = new Set(
    [...entries, ...ancestors].map((entry) => entry.styleClusterId),
  )
  const styleClusters = outline.styleClusters.filter((cluster) =>
    clusterIds.has(cluster.styleClusterId),
  )

  return { entries, ancestors, styleClusters }
}

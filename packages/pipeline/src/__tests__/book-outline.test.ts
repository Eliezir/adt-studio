import path from "node:path"
import { PNG } from "pngjs"
import { describe, expect, it } from "vitest"
import { createPromptEngine } from "@adt/llm"
import type { GenerateObjectOptions, LLMModel, Message } from "@adt/llm"
import type { BookOutlineOutput, PositionedTextOutput } from "@adt/types"
import {
  buildBookOutlineConfig,
  generateBookOutline,
  outlineContextForPage,
} from "../book-outline.js"
import {
  buildBookOutlineEvidence,
  buildHeadingCandidates,
  buildProofSheets,
  type BookOutlineEvidence,
} from "../book-outline-evidence.js"

function pngBase64(width = 4, height = 6): string {
  const image = new PNG({ width, height })
  image.data.fill(255)
  return PNG.sync.write(image).toString("base64")
}

function positionedText(): PositionedTextOutput {
  return {
    pageWidth: 600,
    pageHeight: 800,
    renderWidth: 1200,
    renderHeight: 1600,
    drawItems: [
      {
        kind: "paragraph",
        textId: "pg001_tx001",
        mergedParagraphId: "title",
        top: 40,
        left: 100,
        lineHeight: 42,
        textAlign: "center",
        text: "Chapter One",
        segments: [
          {
            text: "Chapter One",
            style: {
              "font-size": "32px",
              "font-weight": "700",
              "font-family": "Aptos",
            },
          },
        ],
        blockBounds: { x: 100, y: 40, width: 400, height: 42 },
      },
      {
        kind: "paragraph",
        textId: "pg001_tx002",
        top: 150,
        left: 60,
        lineHeight: 18,
        text: "Body copy for the chapter.",
        segments: [{ text: "Body copy for the chapter.", style: { "font-size": "16px" } }],
      },
    ],
  }
}

function evidence(): BookOutlineEvidence {
  return buildBookOutlineEvidence(
    [
      {
        pageId: "pg001",
        pageNumber: 1,
        text: "Chapter One\nBody copy for the chapter.",
        imageBase64: pngBase64(),
        positionedText: positionedText(),
      },
    ],
    {
      bodyPx: 16,
      h1Px: 32,
      h2Px: 26,
      h3Px: 21,
      captionPx: 13,
      sampleChars: 38,
      observed: [
        { px: 32, chars: 11 },
        { px: 16, chars: 27 },
      ],
    },
  )
}

function output(): BookOutlineOutput {
  return {
    reasoning: "The repeated large title style marks chapters.",
    styleClusters: [
      { styleClusterId: "chapter-style", description: "Large centered title", level: 1 },
    ],
    entries: [
      {
        outlineId: "outline-001",
        title: "Chapter One",
        level: 1,
        kind: "chapter",
        pageId: "pg001",
        pageNumber: 1,
        sourceCandidateIds: ["pg001_hc001"],
        parentId: null,
        styleClusterId: "chapter-style",
        confidence: 0.98,
      },
    ],
  }
}

function messageText(message: Message): string {
  if (typeof message.content === "string") return message.content
  return message.content
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n")
}

describe("book outline evidence", () => {
  it("captures positioned typography and normalized coordinates", () => {
    const candidates = buildHeadingCandidates(
      [
        {
          pageId: "pg001",
          pageNumber: 1,
          text: "Chapter One",
          imageBase64: pngBase64(),
          positionedText: positionedText(),
        },
      ],
      null,
    )

    expect(candidates[0]).toMatchObject({
      candidateId: "pg001_hc001",
      text: "Chapter One",
      fontSizePx: 32,
      fontWeight: 700,
      centered: true,
      topRatio: 0.05,
      widthRatio: 2 / 3,
    })
    expect(candidates[0].headingLikelihood).toBeGreaterThan(candidates[1].headingLikelihood)
  })

  it("builds bounded row-major proof sheets from full page images", () => {
    const sheets = buildProofSheets(
      Array.from({ length: 5 }, (_, index) => ({
        pageId: `pg${index + 1}`,
        pageNumber: index + 1,
        text: "",
        imageBase64: pngBase64(),
      })),
      { columns: 2, rows: 2, cellWidth: 10, cellHeight: 12, gap: 2 },
    )

    expect(sheets).toHaveLength(2)
    expect(sheets[0].pageIds).toEqual(["pg1", "pg2", "pg3", "pg4"])
    expect(sheets[1].pageIds).toEqual(["pg5"])
    const rendered = PNG.sync.read(Buffer.from(sheets[0].imageBase64, "base64"))
    expect({ width: rendered.width, height: rendered.height }).toEqual({ width: 26, height: 30 })
  })
})

describe("book outline generation", () => {
  it("inherits the configured OpenAI default model", () => {
    expect(
      buildBookOutlineConfig({
        default_model: "openai:gpt-5.4",
        structure_types: {},
        role_types: {},
      }).modelId,
    ).toBe("openai:gpt-5.4")
  })

  it("sends the complete evidence and validates model references", async () => {
    let captured: GenerateObjectOptions | null = null
    const llm: LLMModel = {
      generateObject: async <T>(options: GenerateObjectOptions) => {
        captured = options
        const result = output()
        expect(options.validate?.(result, options.context ?? {})).toEqual({ valid: true, errors: [] })
        return { object: result as T }
      },
    }

    const result = await generateBookOutline(
      evidence(),
      buildBookOutlineConfig({
        default_model: "openai:gpt-5.4",
        structure_types: {},
        role_types: {},
      }),
      llm,
    )

    expect(result.entries[0].level).toBe(1)
    expect(captured?.prompt).toBe("book_outline")
    expect(captured?.log?.taskType).toBe("book-outline")
    expect((captured?.context?.pages as unknown[])).toHaveLength(1)
    expect((captured?.context?.proof_sheets as unknown[])).toHaveLength(1)
  })

  it("rejects invented candidate references", async () => {
    const llm: LLMModel = {
      generateObject: async <T>(options: GenerateObjectOptions) => {
        const invalid = output()
        invalid.entries[0].sourceCandidateIds = ["invented"]
        const validation = options.validate?.(invalid, options.context ?? {})
        expect(validation?.valid).toBe(false)
        expect(validation?.errors.join(" ")).toContain("unknown candidate")
        return { object: invalid as T }
      },
    }

    await generateBookOutline(
      evidence(),
      buildBookOutlineConfig({ structure_types: {}, role_types: {} }),
      llm,
    )
  })

  it("rejects rewritten outline titles", async () => {
    const llm: LLMModel = {
      generateObject: async <T>(options: GenerateObjectOptions) => {
        const invalid = output()
        invalid.entries[0].title = "A rewritten chapter name"
        const validation = options.validate?.(invalid, options.context ?? {})
        expect(validation?.valid).toBe(false)
        expect(validation?.errors.join(" ")).toContain("title must exactly match")
        return { object: invalid as T }
      },
    }

    await generateBookOutline(
      evidence(),
      buildBookOutlineConfig({ structure_types: {}, role_types: {} }),
      llm,
    )
  })

  it("returns page entries with their ancestor and style context", () => {
    const book = output()
    book.entries.push({
      ...book.entries[0],
      outlineId: "outline-002",
      title: "A Subsection",
      level: 2,
      kind: "section",
      pageId: "pg002",
      pageNumber: 2,
      sourceCandidateIds: ["pg002_hc001"],
      parentId: "outline-001",
      styleClusterId: "section-style",
    })
    book.styleClusters.push({
      styleClusterId: "section-style",
      description: "Section style",
      level: 2,
    })

    const context = outlineContextForPage(book, "pg002")
    expect(context?.entries.map((entry) => entry.outlineId)).toEqual(["outline-002"])
    expect(context?.ancestors.map((entry) => entry.outlineId)).toEqual(["outline-001"])
    expect(context?.styleClusters.map((cluster) => cluster.styleClusterId)).toEqual([
      "chapter-style",
      "section-style",
    ])
  })

  it("renders all evidence plus a proof-sheet image in the OpenAI prompt", async () => {
    const promptEngine = createPromptEngine(path.join(process.cwd(), "prompts"))
    const bookEvidence = evidence()
    const messages = await promptEngine.renderPrompt("book_outline", {
      pages: bookEvidence.pages,
      candidates: bookEvidence.candidates,
      proof_sheets: bookEvidence.proofSheets.map((sheet) => ({
        sheet_id: sheet.sheetId,
        page_ids: sheet.pageIds,
        page_numbers: sheet.pageNumbers,
        image_base64: sheet.imageBase64,
      })),
      type_scale: bookEvidence.typeScale,
    })
    const text = messages.map(messageText).join("\n")
    const imageParts = messages.flatMap((message) =>
      typeof message.content === "string"
        ? []
        : message.content.filter((part) => part.type === "image"),
    )

    expect(text).toContain("Chapter One")
    expect(text).toContain("pg001_hc001")
    expect(text).toContain("proof-001 pages: pg001")
    expect(imageParts).toHaveLength(1)
  })
})

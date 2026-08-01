import { describe, expect, it } from "vitest"
import { repairTableOfContentsLayout } from "../toc-layout.js"

describe("repairTableOfContentsLayout", () => {
  it("splits a dotted TOC leaf into title, leader, and right-aligned page number", () => {
    const repaired = repairTableOfContentsLayout(
      '<div data-id="toc-1" class="font-bold">Digestive system1</div>',
      [{ text_id: "toc-1", text_type: "text", text: "Digestive system........1" }],
    )
    expect(repaired).toContain("flex items-baseline w-full")
    expect(repaired).toContain(">Digestive system</span>")
    expect(repaired).toContain('class="mx-2 flex-1 min-w-4 border-b border-dotted border-current"')
    expect(repaired).toContain('<span class="sr-only">........</span>')
    expect(repaired).toContain('class="shrink-0 text-right tabular-nums">1</span>')
  })

  it("adds a decorative leader when OCR merged title and page number", () => {
    const repaired = repairTableOfContentsLayout(
      '<p data-id="toc-2">Acknowledgementsv</p>',
      [{ text_id: "toc-2", text_type: "text", text: "Acknowledgementsv" }],
    )
    expect(repaired).toContain("border-dotted")
    expect(repaired).toContain(">Acknowledgements</span>")
    expect(repaired).toContain(">v</span>")
  })

  it("does not alter ordinary non-TOC text", () => {
    const html = '<p data-id="body-1">Plants need water.</p>'
    expect(repairTableOfContentsLayout(html, [
      { text_id: "body-1", text_type: "text", text: "Plants need water." },
    ])).toBe(html)
  })
})

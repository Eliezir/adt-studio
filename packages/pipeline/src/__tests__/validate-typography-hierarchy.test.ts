import { describe, expect, it } from "vitest"
import { validateTypographyHierarchy } from "../validate-typography-hierarchy.js"

describe("validateTypographyHierarchy", () => {
  it("accepts authoritative H1/H2/H3 role mappings", () => {
    const html = `<section><h1 class="adt-h1" data-id="chapter">Chapter</h1><h2 class="adt-h2"><span data-id="section">Section</span></h2><h3 class="adt-h3" data-id="sub">Sub</h3></section>`
    expect(validateTypographyHierarchy(html, [
      { text_id: "chapter", text_type: "chapter_title" },
      { text_id: "section", text_type: "section_heading" },
      { text_id: "sub", text_type: "subheading" },
    ])).toEqual([])
  })

  it("rejects role/tag/class mismatches", () => {
    const html = `<section><h2 class="adt-h1" data-id="chapter">Chapter</h2><h1 class="adt-h2" data-id="section">Section</h1></section>`
    const errors = validateTypographyHierarchy(html, [
      { text_id: "chapter", text_type: "chapter_title" },
      { text_id: "section", text_type: "section_heading" },
    ])
    expect(errors).toEqual(expect.arrayContaining([
      expect.stringContaining('chapter_title'),
      expect.stringContaining('section_heading'),
    ]))
  })

  it("keeps legacy heading tags aligned with their adt class", () => {
    expect(validateTypographyHierarchy(
      `<section><h1 class="adt-h2" data-id="legacy">Legacy</h1></section>`,
      [{ text_id: "legacy", text_type: "heading" }],
    )).toContainEqual(expect.stringContaining("must align"))
  })

  it("rejects utility and inline font-size overrides", () => {
    const html = `<section><h2 class="adt-h2 text-[1.15rem]" data-id="section">Section</h2><p style="font-size:12px">Body</p></section>`
    const errors = validateTypographyHierarchy(html, [
      { text_id: "section", text_type: "section_heading" },
    ])
    expect(errors).toEqual(expect.arrayContaining([
      expect.stringContaining("font-size utility"),
      expect.stringContaining("inline font-size"),
    ]))
  })
})

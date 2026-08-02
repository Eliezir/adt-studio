import type { LeafText } from "./web-rendering.js"

interface TocParts {
  title: string
  leader: string
  separator: string
  pageNumber: string
}

function splitTocEntry(text: string): TocParts | null {
  const dotted = text.match(/^(.*?)(\.{2,})(\s*)([ivxlcdm]+|\d+)\s*$/i)
  if (dotted && dotted[1].trim()) {
    return { title: dotted[1], leader: dotted[2], separator: dotted[3], pageNumber: dotted[4] }
  }
  const merged = text.match(/^(.*?\D)(\s*)([ivxlcdm]+|\d+)\s*$/i)
  if (!merged || !merged[1].trim()) return null
  return { title: merged[1], leader: "", separator: merged[2], pageNumber: merged[3] }
}

function escapeHtml(text: string): string {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;")
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function addRowClasses(openingTag: string): string {
  const required = "flex items-baseline w-full min-w-0 gap-0"
  if (/\bclass=["']/.test(openingTag)) {
    return openingTag.replace(/\bclass=(["'])/, `class=$1${required} `)
  }
  return openingTag.replace(/>$/, ` class="${required}">`)
}

/** Guarantee title → dotted leader → right-aligned page-number TOC rows. */
export function repairTableOfContentsLayout(html: string, leafTexts: LeafText[]): string {
  let repaired = html
  const expectedPageNumbers = new Set<string>()
  for (const leaf of leafTexts) {
    const parts = splitTocEntry(leaf.text)
    if (!parts) continue
    expectedPageNumbers.add(parts.pageNumber.toLowerCase())
    const id = escapeRegex(leaf.text_id)
    const element = new RegExp(
      `(<([a-z][\\w-]*)\\b[^>]*\\bdata-id=(['"])${id}\\3[^>]*>)([^<>]*)(<\\/\\2>)`,
      "i",
    )
    repaired = repaired.replace(element, (match, opening: string, _tag: string, _quote: string, _content: string, closing: string) => {
      // OCR often drops leaders altogether. In that case, only repair elements
      // that the renderer already treated as rows. This prevents a heading such
      // as "Chapter 1" from being mistaken for an entry whose page number is 1.
      if (!parts.leader && !/\b(?:flex|grid|items-baseline)\b/.test(opening)) return match
      const leader = parts.leader
        ? `<span aria-hidden="true" class="mx-1.5 sm:mx-2 flex-1 min-w-6 border-b-2 border-dotted border-current opacity-80"><span class="sr-only">${escapeHtml(parts.leader)}</span></span>`
        : `<span aria-hidden="true" class="mx-1.5 sm:mx-2 flex-1 min-w-6 border-b-2 border-dotted border-current opacity-80"></span>`
      const titleText = parts.leader ? parts.title : parts.title + parts.separator
      const pageText = parts.leader ? parts.separator + parts.pageNumber : parts.pageNumber
      return `${addRowClasses(opening)}<span class="min-w-0 max-w-[82%]">${escapeHtml(titleText)}</span>${leader}<span class="w-8 sm:w-10 shrink-0 text-right tabular-nums">${escapeHtml(pageText)}</span>${closing}`
    })
  }

  // Some generated TOCs add a second, decorative leader immediately after
  // each content leaf. Once the leaf itself owns the complete semantic row,
  // that sibling both doubles the dots and can force long rows past the page.
  repaired = repaired.replace(
    /<span\b([^>]*\b(?:aria-hidden=(?:"true"|'true'))[^>]*)><\/span>/gi,
    (match, attributes: string) =>
      /\bborder-(?:b(?:-\d+)?\s+)?border-dotted\b|\bborder-dotted\b/.test(attributes) &&
      !/\bopacity-80\b/.test(attributes)
        ? ""
        : match,
  )

  // A second failure mode is an absolutely positioned number-only column,
  // visually duplicating every page number. Remove it only when it contains
  // two or more numbers and every value is a page number already present in
  // the semantic TOC leaves. This leaves unrelated badges/footers untouched.
  repaired = repaired.replace(
    /<div\b([^>]*\bclass=(?:"[^"]*\babsolute\b[^"]*"|'[^']*\babsolute\b[^']*')[^>]*)>\s*((?:<(?:div|span)\b[^>]*>\s*(?:[ivxlcdm]+|\d+)\s*<\/(?:div|span)>\s*){2,})<\/div>/gi,
    (match, _attributes: string, body: string) => {
      const numbers = [...body.matchAll(/>\s*([ivxlcdm]+|\d+)\s*</gi)].map((entry) => entry[1].toLowerCase())
      return numbers.length >= 2 && numbers.every((number) => expectedPageNumbers.has(number)) ? "" : match
    },
  )

  // A long TOC title may be split into multiple OCR leaves. Generators often
  // wrap on mobile but force those fragments onto one desktop line, which
  // pushes the repaired terminal leaf and page number beyond the page edge.
  // TOC rows must be allowed to wrap at every viewport, matching print.
  repaired = repaired.replace(/\s*\bsm:flex-nowrap\b/g, "")
  return repaired
}

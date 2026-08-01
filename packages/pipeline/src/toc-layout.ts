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
  const required = "flex items-baseline w-full min-w-0"
  if (/\bclass=["']/.test(openingTag)) {
    return openingTag.replace(/\bclass=(["'])/, `class=$1${required} `)
  }
  return openingTag.replace(/>$/, ` class="${required}">`)
}

/** Guarantee title → dotted leader → right-aligned page-number TOC rows. */
export function repairTableOfContentsLayout(html: string, leafTexts: LeafText[]): string {
  let repaired = html
  for (const leaf of leafTexts) {
    const parts = splitTocEntry(leaf.text)
    if (!parts) continue
    const id = escapeRegex(leaf.text_id)
    const element = new RegExp(
      `(<([a-z][\\w-]*)\\b[^>]*\\bdata-id=(['"])${id}\\3[^>]*>)([^<>]*)(<\\/\\2>)`,
      "i",
    )
    repaired = repaired.replace(element, (_match, opening: string, _tag: string, _quote: string, _content: string, closing: string) => {
      const leader = parts.leader
        ? `<span aria-hidden="true" class="mx-2 flex-1 min-w-4 overflow-hidden whitespace-nowrap text-current">${escapeHtml(parts.leader)}</span>`
        : `<span aria-hidden="true" class="mx-2 flex-1 min-w-4 border-b border-dotted border-current"></span>`
      return `${addRowClasses(opening)}<span class="min-w-0">${escapeHtml(parts.title)}</span>${leader}<span class="shrink-0 text-right tabular-nums">${escapeHtml(parts.separator + parts.pageNumber)}</span>${closing}`
    })
  }
  return repaired
}

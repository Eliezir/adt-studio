import { parseDocument } from "htmlparser2"

interface HtmlNode {
  name?: string
  attribs?: Record<string, string>
  parent?: HtmlNode | null
  children?: HtmlNode[]
}

interface LeafText {
  text_id: string
  text_type: string
  heading_level?: number
}

const ROLE_HEADING_LEVEL = {
  chapter_title: 1,
  section_heading: 2,
  subheading: 3,
} as const

const TEXT_SIZE_RE = /\btext-(?:xs|sm|base|lg|xl|[2-9]xl)\b|\btext-\[(?:\d|\.\d|clamp\(|calc\(|var\(|length:)[^\]]*\]/

function walk(node: HtmlNode, callback: (node: HtmlNode) => void): void {
  callback(node)
  for (const child of node.children ?? []) walk(child, callback)
}

function findByDataId(root: HtmlNode, id: string): HtmlNode | undefined {
  let match: HtmlNode | undefined
  walk(root, (node) => {
    if (!match && node.attribs?.["data-id"] === id) match = node
  })
  return match
}

function closestHeading(node: HtmlNode | undefined): HtmlNode | undefined {
  let current = node
  while (current) {
    if (/^h[1-6]$/.test(current.name ?? "")) return current
    current = current.parent ?? undefined
  }
  return undefined
}

function containsHeading(node: HtmlNode): boolean {
  if (/^h[1-6]$/.test(node.name ?? "")) return true
  return (node.children ?? []).some(containsHeading)
}

function hasClass(node: HtmlNode, className: string): boolean {
  return (node.attribs?.class?.split(/\s+/) ?? []).includes(className)
}

export interface TypographyHierarchyOptions {
  /** Activity/overlay controls may size non-heading UI text independently. */
  allowNonHeadingFontSizes?: boolean
}

/** Enforce the sectioning hierarchy and prevent per-page heading-size overrides. */
export function validateTypographyHierarchy(
  html: string,
  leafTexts: LeafText[],
  options: TypographyHierarchyOptions = {},
): string[] {
  const root = parseDocument(html) as unknown as HtmlNode
  const errors: string[] = []

  walk(root, (node) => {
    const classes = node.attribs?.class ?? ""
    const controlsHeading = closestHeading(node) !== undefined || containsHeading(node)
    if (TEXT_SIZE_RE.test(classes) && (!options.allowNonHeadingFontSizes || controlsHeading)) {
      errors.push(`Typography must not use a font-size utility: "${classes}".`)
    }
    if (
      /font-size\s*:/i.test(node.attribs?.style ?? "") &&
      (!options.allowNonHeadingFontSizes || controlsHeading)
    ) {
      errors.push("Typography must not use inline font-size; use the book-wide adt-* class.")
    }
  })

  for (const leaf of leafTexts) {
    const roleLevel =
      ROLE_HEADING_LEVEL[leaf.text_type as keyof typeof ROLE_HEADING_LEVEL]
    const expectedLevel = leaf.heading_level ?? roleLevel
    const isLegacyHeading = leaf.text_type === "heading"
    if (!expectedLevel && !isLegacyHeading) continue

    const content = findByDataId(root, leaf.text_id)
    const heading = closestHeading(content)
    if (!heading) {
      errors.push(`Heading "${leaf.text_id}" must be rendered inside a semantic <h1> through <h6>.`)
      continue
    }

    if (expectedLevel) {
      const expectedTag = `h${expectedLevel}`
      const expectedClass = `adt-h${expectedLevel}`
      if (heading.name !== expectedTag || !hasClass(heading, expectedClass)) {
        errors.push(
          `Heading role "${leaf.text_type}" (${leaf.text_id}) must use <${expectedTag} class="${expectedClass}">.`,
        )
      }
      continue
    }

    const level = heading.name?.slice(1)
    const expectedClass = `adt-h${level}`
    if (!level || !["1", "2", "3", "4", "5", "6"].includes(level) || !hasClass(heading, expectedClass)) {
      errors.push(
        `Legacy heading "${leaf.text_id}" must align its semantic tag with its typography class (h1/adt-h1 through h6/adt-h6).`,
      )
    }
  }

  return [...new Set(errors)]
}

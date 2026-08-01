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
}

const ROLE_HEADING = {
  chapter_title: { tag: "h1", className: "adt-h1" },
  section_heading: { tag: "h2", className: "adt-h2" },
  subheading: { tag: "h3", className: "adt-h3" },
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

function hasClass(node: HtmlNode, className: string): boolean {
  return (node.attribs?.class?.split(/\s+/) ?? []).includes(className)
}

/** Enforce the sectioning hierarchy and prevent per-page font-size overrides. */
export function validateTypographyHierarchy(html: string, leafTexts: LeafText[]): string[] {
  const root = parseDocument(html) as unknown as HtmlNode
  const errors: string[] = []

  walk(root, (node) => {
    const classes = node.attribs?.class ?? ""
    if (TEXT_SIZE_RE.test(classes)) {
      errors.push(`Typography must not use a font-size utility: "${classes}".`)
    }
    if (/font-size\s*:/i.test(node.attribs?.style ?? "")) {
      errors.push("Typography must not use inline font-size; use the book-wide adt-* class.")
    }
  })

  for (const leaf of leafTexts) {
    const expected = ROLE_HEADING[leaf.text_type as keyof typeof ROLE_HEADING]
    const isLegacyHeading = leaf.text_type === "heading"
    if (!expected && !isLegacyHeading) continue

    const content = findByDataId(root, leaf.text_id)
    const heading = closestHeading(content)
    if (!heading) {
      errors.push(`Heading "${leaf.text_id}" must be rendered inside a semantic <h1>, <h2>, or <h3>.`)
      continue
    }

    if (expected) {
      if (heading.name !== expected.tag || !hasClass(heading, expected.className)) {
        errors.push(
          `Heading role "${leaf.text_type}" (${leaf.text_id}) must use <${expected.tag} class="${expected.className}">.`,
        )
      }
      continue
    }

    const level = heading.name?.slice(1)
    const expectedClass = `adt-h${level}`
    if (!level || !["1", "2", "3"].includes(level) || !hasClass(heading, expectedClass)) {
      errors.push(
        `Legacy heading "${leaf.text_id}" must align its semantic tag with its typography class (h1/adt-h1, h2/adt-h2, or h3/adt-h3).`,
      )
    }
  }

  return [...new Set(errors)]
}

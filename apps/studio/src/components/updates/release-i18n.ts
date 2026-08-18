const LOCALIZATION_PATTERN = /<!--\s*adt-release-i18n\s*\n([\s\S]*?)-->/i
const RELEASE_NOTICE_PATTERN =
  /<!--\s*adt-release-notice:start\s*-->[\s\S]*?<!--\s*adt-release-notice:end\s*-->/i
const RELEASE_NOTES_PATTERN =
  /(<!--\s*adt-ai-notes:start\s*-->)([\s\S]*?)(<!--\s*adt-ai-notes:end\s*-->)/i

type LocalizedSection = {
  heading: string
  items: string[]
}

type LocalizedRelease = {
  title: string
  summary: string
  coverAlt: string
  sections: {
    added: LocalizedSection
    improved: LocalizedSection
    fixed: LocalizedSection
  }
}

type ReleaseLocalizations = {
  schemaVersion: 1
  defaultLocale: string
  locales: Record<string, LocalizedRelease>
}

type ReleaseCopy = {
  title?: string
  description?: string
  coverAlt?: string
  releaseNotes?: string
}

export function localizeReleaseCopy<T extends ReleaseCopy>(
  release: T,
  locale: string,
): T {
  if (!release.releaseNotes) return release
  const localizations = parseReleaseLocalizations(release.releaseNotes)
  const cleanNotes = stripReleaseLocalizations(release.releaseNotes)
  if (!localizations) return { ...release, releaseNotes: cleanNotes }
  const localized = resolveLocalization(localizations, locale)
  if (!localized) return { ...release, releaseNotes: cleanNotes }
  return {
    ...release,
    title: localized.title,
    description: localized.summary,
    coverAlt: localized.coverAlt,
    releaseNotes: renderLocalizedNotes(cleanNotes, localized),
  }
}

export function localizeReleaseNotes(
  notes: string | undefined,
  locale: string,
): string | undefined {
  if (!notes) return notes
  return localizeReleaseCopy({ releaseNotes: notes }, locale).releaseNotes
}

export function stripReleaseLocalizations(notes: string): string {
  return notes.replace(LOCALIZATION_PATTERN, "").trimEnd()
}

function parseReleaseLocalizations(
  notes: string,
): ReleaseLocalizations | undefined {
  const match = notes.match(LOCALIZATION_PATTERN)
  if (!match) return undefined
  try {
    const value: unknown = JSON.parse(match[1])
    if (!isRecord(value) || value.schemaVersion !== 1) return undefined
    if (typeof value.defaultLocale !== "string" || !isRecord(value.locales)) {
      return undefined
    }
    const locales: Record<string, LocalizedRelease> = {}
    for (const [locale, candidate] of Object.entries(value.locales)) {
      const parsed = parseLocalizedRelease(candidate)
      if (parsed) locales[locale] = parsed
    }
    if (!locales[value.defaultLocale]) return undefined
    return {
      schemaVersion: 1,
      defaultLocale: value.defaultLocale,
      locales,
    }
  } catch {
    return undefined
  }
}

function resolveLocalization(
  localizations: ReleaseLocalizations,
  requestedLocale: string,
): LocalizedRelease | undefined {
  const normalized = requestedLocale.toLowerCase()
  const exact = Object.entries(localizations.locales).find(
    ([locale]) => locale.toLowerCase() === normalized,
  )?.[1]
  if (exact) return exact
  const language = normalized.split("-")[0]
  const languageMatch = Object.entries(localizations.locales).find(
    ([locale]) => locale.toLowerCase().split("-")[0] === language,
  )?.[1]
  return languageMatch ?? localizations.locales[localizations.defaultLocale]
}

function renderLocalizedNotes(
  originalNotes: string,
  localized: LocalizedRelease,
): string {
  const sections = Object.values(localized.sections)
    .filter((section) => section.items.length > 0)
    .map(
      (section) =>
        `### ${section.heading}\n\n${section.items.map((item) => `- ${item}`).join("\n")}`,
    )
  const generated = originalNotes.match(RELEASE_NOTES_PATTERN)
  if (generated) {
    const footer = generated[2].match(/\n---\s*\n([\s\S]*?)\s*$/)?.[1]
    const content = [
      localized.summary,
      ...sections,
      footer ? `---\n\n${footer.trim()}` : undefined,
    ]
      .filter(Boolean)
      .join("\n\n")
    return replacePictureAlt(
      originalNotes.replace(
        generated[0],
        `${generated[1]}\n${content}\n${generated[3]}`,
      ),
      localized.coverAlt,
    )
  }

  const notice = originalNotes.match(RELEASE_NOTICE_PATTERN)?.[0]
  const pictureMatch = originalNotes.match(/<picture\b[\s\S]*?<\/picture>/i)
  const picture = pictureMatch?.[0]
  const preamble =
    pictureMatch?.index != null
      ? originalNotes.slice(0, pictureMatch.index).trim()
      : notice
  const footer = originalNotes.match(/\n---\s*\n([\s\S]*?)\s*$/)?.[1]
  return [
    preamble,
    picture ? replacePictureAlt(picture, localized.coverAlt) : undefined,
    localized.summary,
    ...sections,
    footer ? `---\n\n${footer.trim()}` : undefined,
  ]
    .filter(Boolean)
    .join("\n\n")
}

/* eslint-disable lingui/no-unlocalized-strings -- HTML entity syntax is serialization data, not UI copy. */
function replacePictureAlt(picture: string, alt: string): string {
  const escaped = alt
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
  return picture.replace(
    /(<img\b[^>]*\balt=)(["'])(.*?)(\2)/i,
    (_match, prefix: string, quote: string) =>
      `${prefix}${quote}${escaped}${quote}`,
  )
}
/* eslint-enable lingui/no-unlocalized-strings */

function parseLocalizedRelease(value: unknown): LocalizedRelease | undefined {
  if (!isRecord(value) || !isRecord(value.sections)) return undefined
  const added = parseSection(value.sections.added)
  const improved = parseSection(value.sections.improved)
  const fixed = parseSection(value.sections.fixed)
  if (
    typeof value.title !== "string" ||
    typeof value.summary !== "string" ||
    typeof value.coverAlt !== "string" ||
    !added ||
    !improved ||
    !fixed
  ) {
    return undefined
  }
  return {
    title: value.title,
    summary: value.summary,
    coverAlt: value.coverAlt,
    sections: { added, improved, fixed },
  }
}

function parseSection(value: unknown): LocalizedSection | undefined {
  if (
    !isRecord(value) ||
    typeof value.heading !== "string" ||
    !Array.isArray(value.items) ||
    !value.items.every((item) => typeof item === "string")
  ) {
    return undefined
  }
  return { heading: value.heading, items: value.items }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

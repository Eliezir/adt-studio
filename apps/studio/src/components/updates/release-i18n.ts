const LOCALIZATION_PATTERN = /<!--\s*adt-release-i18n\s*\n([\s\S]*?)-->/i

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
  const picture = originalNotes.match(/<picture\b[\s\S]*?<\/picture>/i)?.[0]
  const footer = originalNotes.match(/\n---\s*\n([\s\S]*?)\s*$/)?.[1]
  const sections = Object.values(localized.sections)
    .filter((section) => section.items.length > 0)
    .map(
      (section) =>
        `### ${section.heading}\n\n${section.items.map((item) => `- ${item}`).join("\n")}`,
    )
  return [
    picture,
    localized.summary,
    ...sections,
    footer ? `---\n\n${footer.trim()}` : undefined,
  ]
    .filter(Boolean)
    .join("\n\n")
}

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

import { describe, expect, it } from "vitest"
import { localizeReleaseCopy, localizeReleaseNotes } from "./release-i18n"

const metadata = {
  schemaVersion: 1,
  defaultLocale: "en",
  locales: {
    en: release("Creative Control", "Added", "Split books."),
    "pt-BR": release("Controle criativo", "Adicionado", "Divida livros."),
    sq: release("Kontroll krijues", "U shtua", "Ndani libra."),
  },
}

function release(title: string, heading: string, item: string) {
  return {
    title,
    summary: `${title} summary`,
    coverAlt: title,
    sections: {
      added: { heading, items: [item] },
      improved: { heading: "Improved", items: [] },
      fixed: { heading: "Fixed", items: [] },
    },
  }
}

const notice = `<!-- adt-release-notice:start -->
**Windows users: reinstall this release manually.**
<!-- adt-release-notice:end -->`

const notes = `${notice}\n\n<picture><img src="https://example.com/light.png"></picture>\n\nEnglish notes.\n\n---\n\nFull diff: example\n\n<!-- adt-release-i18n\n${JSON.stringify(metadata)}\n-->`

describe("release localization", () => {
  it("localizes release cards and notes for the selected locale", () => {
    const localized = localizeReleaseCopy(
      {
        title: "English",
        description: "English",
        coverAlt: "English cover",
        releaseNotes: notes,
      },
      "pt-BR",
    )
    expect(localized.title).toBe("Controle criativo")
    expect(localized.description).toBe("Controle criativo summary")
    expect(localized.coverAlt).toBe("Controle criativo")
    expect(localized.releaseNotes).toContain("### Adicionado")
    expect(localized.releaseNotes).toContain("- Divida livros.")
    expect(localized.releaseNotes).toContain("<picture>")
    expect(localized.releaseNotes).toContain("Full diff: example")
    expect(localized.releaseNotes).not.toContain("adt-release-i18n")
    expect(localized.releaseNotes).toMatch(
      /^<!-- adt-release-notice:start -->/,
    )
    expect(localized.releaseNotes).toContain(
      "Windows users: reinstall this release manually.",
    )
  })

  it("falls back to English and supports Albanian", () => {
    expect(localizeReleaseNotes(notes, "de")).toContain("Split books.")
    expect(localizeReleaseNotes(notes, "sq")).toContain("Ndani libra.")
  })

  it("preserves the release notice in post-update notes", () => {
    const localized = localizeReleaseNotes(notes, "pt-BR")
    expect(localized).toMatch(/^<!-- adt-release-notice:start -->/)
    expect(localized).toContain(
      "Windows users: reinstall this release manually.",
    )
  })

  it("preserves human content outside generated notes", () => {
    const legacyWarning = "⚠️ **Windows users: reinstall manually.**"
    const marked = `${legacyWarning}\n\n<picture><img alt="English cover" src="https://example.com/light.png"></picture>\n\nManual reviewer note.\n\n<!-- adt-ai-notes:start -->\n## English title\n\nEnglish generated notes.\n<!-- adt-ai-notes:end -->\n\n<!-- adt-release-i18n\n${JSON.stringify(metadata)}\n-->`

    const localized = localizeReleaseNotes(marked, "pt-BR")
    expect(localized).toContain(legacyWarning)
    expect(localized).toContain("Manual reviewer note.")
    expect(localized).toContain("Controle criativo summary")
    expect(localized).not.toContain("English generated notes.")
    expect(localized).toContain('alt="Controle criativo"')
  })

  it("removes malformed metadata instead of displaying it", () => {
    expect(
      localizeReleaseNotes("Notes\n<!-- adt-release-i18n\nnot-json\n-->", "fr"),
    ).toBe("Notes")
  })
})

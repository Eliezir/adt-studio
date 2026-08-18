import { describe, expect, it } from "vitest";
import {
  localizeGithubRelease,
  stripReleaseLocalizations,
} from "./release-i18n";
import {
  releaseExcerpt,
  sectionTone,
  summarizeSections,
} from "./releaseSummary";
import type { GithubRelease } from "./useGithubReleases";

const metadata = {
  schemaVersion: 1,
  defaultLocale: "en",
  locales: {
    en: release("Creative Control", "Added", "Split books."),
    "pt-BR": release("Controle criativo", "Adicionado", "Divida livros."),
    fr: release("Contrôle créatif", "Ajouté", "Scindez des livres."),
  },
};

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
  };
}

function githubRelease(body: string): GithubRelease {
  return {
    tag_name: "v0.7.4",
    name: "ADT Studio v0.7.4",
    body,
    html_url: "https://github.com/unicef/adt-studio/releases/tag/v0.7.4",
    published_at: "2026-07-08T04:57:43Z",
    prerelease: false,
    draft: false,
    assets: [],
  };
}

describe("release localization", () => {
  const notice = `<!-- adt-release-notice:start -->\n**Windows users: reinstall this release manually.**\n<!-- adt-release-notice:end -->`;
  const body = `${notice}\n\n<picture><img alt="English cover" src="https://example.com/light.png"></picture>\n\n## Creative Control\n\nEnglish notes.\n\n---\n\nFull diff: example\n\n<!-- adt-release-i18n\n${JSON.stringify(metadata)}\n-->`;

  it("selects an exact locale while preserving the cover and footer", () => {
    const localized = localizeGithubRelease(githubRelease(body), "pt-BR", {
      fullDiffLabel: "Comparação completa",
    });
    expect(localized.name).toBe("Controle criativo");
    expect(localized.body).toMatch(/^<!-- adt-release-notice:start -->/);
    expect(localized.body).toContain(
      "Windows users: reinstall this release manually.",
    );
    expect(localized.body).toContain("<picture>");
    expect(localized.body).toContain('alt="Controle criativo"');
    expect(localized.body).not.toContain("## Controle criativo");
    expect(localized.body).toContain("Controle criativo summary");
    expect(localized.body).toContain("### Adicionado");
    expect(localized.body).toContain("- Divida livros.");
    expect(localized.body).toContain("Comparação completa: example");
    expect(localized.body).not.toContain("adt-release-i18n");

    const sections = summarizeSections(
      localized.body,
      localized.localization?.sections,
    );
    expect(sections[0]).toEqual({
      kind: "added",
      title: "Adicionado",
      count: 1,
    });
    expect(sectionTone(sections[0].kind)).toBe("added");
  });

  it("preserves unmarked human content outside generated note markers", () => {
    const warning = "⚠️ **Windows users: reinstall manually.**";
    const markedBody = `${warning}\n\n<picture><img alt="English cover" src="https://example.com/light.png"></picture>\n\nManual reviewer note.\n\n<!-- adt-ai-notes:start -->\n## English title\n\nEnglish generated notes.\n<!-- adt-ai-notes:end -->\n\n<!-- adt-release-i18n\n${JSON.stringify(metadata)}\n-->`;

    const localized = localizeGithubRelease(
      githubRelease(markedBody),
      "pt-BR",
    );

    expect(localized.body).toContain(warning);
    expect(localized.body).toContain("Manual reviewer note.");
    expect(localized.body).toContain("Controle criativo summary");
    expect(localized.body).not.toContain("English generated notes.");
    expect(localized.body).toContain('alt="Controle criativo"');
    expect(
      releaseExcerpt(localized.body, localized.localization?.summary),
    ).toBe("Controle criativo summary");
  });

  it("matches a regional locale by language", () => {
    const localized = localizeGithubRelease(githubRelease(body), "fr-CA");
    expect(localized.name).toBe("Contrôle créatif");
    expect(localized.body).toContain("Contrôle créatif summary");
  });

  it("falls back to English and strips malformed metadata", () => {
    const fallback = localizeGithubRelease(githubRelease(body), "de");
    expect(fallback.name).toBe("Creative Control");
    expect(fallback.body).toContain("Creative Control summary");
    expect(stripReleaseLocalizations(`${body}\n`)).not.toContain(
      "adt-release-i18n",
    );
    const malformed = githubRelease(
      "Notes\n<!-- adt-release-i18n\nnot-json\n-->",
    );
    expect(localizeGithubRelease(malformed, "fr").body).toBe("Notes");
  });
});

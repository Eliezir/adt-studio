import { describe, expect, it } from "vitest";
import {
  localizeGithubRelease,
  stripReleaseLocalizations,
} from "./release-i18n";
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
  const body = `<picture><img alt="English cover" src="https://example.com/light.png"></picture>\n\n## Creative Control\n\nEnglish notes.\n\n---\n\nFull diff: example\n\n<!-- adt-release-i18n\n${JSON.stringify(metadata)}\n-->`;

  it("selects an exact locale while preserving the cover and footer", () => {
    const localized = localizeGithubRelease(githubRelease(body), "pt-BR");
    expect(localized.body).toContain("<picture>");
    expect(localized.body).toContain('alt="Controle criativo"');
    expect(localized.body).toContain("## Controle criativo");
    expect(localized.body).toContain("### Adicionado");
    expect(localized.body).toContain("- Divida livros.");
    expect(localized.body).toContain("Full diff: example");
    expect(localized.body).not.toContain("adt-release-i18n");
  });

  it("matches a regional locale by language", () => {
    const localized = localizeGithubRelease(githubRelease(body), "fr-CA");
    expect(localized.body).toContain("## Contrôle créatif");
  });

  it("falls back to English and strips malformed metadata", () => {
    expect(localizeGithubRelease(githubRelease(body), "de").body).toContain(
      "## Creative Control",
    );
    expect(stripReleaseLocalizations(`${body}\n`)).not.toContain(
      "adt-release-i18n",
    );
    const malformed = githubRelease(
      "Notes\n<!-- adt-release-i18n\nnot-json\n-->",
    );
    expect(localizeGithubRelease(malformed, "fr").body).toBe("Notes");
  });
});

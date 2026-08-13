import type { GithubRelease } from "./useGithubReleases";

const LOCALIZATION_PATTERN = /<!--\s*adt-release-i18n\s*\n([\s\S]*?)-->/i;
const RELEASE_NOTICE_PATTERN =
  /<!--\s*adt-release-notice:start\s*-->[\s\S]*?<!--\s*adt-release-notice:end\s*-->/i;

export type LocalizedSection = {
  kind: string;
  heading: string;
  items: string[];
};

export type LocalizedRelease = {
  title: string;
  summary: string;
  coverAlt: string;
  sections: LocalizedSection[];
};

export type LocalizedGithubRelease = GithubRelease & {
  localization?: LocalizedRelease;
};

type LocalizationOptions = {
  fullDiffLabel?: string;
};

type ReleaseLocalizations = {
  schemaVersion: 1;
  defaultLocale: string;
  locales: Record<string, LocalizedRelease>;
};

export function localizeGithubRelease(
  release: GithubRelease,
  locale: string,
  options: LocalizationOptions = {},
): LocalizedGithubRelease {
  if (!release.body) return release;
  const localizations = parseReleaseLocalizations(release.body);
  const cleanBody = stripReleaseLocalizations(release.body);
  if (!localizations) return { ...release, body: cleanBody };
  const localized = resolveLocalization(localizations, locale);
  if (!localized) return { ...release, body: cleanBody };
  return {
    ...release,
    name: localized.title,
    body: renderLocalizedBody(cleanBody, localized, options),
    localization: localized,
  };
}

export function stripReleaseLocalizations(body: string): string {
  return body.replace(LOCALIZATION_PATTERN, "").trimEnd();
}

export function parseReleaseLocalizations(
  body: string,
): ReleaseLocalizations | undefined {
  const match = body.match(LOCALIZATION_PATTERN);
  if (!match) return undefined;
  try {
    const value: unknown = JSON.parse(match[1]);
    if (!isRecord(value) || value.schemaVersion !== 1) return undefined;
    if (typeof value.defaultLocale !== "string" || !isRecord(value.locales)) {
      return undefined;
    }
    const locales: Record<string, LocalizedRelease> = {};
    for (const [locale, candidate] of Object.entries(value.locales)) {
      const parsed = parseLocalizedRelease(candidate);
      if (parsed) locales[locale] = parsed;
    }
    if (!locales[value.defaultLocale]) return undefined;
    return {
      schemaVersion: 1,
      defaultLocale: value.defaultLocale,
      locales,
    };
  } catch {
    return undefined;
  }
}

function resolveLocalization(
  localizations: ReleaseLocalizations,
  requestedLocale: string,
): LocalizedRelease | undefined {
  const normalized = requestedLocale.toLowerCase();
  const exact = Object.entries(localizations.locales).find(
    ([locale]) => locale.toLowerCase() === normalized,
  )?.[1];
  if (exact) return exact;
  const language = normalized.split("-")[0];
  const languageMatch = Object.entries(localizations.locales).find(
    ([locale]) => locale.toLowerCase().split("-")[0] === language,
  )?.[1];
  return languageMatch ?? localizations.locales[localizations.defaultLocale];
}

function renderLocalizedBody(
  originalBody: string,
  localized: LocalizedRelease,
  options: LocalizationOptions,
): string {
  const releaseNotice = originalBody.match(RELEASE_NOTICE_PATTERN)?.[0];
  const originalPicture = originalBody.match(
    /<picture\b[\s\S]*?<\/picture>/i,
  )?.[0];
  const picture = originalPicture
    ? replaceImageAlt(originalPicture, localized.coverAlt)
    : undefined;
  const originalFooter = originalBody.match(/\n---\s*\n([\s\S]*?)\s*$/)?.[1];
  const footer = originalFooter
    ? localizeFooter(originalFooter, options.fullDiffLabel)
    : undefined;
  const sections = localized.sections
    .filter((section) => section.items.length > 0)
    .map(
      (section) =>
        `### ${section.heading}\n\n${section.items.map((item) => `- ${item}`).join("\n")}`,
    );
  return [
    releaseNotice,
    picture,
    localized.summary,
    ...sections,
    footer ? `---\n\n${footer.trim()}` : undefined,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function localizeFooter(footer: string, fullDiffLabel?: string): string {
  if (!fullDiffLabel) return footer;
  return footer.replace(
    /(\*{0,2})Full diff(\*{0,2})(\s*:)/i,
    (_match, opening: string, closing: string, suffix: string) =>
      `${opening}${fullDiffLabel}${closing}${suffix}`,
  );
}

function replaceImageAlt(picture: string, alt: string): string {
  const escaped = alt
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
  return picture.replace(/<img\b[^>]*>/i, (image) =>
    /\salt=["'][^"']*["']/i.test(image)
      ? image.replace(/\salt=["'][^"']*["']/i, ` alt="${escaped}"`)
      : image.replace(/>$/, ` alt="${escaped}">`),
  );
}

function parseLocalizedRelease(value: unknown): LocalizedRelease | undefined {
  if (!isRecord(value) || !isRecord(value.sections)) return undefined;
  const sectionEntries = Object.entries(value.sections);
  const sections = sectionEntries.flatMap(([kind, candidate]) => {
    const parsed = parseSection(kind, candidate);
    return parsed ? [parsed] : [];
  });
  if (
    typeof value.title !== "string" ||
    typeof value.summary !== "string" ||
    typeof value.coverAlt !== "string" ||
    sections.length === 0 ||
    sections.length !== sectionEntries.length
  ) {
    return undefined;
  }
  return {
    title: value.title,
    summary: value.summary,
    coverAlt: value.coverAlt,
    sections,
  };
}

function parseSection(
  kind: string,
  value: unknown,
): LocalizedSection | undefined {
  if (
    !kind.trim() ||
    !isRecord(value) ||
    typeof value.heading !== "string" ||
    !Array.isArray(value.items) ||
    !value.items.every((item) => typeof item === "string")
  ) {
    return undefined;
  }
  return { kind, heading: value.heading, items: value.items };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

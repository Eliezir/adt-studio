import { DEFAULT_LOCALE, LOCALES } from "@/i18n/locales";

/**
 * Locales (besides the default English) that ship a translated Overview —
 * i.e. a `content/docs/index.<locale>.mdx` file exists. When you add a
 * translated overview for a new locale, add the locale here.
 *
 * See `content/docs/README.md` for how MDX translation works.
 */
export const TRANSLATED_OVERVIEW_LOCALES: readonly string[] = LOCALES.filter(
  (l) => l !== DEFAULT_LOCALE,
);

/**
 * Given the English overview path (e.g. "index.mdx") and the active locale,
 * return the path of the localized MDX to render. Falls back to the English
 * file for the default locale or any locale without a translation, so the
 * page always renders something.
 */
export function overviewContentPath(enPath: string, locale: string): string {
  if (TRANSLATED_OVERVIEW_LOCALES.includes(locale)) {
    return enPath.replace(/\.mdx$/i, `.${locale}.mdx`);
  }
  return enPath;
}

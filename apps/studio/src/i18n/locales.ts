import type { MessageDescriptor } from "@lingui/core"
import { msg } from "@lingui/core/macro"

/**
 * Single source of truth for supported locales.
 *
 * When adding a new language:
 * 1. Add its BCP-47 code to LOCALES
 * 2. Add its display label to LOCALE_LABEL_MESSAGES
 * 3. Add its flag emoji to LOCALE_FLAGS
 * 4. Add its full English name to LOCALE_NAMES (used by the auto-translate script)
 * 5. Also update lingui.config.ts (cannot import from src/)
 *
 * See docs/I18N_ADD_LANGUAGE.md for the full guide.
 */
export const LOCALES = ["en", "pt-BR", "es"] as const
export type AppLocale = (typeof LOCALES)[number]

/** Translated display labels shown in the language switcher UI. */
export const LOCALE_LABEL_MESSAGES: Record<AppLocale, MessageDescriptor> = {
  en: msg`English`,
  "pt-BR": msg`Portuguese (BR)`,
  es: msg`Spanish`,
}

/** Flag emoji for each locale, shown in the language switcher UI. */
export const LOCALE_FLAGS: Record<AppLocale, string> = {
  en: "🇺🇸",
  "pt-BR": "🇧🇷",
  es: "🇪🇸",
}

/**
 * Full English language names used in the auto-translate script prompt.
 * Includes future/potential locales beyond the currently active ones.
 * Add an entry here when adding a new locale.
 */
export const LOCALE_NAMES: Record<string, string> = {
  "pt-BR": "Brazilian Portuguese",
  es: "Spanish",
  fr: "French",
}


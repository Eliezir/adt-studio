## Adding a new UI language (Studio)

This project uses **Inlang Message Format** JSON files compiled by **Paraglide JS** into tree-shakeable message functions.

### Locale codes (BCP-47)

Locale codes in this repo follow **BCP-47 language tags**.


### 1) Add the locale to the Inlang project

Edit `apps/studio/project.inlang/settings.json` and append the locale code to `locales`.

Example:

```json
{
  "baseLocale": "en",
  "locales": ["en", "pt-BR", "es", "fr"]
}
```

Locale codes should follow BCP-47 (e.g. `fr`, `fr-CA`, `pt-BR`).

### 2) Create the locale message file

Create:

- `apps/studio/messages/<locale>.json`

It must include the Inlang schema header:

```json
{
  "$schema": "https://inlang.com/schema/inlang-message-format"
}
```

Then add translations for the keys you need. The keys are shared across all locales.

### Message keys and naming convention

Paraglide compiles each message key into a **tree-shakeable function** (e.g. `m.storyboard_settings_save()`), which is why keys must be **stable** and **valid JS identifiers**.

Per the Paraglide docs, **keys should be flat, not nested** (no dot paths). Flat keys map cleanly to functions and keep the compiled output tree‑shakeable. See:

- **Message keys guide**: [Paraglide JS – Message keys and structure](https://inlang.com/m/gerre34r/library-inlang-paraglideJs/message-keys)
- **Paraglide JS docs (overview)**: [Paraglide JS documentation](https://inlang.com/m/gerre34r/library-inlang-paraglideJs)

Project convention:

- **Flat keys only** (no `nav.home`; prefer `nav_home`)
- **`snake_case`** for readability
- **Prefix by UI area**: e.g. `storyboard_settings_*`, `section_data_*`, `llm_logs_*`
- **Keep keys stable**: changing keys is a breaking change (affects all locales + compiled functions)


### 3) Add the locale to the language switcher

For the locale to be selectable in the UI, update the locale list in:

- `apps/studio/src/components/LocaleSwitcher.tsx`

Add a display label and a flag.

Example (adding French `fr`):

```ts
// LocaleSwitcher.tsx
type Locale = (typeof locales)[number]

const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  "pt-BR": "Português (BR)",
  es: "Español",
  fr: "Français",
}

const LOCALE_FLAGS: Record<Locale, string> = {
  en: "🇺🇸",
  "pt-BR": "🇧🇷",
  es: "🇪🇸",
  fr: "🇫🇷",
}
```

### 4) Verify URL routing behavior

The Studio uses Paraglide URL patterns for locale routing, e.g.:

- Base locale: `/...`
- Other locales: `/<locale>/...` (e.g. `/pt-BR/...`, `/es/...`)

Verify:

- Visiting a localized URL renders the correct locale.
- Navigating to an unlocalized URL returns to the base locale.

### 5) Sanity check

- Run `pnpm typecheck` and/or `pnpm lint`
- Open the app and spot-check key screens in the new locale.


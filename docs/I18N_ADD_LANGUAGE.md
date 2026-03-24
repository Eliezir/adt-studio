# Adding a new UI language (Studio)

This project uses **Lingui v5** with `.po` catalog files for i18n.

### Locale codes (BCP-47)

Locale codes follow **BCP-47 language tags** (e.g. `fr`, `fr-CA`, `pt-BR`).

---

### 1) Add the locale to `src/i18n/locales.ts`

This is the **single source of truth** for all locale metadata. Edit `apps/studio/src/i18n/locales.ts` and add the new locale to all four exports:

```ts
// 1. Add to the LOCALES tuple
export const LOCALES = ["en", "pt-BR", "es", "fr"] as const

// 2. Add a translated display label (shown in the language switcher)
export const LOCALE_LABEL_MESSAGES: Record<AppLocale, MessageDescriptor> = {
  // ...existing entries...
  fr: msg`French`,
}

// 3. Add a flag emoji
export const LOCALE_FLAGS: Record<AppLocale, string> = {
  // ...existing entries...
  fr: "🇫🇷",
}

// 4. Add the full English name (used by the auto-translate script)
export const LOCALE_NAMES: Record<string, string> = {
  // ...existing entries...
  fr: "French",
}
```

---

### 2) Also update `lingui.config.ts`

`lingui.config.ts` is read directly by the Lingui CLI and cannot import from `src/`, so it must be updated separately:

```ts
export default defineConfig({
  locales: ["en", "pt-BR", "es", "fr"],
  sourceLocale: "en",
  // ...
})
```

---

### 3) Generate the catalog file

Run the extract command to create the new `.po` file:

```bash
pnpm --filter @adt/studio extract
```

This generates `apps/studio/src/locales/fr.po` pre-populated with all existing message keys and empty `msgstr` entries.

---

### 4) Translate all messages

You can auto-fill all empty `msgstr` entries using the translate script:

```bash
OPENAI_API_KEY=<key> pnpm --filter @adt/studio translate:missing
```

This calls the OpenAI API and patches the `.po` file in place. CI runs this automatically when `OPENAI_API_KEY` is set as a repository secret.

Alternatively, translate manually by editing `apps/studio/src/locales/<locale>.po` directly:

```po
#: src/components/Sidebar.tsx
msgid "Books"
msgstr "Livres"
```

CI enforces that **no `msgstr` entries are left empty** in non-English locales.

---

### 5) Load the catalog in `main.tsx`

Edit `apps/studio/src/main.tsx` to import and register the new locale:

```ts
import { messages as frMessages } from "./locales/fr.po"

// Add to i18n.load():
i18n.load({ en: enMessages, "pt-BR": ptBRMessages, es: esMessages, fr: frMessages })
```

> `LOCALES` and `AppLocale` are now re-exported from `main.tsx` via `src/i18n/locales.ts` — no change needed there.

---

### 6) Update CLAUDE.md

Update the two references to the supported locale list in `CLAUDE.md`:

- The sentence: `All user-visible text in apps/studio/ must be translated to all supported locales: **en, pt-BR, es**`
- The `### Available locales` section listing each locale and its description

---

### 7) Verify

```bash
pnpm --filter @adt/studio extract   # Should produce no diff
pnpm --filter @adt/studio lint      # lingui/no-unlocalized-strings must pass
pnpm typecheck                      # Strict TypeScript check
```

Then run the dev server and switch to the new locale in the UI:

```bash
pnpm dev
```

Open `http://localhost:5173?lang=fr` and confirm the UI renders in French.

---

### Locale routing

The Studio uses a `?lang=<locale>` query parameter for locale selection:

- Default (no param or `?lang=en`): English
- Other locales: `?lang=pt-BR`, `?lang=es`, `?lang=fr`, etc.

The router strips the `lang` param from the URL internally and re-appends it on navigation (see `main.tsx`).

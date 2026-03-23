# Adding a new UI language (Studio)

This project uses **Lingui v5** with `.po` catalog files for i18n.

### Locale codes (BCP-47)

Locale codes follow **BCP-47 language tags** (e.g. `fr`, `fr-CA`, `pt-BR`).

---

### 1) Add the locale to `lingui.config.ts`

Edit `apps/studio/lingui.config.ts` and append the locale code to `locales`.

Example (adding French `fr`):

```ts
export default defineConfig({
  locales: ["en", "pt-BR", "es", "fr"],
  sourceLocale: "en",
  // ...
})
```

---

### 2) Generate the catalog file

Run the extract command to create the new `.po` file:

```bash
pnpm --filter @adt/studio extract
```

This generates `apps/studio/src/locales/fr.po` pre-populated with all existing message keys and empty `msgstr` entries.

---

### 3) Translate all messages

Open `apps/studio/src/locales/<locale>.po` and fill in every `msgstr` entry.

Example:

```po
#: src/components/Sidebar.tsx
msgid "Books"
msgstr "Livres"
```

CI enforces that **no `msgstr` entries are left empty** in non-English locales. The build will fail if any are missing.

---

### 4) Load the catalog in `main.tsx`

Edit `apps/studio/src/main.tsx` to import and register the new locale:

```ts
import { messages as frMessages } from "./locales/fr.po"

// Add to the LOCALES tuple:
export const LOCALES = ["en", "pt-BR", "es", "fr"] as const

// Add to i18n.load():
i18n.load({ en: enMessages, "pt-BR": ptBRMessages, es: esMessages, fr: frMessages })
```

---

### 5) Add the locale to the language switcher

Edit `apps/studio/src/components/LocaleSwitcher.tsx` and add a display label and flag:

```ts
const LOCALE_LABELS: Record<AppLocale, string> = {
  en: "English",
  "pt-BR": "Português (BR)",
  es: "Español",
  fr: "Français",
}

const LOCALE_FLAGS: Record<AppLocale, string> = {
  en: "🇺🇸",
  "pt-BR": "🇧🇷",
  es: "🇪🇸",
  fr: "🇫🇷",
}
```

The switcher renders all entries in `LOCALES` automatically — no other changes needed there.

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

# Documentation authoring guide

The **`docs/`** folder here holds the **ADT Studio documentation content**. It is
rendered by the unified site app (`apps/site`) — the same app that serves the
landing page — using [fumadocs](https://fumadocs.dev) on top of TanStack Start.
The site is built as a **static SPA** and deployed to GitHub Pages.

> This guide lives outside `docs/` on purpose: everything inside `docs/` is
> scanned and published, so the authoring guide sits one level up.

---

## 1. Where things live

```
apps/site/
├─ content/
│  ├─ README.md             ← this guide
│  └─ docs/                 ← all documentation content
│     ├─ meta.json          ← top-level sidebar order + section headers
│     ├─ index.mdx          ← the Overview (docs home) — English
│     ├─ index.pt-BR.mdx    ← Overview translated to Portuguese (BR)
│     ├─ index.es.mdx       ← Overview translated to Spanish
│     ├─ index.fr.mdx       ← Overview translated to French
│     ├─ install.mdx, faq.mdx, … ← individual pages
│     └─ pipeline/          ← a folder (nested section)
│        ├─ meta.json       ← the folder's title, icon, and page order
│        ├─ index.mdx       ← the folder's landing page ("Pipeline" overview)
│        └─ extract.mdx, …  ← the steps
├─ src/components/docs/     ← the docs UI (hero, cards, sidebar, search)
└─ src/lib/docs-i18n.ts     ← MDX translation helper (see §5)
```

`content/docs/` is the **single source of truth** — fumadocs scans every
`.md`/`.mdx` file in it. (Files there **must** have frontmatter; that's why this
guide lives in `content/`, not `content/docs/`.)

---

## 2. Add a new page

1. Create a file, e.g. `content/docs/my-page.mdx`.
2. Add frontmatter:
   ```mdx
   ---
   title: "My Page"
   description: "One sentence shown under the title and in search."
   icon: BookOpen        # optional — any lucide-react icon name
   ---

   Your Markdown / MDX content here.
   ```
3. List it in `meta.json` so it appears in the sidebar (see §3). **A page not
   listed in `meta.json` still builds and is reachable by URL, but won't show in
   the sidebar** — that's how the translated Overview files stay hidden.

### Available MDX components

These are registered globally (see `src/components/mdx.tsx`) and can be used in
any `.mdx` file without importing:

- `<DocsHero />` — the Overview hero (headline, search, popular links)
- `<GetStartedBanner />` — the gradient "Get started" cover card
- `<WhereToBegin />` — the colored entry-point card grid
- `<Principles />` — the three-up principles row

Standard fumadocs components (Callout, Tabs, Steps, etc.) are also available —
see the [fumadocs docs](https://fumadocs.dev/docs/ui).

---

## 3. Sidebar order & sections — `meta.json`

`meta.json` controls order and grouping. Strings wrapped in `---…---` render as
**section headers**; everything else is a page slug:

```json
{
  "pages": [
    "---Introduction---",
    "index",
    "---Get Started---",
    "install",
    "new-project",
    "---Learn---",
    "pipeline",
    "---Help---",
    "faq"
  ]
}
```

- Order in the array = order in the sidebar.
- Only listed pages appear; unlisted files are hidden.

### Folder (nested) sections

A subfolder (e.g. `pipeline/`) becomes a collapsible group. Its own `meta.json`
sets the `title`, `icon`, and child `pages`. Adding an `index.mdx` to the folder
makes the **group label itself a link** to that overview page — to get this,
**do not list `index` in the folder's `pages`** (fumadocs promotes it to the
folder's index automatically).

---

## 4. Translation — UI strings

The docs share the **landing page's language**: one locale switcher (the globe
in the top bar), persisted in `localStorage` + the `?lang=` query param. Locales
are defined once in `src/i18n/locales.ts` (`en`, `pt-BR`, `es`, `fr`).

All user-visible **UI** text (hero, cards, sidebar, search, buttons) uses
[Lingui](https://lingui.dev) macros — never hardcode visible strings:

```tsx
import { Trans, useLingui } from "@lingui/react/macro";
import { msg } from "@lingui/core/macro";

<Trans>Get started with ADT Studio</Trans>;             // JSX text
const { t } = useLingui(); t`Search the documentation…`;  // expressions
const label = msg`Quick Start`;                           // constants → i18n._(label)
```

After adding or changing any UI string:

```bash
pnpm --filter @adt/site extract     # updates src/locales/*.po
# then fill the new msgstr in es.po / pt-BR.po / fr.po
```

**CI enforces this:** `site-ci.yml` runs `extract` and fails if any string was
left unwrapped (the same check the landing page uses).

---

## 5. Translation — MDX content

UI strings live in components; the **prose inside `.mdx` files** is translated
with locale-suffixed files. To translate a page into locale `XX`, create a
sibling file `<page>.XX.mdx` with the same structure and translated text:

```
index.mdx        →  index.pt-BR.mdx   index.es.mdx   index.fr.mdx
```

The translated file can reuse the same components — only the Markdown prose and
frontmatter need translating; the components localize themselves via §4.

**How it's wired:** `src/lib/docs-i18n.ts#overviewContentPath` maps the active
locale to `index.<locale>.mdx`, and the Overview route renders that file
(falling back to English when no translation exists). This is currently enabled
for the **Overview only** — the demonstration the rest of the docs can follow.

To translate the Overview for a **new locale**: add the locale to
`src/i18n/locales.ts`, create `index.<locale>.mdx`, and it's picked up
automatically (the locale list drives `TRANSLATED_OVERVIEW_LOCALES`).

To extend MDX translation to **other pages**, apply the same
`overviewContentPath` pattern in the catch-all route (`src/routes/docs/$.tsx`):
derive the locale path and load it through the client loader with an English
fallback.

> Note: fumadocs also has a built-in path-based i18n (`/<locale>/docs/…`). We
> deliberately don't use it — this site uses **client-side** locale switching to
> stay in sync with the landing page and keep one URL per page.

---

## 6. Suggested structure (current + alternatives)

**Current** (audience: book producers / end users):

```
Introduction · Get Started · Learn · Help
```

Other ways the docs could be divided as they grow — pick one and keep it
consistent:

1. **Task / journey-based** — `Get Started` → `Guides` (How do I…?) →
   `Pipeline reference` → `Troubleshooting`. Best when most readers arrive to
   accomplish a specific task.
2. **Audience-based** — `For book producers` (using the app) vs.
   `For operators` (Docker, self-hosting, API keys, CI). Best if usage splits
   cleanly into two very different reader types.
3. **[Diátaxis](https://diataxis.fr/)** — `Tutorials` (learning) ·
   `How-to guides` (tasks) · `Reference` (the pipeline, stages, output bundle) ·
   `Explanation` (concepts, principles). Scales best for large doc sets and
   keeps each page's *purpose* unambiguous.

Whichever is chosen, the **Pipeline** section maps naturally to the real
pipeline DAG (`packages/types/src/pipeline.ts`) — keep its step pages aligned
with that source of truth.

---

## 7. Develop & verify

```bash
pnpm --filter @adt/site dev            # local dev server
pnpm --filter @adt/site run types:check
pnpm --filter @adt/site build          # static build → .output/public
pnpm --filter @adt/site extract        # update translation catalogs
```

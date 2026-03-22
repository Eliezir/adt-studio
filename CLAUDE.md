# ADT Studio

ADT Studio is a desktop-first application for automated book production — extracting content from PDFs, processing through LLM pipelines, and generating formatted output bundles.

## Tech Stack

- **Monorepo**: pnpm workspaces
- **Backend**: Hono (HTTP server), node-sqlite3-wasm (pure WASM SQLite), Zod
- **Frontend**: React + Vite SPA, TanStack (Router, Query, Table, Form), Tailwind CSS
- **Desktop**: Tauri v2 (sidecar-based — API server compiled to standalone binary)
- **Language**: TypeScript (strict mode)
- **Testing**: Vitest

## 6 Core Principles (Non-Negotiable)

1. **Book-Level Storage** — All book data lives in one directory (zippable, shareable). Never store book data elsewhere.
2. **Entity-Level Versioning** — NEVER overwrite entities. Always create new versions. Users must be able to roll back.
3. **LLM-Level Caching** — Cache at the LLM call level. Hash ordered inputs for cache keys. Reruns are fast if params unchanged.
4. **Maximum Transparency** — All LLM calls, prompts, and responses must be user-inspectable. No black boxes.
5. **Minimize Dependencies** — Avoid new deps. Flat files > database when sufficient. In-memory queues > external services.
6. **Pure JS/TS Over Native** — Always prefer pure JS/WASM libraries over native C/C++ bindings (e.g., node-sqlite3-wasm over better-sqlite3).

## Architecture

```
packages/          # Shared libraries (@adt/* workspace packages)
  types/           # Zod schemas — ALL types defined here
  pipeline/        # Extraction & generation — pure functions only
  llm/             # LLM client, prompts, caching, cost tracking
  pdf/             # PDF extraction
  output/          # Bundle packaging

apps/              # Application tier
  api/             # Hono HTTP server
  studio/          # React SPA (Vite)
  desktop/         # Tauri v2 desktop wrapper

templates/         # Layout templates
config/            # Global configuration
docs/              # Documentation (guidelines, architecture)
```

**Layer rule**: `studio/desktop` → (HTTP only) → `api` → (direct imports) → `packages/*`
Frontend MUST NOT import from packages directly. All data flows through the API.

**Exception**: `@adt/types` may be imported by `studio` for the shared `PIPELINE` definition and derived constants (stage/step names, ordering). No business logic — only type-level and constant data.

## Pipeline Architecture

The pipeline uses a **two-level DAG** model defined in a single source of truth: `packages/types/src/pipeline.ts`.

### Terminology

- **Stage** — A high-level grouping visible in the UI (e.g., Extract, Storyboard, Quizzes). Stages have inter-stage dependencies forming a DAG.
- **Step** — An atomic processing operation within a stage (e.g., `image-filtering`, `page-sectioning`). Steps have intra-stage dependencies. Steps within the same stage can run in parallel if their dependencies are met.

### Single Source of Truth

The `PIPELINE` constant in `@adt/types` defines all stages, their steps, labels, and dependency graphs. Everything else is derived:

- **CLI progress bars** — pre-created from `PIPELINE`
- **API step runner** — stage ordering and step groupings from `STAGE_ORDER`
- **UI sidebar, cards, indicators** — all derived from `PIPELINE`
- **DAG execution engine** — reads `PIPELINE` to build the execution graph

**Never hardcode stage/step ordering, names, or groupings outside of `PIPELINE`.** If you need a new derived lookup, add it to `packages/types/src/pipeline.ts` alongside the existing ones (`STAGE_ORDER`, `STEP_TO_STAGE`, `STAGE_BY_NAME`, `ALL_STEP_NAMES`).

## Commands

```bash
pnpm install       # Install dependencies
pnpm dev           # Run API + Studio dev servers
pnpm test          # Run tests
pnpm typecheck     # TypeScript strict check
pnpm lint          # Lint
pnpm build         # Build all packages
```

### Desktop Development

Prerequisites: [Rust toolchain](https://rustup.rs/) (Tauri CLI is already a local devDependency).

```bash
# Dev mode
pnpm --filter @adt/api build:sidecar   # Build sidecar binary + generate adt-resources.zip
pnpm dev                                # Start API + Studio dev servers (terminal 1)
pnpm dev:desktop                        # Start Tauri dev window (terminal 2)
# Note: run build:sidecar again whenever API code or assets/adt/ change

# Production build — self-contained, runs build:sidecar automatically via beforeBuildCommand
pnpm build:desktop
```

#### How the sidecar works

The API server is compiled into a standalone Node.js binary (`@yao-pkg/pkg`) and bundled inside the Tauri app as a **sidecar**. On launch, `lib.rs` spawns the sidecar, passing resource paths (prompts, config) via environment variables. The frontend detects the Tauri environment and routes API calls to `localhost:3001`.

Key files:
- `apps/api/scripts/bundle.mjs` — esbuild bundle (JS + WASM assets) + pre-builds web assets (`assets/adt/base.bundle.min.js`, `assets/adt/tailwind_output.css`) and creates `assets/adt-resources.zip` for Tauri resource bundling
- `apps/api/scripts/pkg.mjs` — Compile bundle → standalone binary, copy to `desktop/src-tauri/binaries/`
- `apps/desktop/src-tauri/src/lib.rs` — Sidecar spawn, env vars, lifecycle
- `apps/desktop/src-tauri/tauri.conf.json` — `externalBin`, `resources` mapping
- `apps/studio/src/api/client.ts` — Tauri base URL detection

### Releasing

Pushing a version tag triggers a GitHub Actions workflow that builds a Windows installer and creates a GitHub Release with auto-generated changelog.

```bash
git tag v0.2.0 && git push --tags   # Creates next release
```

Or create a new tag in the GitHub UI pointing at `main`.

## Internationalization (i18n)

The Studio app uses **Lingui v5** for i18n. All user-visible text in `apps/studio/` must be translated to all supported locales: **`en`, `pt-BR`, `es`**.

### Rules
- **Every user-visible string must be wrapped** in a Lingui macro — no raw string literals in JSX or component output
  - In React components: `const { t } = useLingui()` → `t\`Your string\``
  - In JSX content: `<Trans>Your string</Trans>`
  - In non-React code (utils, constants): `msg\`Your string\`` + `i18n._()` at runtime
- **After adding or changing any string**, run `pnpm --filter @adt/studio extract` to update all `.po` catalog files and commit them alongside the code change
- **All locales must be fully translated** — no empty `msgstr` entries in `es.po` or `pt-BR.po`
- CI enforces both rules automatically via the `i18n` job in `.github/workflows/ci.yml`

### Available locales
Defined in `apps/studio/lingui.config.ts` and `apps/studio/src/main.tsx`:
- `en` — English (source locale)
- `pt-BR` — Portuguese (Brazil)
- `es` — Spanish

### ESLint — hardcoded string detection
The `lingui/no-unlocalized-strings` rule in `apps/studio/eslint.config.js` flags raw strings that should be wrapped in a macro. It has an `ignoreNames` list for prop names whose values are never user-visible (e.g. `variant`, `className`, `href`).

**When adding a new prop or variable name that holds a non-translatable value** (e.g. a new component prop like `iconName` or `queryKey`):
1. Check if it's already in `ignoreNames` in `eslint.config.js`
2. If not, decide: is this value ever shown to the user as text?
   - **No** (it's a key, identifier, or config value) → add it to `ignoreNames`
   - **Yes** (it's displayed as UI text) → wrap the value in the appropriate macro instead
3. After updating `ignoreNames`, regenerate the suppressions baseline:
   ```bash
   cd apps/studio
   npx eslint src --suppressions-location ./eslint-suppressions.json --prune-suppressions
   npx eslint src --suppress-all --suppressions-location ./eslint-suppressions.json
   ```

### Adding a new language
See [`docs/I18N_ADD_LANGUAGE.md`](docs/I18N_ADD_LANGUAGE.md).

## Key Rules

- All types defined as Zod schemas in `packages/types/`, infer TS types with `z.infer<>`
- All API calls from frontend go through `apps/studio/src/api/client.ts` + TanStack Query
- Styling: Tailwind utility classes only — no CSS modules, no styled-components
- Server state: TanStack Query — no Redux, Zustand, or global stores; `useState` for UI-only state
- Routing: TanStack Router (type-safe), Forms: TanStack Form, Tables: TanStack Table
- Pipeline functions must be pure (no side effects, all deps as params)
- All user input validated with Zod (API layer)
- API keys: header-based (`X-OpenAI-Key`), never logged, never in URLs
- File paths: always validate against base directory (path traversal prevention)
- SQL: parameterized queries only

## Full Guidelines

For complete coding standards, security requirements, patterns, and anti-patterns, see [`docs/GUIDELINES.md`](docs/GUIDELINES.md).
For technology decisions and reasoning, see [`docs/DECISIONS.md`](docs/DECISIONS.md).

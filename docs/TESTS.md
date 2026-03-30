# E2E Tests

End-to-end tests using [Playwright](https://playwright.dev/).

## Prerequisites

- The development server must be accessible at `http://localhost:5173` (or `8080` if running via Docker).
- The `OPEN_AI_API_KEY` environment variable must be set (via `.env` at the project root or exported in the terminal).
- The `REUSE_SERVER` environment variable determines whether Playwright should reuse an existing development server (`true`) or start a new one (`false` or unset).
- The test PDF file must exist in `tests/fixtures/`. By default the test uses `raven.pdf`. To use a different file, set `BOOK_TEST_NAME` to the file name without the extension.

## Running

```bash
# Run all tests and open the report
pnpm e2e

# Run with interactive UI
pnpm e2e:watch

# Open the report from the last run
pnpm e2e:report
```

## Configuration

Defined in `playwright.config.ts`:

- **Test directory**: `e2e/`
- **Timeout**: 10 minutes per test
- **Browsers**: Chromium, Firefox, and WebKit
- **Server**: Starts `pnpm dev` automatically (reuses existing server outside CI)
- **Retries**: 2 in CI, 0 locally
- **Reporter**: HTML

## Tests

### `generation.spec.ts` — Generate book from PDF

Full end-to-end flow for generating a book from a PDF.

**Steps:**

1. **Cleanup** — Removes any directory under `books/` whose name starts with the base PDF name (e.g. `raven`, `raven-1743350400000`), preventing conflicts with previous runs.
2. **API key setup** — Opens the home page, fills in and saves the OpenAI key.
3. **PDF upload** — Navigates to `/books/new` and uploads the file via the drop zone.
4. **Book label** — Fills the label field with a unique name (`raven-<timestamp>`) and validates the value.
5. **Creation wizard** — Advances through the wizard steps and clicks "Create Storyboard".
6. **Extraction** — On the book page, starts the pipeline by clicking "Run" on the extraction stage and verifies the "Extracting..." label appears.
7. **Storyboard** — Verifies the "Building Storyboard..." label appears during generation.
8. **Preview** — Navigates to the preview page and verifies the message "A storyboard must be built before previewing" is displayed while the storyboard is not ready. Once generation completes, an iframe with the book result appears and the message disappears.

**Environment variables:**

| Variable | Required | Description |
|---|---|---|
| `OPEN_AI_API_KEY` | Yes | OpenAI API key |
| `BOOK_TEST_NAME` | No | Test PDF name without extension (default: `raven`) |
| `REUSE_SERVER` | No | if unset or false will call `pnpm dev`. 

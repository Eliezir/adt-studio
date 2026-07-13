#!/usr/bin/env node
// Docs MDX translation linter — the content-side counterpart to `lingui extract`
// (which checks UI strings). Content is organized in per-locale folders
// (fumadocs `parser: 'dir'`): `content/docs/en/…` is the source, and
// `content/docs/<locale>/…` mirrors it. This script:
//   • FAILS on structural errors:
//       - an orphan translation (a <locale>/<path> with no en/<path> source)
//       - a translated page missing a `title` in its frontmatter
//       - an unknown top-level folder (not a known locale)
//   • REPORTS coverage per locale (untranslated pages fall back to English, so
//     missing translations are a warning, not a failure).
//
// Run: node apps/site/scripts/check-translations.mjs
import { readdirSync, statSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const DOCS = fileURLToPath(new URL("../content/docs", import.meta.url));

// Keep in sync with src/i18n/locales.ts (can't import TS from a plain script).
const SOURCE_LOCALE = "en";
const TARGET_LOCALES = ["pt-BR", "es", "fr"];
const ALL_LOCALES = new Set([SOURCE_LOCALE, ...TARGET_LOCALES]);

function walk(dir, base = "") {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const rel = base ? `${base}/${entry}` : entry;
    if (statSync(full).isDirectory()) out.push(...walk(full, rel));
    else if (/\.mdx?$/.test(entry)) out.push(rel);
  }
  return out;
}

const hasTitle = (abs) =>
  /(^|\n)title:\s*\S/.test(readFileSync(abs, "utf8").slice(0, 400));

const errors = [];

// Unknown top-level folders (everything must be a locale folder).
for (const entry of readdirSync(DOCS)) {
  if (!statSync(join(DOCS, entry)).isDirectory()) continue;
  if (!ALL_LOCALES.has(entry)) {
    const guess = [...ALL_LOCALES].find((l) => l.toLowerCase() === entry.toLowerCase());
    errors.push(
      `unknown top-level folder "${entry}"` +
        (guess ? ` — did you mean "${guess}"?` : " — docs are organized in per-locale folders (en/, pt-BR/, …)"),
    );
  }
}

const enDir = join(DOCS, SOURCE_LOCALE);
if (!existsSync(enDir)) {
  console.error(`✗ missing source folder content/docs/${SOURCE_LOCALE}/`);
  process.exit(1);
}
const enPages = walk(enDir);
console.log(`English source pages (${SOURCE_LOCALE}/): ${enPages.length}\n`);

for (const loc of TARGET_LOCALES) {
  const dir = join(DOCS, loc);
  const have = new Set(existsSync(dir) ? walk(dir) : []);
  for (const t of have) {
    if (!enPages.includes(t))
      errors.push(`orphan: ${loc}/${t} has no ${SOURCE_LOCALE}/${t} source (page renamed or deleted?)`);
    else if (!hasTitle(join(dir, t)))
      errors.push(`${loc}/${t} is missing a "title" in its frontmatter`);
  }
  const translated = enPages.filter((p) => have.has(p));
  const missing = enPages.filter((p) => !have.has(p));
  const pct = Math.round((translated.length / Math.max(enPages.length, 1)) * 100);
  console.log(`${loc.padEnd(6)} ${translated.length}/${enPages.length} (${pct}%)`);
  if (missing.length) console.log(`       missing: ${missing.join(", ")}`);
}

if (errors.length) {
  console.error(`\n✗ ${errors.length} translation error(s):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("\n✓ no structural translation errors");

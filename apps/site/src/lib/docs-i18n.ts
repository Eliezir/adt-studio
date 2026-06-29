import { createElement, type ReactNode } from "react";
import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { DEFAULT_LOCALE, LOCALES } from "@/i18n/locales";

/**
 * Every doc content file, keyed relative to `content/docs` (e.g. "index.mdx",
 * "pt-BR/index.mdx", "pipeline/extract.mdx"). Used to detect whether a
 * translation actually exists before trying to load it. (Glob keys only — the
 * modules stay lazy.)
 */
const CONTENT_PATHS = new Set(
  Object.keys(
    import.meta.glob("/content/docs/**/*.{mdx,md}", { eager: false }),
  ).map((k) => k.replace(/^\/content\/docs\//, "")),
);

const LOCALE_PREFIX = new RegExp(`^(?:${LOCALES.join("|")})/`);

/**
 * Resolve the MDX file to render for a page in the active locale. Every locale
 * (including English) lives in its own folder mirroring the tree —
 * `en/pipeline/extract.mdx`, `fr/pipeline/extract.mdx`, … The page's `path`
 * comes from fumadocs with the locale stripped, so we normalize any leading
 * locale segment and prepend the active one, falling back to the English file
 * whenever a translation doesn't exist, so every page always renders.
 *
 * See `content/README.md` for the authoring workflow.
 */
export function localizedContentPath(path: string, locale: string): string {
  const base = path.replace(LOCALE_PREFIX, "");
  const candidate = `${locale}/${base}`;
  return CONTENT_PATHS.has(candidate) ? candidate : `${DEFAULT_LOCALE}/${base}`;
}

/**
 * Sidebar / nav labels. These come from MDX frontmatter `title` and the
 * `meta.json` section separators, so they can't be wrapped in JSX macros —
 * instead they're registered here (keyed by their English value) and applied
 * to the page tree at render time. Keep in sync with the docs frontmatter when
 * pages are added or renamed.
 */
const SIDEBAR_LABELS: Record<string, MessageDescriptor> = {
  // Section headers (meta.json separators)
  Introduction: msg`Introduction`,
  "Get Started": msg`Get Started`,
  Learn: msg`Learn`,
  Help: msg`Help`,
  // Top-level pages
  Overview: msg`Overview`,
  Installation: msg`Installation`,
  "Create a New Project": msg`Create a New Project`,
  "Quick Start": msg`Quick Start`,
  "Core Concepts": msg`Core Concepts`,
  Pipeline: msg`Pipeline`,
  Templates: msg`Templates`,
  "LLM Providers & API Keys": msg`LLM Providers & API Keys`,
  "Output Bundles": msg`Output Bundles`,
  "Troubleshooting & FAQ": msg`Troubleshooting & FAQ`,
  "Reporting Issues": msg`Reporting Issues`,
  "Community & Support": msg`Community & Support`,
  // Pipeline section
  "Pipeline Overview": msg`Pipeline Overview`,
  Extract: msg`Extract`,
  Sectioning: msg`Sectioning`,
  Storyboard: msg`Storyboard`,
  Quizzes: msg`Quizzes`,
  "Image Captions": msg`Image Captions`,
  Glossary: msg`Glossary`,
  "Table of Contents": msg`Table of Contents`,
  Translate: msg`Translate`,
  Speech: msg`Speech`,
  Package: msg`Package`,
};

/**
 * Self-translating sidebar label. Returning a component (rather than a
 * translated string) means the label re-renders on locale change via its own
 * Lingui subscription — fumadocs snapshots the page tree on mount and ignores
 * later `tree` prop changes, so a baked-in string would stay in the initial
 * locale. Renders the same `span.fd-page-tree-item-name` fumadocs uses.
 */
function TreeLabel({ label }: { label: MessageDescriptor }): ReactNode {
  const { i18n } = useLingui();
  return createElement(
    "span",
    { className: "fd-page-tree-item-name" },
    i18n._(label),
  );
}

/**
 * The English title behind a tree node `name`. fumadocs deserializes names as
 * a `<span dangerouslySetInnerHTML={{ __html }}>` (to allow markdown in
 * titles), so the plain text lives there.
 */
function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(?:39|x27);/g, "'");
}

function nameText(name: unknown): string | null {
  if (typeof name === "string") return name;
  if (name && typeof name === "object") {
    const props = (name as { props?: { dangerouslySetInnerHTML?: { __html?: unknown }; children?: unknown } }).props;
    const html = props?.dangerouslySetInnerHTML?.__html;
    if (typeof html === "string") return decodeEntities(html);
    if (typeof props?.children === "string") return props.children;
  }
  return null;
}

function translateName(name: unknown): unknown {
  const text = nameText(name);
  return text && SIDEBAR_LABELS[text]
    ? createElement(TreeLabel, { label: SIDEBAR_LABELS[text] })
    : name;
}

/**
 * Return a copy of a fumadocs page tree with every known node/separator name
 * replaced by a self-translating label (unknown names are left as-is). The
 * tree is built from English frontmatter, so this localizes the sidebar,
 * breadcrumb, and section headers without per-locale content files.
 */
export function translatePageTree<T>(tree: T): T {
  const walk = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(walk);
    if (node && typeof node === "object") {
      const next: Record<string, unknown> = { ...(node as Record<string, unknown>) };
      if ("name" in next) next.name = translateName(next.name);
      if (next.index) next.index = walk(next.index);
      if (Array.isArray(next.children)) next.children = next.children.map(walk);
      return next;
    }
    return node;
  };
  return walk(tree) as T;
}

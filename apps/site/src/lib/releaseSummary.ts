/**
 * Body parsers for release notes.
 *
 * We treat the GitHub release body as the source of truth and derive small
 * facets from it — first image, section counts, first paragraph excerpt —
 * for the home page cards and other compact surfaces.
 *
 * Everything here is plain text manipulation; no React, no markdown parsing
 * library, so it stays cheap to call on every card.
 */

const IMG_MARKDOWN = /!\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/;
const IMG_HTML = /<img[^>]+src=["']([^"']+)["'][^>]*>/i;
const PICTURE_BLOCK = /<picture>[\s\S]*?<\/picture>/i;
const SOURCE_LIGHT =
  /<source[^>]+media=["'][^"']*light[^"']*["'][^>]*srcset=["']([^"']+)["']/i;
const SOURCE_ANY = /<source[^>]+srcset=["']([^"']+)["']/i;

/**
 * A `srcset` value can carry density/width descriptors ("url 2x, url2 3x").
 * For a cover image we only want the first URL.
 */
function firstSrcsetUrl(srcset: string): string {
  return srcset.split(",")[0]?.trim().split(/\s+/)[0] ?? "";
}

/**
 * Reject placeholder hrefs like `https://github.com` (GitHub's `<picture>`
 * snippet ships a bare-host `<img src>` fallback that resolves to nothing
 * useful). A real image URL has a path beyond the host.
 */
function isUsableImage(url: string | undefined | null): url is string {
  if (!url) return false;
  try {
    const u = new URL(url, "https://example.invalid");
    return u.pathname.length > 1;
  } catch {
    return false;
  }
}

export function firstImageFromBody(
  body: string | null | undefined,
): string | null {
  if (!body) return null;

  // GitHub's light/dark `<picture>` snippet: prefer the light source (the
  // landing renders on a light surface), then any source, then the inner img.
  const picture = PICTURE_BLOCK.exec(body);
  if (picture) {
    const block = picture[0];
    const light = SOURCE_LIGHT.exec(block);
    const lightUrl = light && firstSrcsetUrl(light[1]);
    if (isUsableImage(lightUrl)) return lightUrl;
    const any = SOURCE_ANY.exec(block);
    const anyUrl = any && firstSrcsetUrl(any[1]);
    if (isUsableImage(anyUrl)) return anyUrl;
    const innerImg = IMG_HTML.exec(block);
    if (innerImg && isUsableImage(innerImg[1])) return innerImg[1];
  }

  const md = IMG_MARKDOWN.exec(body);
  if (md && isUsableImage(md[1])) return md[1];
  const html = IMG_HTML.exec(body);
  if (html && isUsableImage(html[1])) return html[1];
  return null;
}

export type ReleaseSection = {
  /** Trimmed heading text, e.g. "Added", "Fixed", "Performance". */
  title: string;
  /** Bullet count under this heading (counts top-level `- ` / `* ` lines). */
  count: number;
};

/**
 * Walk the body and group bullets under headings. Releases use one of two
 * shapes: categories as `## Added` / `## Fixed` directly, or a `## Summary`
 * title followed by `### Added` / `### Improved` category subsections.
 *
 * We collect both H2 and H3 headings; if any H3 headings exist we treat H3
 * as the category level (and the lone H2 is the release summary title), else
 * we fall back to H2. Returns at most five sections in document order.
 */
export function summarizeSections(
  body: string | null | undefined,
): ReleaseSection[] {
  if (!body) return [];
  const lines = body.replace(/\r\n/g, "\n").split("\n");

  const h2: ReleaseSection[] = [];
  const h3: ReleaseSection[] = [];
  let inCodeFence = false;
  let current: ReleaseSection | null = null;

  for (const raw of lines) {
    if (/^```/.test(raw)) {
      inCodeFence = !inCodeFence;
      continue;
    }
    if (inCodeFence) continue;

    const h3Match = /^###\s+(.+?)\s*$/.exec(raw);
    if (h3Match) {
      current = { title: cleanHeading(h3Match[1]), count: 0 };
      h3.push(current);
      continue;
    }
    const h2Match = /^##\s+(.+?)\s*$/.exec(raw);
    if (h2Match) {
      current = { title: cleanHeading(h2Match[1]), count: 0 };
      h2.push(current);
      continue;
    }

    if (current && /^\s{0,3}[-*]\s+\S/.test(raw)) {
      current.count += 1;
    }
  }

  const categories = h3.length > 0 ? h3 : h2;
  return categories.slice(0, 5);
}

function cleanHeading(text: string): string {
  return text.replace(/[#*_`]/g, "").trim();
}

/**
 * First paragraph of the body, with markdown noise stripped and images
 * removed. Capped to a couple of lines worth of plain text.
 */
export function firstParagraphFromBody(
  body: string | null | undefined,
  maxChars = 240,
): string {
  if (!body) return "";
  const cleaned = body
    .replace(/```[\s\S]*?```/g, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<picture>[\s\S]*?<\/picture>/gi, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/<img[^>]*>/gi, "")
    .replace(/<\/?(?:picture|source)[^>]*>/gi, "")
    .replace(/<details>[\s\S]*?<\/details>/gi, "");

  const lines = cleaned.split("\n");
  const paragraph: string[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      if (paragraph.length > 0) break;
      continue;
    }
    if (/^#{1,6}\s/.test(line)) {
      if (paragraph.length > 0) break;
      continue;
    }
    if (/^[-*]\s/.test(line) || /^\d+\.\s/.test(line)) {
      if (paragraph.length > 0) break;
      continue;
    }
    paragraph.push(line);
  }

  const text = paragraph
    .join(" ")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();

  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars - 1).replace(/\s+\S*$/, "")}…`;
}

/**
 * Map a section heading like "Added" / "Fixed" / "Performance" to a chip
 * palette key. Anything we don't recognize falls back to "neutral".
 */
export function sectionTone(title: string): SectionTone {
  const t = title.toLowerCase();
  if (/(add|new|feature|highlight|ship)/.test(t)) return "added";
  if (/(fix|bug|patch|resolve)/.test(t)) return "fixed";
  if (/(perf|speed|fast|optim)/.test(t)) return "perf";
  if (/(break|deprecat|remov)/.test(t)) return "breaking";
  if (/(change|update|tweak|improv)/.test(t)) return "changed";
  if (/(security|cve|vuln)/.test(t)) return "security";
  if (/(docs?|guide)/.test(t)) return "docs";
  return "neutral";
}

export type SectionTone =
  | "added"
  | "fixed"
  | "perf"
  | "changed"
  | "breaking"
  | "security"
  | "docs"
  | "neutral";

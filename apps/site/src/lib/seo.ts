import { appName } from "./shared";

const DEFAULT_TITLE = `${appName} — Turn any PDF into an accessible book`;
const DEFAULT_DESCRIPTION =
  "Open-source pipeline that turns PDFs into audio, translations, sign language, and structured HTML. Runs on your machine.";

export interface SeoOptions {
  /** Page title; the app name is appended automatically. Omit for the home title. */
  title?: string;
  description?: string;
}

/**
 * Per-route document head. Phase 2 ships title + description; the SEO phase
 * extends this with canonical URLs, Open Graph, and Twitter cards.
 */
export function seo(options: SeoOptions = {}) {
  const title = options.title ? `${options.title} — ${appName}` : DEFAULT_TITLE;
  const description = options.description ?? DEFAULT_DESCRIPTION;
  return {
    meta: [
      { title },
      { name: "description", content: description },
    ],
  };
}

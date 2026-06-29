import { useEffect, useState } from "react";
import { localizedContentPath } from "@/lib/docs-i18n";

interface PreloadableLoader {
  preload: (path: string) => unknown;
}

/**
 * Resolve which MDX file the client loader should render for the active locale.
 *
 * The docs are prerendered in the default locale, and locale content modules
 * are lazy. If we switched the rendered path to a not-yet-loaded localized
 * module, its Suspense boundary would flash empty — and during hydration that
 * empty differs from the prerendered HTML, causing a mismatch.
 *
 * So we render the default-locale path first (it's already preloaded by the
 * route loader, so it matches the prerendered HTML), and only swap to the
 * localized file once its module has finished preloading. `enPath` changes on
 * navigation reset the resolved path during render so we never render a stale
 * page's content.
 */
export function useLocalizedContent(
  clientLoader: PreloadableLoader,
  enPath: string,
  locale: string,
): string {
  const [resolved, setResolved] = useState(enPath);
  const [prevEnPath, setPrevEnPath] = useState(enPath);
  if (prevEnPath !== enPath) {
    setPrevEnPath(enPath);
    setResolved(enPath);
  }

  useEffect(() => {
    const target = localizedContentPath(enPath, locale);
    // Switching to the default locale (or a page with no translation): the
    // English module is already loaded, so swap back immediately. (Without this
    // the content would stay in the previously-selected locale until a reload.)
    if (target === enPath) {
      setResolved(enPath);
      return;
    }
    let cancelled = false;
    Promise.resolve(clientLoader.preload(target)).then(() => {
      if (!cancelled) setResolved(target);
    });
    return () => {
      cancelled = true;
    };
  }, [clientLoader, enPath, locale]);

  return resolved;
}

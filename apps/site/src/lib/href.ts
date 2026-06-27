const BASE = import.meta.env.BASE_URL || "/";

/**
 * Prefix an app-internal path with the deployment base (e.g. "/adt-studio/" on
 * GitHub Pages, "/" locally). Plain <a href> anchors are root-absolute and
 * ignore the router basepath, so cross-page links break under a subpath deploy
 * unless they carry the base. Pass paths with or without a leading slash;
 * fragments ("#features") and "home + fragment" ("/#features") both work.
 */
export function withBase(path: string): string {
  return `${BASE}${path.replace(/^\//, "")}`;
}

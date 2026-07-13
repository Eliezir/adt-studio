declare global {
  interface Window {
    _paq?: unknown[][];
  }
}

function push(...args: unknown[]): void {
  (window._paq ??= []).push(args);
}

export function trackPageView(title: string, url: string): void {
  push("setCustomUrl", url);
  push("setDocumentTitle", title);
  push("trackPageView");
}

export function trackEvent(
  category: string,
  action: string,
  name?: string,
  value?: number,
): void {
  const extra: unknown[] = [];
  if (name !== undefined) extra.push(name);
  if (value !== undefined) extra.push(value);
  push("trackEvent", category, action, ...extra);
}

export function trackDownload(
  platform: string,
  filename: string,
): void {
  trackEvent("download", platform, filename);
}

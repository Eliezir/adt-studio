import { useEffect, useState } from "react";

/**
 * Returns the platform's command-key glyph for keyboard hints: "⌘" on Apple
 * devices, "Ctrl" elsewhere. Defaults to "⌘" so SSR and the first client
 * render agree, then corrects after mount.
 */
export function useModKey(): string {
  const [mod, setMod] = useState("⌘");

  useEffect(() => {
    const ua = `${navigator.platform} ${navigator.userAgent}`;
    setMod(/mac|iphone|ipad|ipod/i.test(ua) ? "⌘" : "Ctrl");
  }, []);

  return mod;
}

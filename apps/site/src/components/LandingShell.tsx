import type { ReactNode } from "react";
import { Trans } from "@lingui/react/macro";
import { SiteNav } from "@/components/nav/SiteNav";
import { Footer } from "@/components/sections/Footer";

export function LandingShell({ children, footer = true }: { children: ReactNode; footer?: boolean }) {
  return (
    <div className="site-shell min-h-screen bg-white font-sans text-ink antialiased">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-white focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2"
      >
        <Trans>Skip to content</Trans>
      </a>
      <SiteNav />
      <main id="main">{children}</main>
      {footer ? <Footer /> : null}
    </div>
  );
}

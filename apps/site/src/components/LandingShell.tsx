import type { ReactNode } from "react";
import { SiteNav } from "@/components/nav/SiteNav";
import { Footer } from "@/components/sections/Footer";

export function LandingShell({ children, footer = true }: { children: ReactNode; footer?: boolean }) {
  return (
    <div className="site-shell min-h-screen bg-white font-sans text-ink antialiased">
      <SiteNav />
      <main>{children}</main>
      {footer ? <Footer /> : null}
    </div>
  );
}

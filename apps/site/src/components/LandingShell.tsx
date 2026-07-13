import type { ReactNode } from "react";
import { Nav } from "@/components/sections/Nav";
import { Footer } from "@/components/sections/Footer";

export function LandingShell({
  children,
  isHome = false,
}: {
  children: ReactNode;
  isHome?: boolean;
}) {
  return (
    <div className="landing-light min-h-screen bg-[color:var(--color-background)] text-[color:var(--color-foreground)]">
      <Nav isHome={isHome} />
      <main>{children}</main>
      <Footer />
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { LandingShell } from "@/components/LandingShell";
import { Hero } from "@/components/sections/Hero";
import { ReaderFeatures } from "@/components/sections/ReaderFeatures";
import { Demos } from "@/components/sections/Demos";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { Providers } from "@/components/sections/Providers";
import { OpenPrinciples } from "@/components/sections/OpenPrinciples";
import { DownloadCta } from "@/components/sections/DownloadCta";
import { Footer } from "@/components/sections/Footer";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => seo(),
});

function Home() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("landing-smooth");
    const hash = window.location.hash.replace(/^#/, "");
    if (hash) {
      requestAnimationFrame(() => {
        document.getElementById(hash)?.scrollIntoView({ behavior: "auto", block: "start" });
      });
    }
    return () => root.classList.remove("landing-smooth");
  }, []);

  return (
    <LandingShell footer={false}>
      <Hero />
      <ReaderFeatures />
      <Demos />
      <HowItWorks />
      <Providers />
      <div className="noise relative isolate overflow-hidden bg-ink">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 [background:radial-gradient(60%_34%_at_50%_26%,color-mix(in_oklch,var(--color-brand)_34%,transparent),transparent_72%),radial-gradient(45%_30%_at_88%_74%,color-mix(in_oklch,var(--color-brand)_26%,transparent),transparent_70%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:72px_72px] [mask-image:radial-gradient(70%_55%_at_50%_50%,black,transparent)]"
        />
        <DownloadCta />
        <OpenPrinciples />
        <Footer />
      </div>
    </LandingShell>
  );
}

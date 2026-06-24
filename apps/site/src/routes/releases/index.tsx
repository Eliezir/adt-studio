import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { LandingShell } from "@/components/LandingShell";
import { ReleasesPage } from "@/components/pages/ReleasesPage";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/releases/")({
  component: Releases,
  head: () =>
    seo({
      title: "Releases",
      description:
        "Release notes and downloads for every version of ADT Studio.",
    }),
});

function Releases() {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  return (
    <LandingShell>
      <ReleasesPage />
    </LandingShell>
  );
}

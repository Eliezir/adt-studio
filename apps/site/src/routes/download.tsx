import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { LandingShell } from "@/components/LandingShell";
import { DownloadPage } from "@/components/pages/DownloadPage";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/download")({
  component: Download,
  head: () =>
    seo({
      title: "Download",
      description:
        "Download ADT Studio for macOS, Windows, and Linux, or run it with Docker.",
    }),
});

function Download() {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  return (
    <LandingShell>
      <DownloadPage />
    </LandingShell>
  );
}

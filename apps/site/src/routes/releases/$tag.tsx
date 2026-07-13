import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { LandingShell } from "@/components/LandingShell";
import { ReleasesPage } from "@/components/pages/ReleasesPage";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/releases/$tag")({
  component: Release,
  head: ({ params }) =>
    seo({
      title: `Release ${params.tag}`,
      description: `Release notes for ADT Studio ${params.tag}.`,
    }),
});

function Release() {
  const { tag } = Route.useParams();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  return (
    <LandingShell>
      <ReleasesPage focusTag={tag} />
    </LandingShell>
  );
}

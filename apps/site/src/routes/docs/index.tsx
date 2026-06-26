import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { staticFunctionMiddleware } from "@tanstack/start-static-server-functions";
import { DocsLayout } from "fumadocs-ui/layouts/notebook";
import { DocsBody, DocsPage } from "fumadocs-ui/layouts/notebook/page";
import { useFumadocsLoader } from "fumadocs-core/source/client";
import browserCollections from "collections/browser";
import { Suspense } from "react";
import { baseOptions } from "@/lib/layout.shared";
import { slugsToMarkdownPath, source } from "@/lib/source";
import { SidebarBanner } from "@/components/docs/SidebarBanner";
import { PageHeader } from "@/components/docs/PageHeader";
import { useMDXComponents } from "@/components/mdx";
import { seo } from "@/lib/seo";

const loader = createServerFn({ method: "GET" })
  .middleware([staticFunctionMiddleware])
  .handler(async () => {
    const page = source.getPage([]);
    if (!page) throw notFound();

    return {
      path: page.path,
      markdownUrl: slugsToMarkdownPath(page.slugs).url,
      pageTree: await source.serializePageTree(source.getPageTree()),
    };
  });

const clientLoader = browserCollections.docs.createClientLoader({
  component(
    { toc, frontmatter, default: MDX },
    { markdownUrl, path }: { markdownUrl: string; path: string },
  ) {
    return (
      <DocsPage toc={toc} breadcrumb={{ enabled: false }}>
        <PageHeader
          title={frontmatter.title}
          description={frontmatter.description}
        />
        <DocsBody>
          <MDX components={useMDXComponents()} />
        </DocsBody>
      </DocsPage>
    );
  },
});

export const Route = createFileRoute("/docs/")({
  component: Page,
  loader: async () => {
    const data = await loader();
    await clientLoader.preload(data.path);
    return data;
  },
  head: () =>
    seo({
      title: "Documentation",
      description:
        "Learn how to turn any PDF into an accessible book with ADT Studio.",
    }),
});

function Page() {
  const { pageTree, path, markdownUrl } = useFumadocsLoader(
    Route.useLoaderData(),
  );
  const base = baseOptions();

  return (
    <DocsLayout
      {...base}
      nav={{ ...base.nav, mode: "auto" }}
      sidebar={{ banner: <SidebarBanner />, collapsible: false }}
      tree={pageTree}
    >
      <Link to={markdownUrl} hidden />
      <Suspense>{clientLoader.useContent(path, { markdownUrl, path })}</Suspense>
    </DocsLayout>
  );
}

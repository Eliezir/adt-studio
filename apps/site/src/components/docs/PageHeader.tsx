import { DocsDescription, DocsTitle } from "fumadocs-ui/layouts/notebook/page";
import { useTreeContext, useTreePath } from "fumadocs-ui/contexts/tree";
import { getBreadcrumbItemsFromPath } from "fumadocs-core/breadcrumb";
import type { ReactNode } from "react";

/**
 * Section eyebrow above the page title — the name of the sidebar group the
 * page belongs to (e.g. "Overview", "Get Started"). Derived from the page
 * tree, so it stays correct as the nav changes. Separators carry the group
 * name, which `useTreePath` includes in the path.
 */
function Eyebrow() {
  const { root } = useTreeContext();
  const path = useTreePath();
  const items = getBreadcrumbItemsFromPath(root, path, {
    includeSeparator: true,
    includePage: false,
  });
  const label = items.at(-1)?.name;
  if (!label) return null;

  return (
    <span className="mb-2 block text-sm text-fd-muted-foreground">{label}</span>
  );
}

export function PageHeader({
  title,
  description,
}: {
  title: ReactNode;
  description?: ReactNode;
}) {
  return (
    <div className="mb-8">
      <Eyebrow />
      <DocsTitle className="mb-0">{title}</DocsTitle>
      {description ? (
        <DocsDescription className="mb-0 mt-2">{description}</DocsDescription>
      ) : null}
    </div>
  );
}

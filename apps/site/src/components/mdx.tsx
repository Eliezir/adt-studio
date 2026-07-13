import defaultMdxComponents from 'fumadocs-ui/mdx';
import { Step, Steps } from 'fumadocs-ui/components/steps';
import type { MDXComponents } from 'mdx/types';
import { DocsHero } from '@/components/docs/DocsHero';
import { GetStartedBanner } from '@/components/docs/GetStartedBanner';
import { WhereToBegin, Principles } from '@/components/docs/OverviewSections';

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    Step,
    Steps,
    DocsHero,
    GetStartedBanner,
    WhereToBegin,
    Principles,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}

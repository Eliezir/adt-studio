import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { Trans } from '@lingui/react/macro';
import { Button } from '@/components/Button';
import { GithubIcon } from '@/components/icons/GithubIcon';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { appName, gitConfig } from './shared';
import { withBase } from './href';

export function baseOptions(): BaseLayoutProps {
  const githubUrl = `https://github.com/${gitConfig.user}/${gitConfig.repo}`;

  return {
    nav: {
      url: '/docs',
      title: (
        <div className="flex items-center gap-2 px-1">
          <img
            src={`${import.meta.env.BASE_URL}logo.png`}
            alt="ADT Studio logo"
            width={36}
            height={36}
            className="rounded-lg"
          />
          <span className="text-xl font-bold tracking-tight">
            {appName}
          </span>
        </div>
      ),
      // Below md, fumadocs only renders the logo + sidebar trigger in the top
      // bar (the link cluster moves into the sidebar). Surface the language
      // picker here too — like the landing page top bar — pinned next to the
      // hamburger via the `data-docs-mobile-lang` hook (see app.css). md+ keeps
      // it in the right-hand cluster below.
      children: (
        <div data-docs-mobile-lang className="md:hidden">
          <LocaleSwitcher />
        </div>
      ),
    },
    // Mirror the landing-page top bar: Star on GitHub, Download, language
    // picker. Rendered as a single custom secondary item so the cluster sits
    // on the right of the docs sub-nav with the same components and order.
    links: [
      {
        type: 'custom',
        secondary: true,
        children: (
          // Below lg, fumadocs re-renders this cluster inside the sidebar. On
          // mobile (< md) we hide it there and surface the language picker in
          // the top bar instead (see nav.children); on tablet (md–lg) it stays
          // in the sidebar as before.
          <div className="flex items-center gap-2 max-md:hidden">
            <Button
              href={githubUrl}
              target="_blank"
              rel="noreferrer noopener"
              variant="ghost"
              size="md"
              className="hidden h-9 gap-1.5 px-3 text-[13px] sm:inline-flex"
            >
              <GithubIcon className="h-3.5 w-3.5" />
              <Trans>Star</Trans>
            </Button>
            <Button
              href={withBase("/download")}
              variant="primary"
              size="md"
              className="hidden h-9 px-4 text-[13px] sm:inline-flex"
            >
              <Trans>Download</Trans>
            </Button>
            <LocaleSwitcher />
          </div>
        ),
      },
    ],
    searchToggle: { enabled: false },
    // The docs are light-only (matching the landing page) — no dark mode.
    themeSwitch: { enabled: false },
  };
}

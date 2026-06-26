import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { appName, gitConfig } from './shared';

export function baseOptions(): BaseLayoutProps {
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
    },
    links: [
      { type: 'button', text: 'Download', url: '/download', external: true },
    ],
    searchToggle: { enabled: false },
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
  };
}

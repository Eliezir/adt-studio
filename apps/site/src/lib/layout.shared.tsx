import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { appName, gitConfig } from './shared';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      url: '/',
      title: (
        <>
          <img
            src={`${import.meta.env.BASE_URL}logo.png`}
            alt=""
            width={26}
            height={26}
            className="rounded-lg"
          />
          <span className="text-[15px] font-bold tracking-tight">
            {appName}
          </span>
        </>
      ),
    },
    links: [
      { text: 'Home', url: '/' },
      { type: 'button', text: 'Download', url: '/download' },
    ],
    // Kaneo-style: search lives in the sidebar (banner), not the top bar.
    searchToggle: { enabled: false },
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
  };
}

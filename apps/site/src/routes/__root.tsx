import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
  useRouterState,
} from '@tanstack/react-router';
import * as React from 'react';
import { I18nProvider } from '@lingui/react';
import { i18n } from '@lingui/core';
import appCss from '@/styles/app.css?url';
import { RootProvider } from 'fumadocs-ui/provider/tanstack';
import SearchDialog from '@/components/search';
import { activateDetectedLocale } from '@/i18n/setup';
import { trackPageView } from '@/lib/matomo';
import { seo } from '@/lib/seo';

const MATOMO_SNIPPET = `
var _paq = window._paq = window._paq || [];
_paq.push(['enableLinkTracking']);
(function() {
  var u="//observa.unicef.org/";
  _paq.push(['setTrackerUrl', u+'matomo.php']);
  _paq.push(['setSiteId', '148']);
  var d=document, g=d.createElement('script'), s=d.getElementsByTagName('script')[0];
  g.async=true; g.src=u+'matomo.js'; s.parentNode.insertBefore(g,s);
})();
`;

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      ...seo().meta,
    ],
    links: [
      { rel: 'icon', href: `${import.meta.env.BASE_URL}favicon.ico` },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400;1,700&display=swap',
      },
      { rel: 'stylesheet', href: appCss },
    ],
  }),
  component: RootComponent,
});

function MatomoTracker() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    trackPageView(document.title, window.location.href);
  }, [pathname]);

  return null;
}

function LocaleInitializer() {
  React.useEffect(() => {
    activateDetectedLocale();
  }, []);

  return null;
}

function RootComponent() {
  return (
    <html suppressHydrationWarning>
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: MATOMO_SNIPPET }} />
      </head>
      <body className="flex flex-col min-h-screen">
        <I18nProvider i18n={i18n}>
          <RootProvider search={{ SearchDialog }} theme={{ enabled: false }}>
            <LocaleInitializer />
            <MatomoTracker />
            <Outlet />
          </RootProvider>
        </I18nProvider>
        <Scripts />
      </body>
    </html>
  );
}

'use client';
import {
  SearchDialog,
  SearchDialogClose,
  SearchDialogContent,
  SearchDialogHeader,
  SearchDialogIcon,
  SearchDialogInput,
  SearchDialogList,
  SearchDialogOverlay,
  type SharedProps,
} from 'fumadocs-ui/components/dialog/search';
import { useDocsSearch } from 'fumadocs-core/search/client';
import { oramaStaticClient } from 'fumadocs-core/search/client/orama-static';
import { create } from '@orama/orama';
import { useI18n } from 'fumadocs-ui/contexts/i18n';
import { withBase } from '@/lib/href';
import { ORAMA_LANGUAGE, type AppLocale } from '@/i18n/locales';

// Each locale's index partition is tokenized in its own language, so the client
// must build a matching Orama instance to query it. fumadocs passes the
// partition key (the locale) — undefined for the default partition.
// https://docs.orama.com/docs/orama-js/supported-languages
function initOrama(locale?: string) {
  return create({
    schema: { _: 'string' },
    language: ORAMA_LANGUAGE[locale as AppLocale] ?? 'english',
  });
}

export default function DefaultSearchDialog(props: SharedProps) {
  const { locale } = useI18n(); // (optional) for i18n
  const { search, setSearch, query } = useDocsSearch({
    client: oramaStaticClient({
      // The static index is prerendered under the deployment base (e.g.
      // /adt-studio/api/search on GitHub Pages), so fetch it base-aware.
      from: withBase('/api/search'),
      initOrama,
      locale,
    }),
  });

  return (
    <SearchDialog search={search} onSearchChange={setSearch} isLoading={query.isLoading} {...props}>
      <SearchDialogOverlay />
      <SearchDialogContent>
        <SearchDialogHeader>
          <SearchDialogIcon />
          <SearchDialogInput />
          <SearchDialogClose />
        </SearchDialogHeader>
        <SearchDialogList items={query.data !== 'empty' ? query.data : null} />
      </SearchDialogContent>
    </SearchDialog>
  );
}

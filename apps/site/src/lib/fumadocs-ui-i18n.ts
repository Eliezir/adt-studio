import { defineI18n } from "fumadocs-core/i18n";
import { defineI18nUI } from "fumadocs-ui/i18n";
import type { I18nProviderProps } from "fumadocs-ui/contexts/i18n";
import { DEFAULT_LOCALE, LOCALES } from "@/i18n/locales";

/**
 * Translations for fumadocs' built-in UI chrome — the table of contents,
 * search dialog, pagination, code blocks, sidebar/mobile controls, page
 * actions, etc. These are NOT our own components, so they can't be wrapped in
 * Lingui macros; fumadocs exposes them as a keyed dictionary instead
 * (https://fumadocs.dev/docs/ui/translations).
 *
 * English is fumadocs' default — any key omitted for a locale falls back to it.
 * Keep this list to strings that are actually visible in our setup (no theme
 * switcher, no edit-on-GitHub, 404s redirect home).
 */
const i18nUI = defineI18nUI(
  defineI18n({ languages: [...LOCALES], defaultLanguage: DEFAULT_LOCALE }),
  {
    en: { displayName: "English" },
    "pt-BR": {
      displayName: "Português (BR)",
      "On this page(table of contents)": "Nesta página",
      "No Headings(table of contents)": "Sem títulos",
      "Table of Contents(inline table of contents)": "Sumário",
      "Search(search dialog)": "Buscar",
      "Search(search trigger)": "Buscar",
      "No results found(search dialog)": "Nenhum resultado encontrado",
      "Close Search(search dialog)(aria-label)": "Fechar busca",
      "Open Search(search trigger)(aria-label)": "Abrir busca",
      "Next Page(pagination)": "Próxima página",
      "Previous Page(pagination)": "Página anterior",
      "Collapse Sidebar(sidebar)(aria-label)": "Recolher barra lateral",
      "Open Sidebar(sidebar)(aria-label)": "Abrir barra lateral",
      "Toggle Menu(mobile menu)(aria-label)": "Alternar menu",
      "Copy Text(code block)(aria-label)": "Copiar",
      "Copied Text(code block)(aria-label)": "Copiado",
      "Copy Anchor Link(heading anchor)(aria-label)": "Copiar link",
      "Copy Markdown(page actions)": "Copiar Markdown",
      "View as Markdown(page actions)": "Ver como Markdown",
      "Open(page actions)": "Abrir",
    },
    es: {
      displayName: "Español",
      "On this page(table of contents)": "En esta página",
      "No Headings(table of contents)": "Sin encabezados",
      "Table of Contents(inline table of contents)": "Tabla de contenidos",
      "Search(search dialog)": "Buscar",
      "Search(search trigger)": "Buscar",
      "No results found(search dialog)": "No se encontraron resultados",
      "Close Search(search dialog)(aria-label)": "Cerrar búsqueda",
      "Open Search(search trigger)(aria-label)": "Abrir búsqueda",
      "Next Page(pagination)": "Página siguiente",
      "Previous Page(pagination)": "Página anterior",
      "Collapse Sidebar(sidebar)(aria-label)": "Contraer barra lateral",
      "Open Sidebar(sidebar)(aria-label)": "Abrir barra lateral",
      "Toggle Menu(mobile menu)(aria-label)": "Alternar menú",
      "Copy Text(code block)(aria-label)": "Copiar",
      "Copied Text(code block)(aria-label)": "Copiado",
      "Copy Anchor Link(heading anchor)(aria-label)": "Copiar enlace",
      "Copy Markdown(page actions)": "Copiar Markdown",
      "View as Markdown(page actions)": "Ver como Markdown",
      "Open(page actions)": "Abrir",
    },
    fr: {
      displayName: "Français",
      "On this page(table of contents)": "Sur cette page",
      "No Headings(table of contents)": "Aucun titre",
      "Table of Contents(inline table of contents)": "Table des matières",
      "Search(search dialog)": "Rechercher",
      "Search(search trigger)": "Rechercher",
      "No results found(search dialog)": "Aucun résultat",
      "Close Search(search dialog)(aria-label)": "Fermer la recherche",
      "Open Search(search trigger)(aria-label)": "Ouvrir la recherche",
      "Next Page(pagination)": "Page suivante",
      "Previous Page(pagination)": "Page précédente",
      "Collapse Sidebar(sidebar)(aria-label)": "Réduire la barre latérale",
      "Open Sidebar(sidebar)(aria-label)": "Ouvrir la barre latérale",
      "Toggle Menu(mobile menu)(aria-label)": "Basculer le menu",
      "Copy Text(code block)(aria-label)": "Copier",
      "Copied Text(code block)(aria-label)": "Copié",
      "Copy Anchor Link(heading anchor)(aria-label)": "Copier le lien",
      "Copy Markdown(page actions)": "Copier le Markdown",
      "View as Markdown(page actions)": "Voir en Markdown",
      "Open(page actions)": "Ouvrir",
    },
  },
);

/**
 * Build the fumadocs i18n provider props for the active locale. We strip
 * `locales` (and any `onLocaleChange`) so fumadocs does NOT render its own
 * language switcher / locale-redirect — the shared top-bar LocaleSwitcher is
 * the single source of truth for language, driven client-side by Lingui.
 */
export function docsUiI18n(locale: string): I18nProviderProps {
  const { locales: _locales, onLocaleChange: _onLocaleChange, ...rest } =
    i18nUI.provider(locale);
  return rest;
}

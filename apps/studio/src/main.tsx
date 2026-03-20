import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { RouterProvider, createRouter } from "@tanstack/react-router"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { messages as enMessages } from "./locales/en.po"
import { messages as ptBRMessages } from "./locales/pt-BR.po"
import { messages as esMessages } from "./locales/es.po"
import { routeTree } from "./routeTree.gen"
import "./styles/globals.css"

export const LOCALES = ["en", "pt-BR", "es"] as const
export type AppLocale = (typeof LOCALES)[number]

function detectLocale(): AppLocale {
  const stored = localStorage.getItem("adt_locale") as AppLocale | null
  if (stored && LOCALES.includes(stored)) return stored
  const lang = navigator.language
  if (LOCALES.includes(lang as AppLocale)) return lang as AppLocale
  if (lang.startsWith("pt")) return "pt-BR"
  if (lang.startsWith("es")) return "es"
  return "en"
}

i18n.load({ en: enMessages, "pt-BR": ptBRMessages, es: esMessages })
i18n.activate(detectLocale())

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
})

const router = createRouter({ routeTree })

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <I18nProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </I18nProvider>
  </StrictMode>,
)

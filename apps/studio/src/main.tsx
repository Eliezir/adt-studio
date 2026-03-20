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
  const urlLang = new URLSearchParams(window.location.search).get("lang")
  if (urlLang && LOCALES.includes(urlLang as AppLocale)) return urlLang as AppLocale
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

const router = createRouter({
  routeTree,
  rewrite: {
    input: ({ url }) => {
      const lang = url.searchParams.get("lang")
      const next = lang && LOCALES.includes(lang as AppLocale) ? (lang as AppLocale) : "en"
      i18n.activate(next)
      return undefined
    },
  },
})

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

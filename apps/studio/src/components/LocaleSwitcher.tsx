import { useNavigate } from "@tanstack/react-router"
import { Globe } from "lucide-react"
import { getLocale, setLocale, locales, shouldRedirect } from "../paraglide/runtime"
import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type Locale = (typeof locales)[number]

const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  "pt-BR": "Português (BR)",
  es: "Español",
}

const LOCALE_FLAGS: Record<Locale, string> = {
  en: "🇺🇸",
  "pt-BR": "🇧🇷",
  es: "🇪🇸",
}

export function LocaleSwitcher({ className }: { className?: string }) {
  const navigate = useNavigate()
  const currentLocale = (getLocale() as Locale | undefined) ?? "en"

  const handleChange = async (value: string) => {
    if (!locales.includes(value as Locale)) return
    const next = value as Locale
    if (next === currentLocale) return

    await setLocale(next)
    const decision = await shouldRedirect({ url: window.location.href })
    if (!decision.redirectUrl) return

    const url = decision.redirectUrl
    const search = url.search
    const hash = url.hash

    navigate({
      to: url.pathname as any,
      search: search ? (search as any) : true,
      hash: hash || undefined,
    })
  }

  return (
    <Select value={currentLocale} onValueChange={handleChange}>
      <SelectTrigger
        aria-label="Change language"
        className={cn(
          "border-none! bg-transparent! cursor-pointer text-white/70 hover:text-white hover:bg-gray-600! outline-none focus-visible:ring-2! focus-visible:ring-ring! focus-visible:ring-offset-2!",
          className,
        )}
      >
        <SelectValue
          asChild
          placeholder={
            <span className="flex w-8 items-center justify-center">
              <Globe className="h-4 w-4" />
            </span>
          }
        >
          <span className="flex! items-center justify-center uppercase gap-2 bg-transparent! pr-2">
            <Globe className="h-4 w-4" />
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="min-w-[140px]" sideOffset={2} align="end">
        {locales.map((loc) => (
          <SelectItem key={loc} value={loc}>
            <span className="flex items-center gap-2">
              <span className="text-base leading-none">
                {LOCALE_FLAGS[loc]}
              </span>
              <span className="text-xs">{LOCALE_LABELS[loc]}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

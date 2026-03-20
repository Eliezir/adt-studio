import { useState, useEffect } from "react"
import { Eye, EyeOff, Check } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { Trans } from "@lingui/react/macro"
import { useLingui } from "@lingui/react/macro"

type TabKey = "openai" | "azure"

interface ApiKeyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  apiKey: string
  onSaveApiKey: (key: string) => void
  azureKey: string
  onSaveAzureKey: (key: string) => void
  azureRegion: string
  onSaveAzureRegion: (region: string) => void
}

function isValidOpenAIKey(key: string): boolean {
  return key.trim().length > 0 && key.trim().startsWith("sk-")
}

export function ApiKeyDialog({
  open,
  onOpenChange,
  apiKey,
  onSaveApiKey,
  azureKey,
  onSaveAzureKey,
  azureRegion,
  onSaveAzureRegion,
}: ApiKeyDialogProps) {
  const { t } = useLingui()
  const [tab, setTab] = useState<TabKey>("openai")
  const [openaiDraft, setOpenaiDraft] = useState(apiKey)
  const [azureKeyDraft, setAzureKeyDraft] = useState(azureKey)
  const [azureRegionDraft, setAzureRegionDraft] = useState(azureRegion)
  const [showKey, setShowKey] = useState(false)

  const TABS = [
    { key: "openai" as const, label: t`OpenAI` },
    { key: "azure" as const, label: t`Azure Speech` },
  ]

  useEffect(() => {
    if (open) {
      setOpenaiDraft(apiKey)
      setAzureKeyDraft(azureKey)
      setAzureRegionDraft(azureRegion)
      setShowKey(false)
    }
  }, [open, apiKey, azureKey, azureRegion])

  function handleSave() {
    // Save the current tab's credentials
    if (tab === "openai") {
      const trimmed = openaiDraft.trim()
      if (isValidOpenAIKey(trimmed)) {
        onSaveApiKey(trimmed)
      }
    } else {
      const trimmedKey = azureKeyDraft.trim()
      const trimmedRegion = azureRegionDraft.trim()
      if (trimmedKey) onSaveAzureKey(trimmedKey)
      if (trimmedRegion) onSaveAzureRegion(trimmedRegion)
    }
    onOpenChange(false)
  }

  const canSave =
    tab === "openai"
      ? isValidOpenAIKey(openaiDraft)
      : azureKeyDraft.trim().length > 0 && azureRegionDraft.trim().length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle><Trans>API Keys</Trans></DialogTitle>
          <DialogDescription>
            <Trans>Configure API keys for AI pipeline features.</Trans>
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-1 border-b mb-3">
          {TABS.map((t) => {
            const isSaved =
              t.key === "openai" ? apiKey.length > 0 : azureKey.length > 0
            return (
              <button
                key={t.key}
                onClick={() => { setTab(t.key); setShowKey(false) }}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                  tab === t.key
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {t.label}
                {isSaved && <Check className="h-3 w-3 text-green-500" />}
              </button>
            )
          })}
        </div>

        {tab === "openai" && (
          <div className="space-y-2">
            <Label htmlFor="openai-key-input">
              <Trans>OpenAI API Key</Trans>
            </Label>
            <div className="relative">
              <Input
                id="openai-key-input"
                type={showKey ? "text" : "password"}
                placeholder="sk-..."
                value={openaiDraft}
                onChange={(e) => setOpenaiDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSave() }}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-10 w-10"
                onClick={() => setShowKey(!showKey)}
                tabIndex={-1}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {openaiDraft.length > 0 && !isValidOpenAIKey(openaiDraft) && (
              <p className="text-sm text-destructive">
                <Trans>Key must start with "sk-"</Trans>
              </p>
            )}
          </div>
        )}

        {tab === "azure" && (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="azure-key-input">
                <Trans>Subscription Key</Trans>
              </Label>
              <div className="relative">
                <Input
                  id="azure-key-input"
                  type={showKey ? "text" : "password"}
                  placeholder={t`Azure Speech subscription key`}
                  value={azureKeyDraft}
                  onChange={(e) => setAzureKeyDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSave() }}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-10 w-10"
                  onClick={() => setShowKey(!showKey)}
                  tabIndex={-1}
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="azure-region-input">
                <Trans>Region</Trans>
              </Label>
              <Input
                id="azure-region-input"
                placeholder={t`e.g. eastus, westeurope`}
                value={azureRegionDraft}
                onChange={(e) => setAzureRegionDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSave() }}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <Trans>Cancel</Trans>
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            <Trans>Save</Trans>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

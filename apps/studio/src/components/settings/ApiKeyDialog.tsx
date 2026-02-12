import { useState, useEffect } from "react"
import { Eye, EyeOff } from "lucide-react"
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

interface ApiKeyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  apiKey: string
  onSave: (key: string) => void
}

function isValidKey(key: string): boolean {
  return key.trim().length > 0 && key.trim().startsWith("sk-")
}

export function ApiKeyDialog({
  open,
  onOpenChange,
  apiKey,
  onSave,
}: ApiKeyDialogProps) {
  const [draft, setDraft] = useState(apiKey)
  const [showKey, setShowKey] = useState(false)

  useEffect(() => {
    if (open) {
      setDraft(apiKey)
      setShowKey(false)
    }
  }, [open, apiKey])

  function handleSave() {
    const trimmed = draft.trim()
    if (isValidKey(trimmed)) {
      onSave(trimmed)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>OpenAI API Key</DialogTitle>
          <DialogDescription>
            Enter your OpenAI API key to enable AI pipeline features.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="api-key-input">API Key</Label>
          <div className="relative">
            <Input
              id="api-key-input"
              type={showKey ? "text" : "password"}
              placeholder="sk-..."
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave()
              }}
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
              {showKey ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
              <span className="sr-only">
                {showKey ? "Hide" : "Show"} API key
              </span>
            </Button>
          </div>
          {draft.length > 0 && !isValidKey(draft) && (
            <p className="text-sm text-destructive">
              Key must start with "sk-"
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!isValidKey(draft)}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

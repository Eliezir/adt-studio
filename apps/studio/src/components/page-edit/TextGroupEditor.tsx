import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

interface TextGroupEditorProps {
  groups: Array<{
    groupId: string
    groupType: string
    texts: Array<{ textType: string; text: string; isPruned: boolean }>
  }>
  onChange: (groups: TextGroupEditorProps["groups"]) => void
}

export function TextGroupEditor({ groups, onChange }: TextGroupEditorProps) {
  const updateText = (groupIndex: number, textIndex: number, field: string, value: unknown) => {
    const newGroups = groups.map((g, gi) => {
      if (gi !== groupIndex) return g
      return {
        ...g,
        texts: g.texts.map((t, ti) => {
          if (ti !== textIndex) return t
          return { ...t, [field]: value }
        }),
      }
    })
    onChange(newGroups)
  }

  return (
    <div className="space-y-4">
      {groups.map((group, gi) => (
        <div key={group.groupId} className="rounded border p-3">
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="secondary">{group.groupType}</Badge>
            <span className="text-xs text-muted-foreground">{group.groupId}</span>
          </div>
          <div className="space-y-3">
            {group.texts.map((t, ti) => (
              <div key={ti} className={`space-y-1 rounded border p-2 ${t.isPruned ? "opacity-60" : ""}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">[{t.textType}]</span>
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`prune-${gi}-${ti}`} className="text-xs">Pruned</Label>
                    <Switch
                      id={`prune-${gi}-${ti}`}
                      checked={t.isPruned}
                      onCheckedChange={(checked: boolean) => updateText(gi, ti, "isPruned", checked)}
                    />
                  </div>
                </div>
                <Textarea
                  value={t.text}
                  onChange={(e) => updateText(gi, ti, "text", e.target.value)}
                  className={`min-h-[60px] text-sm ${t.isPruned ? "line-through" : ""}`}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

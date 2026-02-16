import { Plus, Trash2 } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { InlineEditCard } from "./InlineEditCard"

interface TextGroup {
  groupId: string
  groupType: string
  texts: Array<{ textType: string; text: string; isPruned: boolean }>
}

interface TextGroupCardProps {
  group: TextGroup
  isEditing: boolean
  isDirty: boolean
  onStartEdit: () => void
  onStopEdit: () => void
  onUpdate: (group: TextGroup) => void
  onRemove: () => void
}

export function TextGroupCard({
  group,
  isEditing,
  isDirty,
  onStartEdit,
  onStopEdit,
  onUpdate,
  onRemove,
}: TextGroupCardProps) {
  const updateGroupType = (groupType: string) => {
    onUpdate({ ...group, groupType })
  }

  const updateText = (textIndex: number, field: string, value: unknown) => {
    onUpdate({
      ...group,
      texts: group.texts.map((t, ti) =>
        ti === textIndex ? { ...t, [field]: value } : t
      ),
    })
  }

  const addTextEntry = () => {
    onUpdate({
      ...group,
      texts: [...group.texts, { textType: "paragraph", text: "", isPruned: false }],
    })
  }

  const removeTextEntry = (textIndex: number) => {
    onUpdate({
      ...group,
      texts: group.texts.filter((_, ti) => ti !== textIndex),
    })
  }

  const viewContent = (
    <>
      <div className="mb-1 flex items-center gap-2">
        <Badge variant="secondary" className="text-xs">{group.groupType}</Badge>
        <span className="text-xs text-muted-foreground">{group.groupId}</span>
      </div>
      <div className="space-y-0.5">
        {group.texts.map((t, i) => (
          <div
            key={i}
            className={`text-xs ${t.isPruned ? "text-muted-foreground line-through" : ""}`}
          >
            <span className="mr-1 text-muted-foreground">[{t.textType}]</span>
            {t.text}
          </div>
        ))}
      </div>
    </>
  )

  const editContent = (
    <>
      <div className="mb-2 flex items-center gap-2">
        <Input
          value={group.groupType}
          onChange={(e) => updateGroupType(e.target.value)}
          className="h-6 w-28 px-1.5 text-xs"
        />
        <span className="text-xs text-muted-foreground">{group.groupId}</span>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
          title="Remove group"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
      <div className="space-y-3">
        {group.texts.map((t, ti) => (
          <div key={ti} className={`space-y-1 rounded border p-2 ${t.isPruned ? "opacity-60" : ""}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">[{t.textType}]</span>
              <div className="flex items-center gap-2">
                <Label htmlFor={`prune-${group.groupId}-${ti}`} className="text-xs">Pruned</Label>
                <Switch
                  id={`prune-${group.groupId}-${ti}`}
                  checked={t.isPruned}
                  onCheckedChange={(checked: boolean) => updateText(ti, "isPruned", checked)}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => removeTextEntry(ti)}
                  title="Remove text entry"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <Textarea
              value={t.text}
              onChange={(e) => updateText(ti, "text", e.target.value)}
              className={`min-h-[60px] text-xs ${t.isPruned ? "line-through" : ""}`}
            />
          </div>
        ))}
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-full text-xs text-muted-foreground"
          onClick={addTextEntry}
        >
          <Plus className="mr-1 h-3 w-3" />
          Add text entry
        </Button>
      </div>
    </>
  )

  return (
    <InlineEditCard
      isEditing={isEditing}
      isDirty={isDirty}
      onStartEdit={onStartEdit}
      onStopEdit={onStopEdit}
      viewContent={viewContent}
      editContent={editContent}
    />
  )
}

import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

interface ImagePruningEditorProps {
  images: Array<{
    imageId: string
    isPruned: boolean
    reason?: string
  }>
  bookLabel: string
  onChange: (images: ImagePruningEditorProps["images"]) => void
}

export function ImagePruningEditor({ images, bookLabel, onChange }: ImagePruningEditorProps) {
  if (images.length === 0) {
    return <p className="text-sm text-muted-foreground">No images on this page.</p>
  }

  const togglePruned = (index: number) => {
    const newImages = images.map((img, i) => {
      if (i !== index) return img
      return { ...img, isPruned: !img.isPruned }
    })
    onChange(newImages)
  }

  return (
    <div className="space-y-2">
      {images.map((img, i) => (
        <div
          key={img.imageId}
          className={`flex items-center gap-3 rounded border p-2 ${img.isPruned ? "opacity-60" : ""}`}
        >
          <img
            src={`/api/books/${bookLabel}/images/${img.imageId}`}
            alt={img.imageId}
            className="h-16 w-16 shrink-0 rounded border object-cover bg-muted"
          />
          <div className="flex-1 min-w-0">
            <span className={`text-sm truncate block ${img.isPruned ? "line-through" : ""}`}>{img.imageId}</span>
            {img.reason && (
              <p className="text-xs text-muted-foreground">{img.reason}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor={`img-prune-${i}`} className="text-xs">Pruned</Label>
            <Switch
              id={`img-prune-${i}`}
              checked={img.isPruned}
              onCheckedChange={() => togglePruned(i)}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

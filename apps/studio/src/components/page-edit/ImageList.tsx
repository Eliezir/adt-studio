import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import type { PageDetail } from "@/api/client"

type ImageClassification = NonNullable<PageDetail["imageClassification"]>

interface ImageListProps {
  images: ImageClassification["images"]
  bookLabel: string
  onUpdate: (updater: (prev: ImageClassification) => ImageClassification) => void
}

export function ImageList({ images, bookLabel, onUpdate }: ImageListProps) {
  if (images.length === 0) return null

  const togglePruned = (index: number) => {
    onUpdate((prev) => ({
      ...prev,
      images: prev.images.map((img, i) =>
        i === index ? { ...img, isPruned: !img.isPruned } : img
      ),
    }))
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
          <div className="flex flex-1 flex-col gap-0.5 min-w-0">
            <span className={`text-sm truncate ${img.isPruned ? "line-through" : ""}`}>
              {img.imageId}
            </span>
            {img.reason && (
              <span className="text-xs text-muted-foreground">{img.reason}</span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Label htmlFor={`img-prune-${i}`} className="text-xs">
              Pruned
            </Label>
            <Switch
              id={`img-prune-${i}`}
              checked={img.isPruned}
              onCheckedChange={() => togglePruned(i)}
            />
          </div>
          {img.isPruned && (
            <Badge variant="outline" className="text-xs shrink-0">
              Pruned
            </Badge>
          )}
        </div>
      ))}
    </div>
  )
}

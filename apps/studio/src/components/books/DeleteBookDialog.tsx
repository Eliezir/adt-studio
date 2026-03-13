import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { m } from "@/paraglide/messages"

interface DeleteBookDialogProps {
  label: string | null
  onConfirm: () => void
  onCancel: () => void
  isPending: boolean
}

export function DeleteBookDialog({
  label,
  onConfirm,
  onCancel,
  isPending,
}: DeleteBookDialogProps) {
  return (
    <Dialog open={!!label} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{m.books_deleteDialog_title()}</DialogTitle>
          <DialogDescription>
            {m.books_deleteDialog_body_prefix()}{" "}
            <strong>{label}</strong>
            {m.books_deleteDialog_body_suffix()}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isPending}>
            {m.books_deleteDialog_cancel()}
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending
              ? m.books_deleteDialog_deleting()
              : m.books_deleteDialog_delete()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

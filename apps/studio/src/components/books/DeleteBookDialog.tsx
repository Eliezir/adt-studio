import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Trans } from "@lingui/react/macro"

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
          <DialogTitle><Trans>Delete book</Trans></DialogTitle>
          <DialogDescription>
            <Trans>Are you sure you want to delete</Trans>{" "}
            <strong>{label}</strong>
            <Trans>? This will remove all extracted data and cannot be undone.</Trans>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isPending}>
            <Trans>Cancel</Trans>
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending
              ? <Trans>Deleting...</Trans>
              : <Trans>Delete</Trans>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

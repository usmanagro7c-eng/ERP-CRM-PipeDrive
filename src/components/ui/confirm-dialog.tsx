import * as React from "react";
import { Loader2, AlertTriangle, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ConfirmDialogProps {
  /** Controlled open state. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Short action headline, e.g. 'Delete status "Nurture"'. */
  title: string;
  /** Supporting copy. Use it to explain consequences. */
  description?: React.ReactNode;
  /** Label of the primary destructive button. */
  confirmLabel?: string;
  /** When true, the primary button is disabled (e.g. column has records). */
  confirmDisabled?: boolean;
  /** Show a spinner and block interaction while the action runs. */
  pending?: boolean;
  /** Optional inline error message (renders in a destructive callout, keeps dialog open). */
  error?: string | null;
  onConfirm: () => void;
}

/**
 * A single, consistent destructive-action confirmation dialog used across the
 * kanban boards (column delete, card delete, etc.). Replaces native
 * `window.confirm`, shows a warning icon, supports a disabled confirm with
 * explanatory copy and renders Frappe/ERPNext failures inline so the user
 * never gets a raw HTML dump in a toast.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Delete",
  confirmDisabled = false,
  pending = false,
  error = null,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => (pending ? undefined : onOpenChange(v))}>
      <DialogContent className="p-0 overflow-hidden">
        <DialogHeader
          className={cn(
            "px-6 pt-6 pb-3",
            "border-b border-border/70 bg-gradient-to-br from-destructive/10 via-card to-card",
          )}
        >
          <div className="flex items-start gap-3">
            <span
              className={cn(
                "mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl",
                "bg-destructive/15 text-destructive ring-1 ring-destructive/30 shadow-sm",
              )}
              aria-hidden="true"
            >
              <AlertTriangle className="size-5" />
            </span>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base font-semibold leading-snug">{title}</DialogTitle>
              {description && (
                <DialogDescription className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                  {description}
                </DialogDescription>
              )}
            </div>
          </div>
        </DialogHeader>

        {error && (
          <div
            role="alert"
            className="mx-6 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-[12px] leading-snug text-destructive"
          >
            <span className="font-medium">Delete blocked. </span>
            {error}
          </div>
        )}

        <DialogFooter
          className={cn(
            "flex flex-col-reverse gap-2 border-t border-border/70 bg-muted/30 px-6 py-4",
            "sm:flex-row sm:items-center sm:justify-end",
          )}
        >
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={pending}
            className="sm:min-w-20"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={pending || confirmDisabled || !!error}
            onClick={onConfirm}
            className="sm:min-w-28 shadow-sm"
          >
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Deleting…
              </>
            ) : (
              <>
                <Trash2 className="size-4" />
                {confirmLabel}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

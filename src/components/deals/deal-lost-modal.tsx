import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { lostReasonsOptions, useSaveDeal } from "@/hooks/use-deals";

const FALLBACK_REASONS = [
  "Pricing",
  "Competition",
  "Budget Constraints",
  "Missing Features",
  "Long Sales Cycle",
  "No Decision-Maker",
  "Unresponsive Prospect",
  "Poor Fit",
  "Other",
];

interface DealLostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dealNames: string[];
  dealTitle?: string | undefined;
  targetStatus?: string | undefined;
  onSuccess?: () => void;
}

export function DealLostModal({
  open,
  onOpenChange,
  dealNames,
  dealTitle,
  targetStatus = "Lost",
  onSuccess,
}: DealLostModalProps) {
  const saveMutation = useSaveDeal();
  const reasonsQuery = useQuery(lostReasonsOptions());

  const reasons = (
    reasonsQuery.data && reasonsQuery.data.length > 0
      ? reasonsQuery.data.map((r) => r.name)
      : FALLBACK_REASONS
  ).filter(Boolean);

  const [reason, setReason] = useState<string>("Pricing");
  const [notes, setNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    if (!reason) {
      toast.error("Please select a reason for losing the deal.");
      return;
    }

    if (reason === "Other" && !notes.trim()) {
      toast.error("Please provide lost notes when selecting 'Other'.");
      return;
    }

    setSubmitting(true);
    try {
      for (const name of dealNames) {
        await saveMutation.mutateAsync({
          name,
          values: {
            status: targetStatus,
            lost_reason: reason,
            lost_notes: notes.trim() || undefined,
          },
        });
      }
      toast.success(
        dealNames.length > 1
          ? `Marked ${dealNames.length} deals as Lost`
          : "Deal marked as Lost",
      );
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update deal");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="size-5" />
            Mark Deal as Lost
          </DialogTitle>
          <DialogDescription>
            Frappe CRM requires a reason when marking deals as Lost. Please specify why this deal was lost.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {dealTitle && (
            <div className="rounded-md bg-muted/50 p-2.5 border text-xs">
              <span className="text-muted-foreground block text-[11px] mb-0.5">Target Deal:</span>
              <span className="font-semibold text-foreground">{dealTitle}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="lost-reason-select" className="text-xs font-medium">
              Lost Reason <span className="text-destructive">*</span>
            </Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id="lost-reason-select" className="h-9 text-xs">
                <SelectValue placeholder="Select lost reason..." />
              </SelectTrigger>
              <SelectContent>
                {reasons.map((r) => (
                  <SelectItem key={r} value={r} className="text-xs">
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lost-notes-input" className="text-xs font-medium">
              Lost Notes {reason === "Other" && <span className="text-destructive">*</span>}
            </Label>
            <Textarea
              id="lost-notes-input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                reason === "Other"
                  ? "Describe why the deal was lost (required for 'Other')..."
                  : "Optional notes, competitor name, client feedback..."
              }
              className="text-xs min-h-[80px]"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleConfirm}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 size-3.5 animate-spin" />
                Saving...
              </>
            ) : (
              "Confirm Lost Deal"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

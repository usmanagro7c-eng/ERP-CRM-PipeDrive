import { useState, useEffect } from "react";
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
import { useSaveLead, leadLostReasonsOptions } from "@/hooks/use-leads";

export const FALLBACK_LEAD_LOST_REASONS = [
  "Not Interested",
  "No Budget",
  "Competitor Chosen",
  "Unresponsive",
  "Invalid Contact Details",
  "Poor Fit",
  "Pricing",
  "Other",
];

export function isLeadLostStatus(
  statusName: string | undefined | null,
  statuses?: Array<{ name: string; type?: string; lead_status?: string }>,
): boolean {
  if (!statusName) return false;
  const lower = statusName.toLowerCase().trim();
  if (
    lower === "unqualified" ||
    lower.includes("unqualif") ||
    lower.includes("lost") ||
    lower.includes("junk") ||
    lower.includes("disqualif")
  ) {
    return true;
  }
  const match = statuses?.find((s) => s.name.toLowerCase() === lower);
  return match?.type?.toLowerCase() === "lost";
}

export interface LeadLostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadNames: string[];
  leadTitle?: string | undefined;
  targetStatus?: string | undefined;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function LeadLostModal({
  open,
  onOpenChange,
  leadNames,
  leadTitle,
  targetStatus = "Unqualified",
  onSuccess,
  onCancel,
}: LeadLostModalProps) {
  const saveMutation = useSaveLead();
  const reasonsQuery = useQuery(leadLostReasonsOptions());

  const reasons = (
    reasonsQuery.data && reasonsQuery.data.length > 0
      ? reasonsQuery.data.map((r) => r.name)
      : FALLBACK_LEAD_LOST_REASONS
  ).filter(Boolean);

  const [reason, setReason] = useState<string>("Not Interested");
  const [notes, setNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  // Sync default reason if list loads and current reason is not in list
  useEffect(() => {
    if (reasons.length > 0 && !reasons.includes(reason)) {
      setReason(reasons[0]);
    }
  }, [reasons, reason]);

  async function handleConfirm() {
    if (!reason) {
      toast.error("Please specify a reason for losing the lead.");
      return;
    }

    if (reason === "Other" && !notes.trim()) {
      toast.error("Please provide lost notes when selecting 'Other'.");
      return;
    }

    setSubmitting(true);
    try {
      for (const name of leadNames) {
        await saveMutation.mutateAsync({
          name,
          values: {
            status: targetStatus,
            lost_reason: reason,
            lost_notes: notes.trim() || undefined,
          },
          silent: true,
        });
      }
      toast.dismiss();
      toast.success(
        leadNames.length > 1
          ? `Marked ${leadNames.length} leads as ${targetStatus}`
          : `Lead marked as ${targetStatus}`,
        { id: "lead-lost-status" },
      );
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update lead status");
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose(nextOpen: boolean) {
    if (!nextOpen && !submitting) {
      onCancel?.();
    }
    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="size-5" />
            Mark Lead as {targetStatus}
          </DialogTitle>
          <DialogDescription>
            Frappe CRM requires a reason when marking leads as unqualified or lost. Please specify why this lead was lost.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {leadTitle && (
            <div className="rounded-md bg-muted/50 p-2.5 border text-xs">
              <span className="text-muted-foreground block text-[11px] mb-0.5">Target Lead:</span>
              <span className="font-semibold text-foreground">{leadTitle}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="lead-lost-reason-select" className="text-xs font-medium">
              Lost Reason <span className="text-destructive">*</span>
            </Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id="lead-lost-reason-select" className="h-9 text-xs">
                <SelectValue placeholder="Select lost reason..." />
              </SelectTrigger>
              <SelectContent>
                {reasons.map((r) => (
                  <SelectItem key={r} value={r} className="text-xs cursor-pointer">
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lead-lost-notes-input" className="text-xs font-medium">
              Lost Notes {reason === "Other" && <span className="text-destructive">*</span>}
            </Label>
            <Textarea
              id="lead-lost-notes-input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                reason === "Other"
                  ? "Describe why the lead was lost (required for 'Other')..."
                  : "Optional notes, reason details, feedback..."
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
            onClick={() => handleClose(false)}
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
              `Confirm ${targetStatus}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

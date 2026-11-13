import { useEffect, useState } from "react";
import { Loader2, Maximize2, Minimize2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSaveCallLog, type CrmCallLog } from "@/hooks/use-call-logs";
import { cn } from "@/lib/utils";

interface CallFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  callLog?: CrmCallLog | null;
  initialValues?: {
    reference_doctype?: string;
    reference_docname?: string;
    from?: string;
    to?: string;
    duration?: number;
  } | null;
  onSuccess?: () => void;
}

const CALL_TYPES = ["Outbound", "Inbound"];
const CALL_STATUSES = ["Connected", "No Answer", "Busy", "Failed"];
const LINK_DOCTYPES = [
  { value: "CRM Lead", label: "Lead" },
  { value: "CRM Deal", label: "Deal" },
  { value: "CRM Contact", label: "Contact" },
  { value: "CRM Organization", label: "Organization" },
];

export function CallFormModal({
  open,
  onOpenChange,
  callLog,
  initialValues,
  onSuccess,
}: CallFormModalProps) {
  const isEdit = Boolean(callLog);
  const saveMutation = useSaveCallLog();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [callType, setCallType] = useState<string>("Outbound");
  const [callStatus, setCallStatus] = useState<string>("Connected");
  const [fromNumber, setFromNumber] = useState<string>("");
  const [toNumber, setToNumber] = useState<string>("");
  const [duration, setDuration] = useState<string>("0");
  const [summary, setSummary] = useState<string>("");
  const [referenceDoctype, setReferenceDoctype] = useState<string>("");
  const [referenceDocname, setReferenceDocname] = useState<string>("");

  const [errors, setErrors] = useState<{ to?: string; from?: string }>({});

  useEffect(() => {
    if (open) {
      if (callLog) {
        setCallType(callLog.type || "Outbound");
        setCallStatus(callLog.status || "Connected");
        setFromNumber(callLog.from || "");
        setToNumber(callLog.to || "");
        setDuration(callLog.duration ? String(callLog.duration) : "60");
        setSummary(callLog.summary || callLog.note || "");
        setReferenceDoctype(callLog.reference_doctype || "");
        setReferenceDocname(callLog.reference_docname || "");
      } else {
        setCallType("Outbound");
        setCallStatus("Connected");
        setFromNumber(initialValues?.from || "");
        setToNumber(initialValues?.to || "");
        setDuration(initialValues?.duration ? String(initialValues.duration) : "0");
        setSummary("");
        setReferenceDoctype(initialValues?.reference_doctype || "");
        setReferenceDocname(initialValues?.reference_docname || "");
      }
      setErrors({});
    }
  }, [open, callLog, initialValues]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!toNumber.trim()) {
      setErrors({ to: "To Number is required" });
      toast.error("Please enter To Number");
      return;
    }

    const payload: Partial<CrmCallLog> = {
      type: callType,
      status: callStatus,
      from: fromNumber.trim() || undefined, // falls back to `to` server-side when empty
      to: toNumber.trim(),
      duration: Number(duration) || 0,
      summary: summary.trim(),
      note: summary.trim(),
      reference_doctype: referenceDoctype || undefined,
      reference_docname: referenceDocname.trim() || undefined,
    };
    if (callLog?.name) {
      payload.name = callLog.name;
    }

    try {
      await saveMutation.mutateAsync(payload);
      onSuccess?.();
      onOpenChange(false);
    } catch {
      // toast shown by hook
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "p-0 overflow-hidden flex flex-col transition-all duration-200 border border-border bg-card shadow-2xl",
          isFullscreen
            ? "w-screen h-screen max-w-none max-h-none rounded-none"
            : "w-[95vw] sm:max-w-xl max-h-[90vh] rounded-xl",
        )}
      >
        {/* Header matching Frappe CRM: Title on left, Maximize + Single Close on right */}
        <div className="flex items-center justify-between px-6 pt-5 pb-2">
          <DialogTitle className="text-base font-semibold text-foreground">
            {isEdit ? "Edit Call Log" : "Create Call Log"}
          </DialogTitle>
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setIsFullscreen((p) => !p)}
              className="size-7 text-muted-foreground hover:text-foreground cursor-pointer"
              title={isFullscreen ? "Restore window" : "Maximize window"}
            >
              {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="size-7 text-muted-foreground hover:text-foreground cursor-pointer"
              title="Close"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        {/* Modal Form Body matching Frappe CRM 2-Column layout */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Column 1 */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-normal text-muted-foreground">
                  Type <span className="text-destructive">*</span>
                </Label>
                <Select value={callType} onValueChange={setCallType}>
                  <SelectTrigger className="h-8 text-xs bg-muted/30 border-muted-foreground/20 cursor-pointer">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {CALL_TYPES.map((t) => (
                      <SelectItem key={t} value={t} className="text-xs cursor-pointer">
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-normal text-muted-foreground">
                  From Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={fromNumber}
                  onChange={(e) => setFromNumber(e.target.value)}
                  placeholder="From Number"
                  className="h-8 text-xs bg-muted/30 border-muted-foreground/20 focus-visible:bg-background"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-normal text-muted-foreground">
                  Duration (seconds)
                </Label>
                <Input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="Duration"
                  className="h-8 text-xs bg-muted/30 border-muted-foreground/20 focus-visible:bg-background font-mono"
                />
              </div>
            </div>

            {/* Column 2 */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-normal text-muted-foreground">
                  To Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={toNumber}
                  onChange={(e) => {
                    setToNumber(e.target.value);
                    if (e.target.value.trim()) setErrors({});
                  }}
                  placeholder="To Number"
                  className={cn(
                    "h-8 text-xs bg-muted/30 border-muted-foreground/20 focus-visible:bg-background",
                    errors.to && "border-destructive focus-visible:ring-destructive",
                  )}
                  autoFocus
                  required
                />
                {errors.to && <p className="text-[11px] text-destructive">{errors.to}</p>}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-normal text-muted-foreground">
                  Status <span className="text-destructive">*</span>
                </Label>
                <Select value={callStatus} onValueChange={setCallStatus}>
                  <SelectTrigger className="h-8 text-xs bg-muted/30 border-muted-foreground/20 cursor-pointer">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {CALL_STATUSES.map((s) => (
                      <SelectItem key={s} value={s} className="text-xs cursor-pointer">
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-normal text-muted-foreground">Link To</Label>
                <Select
                  value={referenceDoctype || "none"}
                  onValueChange={(val) => setReferenceDoctype(val === "none" ? "" : val)}
                >
                  <SelectTrigger className="h-8 text-xs bg-muted/30 border-muted-foreground/20 cursor-pointer">
                    <SelectValue placeholder="Select Record Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="text-xs cursor-pointer">
                      None (Standalone)
                    </SelectItem>
                    {LINK_DOCTYPES.map((dt) => (
                      <SelectItem
                        key={dt.value}
                        value={dt.value}
                        className="text-xs cursor-pointer"
                      >
                        {dt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {referenceDoctype && (
            <div className="space-y-1.5">
              <Label className="text-xs font-normal text-muted-foreground">Record ID / Name</Label>
              <Input
                value={referenceDocname}
                onChange={(e) => setReferenceDocname(e.target.value)}
                placeholder="e.g. CRM-LEAD-2026-00001"
                className="h-8 text-xs bg-muted/30 border-muted-foreground/20 focus-visible:bg-background"
              />
            </div>
          )}

          {/* Summary / Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-normal text-muted-foreground">Summary</Label>
            <Textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Summary"
              rows={4}
              className="text-xs bg-muted/30 border-muted-foreground/20 resize-none focus-visible:bg-background"
            />
          </div>

          {/* Footer Submit Button matching Frappe CRM */}
          <div className="flex justify-end pt-3 pb-1 border-t border-border/40">
            <Button
              type="submit"
              disabled={saveMutation.isPending}
              className="h-8 text-xs px-4 rounded-md font-medium bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 cursor-pointer shadow-xs"
            >
              {saveMutation.isPending && <Loader2 className="size-3.5 animate-spin mr-1.5" />}
              <span>{isEdit ? "Save Changes" : "Create"}</span>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

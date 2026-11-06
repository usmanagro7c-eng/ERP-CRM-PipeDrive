import { useEffect, useState } from "react";
import { Loader2, Maximize2, Minimize2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useSaveNote, type CrmNote } from "@/hooks/use-notes";
import { cn } from "@/lib/utils";

interface NoteFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note?: CrmNote | null;
  initialValues?: {
    reference_doctype?: string;
    reference_docname?: string;
  } | null;
  onSuccess?: () => void;
}

const LINK_DOCTYPES = [
  { value: "CRM Lead", label: "Lead" },
  { value: "CRM Deal", label: "Deal" },
  { value: "CRM Contact", label: "Contact" },
  { value: "CRM Organization", label: "Organization" },
];

export function NoteFormModal({
  open,
  onOpenChange,
  note,
  initialValues,
  onSuccess,
}: NoteFormModalProps) {
  const isEdit = Boolean(note);
  const saveMutation = useSaveNote();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [referenceDoctype, setReferenceDoctype] = useState("");
  const [referenceDocname, setReferenceDocname] = useState("");
  const [errors, setErrors] = useState<{ title?: string }>({});

  useEffect(() => {
    if (open) {
      if (note) {
        setTitle(note.title || "");
        setContent(note.content || "");
        setReferenceDoctype(note.reference_doctype || "");
        setReferenceDocname(note.reference_docname || "");
      } else {
        setTitle("");
        setContent("");
        setReferenceDoctype(initialValues?.reference_doctype || "");
        setReferenceDocname(initialValues?.reference_docname || "");
      }
      setErrors({});
    }
  }, [open, note, initialValues]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!title.trim()) {
      setErrors({ title: "Title is required" });
      toast.error("Please enter a Title");
      return;
    }

    const payload: Record<string, unknown> = {
      name: note?.name,
      title: title.trim(),
      content: content.trim() || "",
      reference_doctype: referenceDoctype || null,
      reference_docname: referenceDocname.trim() || null,
    };

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
            {isEdit ? "Edit Note" : "Create Note"}
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

        {/* Modal Form Body matching Frappe CRM */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <Label className="text-xs font-normal text-muted-foreground">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (e.target.value.trim()) setErrors({});
              }}
              placeholder="Title"
              className={cn(
                "h-8 text-xs bg-muted/30 border-muted-foreground/20 focus-visible:bg-background",
                errors.title && "border-destructive focus-visible:ring-destructive",
              )}
              autoFocus
              required
            />
            {errors.title && (
              <p className="text-[11px] text-destructive">{errors.title}</p>
            )}
          </div>

          {/* Optional Reference Link */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    <SelectItem key={dt.value} value={dt.value} className="text-xs cursor-pointer">
                      {dt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
          </div>

          {/* Content */}
          <div className="space-y-1.5">
            <Label className="text-xs font-normal text-muted-foreground">Content</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Content"
              rows={6}
              className="text-xs bg-muted/30 border-muted-foreground/20 resize-none focus-visible:bg-background"
            />
          </div>

          {/* Footer Button matching Frappe CRM */}
          <div className="flex justify-end pt-3 pb-1 border-t border-border/40">
            <Button
              type="submit"
              disabled={saveMutation.isPending}
              className="h-8 text-xs px-4 rounded-md font-medium bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 cursor-pointer shadow-xs"
            >
              {saveMutation.isPending && (
                <Loader2 className="size-3.5 animate-spin mr-1.5" />
              )}
              <span>{isEdit ? "Save Changes" : "Create"}</span>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

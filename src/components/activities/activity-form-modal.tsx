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
import { useSaveActivity, type FrappeDocTypeMeta } from "@/hooks/use-activities";
import { useCrmUsers } from "@/hooks/use-dashboard";
import { cn } from "@/lib/utils";

interface ActivityFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meta?: FrappeDocTypeMeta;
  /** Existing doc when editing; null when creating. */
  activity?: Record<string, unknown> | null;
  /** Optional initial field values */
  initialValues?: Record<string, unknown> | null;
  onSuccess?: (savedDoc: Record<string, unknown>) => void;
}

const PRIORITIES = ["Low", "Medium", "High", "Urgent"];
const STATUSES = ["Backlog", "Todo", "In Progress", "Done", "Canceled"];

interface FormDataState {
  title: string;
  priority: string;
  due_date: string;
  assigned_to: string;
  status: string;
  description: string;
}

const defaultFormData: FormDataState = {
  title: "",
  priority: "Low",
  due_date: "",
  assigned_to: "",
  status: "Backlog",
  description: "",
};

export function ActivityFormModal({
  open,
  onOpenChange,
  activity,
  initialValues,
  onSuccess,
}: ActivityFormModalProps) {
  const isEdit = Boolean(activity);
  const docName = activity ? String(activity["name"]) : undefined;
  const saveMutation = useSaveActivity();
  const { data: users = [] } = useCrmUsers();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [formData, setFormData] = useState<FormDataState>(defaultFormData);
  const [errors, setErrors] = useState<{ title?: string }>({});

  useEffect(() => {
    if (open) {
      if (activity) {
        setFormData({
          title: String(activity["title"] || ""),
          priority: String(activity["priority"] || "Low"),
          due_date: String(activity["due_date"] || "")
            .replace(" ", "T")
            .slice(0, 16),
          assigned_to: String(activity["assigned_to"] || ""),
          status: String(activity["status"] || "Backlog"),
          description: String(activity["description"] || ""),
        });
      } else {
        const defaultOwner = users.find((u) => u.session_user)?.name || users[0]?.name || "";
        const presetStatus = String(initialValues?.["status"] || "Backlog");
        setFormData({
          ...defaultFormData,
          status: presetStatus,
          assigned_to: defaultOwner,
          ...(initialValues
            ? {
                title: String(initialValues["title"] || ""),
                priority: String(initialValues["priority"] || "Low"),
                due_date: String(initialValues["due_date"] || ""),
                description: String(initialValues["description"] || ""),
              }
            : {}),
        });
      }
      setErrors({});
    }
  }, [open, activity, initialValues, users]);

  const handleChange = (field: keyof FormDataState, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (field === "title" && value.trim()) {
      setErrors({});
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.title.trim()) {
      setErrors({ title: "Title is required" });
      toast.error("Please enter a Title");
      return;
    }

    const payload: Record<string, unknown> = {
      title: formData.title.trim(),
      priority: formData.priority || "Low",
      status: formData.status || "Backlog",
      due_date: formData.due_date ? formData.due_date.replace("T", " ") : null,
      assigned_to: formData.assigned_to || null,
      description: formData.description.trim() || null,
    };

    try {
      const result = await saveMutation.mutateAsync({
        name: docName,
        values: payload,
      });
      onSuccess?.(result ?? payload);
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
            {isEdit ? "Edit Task" : "Create Task"}
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

        {/* Modal Form Body matching Frappe CRM exact layout */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <Label className="text-xs font-normal text-muted-foreground">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              value={formData.title}
              onChange={(e) => handleChange("title", e.target.value)}
              placeholder="Title"
              className={cn(
                "h-8 text-xs bg-muted/30 border-muted-foreground/20 focus-visible:bg-background",
                errors.title && "border-destructive focus-visible:ring-destructive",
              )}
              autoFocus
              required
            />
            {errors.title && <p className="text-[11px] text-destructive">{errors.title}</p>}
          </div>

          {/* Row 1: Priority & Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-normal text-muted-foreground">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(val) => handleChange("priority", val)}
              >
                <SelectTrigger className="h-8 text-xs bg-muted/30 border-muted-foreground/20 cursor-pointer">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p} className="text-xs cursor-pointer">
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-normal text-muted-foreground">Due Date</Label>
              <Input
                type="datetime-local"
                value={formData.due_date}
                onChange={(e) => handleChange("due_date", e.target.value)}
                className="h-8 text-xs bg-muted/30 border-muted-foreground/20 focus-visible:bg-background"
              />
            </div>
          </div>

          {/* Row 2: Assigned To & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-normal text-muted-foreground">Assigned To</Label>
              <Select
                value={formData.assigned_to || undefined}
                onValueChange={(val) => handleChange("assigned_to", val)}
              >
                <SelectTrigger className="h-8 text-xs bg-muted/30 border-muted-foreground/20 cursor-pointer">
                  <SelectValue placeholder="Assigned To" />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {users.map((u) => {
                    const name = u.full_name || u.name;
                    return (
                      <SelectItem key={u.name} value={u.name} className="text-xs cursor-pointer">
                        <div className="flex items-center gap-2">
                          <div className="size-4 rounded-full bg-neutral-200 dark:bg-neutral-700 text-foreground flex items-center justify-center text-[10px] font-medium">
                            {name.charAt(0).toUpperCase()}
                          </div>
                          <span>{name}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-normal text-muted-foreground">Status</Label>
              <Select value={formData.status} onValueChange={(val) => handleChange("status", val)}>
                <SelectTrigger className="h-8 text-xs bg-muted/30 border-muted-foreground/20 cursor-pointer">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s} className="text-xs cursor-pointer">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-xs font-normal text-muted-foreground">Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="Description"
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

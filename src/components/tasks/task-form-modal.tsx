import { useEffect, useState } from "react";
import { CheckCircle2, Clock, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
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
import { useSaveTask, type CrmTask } from "@/hooks/use-tasks";

interface TaskFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: CrmTask | null;
  initialValues?: {
    reference_doctype?: string;
    reference_docname?: string;
  } | null;
}

export function TaskFormModal({ open, onOpenChange, task, initialValues }: TaskFormModalProps) {
  const saveMutation = useSaveTask();

  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<string>("Medium");
  const [status, setStatus] = useState<string>("Todo");
  const [dueDate, setDueDate] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (task) {
      setTitle(task.title || "");
      setPriority(task.priority || "Medium");
      setStatus(task.status || "Todo");
      setDueDate(task.due_date || "");
      setAssignedTo(task.assigned_to || "");
      setDescription(task.description || "");
    } else {
      setTitle("");
      setPriority("Medium");
      setStatus("Todo");
      setDueDate("");
      setAssignedTo("");
      setDescription("");
    }
  }, [task, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    const payload: Record<string, unknown> = {
      title: title.trim(),
      priority,
      status,
    };
    if (task?.name) payload["name"] = task.name;
    if (dueDate) payload["due_date"] = dueDate;
    if (assignedTo.trim()) payload["assigned_to"] = assignedTo.trim();
    if (description.trim()) payload["description"] = description.trim();
    const refDoc = task?.reference_doctype || initialValues?.reference_doctype;
    if (refDoc) payload["reference_doctype"] = refDoc;
    const refName = task?.reference_docname || initialValues?.reference_docname;
    if (refName) payload["reference_docname"] = refName;

    await saveMutation.mutateAsync(payload);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              {task ? "Edit Task" : "Create New Task"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Assign action items, set deadlines, and track completion.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-4 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs">Task Title *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Follow up on contract signature"
                className="text-xs h-8"
                required
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todo">Todo</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Done">Done</SelectItem>
                    <SelectItem value="Canceled">Canceled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Due Date</Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="text-xs h-8"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Assigned To (Email)</Label>
                <Input
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  placeholder="agent@company.com"
                  className="text-xs h-8"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Description & Notes</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add extra instructions or context..."
                className="text-xs min-h-[70px] resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs h-8"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={saveMutation.isPending || !title.trim()}
              className="text-xs h-8 gap-1.5"
            >
              {saveMutation.isPending && <Loader2 className="size-3 animate-spin" />}
              <span>{task ? "Update Task" : "Create Task"}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

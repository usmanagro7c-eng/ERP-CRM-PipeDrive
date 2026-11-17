import { useState } from "react";
import { CheckCircle2, Circle, Clock, Plus, Trash2, User } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  tasksListOptions,
  useSaveTask,
  useToggleTaskComplete,
  useDeleteTask,
} from "@/hooks/use-tasks";

interface RecordTasksTabProps {
  referenceDoctype: string;
  referenceName: string;
}

export function RecordTasksTab({ referenceDoctype, referenceName }: RecordTasksTabProps) {
  const { data: tasks = [], isLoading } = useQuery(
    tasksListOptions({
      reference_doctype: referenceDoctype,
      reference_docname: referenceName,
    }),
  );
  const saveMutation = useSaveTask();
  const toggleMutation = useToggleTaskComplete();
  const deleteMutation = useDeleteTask();

  const [showNewTask, setShowNewTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskPriority, setTaskPriority] = useState<string>("Medium");
  const [taskDueDate, setTaskDueDate] = useState<string>("");

  async function handleCreateTask() {
    if (!taskTitle.trim()) return;
    try {
      const payload: Record<string, unknown> = {
        title: taskTitle.trim(),
        priority: taskPriority,
        reference_doctype: referenceDoctype,
        reference_docname: referenceName,
        status: "Todo",
      };
      if (taskDueDate) payload["due_date"] = taskDueDate;
      await saveMutation.mutateAsync(payload);
      setTaskTitle("");
      setShowNewTask(false);
    } catch {
      // handled by hook
    }
  }

  function getPriorityColor(priority: string) {
    switch (priority?.toLowerCase()) {
      case "urgent":
        return "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200";
      case "high":
        return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200";
      case "medium":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  }

  return (
    <div className="flex flex-col h-full min-h-[460px] max-w-4xl px-1 sm:px-4">
      {/* Tasks Header matching Frappe CRM */}
      <div className="flex shrink-0 items-center justify-between pb-4 pt-2">
        <h2 className="text-2xl font-semibold text-foreground">Tasks</h2>
        <Button
          size="sm"
          onClick={() => setShowNewTask(true)}
          className="h-7 text-xs font-medium px-2.5 rounded-md gap-1 bg-white text-black hover:bg-neutral-200 dark:bg-white dark:text-black cursor-pointer shadow-xs"
        >
          <Plus className="size-3.5" />
          <span>New Task</span>
        </Button>
      </div>

      {showNewTask && (
        <div className="rounded-lg border bg-card p-3.5 space-y-3 shadow-xs mb-5">
          <Input
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
            placeholder="What needs to be done? (e.g. Follow up on proposal)"
            className="text-xs h-8 bg-secondary/30"
            autoFocus
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] text-muted-foreground">Priority</label>
              <Select value={taskPriority} onValueChange={setTaskPriority}>
                <SelectTrigger className="h-7 text-xs mt-1 bg-secondary/30">
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
            <div>
              <label className="text-[11px] text-muted-foreground">Due Date</label>
              <Input
                type="date"
                value={taskDueDate}
                onChange={(e) => setTaskDueDate(e.target.value)}
                className="h-7 text-xs mt-1 bg-secondary/30"
              />
            </div>
          </div>
          <div className="flex justify-end gap-1.5 pt-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowNewTask(false)}
              className="h-7 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreateTask}
              disabled={!taskTitle.trim() || saveMutation.isPending}
              className="h-7 text-xs cursor-pointer"
            >
              {saveMutation.isPending ? "Creating..." : "Create Task"}
            </Button>
          </div>
        </div>
      )}

      {tasks.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-24 select-none">
          <div className="flex items-center justify-center size-14 rounded-full mb-2">
            <CheckCircle2 className="size-10 stroke-[1.2] text-muted-foreground/45" />
          </div>
          <p className="text-sm font-medium text-foreground">No Tasks Found</p>
          <p className="text-xs text-muted-foreground mt-1">
            Nothing to do at the moment. Start organizing by adding one here.
          </p>
        </div>
      ) : (
        <div className="space-y-2 pb-8">
          {tasks.map((t) => {
            const isCompleted = t.status === "Done" || t.status === "Completed" || t.status === "Closed";
            return (
              <div
                key={t.name}
                className="group flex items-center justify-between rounded-lg border bg-card p-3 text-xs shadow-2xs hover:border-primary/40 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <button
                    onClick={() => toggleMutation.mutate({ name: t.name, currentStatus: t.status })}
                    className="text-muted-foreground hover:text-primary cursor-pointer shrink-0"
                    title={isCompleted ? "Mark incomplete" : "Mark complete"}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="size-4 text-emerald-500" />
                    ) : (
                      <Circle className="size-4" />
                    )}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div
                      className={`font-medium truncate ${
                        isCompleted ? "line-through text-muted-foreground" : "text-foreground"
                      }`}
                    >
                      {t.title}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                      {t.due_date && (
                        <span className="flex items-center gap-1">
                          <Clock className="size-2.5" />
                          <span>Due {t.due_date}</span>
                        </span>
                      )}
                      {t.assigned_to && (
                        <span className="flex items-center gap-1">
                          <User className="size-2.5" />
                          <span>{t.assigned_to}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={`text-[10px] h-4 px-1.5 ${getPriorityColor(t.priority)}`}
                  >
                    {t.priority || "Medium"}
                  </Badge>
                  <button
                    onClick={() => deleteMutation.mutate(t.name)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive cursor-pointer p-0.5"
                    title="Delete task"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

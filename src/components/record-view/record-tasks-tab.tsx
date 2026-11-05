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

export function RecordTasksTab({
  referenceDoctype,
  referenceName,
}: RecordTasksTabProps) {
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
        status: "Open",
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
        return "bg-rose-500/10 text-rose-600 border-rose-200";
      case "high":
        return "bg-amber-500/10 text-amber-600 border-amber-200";
      case "medium":
        return "bg-blue-500/10 text-blue-600 border-blue-200";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Tasks & Action Items ({tasks.length})</h3>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowNewTask(true)}
          className="h-7 text-xs gap-1"
        >
          <Plus className="size-3" />
          <span>New Task</span>
        </Button>
      </div>

      {showNewTask && (
        <div className="rounded-lg border bg-card p-3 space-y-3 shadow-2xs">
          <Input
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
            placeholder="What needs to be done? (e.g. Follow up on proposal)"
            className="text-xs h-8"
            autoFocus
          />
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={taskPriority} onValueChange={setTaskPriority}>
              <SelectTrigger className="h-7 w-28 text-xs">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Low">Low</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={taskDueDate}
              onChange={(e) => setTaskDueDate(e.target.value)}
              className="h-7 w-36 text-xs"
            />

            <div className="flex-1 flex justify-end gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNewTask(false)}
                className="h-7 text-xs text-muted-foreground"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleCreateTask}
                disabled={!taskTitle.trim() || saveMutation.isPending}
                className="h-7 text-xs"
              >
                {saveMutation.isPending ? "Adding..." : "Add Task"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {tasks.length === 0 ? (
        <div className="py-12 text-center text-xs text-muted-foreground">
          No open tasks for this record.
        </div>
      ) : (
        <div className="divide-y divide-border rounded-lg border bg-card overflow-hidden">
          {tasks.map((task) => {
            const isCompleted = task.status === "Completed";
            return (
              <div
                key={task.name}
                className={`group flex items-center justify-between p-3 text-xs transition-colors ${
                  isCompleted ? "bg-muted/20 opacity-70" : "hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() =>
                      toggleMutation.mutate({
                        name: task.name,
                        currentStatus: task.status,
                      })
                    }
                    className="cursor-pointer shrink-0 text-muted-foreground hover:text-primary transition-colors"
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="size-4 text-emerald-600" />
                    ) : (
                      <Circle className="size-4" />
                    )}
                  </button>
                  <div className="min-w-0">
                    <p
                      className={`font-medium text-foreground truncate ${
                        isCompleted ? "line-through text-muted-foreground" : ""
                      }`}
                    >
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                      {task.due_date && (
                        <span className="flex items-center gap-1">
                          <Clock className="size-3" />
                          <span>Due: {task.due_date}</span>
                        </span>
                      )}
                      {task.assigned_to && (
                        <span className="flex items-center gap-1">
                          <User className="size-3" />
                          <span>{task.assigned_to}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1.5 py-0 h-4 ${getPriorityColor(
                      task.priority,
                    )}`}
                  >
                    {task.priority}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMutation.mutate(task.name)}
                    className="size-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                    title="Delete task"
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

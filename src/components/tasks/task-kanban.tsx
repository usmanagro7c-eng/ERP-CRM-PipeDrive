import { useState, useEffect } from "react";
import { CheckCircle2, Circle, Clock, Plus, Trash2, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { type CrmTask } from "@/hooks/use-tasks";

interface TaskKanbanProps {
  tasks: CrmTask[];
  onToggleComplete: (task: CrmTask) => void;
  onEdit: (task: CrmTask) => void;
  onAddInStatus: (status: string) => void;
}

const COLUMNS = [
  { key: "Todo", label: "To Do", color: "border-amber-500/40" },
  { key: "In Progress", label: "In Progress", color: "border-blue-500/40" },
  { key: "Done", label: "Done", color: "border-emerald-500/40" },
];

export function TaskKanban({ tasks, onToggleComplete, onEdit, onAddInStatus }: TaskKanbanProps) {
  const [hiddenColumns, setHiddenColumns] = useState<string[]>(() => {
    try {
      const raw = window.localStorage.getItem("agrocrm.hiddenTaskColumns");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  useEffect(() => {
    try {
      window.localStorage.setItem("agrocrm.hiddenTaskColumns", JSON.stringify(hiddenColumns));
    } catch {
      // ignore
    }
  }, [hiddenColumns]);
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
    <div className="flex flex-col gap-2">
      {hiddenColumns.length > 0 && (
        <div className="flex items-center gap-2 px-1">
          <span className="text-xs text-muted-foreground">Hidden columns:</span>
          <Select
            value=""
            onValueChange={(val) => {
              if (!val) return;
              setHiddenColumns((prev) => prev.filter((c) => c !== val));
            }}
          >
            <SelectTrigger className="h-7 text-xs w-40">
              <SelectValue placeholder="Restore column..." />
            </SelectTrigger>
            <SelectContent>
              {hiddenColumns.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="flex gap-4 overflow-x-auto pb-4 pt-1 items-start scrollbar-none">
        {COLUMNS.filter((col) => !hiddenColumns.includes(col.key)).map((col) => {
        const colTasks = tasks.filter(
          (t) => (t.status || "Todo").toLowerCase() === col.key.toLowerCase(),
        );

        return (
          <div
            key={col.key}
            className="flex w-[82vw] sm:w-64 shrink-0 flex-col rounded-lg border bg-muted/20"
          >
            {/* Header */}
            <div
              className={`flex items-center justify-between p-3 border-b bg-card/60 rounded-t-lg border-t-2 ${col.color}`}
            >
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-xs text-foreground">{col.label}</h3>
                <span className="flex size-5 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                  {colTasks.length}
                </span>
              </div>
              <div className="flex items-center gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setHiddenColumns((prev) => [...prev, col.key])}
                  className="size-6 text-muted-foreground hover:text-destructive"
                  title={`Hide column ${col.label}`}
                >
                  <Trash2 className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onAddInStatus(col.key)}
                  className="size-6 text-muted-foreground hover:text-foreground"
                  title={`Add task in ${col.key}`}
                >
                  <Plus className="size-3.5" />
                </Button>
              </div>
            </div>

            {/* Cards List */}
            <div className="p-2 space-y-2.5 min-h-[200px]">
              {colTasks.length === 0 ? (
                <div className="py-10 text-center text-xs text-muted-foreground/60 italic">
                  No tasks in this status
                </div>
              ) : (
                colTasks.map((task) => {
                  const isCompleted = task.status === "Completed";
                  return (
                    <div
                      key={task.name}
                      onClick={() => onEdit(task)}
                      className={`group rounded-lg border bg-card p-3 shadow-2xs space-y-2 hover:shadow-xs transition-shadow cursor-pointer ${
                        isCompleted ? "opacity-60" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleComplete(task);
                            }}
                            className="cursor-pointer text-muted-foreground hover:text-primary transition-colors"
                          >
                            {isCompleted ? (
                              <CheckCircle2 className="size-3.5 text-emerald-700 dark:text-emerald-400" />
                            ) : (
                              <Circle className="size-3.5" />
                            )}
                          </button>
                          <span
                            className={`font-medium text-xs text-foreground truncate max-w-[190px] ${
                              isCompleted ? "line-through text-muted-foreground" : ""
                            }`}
                          >
                            {task.title}
                          </span>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-[9px] px-1 py-0 h-3.5 shrink-0 ${getPriorityColor(
                            task.priority,
                          )}`}
                        >
                          {task.priority}
                        </Badge>
                      </div>

                      {task.description && (
                        <p className="text-[11px] text-muted-foreground line-clamp-2">
                          {task.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-1 border-t text-[10px] text-muted-foreground">
                        {task.due_date ? (
                          <span className="flex items-center gap-1">
                            <Clock className="size-2.5" />
                            <span>{task.due_date}</span>
                          </span>
                        ) : (
                          <span>No deadline</span>
                        )}

                        {task.assigned_to && (
                          <span className="flex items-center gap-1 truncate max-w-[100px]">
                            <User className="size-2.5" />
                            <span>{task.assigned_to.split("@")[0]}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}

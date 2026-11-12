import { CheckCircle2, Circle, Clock, Edit2, MoreHorizontal, Trash2, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type CrmTask } from "@/hooks/use-tasks";

interface TaskTableProps {
  tasks: CrmTask[];
  onToggleComplete: (task: CrmTask) => void;
  onEdit: (task: CrmTask) => void;
  onDelete: (name: string) => void;
}

export function TaskTable({ tasks, onToggleComplete, onEdit, onDelete }: TaskTableProps) {
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

  function getStatusBadge(status: string) {
    switch (status?.toLowerCase()) {
      case "completed":
        return "bg-emerald-500/10 text-emerald-600 border-emerald-200";
      case "in progress":
        return "bg-blue-500/10 text-blue-600 border-blue-200";
      case "cancelled":
        return "bg-muted text-muted-foreground border-border";
      default:
        return "bg-amber-500/10 text-amber-600 border-amber-200";
    }
  }

  if (tasks.length === 0) {
    return (
      <div className="py-16 text-center text-xs text-muted-foreground">
        No tasks found matching criteria.
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <Table className="text-xs">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-10"></TableHead>
            <TableHead className="font-semibold">Task Title</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="font-semibold">Priority</TableHead>
            <TableHead className="font-semibold">Due Date</TableHead>
            <TableHead className="font-semibold">Assigned To</TableHead>
            <TableHead className="font-semibold">Linked Record</TableHead>
            <TableHead className="w-10 text-right"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => {
            const isCompleted = task.status === "Completed";
            return (
              <TableRow
                key={task.name}
                className={`transition-colors ${isCompleted ? "opacity-60 bg-muted/10" : ""}`}
              >
                <TableCell className="py-2.5">
                  <button
                    onClick={() => onToggleComplete(task)}
                    className="cursor-pointer text-muted-foreground hover:text-primary transition-colors"
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="size-4 text-emerald-600" />
                    ) : (
                      <Circle className="size-4" />
                    )}
                  </button>
                </TableCell>
                <TableCell className="py-2.5 font-medium">
                  <span className={isCompleted ? "line-through text-muted-foreground" : ""}>
                    {task.title}
                  </span>
                </TableCell>
                <TableCell className="py-2.5">
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1.5 py-0 h-4 ${getStatusBadge(task.status)}`}
                  >
                    {task.status}
                  </Badge>
                </TableCell>
                <TableCell className="py-2.5">
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1.5 py-0 h-4 ${getPriorityColor(task.priority)}`}
                  >
                    {task.priority}
                  </Badge>
                </TableCell>
                <TableCell className="py-2.5 text-muted-foreground">
                  {task.due_date ? (
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" />
                      <span>{task.due_date}</span>
                    </span>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="py-2.5 text-muted-foreground">
                  {task.assigned_to ? (
                    <span className="flex items-center gap-1 truncate max-w-[150px]">
                      <User className="size-3" />
                      <span>{task.assigned_to}</span>
                    </span>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="py-2.5 text-muted-foreground">
                  {task.reference_docname ? (
                    <span className="font-mono text-[11px] truncate max-w-[120px]">
                      {task.reference_docname}
                    </span>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="py-2.5 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-7">
                        <MoreHorizontal className="size-3.5 text-muted-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="text-xs">
                      <DropdownMenuItem onClick={() => onEdit(task)}>
                        <Edit2 className="size-3 mr-1.5" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onDelete(task.name)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="size-3 mr-1.5" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

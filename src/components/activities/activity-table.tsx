import {
  ArrowDown,
  ArrowUp,
  Calendar,
  CheckCircle2,
  Circle,
  CircleSlash,
  MoreVertical,
  User,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoveToSubmenu } from "@/components/organizations/move-to-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSaveActivity, useDeleteActivity, type FrappeDocTypeMeta } from "@/hooks/use-activities";
import { cn } from "@/lib/utils";

export interface SortState {
  field: string;
  direction: "asc" | "desc";
}

interface ActivityTableProps {
  meta?: FrappeDocTypeMeta;
  rows: Record<string, unknown>[];
  columns?: string[];
  sort: SortState | null;
  onSortChange: (sort: SortState) => void;
  onRowClick?: (name: string) => void;
  onEdit?: (activity: Record<string, unknown>) => void;
  loading: boolean;
  emptyAction?: React.ReactNode;
}

const STATUS_OPTIONS = [
  { key: "Backlog", label: "Backlog", value: "Backlog" },
  { key: "Todo", label: "Todo", value: "Todo" },
  { key: "In Progress", label: "In Progress", value: "In Progress" },
  { key: "Done", label: "Done", value: "Done" },
  { key: "Canceled", label: "Canceled", value: "Canceled" },
];

function formatRelativeTime(dateStr: unknown): string {
  if (!dateStr || typeof dateStr !== "string") return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays === 0) {
      if (diffHours === 0) {
        if (diffMin <= 1) return "just now";
        return `${diffMin}m ago`;
      }
      return `${diffHours}h ago`;
    }
    if (diffDays === 1) return "yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  } catch {
    return String(dateStr);
  }
}

function formatDueDate(dateStr: unknown): string {
  if (!dateStr || typeof dateStr !== "string") return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return String(dateStr);
  }
}

function StatusBadge({ status }: { status: string }) {
  const s = status.trim().toLowerCase();
  let color = "bg-muted text-muted-foreground border-border/40";
  if (s === "done" || s === "completed") {
    color =
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800";
  } else if (s === "in progress") {
    color =
      "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border-blue-200 dark:border-blue-800";
  } else if (s === "todo") {
    color =
      "bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-400 border-sky-200 dark:border-sky-800";
  } else if (s === "canceled" || s === "cancelled") {
    color =
      "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border-rose-200 dark:border-rose-800";
  }

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border",
        color,
      )}
    >
      {status || "Backlog"}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const p = priority.trim().toLowerCase();
  let color = "text-muted-foreground";
  if (p === "urgent") color = "text-rose-600 dark:text-rose-400 font-medium";
  else if (p === "high") color = "text-amber-600 dark:text-amber-400 font-medium";
  else if (p === "medium") color = "text-sky-600 dark:text-sky-400 font-medium";
  else if (p === "low") color = "text-muted-foreground";

  return <span className={cn("text-xs", color)}>{priority || "Low"}</span>;
}

export function ActivityTable({
  rows,
  sort,
  onSortChange,
  onRowClick,
  onEdit,
  loading,
  emptyAction,
}: ActivityTableProps) {
  const saveMutation = useSaveActivity();
  const deleteMutation = useDeleteActivity();
  const [selectedNames, setSelectedNames] = useState<string[]>([]);

  const allNames = rows.map((r) => String(r["name"]));
  const allSelected = allNames.length > 0 && allNames.every((n) => selectedNames.includes(n));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedNames([]);
    } else {
      setSelectedNames(allNames);
    }
  };

  const toggleSelectRow = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedNames((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
    );
  };

  if (loading && rows.length === 0) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 8 }).map((_, idx) => (
          <Skeleton key={idx} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (!loading && rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <div className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <CircleSlash className="size-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-foreground">No Tasks Found</h3>
          <p className="text-xs text-muted-foreground max-w-sm">
            No tasks match your search criteria or none have been created yet.
          </p>
        </div>
        {emptyAction}
      </div>
    );
  }

  return (
    <div className="relative overflow-x-auto">
      <Table className="min-w-[640px] md:min-w-[800px]">
        <TableHeader>
          <TableRow className="hover:bg-transparent border-b border-border/70 text-muted-foreground text-xs">
            {/* Checkbox */}
            <TableHead className="w-[40px] pl-4">
              <Checkbox
                checked={allSelected}
                onCheckedChange={toggleSelectAll}
                aria-label="Select all"
                className="translate-y-[2px]"
              />
            </TableHead>

            {/* Title */}
            <TableHead className="w-[40%]">
              <button
                type="button"
                onClick={() =>
                  onSortChange({
                    field: "title",
                    direction:
                      sort?.field === "title" && sort?.direction === "asc" ? "desc" : "asc",
                  })
                }
                className="flex items-center gap-1 font-normal text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <span>Title</span>
                {sort?.field === "title" &&
                  (sort.direction === "asc" ? (
                    <ArrowUp className="size-3" />
                  ) : (
                    <ArrowDown className="size-3" />
                  ))}
              </button>
            </TableHead>

            {/* Status */}
            <TableHead className="w-[12%]">
              <button
                type="button"
                onClick={() =>
                  onSortChange({
                    field: "status",
                    direction:
                      sort?.field === "status" && sort?.direction === "asc" ? "desc" : "asc",
                  })
                }
                className="flex items-center gap-1 font-normal text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <span>Status</span>
                {sort?.field === "status" &&
                  (sort.direction === "asc" ? (
                    <ArrowUp className="size-3" />
                  ) : (
                    <ArrowDown className="size-3" />
                  ))}
              </button>
            </TableHead>

            {/* Priority */}
            <TableHead className="hidden md:table-cell w-[12%]">
              <button
                type="button"
                onClick={() =>
                  onSortChange({
                    field: "priority",
                    direction:
                      sort?.field === "priority" && sort?.direction === "asc" ? "desc" : "asc",
                  })
                }
                className="flex items-center gap-1 font-normal text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <span>Priority</span>
                {sort?.field === "priority" &&
                  (sort.direction === "asc" ? (
                    <ArrowUp className="size-3" />
                  ) : (
                    <ArrowDown className="size-3" />
                  ))}
              </button>
            </TableHead>

            {/* Due Date */}
            <TableHead className="w-[15%]">
              <button
                type="button"
                onClick={() =>
                  onSortChange({
                    field: "due_date",
                    direction:
                      sort?.field === "due_date" && sort?.direction === "asc" ? "desc" : "asc",
                  })
                }
                className="flex items-center gap-1 font-normal text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <span>Due Date</span>
                {sort?.field === "due_date" &&
                  (sort.direction === "asc" ? (
                    <ArrowUp className="size-3" />
                  ) : (
                    <ArrowDown className="size-3" />
                  ))}
              </button>
            </TableHead>

            {/* Assigned To */}
            <TableHead className="hidden lg:table-cell w-[13%]">
              <button
                type="button"
                onClick={() =>
                  onSortChange({
                    field: "assigned_to",
                    direction:
                      sort?.field === "assigned_to" && sort?.direction === "asc" ? "desc" : "asc",
                  })
                }
                className="flex items-center gap-1 font-normal text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <span>Assigned To</span>
                {sort?.field === "assigned_to" &&
                  (sort.direction === "asc" ? (
                    <ArrowUp className="size-3" />
                  ) : (
                    <ArrowDown className="size-3" />
                  ))}
              </button>
            </TableHead>

            {/* Last Modified */}
            <TableHead className="hidden md:table-cell w-[12%] text-right pr-4">
              <button
                type="button"
                onClick={() =>
                  onSortChange({
                    field: "modified",
                    direction:
                      sort?.field === "modified" && sort?.direction === "asc" ? "desc" : "asc",
                  })
                }
                className="ml-auto flex items-center gap-1 font-normal text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <span>Last Modified</span>
                {sort?.field === "modified" &&
                  (sort.direction === "asc" ? (
                    <ArrowUp className="size-3" />
                  ) : (
                    <ArrowDown className="size-3" />
                  ))}
              </button>
            </TableHead>

            {/* Actions */}
            <TableHead className="w-[40px] text-right pr-2" />
          </TableRow>
        </TableHeader>

        <TableBody>
          {rows.map((row) => {
            const name = String(row["name"] ?? "");
            const title = String(row["title"] ?? row["subject"] ?? name);
            const status = String(row["status"] ?? "Backlog");
            const priority = String(row["priority"] ?? "Low");
            const dueDate = row["due_date"];
            const assignedTo = String(row["assigned_to"] ?? "");
            const modified = row["modified"] || row["creation"];
            const isSelected = selectedNames.includes(name);

            return (
              <TableRow
                key={name}
                onClick={() => (onEdit ? onEdit(row) : onRowClick?.(name))}
                className={cn(
                  "group cursor-pointer hover:bg-muted/40 transition-colors border-b border-border/50 h-10",
                  isSelected && "bg-muted/30",
                )}
              >
                {/* Checkbox */}
                <TableCell className="w-[40px] pl-4 py-2" onClick={(e) => toggleSelectRow(name, e)}>
                  <Checkbox checked={isSelected} aria-label={`Select ${title}`} />
                </TableCell>

                {/* Title */}
                <TableCell className="text-xs font-medium text-foreground py-2 truncate max-w-[320px]">
                  <span className="hover:underline">{title}</span>
                </TableCell>

                {/* Status */}
                <TableCell className="py-2">
                  <StatusBadge status={status} />
                </TableCell>

                {/* Priority */}
                <TableCell className="hidden md:table-cell py-2">
                  <PriorityBadge priority={priority} />
                </TableCell>

                {/* Due Date */}
                <TableCell className="text-xs text-muted-foreground py-2">
                  {dueDate ? formatDueDate(dueDate) : "-"}
                </TableCell>

                {/* Assigned To */}
                <TableCell className="hidden lg:table-cell py-2">
                  {assignedTo ? (
                    <div className="flex items-center gap-1.5 text-xs text-foreground">
                      <div className="size-5 rounded-full bg-neutral-200 dark:bg-neutral-700 text-foreground flex items-center justify-center text-[10px] font-semibold shrink-0">
                        {assignedTo.charAt(0).toUpperCase()}
                      </div>
                      <span className="truncate max-w-[110px]">{assignedTo}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-xs">-</span>
                  )}
                </TableCell>

                {/* Last Modified */}
                <TableCell className="hidden md:table-cell text-xs text-muted-foreground text-right pr-4 py-2">
                  {formatRelativeTime(modified)}
                </TableCell>

                {/* Dropdown Menu Actions */}
                <TableCell className="text-right pr-2 py-2" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                      >
                        <MoreVertical className="size-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44 text-xs">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      {onEdit && (
                        <DropdownMenuItem onClick={() => onEdit(row)}>Edit Task</DropdownMenuItem>
                      )}
                      <MoveToSubmenu
                        label="Change Status"
                        currentValue={status}
                        options={STATUS_OPTIONS}
                        onSelect={(newStatus) => {
                          void saveMutation.mutateAsync({
                            name,
                            values: { status: newStatus },
                          });
                        }}
                      />
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to delete task "${title}"?`)) {
                            void deleteMutation.mutate(name);
                          }
                        }}
                      >
                        Delete Task
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

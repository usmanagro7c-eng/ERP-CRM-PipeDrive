import { useMemo } from "react";
import {
  Calendar,
  CheckCircle2,
  Circle,
  Link as LinkIcon,
  MoreVertical,
  User,
  CircleSlash,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
  ActivityStatusBadge,
  ActivityPriorityBadge,
} from "@/components/activities/activity-badge";
import { useSaveActivity, useDeleteActivity, type FrappeDocTypeMeta } from "@/hooks/use-activities";
import { cn } from "@/lib/utils";

interface ActivityGridProps {
  meta: FrappeDocTypeMeta;
  rows: Record<string, unknown>[];
  onRowClick?: (name: string) => void;
  onEdit?: (activity: Record<string, unknown>) => void;
  loading: boolean;
  emptyAction?: React.ReactNode;
}

const STATUS_OPTIONS = [
  { key: "Todo", label: "Todo", value: "Todo" },
  { key: "In Progress", label: "In Progress", value: "In Progress" },
  { key: "Done", label: "Done", value: "Done" },
  { key: "Backlog", label: "Backlog", value: "Backlog" },
  { key: "Canceled", label: "Canceled", value: "Canceled" },
];

function isOverdue(dueDate: unknown, status: unknown): boolean {
  if (!dueDate || status === "Done" || status === "Canceled") return false;
  try {
    const d = new Date(String(dueDate));
    return !isNaN(d.getTime()) && d.getTime() < Date.now();
  } catch {
    return false;
  }
}

export function ActivityGrid({
  meta,
  rows,
  onRowClick,
  onEdit,
  loading,
  emptyAction,
}: ActivityGridProps) {
  const saveMutation = useSaveActivity();
  const deleteMutation = useDeleteActivity();

  if (loading && rows.length === 0) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 p-4">
        {Array.from({ length: 8 }).map((_, idx) => (
          <Skeleton key={idx} className="h-44 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (!loading && rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
          <CircleSlash className="size-6 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-semibold">No activities found</h3>
          <p className="text-xs text-muted-foreground max-w-sm">
            No activities match your search criteria or none have been scheduled yet.
          </p>
        </div>
        {emptyAction}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 p-1">
      {rows.map((row) => {
        const name = String(row["name"] ?? "");
        const title = String(row["title"] ?? "Untitled Activity");
        const status = String(row["status"] ?? "");
        const isDone = status === "Done";
        const priority = row["priority"] as string | undefined;
        const dueDate = row["due_date"];
        const owner = row["assigned_to"];
        const docType = String(row["reference_doctype"] ?? "");
        const docName = String(row["reference_docname"] ?? "");
        const overdue = isOverdue(dueDate, status);

        return (
          <div
            key={name}
            onClick={() => onRowClick?.(name)}
            className="group relative flex flex-col justify-between rounded-xl border bg-card p-4 shadow-xs transition-all hover:border-primary/50 hover:shadow-md cursor-pointer"
          >
            {/* Top row: Checkbox, Title & 3-dots */}
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5 flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void saveMutation.mutateAsync({
                        name,
                        values: { status: isDone ? "Todo" : "Done" },
                      });
                    }}
                    className="mt-0.5 text-muted-foreground hover:text-primary transition-colors shrink-0 cursor-pointer"
                    title={isDone ? "Mark as Todo" : "Mark as Done"}
                  >
                    {isDone ? (
                      <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Circle className="size-4 opacity-50 group-hover:opacity-100" />
                    )}
                  </button>

                  <div className="flex-1 truncate">
                    <h4
                      className={cn(
                        "font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors",
                        isDone && "line-through text-muted-foreground",
                      )}
                    >
                      {title}
                    </h4>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      #{name}
                    </span>
                  </div>
                </div>

                <div
                  className="shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground opacity-60 group-hover:opacity-100"
                      >
                        <MoreVertical className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 text-xs">
                      <DropdownMenuLabel>Activity Actions</DropdownMenuLabel>
                      {onEdit && (
                        <DropdownMenuItem onClick={() => onEdit(row)}>
                          Edit Activity
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() => {
                          void saveMutation.mutateAsync({
                            name,
                            values: { status: isDone ? "Todo" : "Done" },
                          });
                        }}
                      >
                        {isDone ? "Mark as Todo" : "Mark as Done"}
                      </DropdownMenuItem>
                      <MoveToSubmenu
                        label="Move to Status"
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
                          if (
                            window.confirm(
                              `Are you sure you want to delete activity #${name}?`,
                            )
                          ) {
                            void deleteMutation.mutate(name);
                          }
                        }}
                      >
                        Delete Activity
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Status Badge & Priority */}
              <div className="mt-3 flex items-center justify-between gap-2">
                <ActivityStatusBadge status={status} />
                {Boolean(priority) && <ActivityPriorityBadge priority={priority} />}
              </div>

              {/* Due date */}
              {Boolean(dueDate) && (
                <div
                  className={cn(
                    "mt-3 flex items-center gap-1.5 text-xs",
                    overdue ? "text-destructive font-medium" : "text-muted-foreground",
                  )}
                >
                  {overdue ? (
                    <AlertCircle className="size-3.5 text-destructive shrink-0" />
                  ) : (
                    <Calendar className="size-3.5 opacity-70 shrink-0" />
                  )}
                  <span>Due: {String(dueDate).slice(0, 16)}</span>
                  {overdue && (
                    <span className="text-[10px] bg-destructive/10 text-destructive px-1.5 py-0.2 rounded font-semibold ml-auto">
                      OVERDUE
                    </span>
                  )}
                </div>
              )}

              {/* Related Entity */}
              {Boolean(docName) && (
                <div className="mt-2.5 flex items-center gap-1.5 text-xs text-muted-foreground border-t border-border/40 pt-2 truncate">
                  <LinkIcon className="size-3 shrink-0 opacity-70" />
                  <span className="truncate font-mono text-[11px]">
                    {docType ? `${docType}: ` : ""}
                    {docName}
                  </span>
                </div>
              )}
            </div>

            {/* Footer row: Assignee */}
            <div className="mt-4 flex items-center justify-end border-t border-border/50 pt-2.5 text-xs text-muted-foreground">
              {Boolean(owner) && (
                <div
                  className="flex items-center gap-1.5 font-medium"
                  title={`Assigned to: ${String(owner)}`}
                >
                  <User className="size-3.5 opacity-70" />
                  <span className="truncate max-w-[120px]">{String(owner)}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

import {
  ArrowDown,
  ArrowUp,
  ChevronsUpDown,
  CircleSlash,
  MoreVertical,
  Calendar,
  User,
  Link as LinkIcon,
  CheckCircle2,
  Circle,
  AlertCircle,
} from "lucide-react";
import { useMemo } from "react";

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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ActivityStatusBadge,
  ActivityPriorityBadge,
} from "@/components/activities/activity-badge";
import { useSaveActivity, useDeleteActivity, type FrappeDocTypeMeta } from "@/hooks/use-activities";
import {
  fieldsByNames,
  fieldLabel,
  formatFieldValue,
  type FrappeDocField,
} from "@/lib/frappe-meta";
import { cn } from "@/lib/utils";

export interface SortState {
  field: string;
  direction: "asc" | "desc";
}

interface ActivityTableProps {
  meta: FrappeDocTypeMeta;
  rows: Record<string, unknown>[];
  columns: string[];
  sort: SortState | null;
  onSortChange: (sort: SortState) => void;
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

function SortButton({
  field,
  label,
  sort,
  onSortChange,
}: {
  field: string;
  label: string;
  sort: SortState | null;
  onSortChange: (sort: SortState) => void;
}) {
  const active = sort?.field === field;
  return (
    <button
      type="button"
      onClick={() =>
        onSortChange({ field, direction: active && sort?.direction === "asc" ? "desc" : "asc" })
      }
      className={cn(
        "group inline-flex items-center gap-1 rounded px-1 py-0.5 text-xs font-medium uppercase tracking-wide transition-colors cursor-pointer",
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
      )}
      aria-label={`Sort by ${label}`}
    >
      {label}
      {active ? (
        sort?.direction === "asc" ? (
          <ArrowUp className="size-3" />
        ) : (
          <ArrowDown className="size-3" />
        )
      ) : (
        <ChevronsUpDown className="size-3 opacity-40 group-hover:opacity-100" />
      )}
    </button>
  );
}

function ActivityCellValue({
  field,
  row,
}: {
  field: FrappeDocField;
  row: Record<string, unknown>;
}) {
  const value = row[field.fieldname];

  if (field.fieldname === "status") {
    return <ActivityStatusBadge status={value as string} />;
  }

  if (field.fieldname === "priority") {
    return <ActivityPriorityBadge priority={value as string} />;
  }

  if (field.fieldname === "title") {
    const isDone = row["status"] === "Done";
    return (
      <span
        className={cn(
          "font-medium text-foreground truncate max-w-[240px]",
          isDone && "line-through text-muted-foreground",
        )}
      >
        {String(value || "—")}
      </span>
    );
  }

  if (field.fieldname === "due_date") {
    if (!value) return <span className="text-muted-foreground">—</span>;
    const overdue = isOverdue(value, row["status"]);
    return (
      <div
        className={cn(
          "flex items-center gap-1.5 text-xs",
          overdue ? "text-destructive font-medium" : "text-muted-foreground",
        )}
      >
        {overdue ? (
          <AlertCircle className="size-3 text-destructive shrink-0" />
        ) : (
          <Calendar className="size-3 shrink-0" />
        )}
        <span>{formatFieldValue(field, value)}</span>
      </div>
    );
  }

  if (field.fieldname === "assigned_to") {
    if (!value) return <span className="text-muted-foreground">—</span>;
    return (
      <div className="flex items-center gap-1.5 text-xs">
        <User className="size-3 text-muted-foreground shrink-0" />
        <span className="truncate">{String(value)}</span>
      </div>
    );
  }

  if (field.fieldname === "reference_docname") {
    if (!value) return <span className="text-muted-foreground">—</span>;
    const docType = String(row["reference_doctype"] ?? "");
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <LinkIcon className="size-3 shrink-0 opacity-70" />
        <span className="truncate max-w-[150px] font-mono text-[11px]">
          {docType ? `${docType}: ` : ""}
          {String(value)}
        </span>
      </div>
    );
  }

  return <span>{formatFieldValue(field, value)}</span>;
}

export function ActivityTable({
  meta,
  rows,
  columns,
  sort,
  onSortChange,
  onRowClick,
  onEdit,
  loading,
  emptyAction,
}: ActivityTableProps) {
  const saveMutation = useSaveActivity();
  const deleteMutation = useDeleteActivity();

  const activeFields = useMemo(() => fieldsByNames(meta, columns), [meta, columns]);

  if (loading && rows.length === 0) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 8 }).map((_, idx) => (
          <Skeleton key={idx} className="h-12 w-full" />
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
    <div className="relative overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {/* Quick Done Checkbox Header */}
            <TableHead className="w-[44px] text-center" />
            <TableHead className="w-[100px]">
              <SortButton
                field="name"
                label="ID"
                sort={sort}
                onSortChange={onSortChange}
              />
            </TableHead>
            {activeFields.map((field) => (
              <TableHead key={field.fieldname}>
                <SortButton
                  field={field.fieldname}
                  label={fieldLabel(field)}
                  sort={sort}
                  onSortChange={onSortChange}
                />
              </TableHead>
            ))}
            <TableHead className="w-[60px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const name = String(row["name"] ?? "");
            const currentStatus = String(row["status"] ?? "");
            const isDone = currentStatus === "Done";

            return (
              <TableRow
                key={name}
                onClick={() => onRowClick?.(name)}
                className="group cursor-pointer hover:bg-muted/50"
              >
                {/* Complete / Done Toggle button */}
                <TableCell
                  className="w-[44px] text-center p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    void saveMutation.mutateAsync({
                      name,
                      values: { status: isDone ? "Todo" : "Done" },
                    });
                  }}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground hover:text-primary"
                    title={isDone ? "Mark as Todo" : "Mark as Done"}
                  >
                    {isDone ? (
                      <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Circle className="size-4 opacity-50 group-hover:opacity-100" />
                    )}
                  </Button>
                </TableCell>

                <TableCell className="font-mono text-xs font-semibold text-primary">
                  #{name}
                </TableCell>
                {activeFields.map((field) => (
                  <TableCell key={field.fieldname} className="text-sm">
                    <ActivityCellValue field={field} row={row} />
                  </TableCell>
                ))}
                <TableCell
                  className="text-right"
                  onClick={(e) => e.stopPropagation()}
                >
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 opacity-0 group-hover:opacity-100 focus:opacity-100"
                      >
                        <MoreVertical className="size-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 text-xs">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
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
                        currentValue={currentStatus}
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
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

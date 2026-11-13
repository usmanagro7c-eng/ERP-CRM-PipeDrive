import { useState, useMemo, useEffect } from "react";
import {
  Calendar,
  CheckCircle2,
  Circle,
  GripVertical,
  Link as LinkIcon,
  MoreVertical,
  Plus,
  Trash2,
  User,
  AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ActivityStatusBadge,
  ActivityPriorityBadge,
  getActivityStatusStyle,
} from "@/components/activities/activity-badge";
import { useSaveActivity, useDeleteActivity, type FrappeDocTypeMeta } from "@/hooks/use-activities";
import { fieldLabel, selectOptions } from "@/lib/frappe-meta";
import { cn } from "@/lib/utils";

interface ActivityKanbanProps {
  meta: FrappeDocTypeMeta;
  rows: Record<string, unknown>[];
  onRowClick?: (name: string) => void;
  onEdit?: (activity: Record<string, unknown>) => void;
  onAddInStatus?: (statusName: string) => void;
  loading: boolean;
  groupBy: string;
  onGroupByChange: (newGroupBy: string) => void;
}

const UNASSIGNED_KEY = "__unassigned__";

const DEFAULT_STATUS_COLUMNS = [
  { key: "Todo", label: "Todo" },
  { key: "In Progress", label: "In Progress" },
  { key: "Done", label: "Done" },
  { key: "Backlog", label: "Backlog" },
  { key: "Canceled", label: "Canceled" },
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

export function ActivityKanban({
  meta,
  rows,
  onRowClick,
  onEdit,
  onAddInStatus,
  loading,
  groupBy,
  onGroupByChange,
}: ActivityKanbanProps) {
  const saveMutation = useSaveActivity();
  const deleteMutation = useDeleteActivity();

  const [draggedActivityName, setDraggedActivityName] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [hiddenColumns, setHiddenColumns] = useState<string[]>(() => {
    try {
      const raw = window.localStorage.getItem("agrocrm.hiddenActivityColumns");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  useEffect(() => {
    try {
      window.localStorage.setItem("agrocrm.hiddenActivityColumns", JSON.stringify(hiddenColumns));
    } catch {
      // ignore
    }
  }, [hiddenColumns]);

  // Groupable fields from metadata
  const groupableFields = useMemo(() => {
    return (meta.fields ?? []).filter(
      (f) => (f.fieldtype === "Select" || f.fieldtype === "Link") && !f.hidden,
    );
  }, [meta]);

  const activeGroupField = useMemo(
    () => (meta.fields ?? []).find((f) => f.fieldname === groupBy),
    [meta, groupBy],
  );

  // Columns setup
  const columns = useMemo(() => {
    if (groupBy === "status") {
      const cols = [...DEFAULT_STATUS_COLUMNS];
      cols.push({ key: UNASSIGNED_KEY, label: "Unassigned Status" });
      return cols;
    }

    // Dynamic grouping for other select/link fields
    const keys = new Set<string>();
    if (activeGroupField?.fieldtype === "Select") {
      for (const opt of selectOptions(activeGroupField)) keys.add(opt);
    }
    for (const r of rows) {
      const val = r[groupBy];
      if (typeof val === "string" && val.trim()) keys.add(val.trim());
    }
    const cols = Array.from(keys).map((k) => ({
      key: k,
      label: k,
    }));
    cols.push({
      key: UNASSIGNED_KEY,
      label: `No ${fieldLabel(activeGroupField ?? { fieldname: groupBy })}`,
    });
    return cols;
  }, [groupBy, activeGroupField, rows]);

  // Group activities into columns
  const groupedActivities = useMemo(() => {
    const map = new Map<string, Record<string, unknown>[]>();
    for (const col of columns) {
      map.set(col.key, []);
    }
    for (const row of rows) {
      const val = row[groupBy];
      const key =
        typeof val === "string" && val.trim() && map.has(val.trim()) ? val.trim() : UNASSIGNED_KEY;
      const list = map.get(key);
      if (list) list.push(row);
      else map.set(key, [row]);
    }
    return map;
  }, [columns, rows, groupBy]);

  const statusOptions = useMemo(() => {
    return DEFAULT_STATUS_COLUMNS.map((s) => ({
      key: s.key,
      label: s.label,
      value: s.key,
    }));
  }, []);

  // Move activity to new column
  async function handleMove(activityName: string, targetColKey: string) {
    if (targetColKey === UNASSIGNED_KEY) return;
    const patch: Record<string, unknown> = { [groupBy]: targetColKey };
    await saveMutation.mutateAsync({ name: activityName, values: patch });
  }

  return (
    <div className="flex h-full flex-col space-y-4">
      {/* Top controls: Group By selector & Summary */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Activities Board:</span>
          <span>Showing {rows.length} total tasks</span>
        </div>

        <div className="flex items-center gap-2">
          {hiddenColumns.length > 0 && (
            <Select
              value=""
              onValueChange={(val) => {
                if (!val) return;
                setHiddenColumns((prev) => prev.filter((c) => c !== val));
              }}
            >
              <SelectTrigger aria-label="Restore hidden column" className="h-8 w-40 text-xs">
                <SelectValue placeholder="Restore column..." />
              </SelectTrigger>
              <SelectContent>
                {hiddenColumns.map((c) => (
                  <SelectItem key={c} value={c} className="text-xs">
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <span className="text-xs font-medium text-muted-foreground">Group by:</span>
          <Select value={groupBy} onValueChange={onGroupByChange}>
            <SelectTrigger aria-label="Group tasks by" className="h-8 w-44 text-xs">
              <SelectValue placeholder="Group by field..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="status">Status (Task Board)</SelectItem>
              {groupableFields
                .filter((f) => f.fieldname !== "status")
                .map((f) => (
                  <SelectItem key={f.fieldname} value={f.fieldname}>
                    {fieldLabel(f)}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Kanban Board Horizontal Scroll */}
      <div className="flex flex-1 gap-4 overflow-x-auto pb-4 pt-1 items-start">
        {columns.filter((col) => !hiddenColumns.includes(col.key)).map((col) => {
          const activities = groupedActivities.get(col.key) ?? [];
          const isOver = dragOverCol === col.key;
          const isUnassigned = col.key === UNASSIGNED_KEY;

          // Hide unassigned column if empty
          if (isUnassigned && activities.length === 0) return null;

          const style = getActivityStatusStyle(col.key);

          return (
            <div
              key={col.key}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (dragOverCol !== col.key) setDragOverCol(col.key);
              }}
              onDragLeave={() => {
                if (dragOverCol === col.key) setDragOverCol(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverCol(null);
                const actName = e.dataTransfer.getData("text/plain") || draggedActivityName;
                if (actName && actName !== col.key) {
                  void handleMove(actName, col.key);
                }
                setDraggedActivityName(null);
              }}
              className={cn(
                "flex w-[82vw] sm:w-64 shrink-0 flex-col rounded-lg border bg-muted/30 transition-all duration-150",
                isOver ? "border-primary ring-2 ring-primary/20 bg-primary/5" : "border-border",
              )}
            >
              {/* Column Header */}
              <div className="border-b bg-card/60 p-3 rounded-t-lg">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 truncate">
                    <span className={cn("size-2 rounded-full shrink-0", style.bar)} />
                    <h3 className="font-semibold text-xs text-foreground truncate">{col.label}</h3>
                    <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-mono">
                      {activities.length}
                    </Badge>
                  </div>

                  {!isUnassigned && (
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
                      {onAddInStatus && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onAddInStatus(col.key)}
                          className="size-6 text-muted-foreground hover:text-foreground"
                          title={`Add activity in ${col.label}`}
                        >
                          <Plus className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Column Cards List */}
              <div className="flex flex-col gap-2.5 p-2.5 min-h-[160px] max-h-[calc(100vh-270px)] overflow-y-auto">
                {loading && rows.length === 0 ? (
                  <div className="space-y-2">
                    <Skeleton className="h-24 w-full rounded-md" />
                    <Skeleton className="h-24 w-full rounded-md" />
                  </div>
                ) : activities.length === 0 ? (
                  <div className="flex flex-1 flex-col items-center justify-center py-8 text-center text-xs text-muted-foreground">
                    <p className="italic">No tasks here</p>
                    <p className="text-[10px] text-muted-foreground">Drag tasks to move</p>
                  </div>
                ) : (
                  activities.map((act) => {
                    const name = String(act["name"] ?? "");
                    const title = String(act["title"] ?? "Untitled Activity");
                    const currentStatus = String(act["status"] ?? "");
                    const isDone = currentStatus === "Done";
                    const priority = act["priority"] as string | undefined;
                    const dueDate = act["due_date"];
                    const owner = act["assigned_to"];
                    const docType = String(act["reference_doctype"] ?? "");
                    const docName = String(act["reference_docname"] ?? "");
                    const overdue = isOverdue(dueDate, currentStatus);

                    return (
                      <div
                        key={name}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/plain", name);
                          e.dataTransfer.effectAllowed = "move";
                          setDraggedActivityName(name);
                        }}
                        onDragEnd={() => {
                          setDraggedActivityName(null);
                          setDragOverCol(null);
                        }}
                        onClick={() => onRowClick?.(name)}
                        className={cn(
                          "group relative rounded-md border bg-card p-3 shadow-xs transition-all hover:shadow-md cursor-grab active:cursor-grabbing",
                          draggedActivityName === name
                            ? "opacity-40 border-dashed"
                            : "border-border",
                        )}
                      >
                        {/* Top row: Checkbox, Title & 3-dots */}
                        <div className="flex items-start justify-between gap-1.5">
                          <div className="flex items-start gap-2 flex-1 min-w-0">
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
                                <CheckCircle2 className="size-4 text-emerald-700 dark:text-emerald-400" />
                              ) : (
                                <Circle className="size-4 opacity-50 group-hover:opacity-100" />
                              )}
                            </button>

                            <div className="flex-1 truncate">
                              <h4
                                className={cn(
                                  "font-semibold text-xs text-foreground truncate group-hover:text-primary transition-colors",
                                  isDone && "line-through text-muted-foreground",
                                )}
                              >
                                {title}
                              </h4>
                              <span className="font-mono text-[10px] text-muted-foreground">
                                #{name}
                              </span>
                            </div>
                          </div>

                          <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-6 text-muted-foreground opacity-90 sm:opacity-60 sm:group-hover:opacity-100"
                                  aria-label="More actions"
                                >
                                  <MoreVertical className="size-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48 text-xs">
                                <DropdownMenuLabel>Activity Actions</DropdownMenuLabel>
                                {onEdit && (
                                  <DropdownMenuItem onClick={() => onEdit(act)}>
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
                                  options={statusOptions}
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

                        {/* Priority & Due Date */}
                        <div className="mt-2.5 flex items-center justify-between gap-2">
                          {Boolean(priority) && <ActivityPriorityBadge priority={priority} />}

                          {Boolean(dueDate) && (
                            <div
                              className={cn(
                                "flex items-center gap-1 text-[11px]",
                                overdue ? "text-destructive font-medium" : "text-muted-foreground",
                              )}
                              title={overdue ? "Overdue activity!" : "Due date"}
                            >
                              {overdue ? (
                                <AlertCircle className="size-3 text-destructive shrink-0" />
                              ) : (
                                <Calendar className="size-3 shrink-0 opacity-70" />
                              )}
                              <span>{String(dueDate).slice(0, 16)}</span>
                            </div>
                          )}
                        </div>

                        {/* Linked Entity & Assignee */}
                        <div className="mt-2 flex items-center justify-between border-t border-border/40 pt-2 text-[10px] text-muted-foreground">
                          {docName ? (
                            <div
                              className="flex items-center gap-1 truncate max-w-[140px]"
                              title={`Related to ${docType}: ${docName}`}
                            >
                              <LinkIcon className="size-2.5 opacity-70 shrink-0" />
                              <span className="truncate font-mono">{docName}</span>
                            </div>
                          ) : (
                            <span />
                          )}

                          {Boolean(owner) && (
                            <div
                              className="flex items-center gap-1 font-medium"
                              title={`Assigned to: ${String(owner)}`}
                            >
                              <User className="size-3 opacity-70" />
                              <span className="truncate max-w-[100px]">{String(owner)}</span>
                            </div>
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

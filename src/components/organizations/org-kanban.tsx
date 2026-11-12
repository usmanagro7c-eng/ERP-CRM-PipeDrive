import { useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  Building2,
  DollarSign,
  GripVertical,
  MoreVertical,
  Plus,
  Users,
  Briefcase,
  ExternalLink,
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
import { useSaveOrganization, useLinkOptions } from "@/hooks/use-organizations";
import {
  fieldLabel,
  formatFieldValue,
  selectOptions,
  type FrappeDocTypeMeta,
} from "@/lib/frappe-meta";
import { cn } from "@/lib/utils";

interface OrgKanbanProps {
  meta: FrappeDocTypeMeta;
  rows: Record<string, unknown>[];
  onRowClick?: (name: string) => void;
  onEdit?: (org: Record<string, unknown>) => void;
  onAddInColumn?: (columnKey: string, columnValue: string) => void;
  loading: boolean;
  groupBy: string;
  onGroupByChange: (newGroupBy: string) => void;
}

const UNASSIGNED_KEY = "__unassigned__";

const COLUMN_COLORS = [
  "border-t-blue-500",
  "border-t-emerald-500",
  "border-t-amber-500",
  "border-t-violet-500",
  "border-t-rose-500",
  "border-t-cyan-500",
  "border-t-indigo-500",
  "border-t-orange-500",
  "border-t-teal-500",
  "border-t-pink-500",
];

function initialsOf(value: unknown): string {
  const text = String(value ?? "").trim();
  if (!text) return "—";
  const parts = text.split(/\s+/).slice(0, 2);
  return parts.map((part) => part.charAt(0).toUpperCase()).join("");
}

export function OrgKanban({
  meta,
  rows,
  onRowClick,
  onEdit,
  onAddInColumn,
  loading,
  groupBy,
  onGroupByChange,
}: OrgKanbanProps) {
  const saveMutation = useSaveOrganization();
  const [draggedOrgName, setDraggedOrgName] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  // Identify all fields suitable for Kanban grouping (Select and Link fields)
  const groupableFields = useMemo(() => {
    return (meta.fields ?? []).filter(
      (f) =>
        (f.fieldtype === "Select" || f.fieldtype === "Link") &&
        !f.hidden &&
        f.fieldname !== "currency",
    );
  }, [meta]);

  const currentField = useMemo(() => {
    return meta.fields?.find((f) => f.fieldname === groupBy) ?? groupableFields[0];
  }, [meta, groupBy, groupableFields]);

  // If grouping by a Link field, query available link options
  const isLinkField = currentField?.fieldtype === "Link";
  const linkOptionsQuery = useLinkOptions(
    isLinkField ? (currentField.options ?? undefined) : undefined,
  );

  // Build the list of column categories
  const columns = useMemo(() => {
    const list: Array<{ key: string; label: string; value: string }> = [
      { key: UNASSIGNED_KEY, label: "Unassigned", value: "" },
    ];

    if (!currentField) return list;

    if (currentField.fieldtype === "Select") {
      const opts = selectOptions(currentField);
      for (const opt of opts) {
        if (opt.trim()) {
          list.push({ key: opt, label: opt, value: opt });
        }
      }
    } else if (currentField.fieldtype === "Link") {
      const fetched = (linkOptionsQuery.data ?? []).map((item) => item.name);
      // Also collect any distinct values already present in rows
      const existingInRows = new Set<string>();
      for (const row of rows) {
        const val = row[currentField.fieldname];
        if (typeof val === "string" && val.trim()) {
          existingInRows.add(val.trim());
        }
      }
      const combined = Array.from(new Set([...fetched, ...existingInRows]));
      for (const item of combined) {
        list.push({ key: item, label: item, value: item });
      }
    }

    return list;
  }, [currentField, linkOptionsQuery.data, rows]);

  // Group rows into columns
  const groupedData = useMemo(() => {
    const map = new Map<string, Record<string, unknown>[]>();
    for (const col of columns) {
      map.set(col.key, []);
    }

    const fieldname = currentField?.fieldname ?? groupBy;
    for (const row of rows) {
      const rawVal = row[fieldname];
      const val = typeof rawVal === "string" ? rawVal.trim() : "";
      const colKey = val || UNASSIGNED_KEY;

      if (!map.has(colKey)) {
        map.set(colKey, []);
      }
      map.get(colKey)!.push(row);
    }

    return map;
  }, [columns, currentField, groupBy, rows]);

  const titleField = meta.title_field || "organization_name";
  const imageField = meta.image_field;

  const handleCardDrop = async (targetColKey: string) => {
    if (!draggedOrgName || !currentField) return;
    const targetCol = columns.find((c) => c.key === targetColKey);
    const targetValue = targetCol
      ? targetCol.value
      : targetColKey === UNASSIGNED_KEY
        ? ""
        : targetColKey;

    // Find current org
    const org = rows.find((r) => String(r["name"]) === draggedOrgName);
    if (!org) return;

    const currentVal = (org[currentField.fieldname] as string) || "";
    if (currentVal === targetValue) {
      setDraggedOrgName(null);
      setDragOverCol(null);
      return;
    }

    try {
      await saveMutation.mutateAsync({
        name: draggedOrgName,
        values: {
          [currentField.fieldname]: targetValue,
        },
      });
    } catch {
      // toast shown by mutation
    } finally {
      setDraggedOrgName(null);
      setDragOverCol(null);
    }
  };

  const handleMoveViaMenu = async (orgName: string, targetValue: string) => {
    if (!currentField) return;
    try {
      await saveMutation.mutateAsync({
        name: orgName,
        values: {
          [currentField.fieldname]: targetValue,
        },
      });
    } catch {
      // toast shown by mutation
    }
  };

  return (
    <div className="flex flex-1 min-h-0 h-full flex-col space-y-3">
      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-3 shadow-sm shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Group by:
          </span>
          <Select value={currentField?.fieldname ?? groupBy} onValueChange={onGroupByChange}>
            <SelectTrigger className="h-8 w-48 text-xs font-medium">
              <SelectValue placeholder="Select group field" />
            </SelectTrigger>
            <SelectContent>
              {groupableFields.map((f) => (
                <SelectItem key={f.fieldname} value={f.fieldname} className="text-xs">
                  {fieldLabel(f)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{columns.length} columns</span>
          <span>•</span>
          <span>
            {rows.length} {rows.length === 1 ? "organization" : "organizations"}
          </span>
        </div>
      </div>

      {/* Kanban Board Columns */}
      <div className="flex flex-1 min-h-0 gap-4 overflow-x-auto pb-3 pt-1 items-stretch h-full scrollbar-thin">
        {loading && rows.length === 0
          ? // Skeleton loader for Kanban columns
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={`skel-col-${i}`}
                className="flex w-80 shrink-0 flex-col gap-3 rounded-xl border bg-secondary/20 p-3"
              >
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-5 w-6 rounded-full" />
                </div>
                <Skeleton className="h-28 w-full rounded-lg" />
                <Skeleton className="h-28 w-full rounded-lg" />
              </div>
            ))
          : columns.map((col, index) => {
              const orgs = groupedData.get(col.key) ?? [];
              const isOver = dragOverCol === col.key;
              const colorClass = COLUMN_COLORS[index % COLUMN_COLORS.length];

              return (
                <div
                  key={col.key}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (dragOverCol !== col.key) setDragOverCol(col.key);
                  }}
                  onDragLeave={() => {
                    if (dragOverCol === col.key) setDragOverCol(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    void handleCardDrop(col.key);
                  }}
                  className={cn(
                    "flex w-[82vw] sm:w-80 shrink-0 flex-col rounded-xl border border-t-4 bg-muted/30 transition-all duration-150 h-full max-h-full overflow-hidden",
                    colorClass,
                    isOver && "border-primary/60 bg-accent/40 ring-2 ring-primary/20",
                  )}
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between border-b bg-card/60 px-3.5 py-2.5 backdrop-blur-xs shrink-0">
                    <div className="flex items-center gap-2">
                      <h3
                        className="text-sm font-semibold text-foreground truncate max-w-[170px]"
                        title={col.label}
                      >
                        {col.label}
                      </h3>
                      <Badge variant="secondary" className="h-5 px-1.5 text-xs font-semibold">
                        {orgs.length}
                      </Badge>
                    </div>
                    {onAddInColumn && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:text-foreground"
                        title={`Add organization to ${col.label}`}
                        onClick={() => onAddInColumn(currentField?.fieldname ?? groupBy, col.value)}
                      >
                        <Plus className="size-3.5" />
                      </Button>
                    )}
                  </div>

                  {/* Cards Container */}
                  <div className="flex flex-1 min-h-0 flex-col gap-2.5 p-2.5 overflow-y-auto">
                    {orgs.length === 0 ? (
                      <div className="flex flex-1 items-center justify-center rounded-lg border-2 border-dashed border-border/40 p-6 text-center text-xs text-muted-foreground m-1">
                        <span>No organizations here</span>
                      </div>
                    ) : (
                      orgs.map((org) => {
                        const orgName = String(org["name"] ?? "");
                        const displayName = String(org[titleField] ?? orgName);
                        const isDragging = draggedOrgName === orgName;
                        const logoUrl =
                          imageField && typeof org[imageField] === "string"
                            ? String(org[imageField])
                            : null;
                        const industryVal =
                          typeof org["industry"] === "string" ? org["industry"] : null;
                        const employeesVal =
                          typeof org["no_of_employees"] === "string"
                            ? org["no_of_employees"]
                            : null;
                        const revenueVal =
                          typeof org["annual_revenue"] === "number" ? org["annual_revenue"] : null;
                        const territoryVal =
                          typeof org["territory"] === "string" ? org["territory"] : null;
                        const website = typeof org["website"] === "string" ? org["website"] : null;

                        return (
                          <div
                            key={orgName}
                            draggable
                            onDragStart={(e) => {
                              setDraggedOrgName(orgName);
                              e.dataTransfer.setData("text/plain", orgName);
                            }}
                            onDragEnd={() => {
                              setDraggedOrgName(null);
                              setDragOverCol(null);
                            }}
                            className={cn(
                              "group relative flex flex-col gap-2.5 rounded-lg border bg-card p-3 shadow-xs transition-all duration-150 cursor-grab active:cursor-grabbing hover:shadow-md hover:border-primary/40",
                              isDragging && "opacity-40 scale-95",
                            )}
                            onClick={() => onRowClick?.(orgName)}
                          >
                            {/* Card Header */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2.5">
                                {logoUrl ? (
                                  <img
                                    src={logoUrl}
                                    alt=""
                                    className="size-8 shrink-0 rounded-md border object-cover"
                                  />
                                ) : (
                                  <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">
                                    {initialsOf(displayName)}
                                  </span>
                                )}
                                <div className="flex flex-col">
                                  <Link
                                    to="/organizations/$orgId"
                                    params={{ orgId: orgName }}
                                    className="font-medium text-sm text-foreground hover:text-primary hover:underline line-clamp-1"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {displayName}
                                  </Link>
                                  {website && (
                                    <a
                                      href={
                                        website.startsWith("http") ? website : `https://${website}`
                                      }
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <span className="truncate max-w-[120px]">
                                        {website.replace(/^https?:\/\//, "")}
                                      </span>
                                      <ExternalLink className="size-2.5 opacity-60" />
                                    </a>
                                  )}
                                </div>
                              </div>

                              {/* Dropdown Menu & Drag Handle */}
                              <div className="flex items-center">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="size-6 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                                    >
                                      <MoreVertical className="size-3.5" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-44 text-xs">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuItem asChild>
                                      <Link to="/organizations/$orgId" params={{ orgId: orgName }}>
                                        View details
                                      </Link>
                                    </DropdownMenuItem>
                                    {onEdit && (
                                      <DropdownMenuItem onClick={() => onEdit(org)}>
                                        Edit organization
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuSeparator />
                                    <MoveToSubmenu
                                      label="Move to..."
                                      currentValue={col.value || col.key}
                                      options={columns}
                                      onSelect={(val) => void handleMoveViaMenu(orgName, val)}
                                    />
                                  </DropdownMenuContent>
                                </DropdownMenu>

                                <span className="text-muted-foreground/30 group-hover:text-muted-foreground/80 cursor-grab pl-0.5">
                                  <GripVertical className="size-3.5" />
                                </span>
                              </div>
                            </div>

                            {/* Badges / Attributes */}
                            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                              {industryVal && (
                                <Badge
                                  variant="outline"
                                  className="gap-1 px-1.5 py-0 text-[10px] font-normal bg-secondary/50"
                                >
                                  <Briefcase className="size-2.5 opacity-60" />
                                  <span className="truncate max-w-[110px]">{industryVal}</span>
                                </Badge>
                              )}
                              {employeesVal && (
                                <Badge
                                  variant="outline"
                                  className="gap-1 px-1.5 py-0 text-[10px] font-normal bg-secondary/50"
                                >
                                  <Users className="size-2.5 opacity-60" />
                                  <span>{employeesVal}</span>
                                </Badge>
                              )}
                              {territoryVal && (
                                <Badge
                                  variant="outline"
                                  className="gap-1 px-1.5 py-0 text-[10px] font-normal bg-secondary/50"
                                >
                                  <Building2 className="size-2.5 opacity-60" />
                                  <span className="truncate max-w-[110px]">{territoryVal}</span>
                                </Badge>
                              )}
                              {revenueVal != null && revenueVal > 0 && (
                                <span className="ml-auto text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                                  PKR{" "}
                                  {revenueVal >= 1_000_000
                                    ? `${(revenueVal / 1_000_000).toFixed(1)}M`
                                    : revenueVal.toLocaleString()}
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

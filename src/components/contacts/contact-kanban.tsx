import { useState, useMemo } from "react";
import {
  Building2,
  Mail,
  MoreVertical,
  Phone,
  Plus,
  Briefcase,
  User,
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
  ContactStatusBadge,
  getContactStatusStyle,
} from "@/components/contacts/contact-badge";
import { useSaveContact, useDeleteContact, type FrappeDocTypeMeta } from "@/hooks/use-contacts";
import { fieldLabel, selectOptions } from "@/lib/frappe-meta";
import { cn } from "@/lib/utils";

interface ContactKanbanProps {
  meta: FrappeDocTypeMeta;
  rows: Record<string, unknown>[];
  statuses: Array<{
    name: string;
    label?: string;
  }>;
  onRowClick?: (name: string) => void;
  onEdit?: (contact: Record<string, unknown>) => void;
  onAddInStatus?: (statusName: string) => void;
  loading: boolean;
  groupBy: string;
  onGroupByChange: (newGroupBy: string) => void;
}

const UNASSIGNED_KEY = "__unassigned__";

function initialsOf(first: unknown, last: unknown): string {
  const f = String(first ?? "").trim();
  const l = String(last ?? "").trim();
  const combined = `${f} ${l}`.trim();
  if (!combined) return "—";
  const parts = combined.split(/\s+/).slice(0, 2);
  return parts.map((part) => part.charAt(0).toUpperCase()).join("");
}

export function ContactKanban({
  meta,
  rows,
  statuses,
  onRowClick,
  onEdit,
  onAddInStatus,
  loading,
  groupBy,
  onGroupByChange,
}: ContactKanbanProps) {
  const saveMutation = useSaveContact();
  const deleteMutation = useDeleteContact();
  const [draggedName, setDraggedName] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  const groupByOptions = useMemo(() => {
    const list: Array<{ fieldname: string; label: string }> = [
      { fieldname: "status", label: "Status" },
      { fieldname: "company_name", label: "Organization" },
      { fieldname: "department", label: "Department" },
      { fieldname: "gender", label: "Gender" },
    ];
    return list;
  }, []);

  const columns = useMemo(() => {
    if (groupBy === "status") {
      const standard = statuses.map((s) => ({
        key: s.name,
        label: s.label || s.name,
        color: undefined,
      }));
      return [
        ...standard,
        { key: UNASSIGNED_KEY, label: "Unassigned", color: undefined },
      ];
    }

    const field = (meta.fields ?? []).find((f) => f.fieldname === groupBy);
    if (field && field.fieldtype === "Select") {
      const opts = selectOptions(field).map((opt) => ({
        key: opt,
        label: opt,
        color: undefined,
      }));
      return [
        ...opts,
        { key: UNASSIGNED_KEY, label: "Unassigned", color: undefined },
      ];
    }

    const set = new Set<string>();
    for (const r of rows) {
      const val = String(r[groupBy] ?? "").trim();
      if (val) set.add(val);
    }
    const cols = Array.from(set).map((val) => ({
      key: val,
      label: val,
      color: undefined,
    }));
    return [
      ...cols,
      { key: UNASSIGNED_KEY, label: "Unassigned", color: undefined },
    ];
  }, [groupBy, statuses, meta, rows]);

  const grouped = useMemo(() => {
    const map = new Map<string, Record<string, unknown>[]>();
    for (const col of columns) {
      map.set(col.key, []);
    }
    for (const row of rows) {
      const val = String(row[groupBy] ?? "").trim();
      const colKey = val && map.has(val) ? val : UNASSIGNED_KEY;
      const bucket = map.get(colKey);
      if (bucket) {
        bucket.push(row);
      } else {
        const unassigned = map.get(UNASSIGNED_KEY) ?? [];
        unassigned.push(row);
        map.set(UNASSIGNED_KEY, unassigned);
      }
    }
    return map;
  }, [columns, rows, groupBy]);

  function handleDrop(targetKey: string) {
    if (!draggedName) return;
    const targetValue = targetKey === UNASSIGNED_KEY ? "" : targetKey;
    saveMutation.mutate({
      name: draggedName,
      values: { [groupBy]: targetValue },
    });
    setDraggedName(null);
    setDragOverCol(null);
  }

  const statusOptions = useMemo(
    () =>
      statuses.map((s) => ({
        key: s.name,
        label: s.label || s.name,
        value: s.name,
      })),
    [statuses],
  );

  return (
    <div className="space-y-3">
      {/* Kanban Header / Controls */}
      <div className="flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground font-medium">Group by:</span>
          <Select value={groupBy} onValueChange={onGroupByChange}>
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {groupByOptions.map((opt) => (
                <SelectItem key={opt.fieldname} value={opt.fieldname} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Kanban Columns */}
      <div className="flex gap-4 overflow-x-auto pb-4 pt-1 items-start min-h-[500px]">
        {columns.map((col) => {
          const items = grouped.get(col.key) ?? [];
          if (col.key === UNASSIGNED_KEY && items.length === 0) return null;
          const isOver = dragOverCol === col.key;
          const statusStyle = groupBy === "status" ? getContactStatusStyle(col.key) : null;

          return (
            <div
              key={col.key}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverCol(col.key);
              }}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={(e) => {
                e.preventDefault();
                handleDrop(col.key);
              }}
              className={cn(
                "flex flex-col w-[82vw] sm:w-72 shrink-0 rounded-lg border bg-muted/30 transition-colors",
                isOver && "border-primary bg-primary/5",
              )}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between p-3 border-b bg-muted/50 rounded-t-lg">
                <div className="flex items-center gap-2 truncate">
                  <div
                    className={cn(
                      "size-2.5 rounded-full shrink-0",
                      statusStyle?.bar || "bg-muted-foreground",
                    )}
                  />
                  <span className="font-semibold text-xs truncate">{col.label}</span>
                  <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-mono">
                    {items.length}
                  </Badge>
                </div>

                {groupBy === "status" && col.key !== UNASSIGNED_KEY && onAddInStatus && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6 text-muted-foreground hover:text-foreground cursor-pointer"
                    onClick={() => onAddInStatus(col.key)}
                    title={`Add contact in ${col.label}`}
                  >
                    <Plus className="size-3.5" />
                  </Button>
                )}
              </div>

              {/* Cards List */}
              <div className="p-2 space-y-2 flex-1 min-h-[200px]">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-28 w-full rounded-md" />
                  ))
                ) : items.length === 0 ? (
                  <div className="h-24 flex items-center justify-center text-[11px] text-muted-foreground italic border border-dashed rounded-md">
                    No contacts
                  </div>
                ) : (
                  items.map((contact) => {
                    const name = String(contact["name"] ?? "");
                    const firstName = String(contact["first_name"] ?? "");
                    const lastName = String(contact["last_name"] ?? "");
                    const fullName =
                      String(contact["full_name"] ?? "").trim() ||
                      `${firstName} ${lastName}`.trim() ||
                      name;
                    const status = String(contact["status"] ?? "Passive");
                    const email = String(contact["email_id"] ?? "");
                    const phone =
                      String(contact["mobile_no"] ?? "").trim() ||
                      String(contact["phone"] ?? "").trim();
                    const company = String(contact["company_name"] ?? "");
                    const designation = String(contact["designation"] ?? "");

                    return (
                      <div
                        key={name}
                        draggable
                        onDragStart={() => setDraggedName(name)}
                        onClick={() => (onRowClick ? onRowClick(name) : onEdit?.(contact))}
                        className="group relative rounded-md border bg-card p-3 shadow-xs hover:shadow-md transition cursor-pointer space-y-2"
                      >
                        {/* Title & 3-dots */}
                        <div className="flex items-start justify-between gap-1">
                          <div className="flex items-center gap-2">
                            <div className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-semibold shrink-0">
                              {initialsOf(firstName, lastName)}
                            </div>
                            <span className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors truncate">
                              {fullName}
                            </span>
                          </div>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-6 text-muted-foreground hover:text-foreground opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition cursor-pointer"
                              >
                                <MoreVertical className="size-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 text-xs">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => onEdit?.(contact)}>
                                Edit Contact
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <MoveToSubmenu
                                label="Move to Status"
                                currentValue={status}
                                options={statusOptions}
                                onSelect={(newStatus) => {
                                  saveMutation.mutate({
                                    name,
                                    values: { status: newStatus },
                                  });
                                }}
                              />
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  if (confirm(`Delete "${fullName}"?`)) {
                                    deleteMutation.mutate(name);
                                  }
                                }}
                                className="text-destructive focus:text-destructive"
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* Details */}
                        <div className="space-y-1 text-[11px] text-muted-foreground">
                          {company && (
                            <div className="flex items-center gap-1.5 truncate">
                              <Building2 className="size-3 shrink-0" />
                              <span className="truncate">{company}</span>
                            </div>
                          )}
                          {designation && (
                            <div className="flex items-center gap-1.5 truncate">
                              <Briefcase className="size-3 shrink-0" />
                              <span className="truncate">{designation}</span>
                            </div>
                          )}
                          {email && (
                            <div className="flex items-center gap-1.5 truncate">
                              <Mail className="size-3 shrink-0" />
                              <span className="truncate">{email}</span>
                            </div>
                          )}
                          {phone && (
                            <div className="flex items-center gap-1.5 truncate">
                              <Phone className="size-3 shrink-0" />
                              <span className="truncate">{phone}</span>
                            </div>
                          )}
                        </div>

                        {/* Footer status badge if not grouping by status */}
                        {groupBy !== "status" && (
                          <div className="pt-1 border-t">
                            <ContactStatusBadge status={status} />
                          </div>
                        )}
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

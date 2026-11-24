import { useState, useMemo, useEffect } from "react";
import { Building2, Mail, MoreVertical, Phone, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
import { ContactStatusBadge, getContactStatusStyle } from "@/components/contacts/contact-badge";
import { resolveContactCompany } from "@/components/contacts/contact-table";
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
  const [deleteTarget, setDeleteTarget] = useState<{ name: string; title: string } | null>(null);
  const [draggedName, setDraggedName] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [hiddenColumns, setHiddenColumns] = useState<string[]>(() => {
    try {
      const raw = window.localStorage.getItem("agrocrm.hiddenContactColumns");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  useEffect(() => {
    try {
      window.localStorage.setItem("agrocrm.hiddenContactColumns", JSON.stringify(hiddenColumns));
    } catch {
      // ignore
    }
  }, [hiddenColumns]);

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
      return [...standard, { key: UNASSIGNED_KEY, label: "Unassigned", color: undefined }];
    }

    const field = (meta.fields ?? []).find((f) => f.fieldname === groupBy);
    if (field && field.fieldtype === "Select") {
      const opts = selectOptions(field).map((opt) => ({
        key: opt,
        label: opt,
        color: undefined,
      }));
      return [...opts, { key: UNASSIGNED_KEY, label: "Unassigned", color: undefined }];
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
    return [...cols, { key: UNASSIGNED_KEY, label: "Unassigned", color: undefined }];
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
    <div className="flex flex-1 min-h-0 h-full flex-col space-y-3">
      {/* Kanban Header / Controls */}
      <div className="flex items-center justify-between gap-3 text-xs shrink-0">
        <div className="flex items-center gap-2">
          {hiddenColumns.length > 0 && (
            <Select
              value=""
              onValueChange={(val) => {
                if (!val) return;
                setHiddenColumns((prev) => prev.filter((c) => c !== val));
              }}
            >
              <SelectTrigger aria-label="Restore hidden column" className="h-8 w-36 text-xs">
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
          <span className="text-muted-foreground font-medium">Group by:</span>
          <Select value={groupBy} onValueChange={onGroupByChange}>
            <SelectTrigger aria-label="Group contacts by" className="h-8 w-40 text-xs">
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
      <div className="flex flex-1 min-h-0 gap-3 sm:gap-4 overflow-x-auto pb-3 pt-1 items-stretch h-full">
        {columns.filter((col) => !hiddenColumns.includes(col.key)).map((col) => {
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
                "flex flex-col w-[84vw] max-w-[320px] sm:w-[272px] sm:max-w-none shrink-0 rounded-2xl border bg-muted/[0.35] transition-[border-color,box-shadow,background-color] duration-200 h-full max-h-full overflow-hidden",
                isOver ? "border-primary/50 ring-2 ring-primary/15 bg-primary/[0.03]" : "border-border/60",
              )}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between px-3.5 py-3 border-b border-border/50 bg-background/60 rounded-t-2xl backdrop-blur-sm shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={cn(
                      "size-2 rounded-full shrink-0",
                      statusStyle?.bar || "bg-muted-foreground/50",
                    )}
                  />
                  <span className="font-semibold text-[13px] tracking-tight truncate">{col.label}</span>
                  <span className="text-[11px] font-medium text-muted-foreground tabular-nums">{items.length}</span>
                </div>

                {col.key !== UNASSIGNED_KEY && (
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 rounded-md text-muted-foreground/70 hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setHiddenColumns((prev) => [...prev, col.key])}
                      title={`Hide column ${col.label}`}
                      aria-label={`Hide column ${col.label}`}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                    {groupBy === "status" && onAddInStatus && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 rounded-md text-muted-foreground/70 hover:text-foreground hover:bg-muted/60"
                        onClick={() => onAddInStatus(col.key)}
                        title={`Add contact in ${col.label}`}
                        aria-label={`Add contact in ${col.label}`}
                      >
                        <Plus className="size-3.5" />
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Cards List */}
              <div className="p-2 sm:p-2.5 space-y-2.5 flex-1 min-h-0 overflow-y-auto">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-28 w-full rounded-xl" />
                  ))
                ) : items.length === 0 ? (
                  <div className="flex flex-1 flex-col items-center justify-center py-10 px-4 text-center text-muted-foreground/70">
                    <div className="size-8 rounded-full border border-dashed border-border/70 mb-2.5" />
                    <p className="text-xs font-medium text-muted-foreground">No contacts</p>
                    <p className="text-[11px] mt-0.5">Drop a contact here</p>
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
                    const company = resolveContactCompany(contact);
                    const designation = String(contact["designation"] ?? "");

                    return (
                      <div
                        key={name}
                        draggable
                        onDragStart={() => setDraggedName(name)}
                        onClick={() => (onRowClick ? onRowClick(name) : onEdit?.(contact))}
                        className="group relative rounded-xl border border-border/70 bg-card p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-[transform,box-shadow,border-color] duration-200 cursor-pointer space-y-2.5 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.18)] hover:border-border"
                      >
                        {/* Title & 3-dots */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary text-[11px] font-semibold shrink-0">
                              {initialsOf(firstName, lastName)}
                            </div>
                            <div className="min-w-0">
                              <span className="font-semibold text-[13px] leading-5 text-foreground group-hover:text-primary transition-colors truncate block">
                                {fullName}
                              </span>
                              {designation && (
                                <span className="text-[11px] text-muted-foreground truncate block">{designation}</span>
                              )}
                            </div>
                          </div>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7 -mr-1 -mt-1 rounded-md text-muted-foreground/80 hover:text-foreground hover:bg-muted/60 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                                title="More actions"
                                aria-label="More actions"
                              >
                                <MoreVertical className="size-4" />
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
                                onClick={() => setDeleteTarget({ name, title: fullName })}
                                className="text-destructive focus:text-destructive"
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* Details */}
                        <div className="space-y-1.5 text-[11px] text-muted-foreground">
                          {company && (
                            <div className="flex items-center gap-2 min-w-0">
                              <Building2 className="size-3.5 shrink-0 opacity-60" />
                              <span className="truncate text-foreground/85">{company}</span>
                            </div>
                          )}
                          {email && (
                            <div className="flex items-center gap-2 min-w-0">
                              <Mail className="size-3.5 shrink-0 opacity-60" />
                              <span className="truncate">{email}</span>
                            </div>
                          )}
                          {phone && (
                            <div className="flex items-center gap-2 min-w-0">
                              <Phone className="size-3.5 shrink-0 opacity-60" />
                              <span className="truncate">{phone}</span>
                            </div>
                          )}
                        </div>

                        {/* Footer status badge if not grouping by status */}
                        {groupBy !== "status" && (
                          <div className="pt-2 border-t border-border/50">
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

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !deleteMutation.isPending) setDeleteTarget(null);
        }}
        title={`Delete contact "${deleteTarget?.title || ""}"?`}
        description="This contact will be permanently removed. This action cannot be undone."
        pending={deleteMutation.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          const name = deleteTarget.name;
          deleteMutation.mutate(name, { onSettled: () => setDeleteTarget(null) });
        }}
      />
    </div>
  );
}

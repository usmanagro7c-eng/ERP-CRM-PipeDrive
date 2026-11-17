import { useState, useMemo, useEffect, type ReactNode } from "react";
import {
  Briefcase,
  Building2,
  Calendar,
  GripVertical,
  Mail,
  MoreVertical,
  Phone,
  Plus,
  Trash2,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { stripHtml, isLinkedRecordConflict } from "@/lib/frappe-error";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  LeadStatusBadge,
  LeadTemperatureBadge,
  getLeadStatusStyle,
} from "@/components/leads/lead-stage-badge";
import { LeadLostModal, isLeadLostStatus } from "@/components/leads/lead-lost-modal";
import { useSaveLead, useDeleteLead, type FrappeDocTypeMeta } from "@/hooks/use-leads";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as api from "@/lib/api";
import { fieldLabel, selectOptions } from "@/lib/frappe-meta";
import { cn } from "@/lib/utils";

interface LeadKanbanProps {
  meta: FrappeDocTypeMeta;
  rows: Record<string, unknown>[];
  statuses: Array<{
    name: string;
    lead_status?: string;
    type?: string;
    color?: string;
    position?: number;
  }>;
  onRowClick?: (name: string) => void;
  onEdit?: (lead: Record<string, unknown>) => void;
  onConvert?: (lead: Record<string, unknown>) => void;
  onAddInStatus?: (statusName: string) => void;
  loading: boolean;
  groupBy: string;
  onGroupByChange: (newGroupBy: string) => void;
}

const UNASSIGNED_KEY = "__unassigned__";

type DeletedLeadStatus = {
  name: string;
  type?: string | undefined;
  color?: string | undefined;
  position?: number | undefined;
};

function initialsOf(first: unknown, last: unknown): string {
  const f = String(first ?? "").trim();
  const l = String(last ?? "").trim();
  const combined = `${f} ${l}`.trim();
  if (!combined) return "—";
  const parts = combined.split(/\s+/).slice(0, 2);
  return parts.map((part) => part.charAt(0).toUpperCase()).join("");
}

export function LeadKanban({
  meta,
  rows,
  statuses,
  onRowClick,
  onEdit,
  onConvert,
  onAddInStatus,
  loading,
  groupBy,
  onGroupByChange,
}: LeadKanbanProps) {
  const saveMutation = useSaveLead();
  const deleteMutation = useDeleteLead();
  const queryClient = useQueryClient();

  const [confirmDelete, setConfirmDelete] = useState<null | {
    title: string;
    body: ReactNode;
    confirmLabel: string;
    confirmDisabled?: boolean;
    action: () => Promise<void>;
  }>(null);
  const [confirmPending, setConfirmPending] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  /** Count of records currently sitting in a column. */
  function countRecordsIn(statusName: string): number {
    return rows.reduce((acc, r) => {
      const v = r[groupBy];
      const key = typeof v === "string" && v.trim() ? v.trim() : UNASSIGNED_KEY;
      return key === statusName ? acc + 1 : acc;
    }, 0);
  }

  function openColumnDeleteDialog(statusName: string) {
    const meta = statuses.find((s) => s.name === statusName);
    const label = meta?.lead_status ?? statusName;
    const count = countRecordsIn(statusName);
    setConfirmError(null);
    setConfirmDelete({
      title: `Delete status "${label}"?`,
      confirmLabel: "Delete",
      body:
        count > 0 ? (
          <span>
            This status is used by <strong>{count} lead{count !== 1 ? "s" : ""}</strong> in your
            pipeline. Deleting it will fail until those leads are moved to another status
            (drag the cards or use the card menu's{" "}
            <em>Move to Status</em>). The status definition itself will be permanently
            removed.
          </span>
        ) : (
          <span>
            This will permanently remove the <strong>{label}</strong> status from your pipeline.
            Leads currently in this status will become <strong>Unassigned</strong>. This cannot
            be undone.
          </span>
        ),
      action: async () => {
        await performDeleteStatus(statusName);
      },
    });
  }

  async function performDeleteStatus(statusName: string) {
    const meta = statuses.find((s) => s.name === statusName);
    try {
      await api.deleteLeadStatus(statusName);
      toast.success(`Status "${statusName}" deleted`);
      if (meta && !deletedStatuses.some((d) => d.name === statusName)) {
        setDeletedStatuses((prev) => [...prev, {
          name: statusName,
          ...(meta.type !== undefined && { type: meta.type }),
          ...(meta.color !== undefined && { color: meta.color }),
          ...(meta.position !== undefined && { position: meta.position }),
        }]);
      }
      await queryClient.invalidateQueries({ queryKey: ["leads", "statuses"] });
      setConfirmDelete(null);
    } catch (err) {
      const message = stripHtml(err instanceof Error ? err.message : String(err));
      setConfirmError(
        isLinkedRecordConflict(err)
          ? stripHtml(err instanceof Error ? err.message : String(err))
          : message || "Failed to delete status",
      );
    }
  }

  async function handleConfirmDelete() {
    if (!confirmDelete) return;
    setConfirmPending(true);
    setConfirmError(null);
    try {
      await confirmDelete.action();
    } catch (err) {
      setConfirmError(stripHtml(err instanceof Error ? err.message : String(err)));
    } finally {
      setConfirmPending(false);
    }
  }

  async function handleRestoreStatus(statusName: string) {
    const meta = deletedStatuses.find((d) => d.name === statusName);
    try {
      await api.createLeadStatus({
        lead_status: statusName,
        ...(meta?.type !== undefined && { type: meta.type }),
        ...(meta?.color !== undefined && { color: meta.color }),
        ...(meta?.position !== undefined && { position: meta.position }),
      });
      toast.success(`Status "${statusName}" restored`);
      setDeletedStatuses((prev) => prev.filter((d) => d.name !== statusName));
      await queryClient.invalidateQueries({ queryKey: ["leads", "statuses"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to restore status");
    }
  }

  const [draggedLeadName, setDraggedLeadName] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [addStatusDialogOpen, setAddStatusDialogOpen] = useState(false);
  const [newStatusName, setNewStatusName] = useState("");
  const [deletedStatuses, setDeletedStatuses] = useState<Array<{ name: string; type?: string; color?: string; position?: number }>>(() => {
    try {
      const raw = window.localStorage.getItem("agrocrm.deletedLeadStatuses");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  useEffect(() => {
    try {
      window.localStorage.setItem("agrocrm.deletedLeadStatuses", JSON.stringify(deletedStatuses));
    } catch {
      // ignore
    }
  }, [deletedStatuses]);
  const [lostModalState, setLostModalState] = useState<{
    open: boolean;
    leadNames: string[];
    leadTitle?: string;
    targetStatus: string;
  }>({
    open: false,
    leadNames: [],
    targetStatus: "Unqualified",
  });

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
    // If grouping by status (default pipeline mode), use statuses ordered by position
    if (groupBy === "status") {
      const cols = statuses.map((s) => ({
        key: s.name,
        label: s.lead_status || s.name,
        type: s.type,
      }));
      cols.push({
        key: UNASSIGNED_KEY,
        label: "Unassigned Status",
        type: undefined,
      });
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
      type: undefined,
    }));
    cols.push({
      key: UNASSIGNED_KEY,
      label: `No ${fieldLabel(activeGroupField ?? { fieldname: groupBy })}`,
      type: undefined,
    });
    return cols;
  }, [groupBy, statuses, activeGroupField, rows]);

  // Group leads into columns
  const groupedLeads = useMemo(() => {
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

  // All status options for the Move To submenu
  const statusOptions = useMemo(() => {
    return statuses.map((s) => ({
      key: s.name,
      label: s.lead_status || s.name,
      value: s.name,
    }));
  }, [statuses]);

  // Move lead to new column
  async function handleMove(leadName: string, targetColKey: string) {
    if (targetColKey === UNASSIGNED_KEY) return;
    if (groupBy === "status" && targetColKey === "Converted") {
      const lead = rows.find((r) => r["name"] === leadName);
      if (lead && onConvert) {
        onConvert(lead);
        return;
      }
    }
    if (groupBy === "status" && isLeadLostStatus(targetColKey, statuses)) {
      const lead = rows.find((r) => r["name"] === leadName);
      const leadTitle = lead ? String(lead["lead_name"] || lead["name"] || leadName) : leadName;
      setLostModalState({
        open: true,
        leadNames: [leadName],
        leadTitle,
        targetStatus: targetColKey,
      });
      return;
    }
    const patch: Record<string, unknown> = { [groupBy]: targetColKey };
    await saveMutation.mutateAsync({ name: leadName, values: patch });
  }

  return (
    <div className="flex flex-1 min-h-0 h-full flex-col space-y-3">
      {/* Top controls: Group By selector & Pipeline Summary */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 shrink-0">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Leads Board:</span>
          <span>Showing {rows.length} total leads</span>
          {groupBy === "status" && (
            <Select
              value=""
              onValueChange={async (val) => {
                if (!val) return;
                if (val === "__custom__") {
                  setNewStatusName("");
                  setAddStatusDialogOpen(true);
                  return;
                }
                await handleRestoreStatus(val);
              }}
            >
              <SelectTrigger className="h-7 text-xs ml-2 w-40" aria-label="Restore deleted status">
                <SelectValue placeholder="Add status..." />
              </SelectTrigger>
              {addStatusDialogOpen && (
                <Dialog open={addStatusDialogOpen} onOpenChange={(open) => setAddStatusDialogOpen(open)}>
                  <DialogContent className="p-4">
                    <DialogHeader>
                      <DialogTitle>Add New Status</DialogTitle>
                    </DialogHeader>
                    <DialogDescription>Enter a name for the new status</DialogDescription>
                    <Label className="block text-sm font-medium mb-2">Status Name</Label>
                    <Input
                      value={newStatusName}
                      onChange={(e) => setNewStatusName(e.target.value)}
                      placeholder="e.g. Nurture"
                      className="w-full mb-3"
                    />
                    <DialogFooter className="justify-end space-x-2">
                      <Button variant="ghost" onClick={() => setAddStatusDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button
                        onClick={async () => {
                          const trimmed = newStatusName.trim();
                          if (!trimmed) {
                            setAddStatusDialogOpen(false);
                            return;
                          }
                          try {
                            await api.createLeadStatus({ lead_status: trimmed });
                            toast.success(`Status "${trimmed}" created`);
                            await queryClient.invalidateQueries({ queryKey: ["leads", "statuses"] });
                          } catch (err) {
                            toast.error(err instanceof Error ? err.message : "Failed to create status");
                          }
                          setAddStatusDialogOpen(false);
                        }}
                        disabled={!newStatusName.trim()}
                      >
                        Create
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
              <SelectContent>
                {deletedStatuses.length === 0 && (
                  <SelectItem value="__none__" disabled>
                    No deleted statuses
                  </SelectItem>
                )}
                {deletedStatuses.map((d) => (
                  <SelectItem key={d.name} value={d.name}>
                    {d.name}
                  </SelectItem>
                ))}
                <SelectItem value="__custom__">Custom...</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Group by:</span>
          <Select value={groupBy} onValueChange={onGroupByChange}>
            <SelectTrigger aria-label="Group leads by" className="h-8 w-44 text-xs">
              <SelectValue placeholder="Group by field..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="status">Status (Leads Pipeline)</SelectItem>
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
      <div className="flex flex-1 min-h-0 gap-4 overflow-x-auto pb-3 pt-1 items-stretch">
        {columns.map((col) => {
          const leads = groupedLeads.get(col.key) ?? [];
          const isOver = dragOverCol === col.key;
          const isUnassigned = col.key === UNASSIGNED_KEY;

          // Hide unassigned column if empty
          if (isUnassigned && leads.length === 0) return null;

          const style = getLeadStatusStyle(col.key);

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
                const leadName = e.dataTransfer.getData("text/plain") || draggedLeadName;
                if (leadName && leadName !== col.key) {
                  void handleMove(leadName, col.key);
                }
                setDraggedLeadName(null);
              }}
              className={cn(
                "flex w-[82vw] sm:w-64 shrink-0 flex-col rounded-lg border bg-muted/30 transition-all duration-150 h-full max-h-full overflow-hidden",
                isOver ? "border-primary ring-2 ring-primary/20 bg-primary/5" : "border-border",
              )}
            >
              {/* Column Header */}
              <div className="border-b bg-card/60 p-3 rounded-t-lg shrink-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 truncate">
                    <span className={cn("size-2 rounded-full shrink-0", style.bar)} />
                    <h3 className="font-semibold text-xs text-foreground truncate">{col.label}</h3>
                    <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-mono">
                      {leads.length}
                    </Badge>
                  </div>

                  {!isUnassigned && (
                    <div className="flex items-center gap-0.5">
                      {groupBy === "status" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openColumnDeleteDialog(col.key)}
                          className="size-6 text-muted-foreground hover:text-destructive"
                          title={`Delete status ${col.label}`}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      )}
                      {onAddInStatus && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onAddInStatus(col.key)}
                          className="size-6 text-muted-foreground hover:text-foreground"
                          title={`Add lead in ${col.label}`}
                        >
                          <Plus className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Column Cards List */}
              <div className="flex-1 min-h-0 overflow-y-auto p-2.5 flex flex-col gap-2.5">
                {loading && rows.length === 0 ? (
                  <div className="space-y-2">
                    <Skeleton className="h-24 w-full rounded-md" />
                    <Skeleton className="h-24 w-full rounded-md" />
                  </div>
                ) : leads.length === 0 ? (
                  <div className="flex flex-1 flex-col items-center justify-center py-8 text-center text-xs text-muted-foreground border-2 border-dashed border-border/40 rounded-lg m-1">
                    <p className="italic">No leads here</p>
                    <p className="text-[10px] text-muted-foreground">Drag leads to move</p>
                  </div>
                ) : (
                  leads.map((lead) => {
                    const name = String(lead["name"] ?? "");
                    const fullName =
                      String(lead["lead_name"] ?? "") ||
                      `${String(lead["first_name"] ?? "")} ${String(lead["last_name"] ?? "")}`.trim() ||
                      "Unnamed Lead";
                    const org = lead["organization"];
                    const email = lead["email"];
                    const mobile = lead["mobile_no"] || lead["phone"];
                    const owner = lead["lead_owner"];
                    const temp = lead["lead_temperature"] as string | undefined;
                    const currentStatus = String(lead["status"] ?? "");

                    return (
                      <div
                        key={name}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/plain", name);
                          e.dataTransfer.effectAllowed = "move";
                          setDraggedLeadName(name);
                        }}
                        onDragEnd={() => {
                          setDraggedLeadName(null);
                          setDragOverCol(null);
                        }}
                        onClick={() => onRowClick?.(name)}
                        className={cn(
                          "group relative rounded-md border bg-card p-3 shadow-xs transition-all hover:shadow-md cursor-grab active:cursor-grabbing shrink-0",
                          draggedLeadName === name ? "opacity-40 border-dashed" : "border-border",
                        )}
                      >
                        {/* Top row: Lead Name & 3-dots */}
                        <div className="flex items-start justify-between gap-1">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                              {initialsOf(lead["first_name"], lead["last_name"])}
                            </span>
                            <div className="flex-1 truncate">
                              <h4 className="font-semibold text-xs text-foreground truncate group-hover:text-primary transition-colors">
                                {fullName}
                              </h4>
                              <span className="font-mono text-[10px] text-muted-foreground">
                                {name}
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
                                <DropdownMenuLabel>Lead Actions</DropdownMenuLabel>
                                {onEdit && (
                                  <DropdownMenuItem onClick={() => onEdit(lead)}>
                                    Edit Lead
                                  </DropdownMenuItem>
                                )}
                                {onConvert && (
                                  <DropdownMenuItem
                                    onClick={() => onConvert(lead)}
                                    disabled={
                                      Boolean(lead["converted"]) || currentStatus === "Converted"
                                    }
                                  >
                                    <Briefcase className="mr-2 size-3.5 text-primary" />
                                    {Boolean(lead["converted"]) || currentStatus === "Converted"
                                      ? "Already Converted"
                                      : "Convert to Deal"}
                                  </DropdownMenuItem>
                                )}
                                <MoveToSubmenu
                                  label="Move to Status"
                                  currentValue={currentStatus}
                                  options={statusOptions}
                                  onSelect={(newStatus) => {
                                    if (isLeadLostStatus(newStatus, statuses)) {
                                      setLostModalState({
                                        open: true,
                                        leadNames: [name],
                                        leadTitle: fullName || name,
                                        targetStatus: newStatus,
                                      });
                                      return;
                                    }
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
                                    setConfirmError(null);
                                    setConfirmDelete({
                                      title: `Delete lead "${name}"?`,
                                      confirmLabel: "Delete",
                                      body: (
                                        <span>
                                          This lead will be permanently deleted from your CRM. This
                                          cannot be undone.
                                        </span>
                                      ),
                                      action: async () => {
                                        await deleteMutation.mutateAsync(name);
                                        setConfirmDelete(null);
                                      },
                                    });
                                  }}
                                >
                                  Delete Lead
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        {/* Middle row: Organization & Temperature */}
                        <div className="mt-2.5 flex items-center justify-between gap-2">
                          {org ? (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                              <Building2 className="size-3 shrink-0" />
                              <span className="truncate max-w-[170px]">{String(org)}</span>
                            </div>
                          ) : (
                            <span />
                          )}

                          {Boolean(temp) && <LeadTemperatureBadge temp={temp} />}
                        </div>

                        {/* Contact details */}
                        <div className="mt-2 space-y-1 text-[11px] text-muted-foreground border-t border-border/40 pt-2">
                          {Boolean(email) && (
                            <div className="flex items-center gap-1.5 truncate">
                              <Mail className="size-3 shrink-0 opacity-70" />
                              <span className="truncate">{String(email)}</span>
                            </div>
                          )}
                          {Boolean(mobile) && (
                            <div className="flex items-center gap-1.5 truncate">
                              <Phone className="size-3 shrink-0 opacity-70" />
                              <span className="truncate">{String(mobile)}</span>
                            </div>
                          )}
                        </div>

                        {/* Bottom row: Lead Owner */}
                        {Boolean(owner) && (
                          <div className="mt-2 flex items-center justify-end text-[10px] text-muted-foreground font-medium">
                            <div
                              className="flex items-center gap-1"
                              title={`Owner: ${String(owner)}`}
                            >
                              <User className="size-3 opacity-70" />
                              <span className="truncate max-w-[120px]">{String(owner)}</span>
                            </div>
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
        open={confirmDelete !== null}
        onOpenChange={(open) => {
          if (open) return;
          setConfirmDelete(null);
          setConfirmError(null);
        }}
        title={confirmDelete?.title ?? "Confirm"}
        description={confirmDelete?.body}
        confirmLabel={confirmDelete?.confirmLabel ?? "Delete"}
        confirmDisabled={confirmDelete?.confirmDisabled}
        pending={confirmPending}
        error={confirmError}
        onConfirm={() => void handleConfirmDelete()}
      />
      <LeadLostModal
        open={lostModalState.open}
        onOpenChange={(open) => setLostModalState((p) => ({ ...p, open }))}
        leadNames={lostModalState.leadNames}
        leadTitle={lostModalState.leadTitle}
        targetStatus={lostModalState.targetStatus}
      />
    </div>
  );
}

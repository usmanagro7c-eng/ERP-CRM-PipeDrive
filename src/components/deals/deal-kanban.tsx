import { useState, useMemo, useEffect, type ReactNode } from "react";
import {
  Building2,
  Calendar,
  GripVertical,
  MoreVertical,
  Plus,
  Trash2,
  User,
  CheckCircle2,
  XCircle,
  ArrowRight,
  TrendingUp,
  Loader2,
  FileText,
  Mail,
  Phone,
  ChevronDown,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  PanelLeftClose,
  PanelLeftOpen,
  MapPin,
  Layers,
  Sparkles,
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
import { StageBadge, formatCurrency, getStageStyle } from "@/components/deals/deal-stage-badge";
import { AvatarGradient } from "@/components/ui/avatar-gradient";
import { DealLostModal } from "@/components/deals/deal-lost-modal";
import { useSaveDeal, useDeleteDeal, type FrappeDocTypeMeta } from "@/hooks/use-deals";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as api from "@/lib/api";
import { fieldLabel, selectOptions } from "@/lib/frappe-meta";
import { triggerConfetti } from "@/lib/confetti";
import { cn } from "@/lib/utils";

interface DealKanbanProps {
  meta: FrappeDocTypeMeta;
  rows: Record<string, unknown>[];
  stages: Array<{
    name: string;
    deal_status?: string;
    type?: string;
    probability?: number;
    color?: string;
    position?: number;
  }>;
  onRowClick?: (name: string) => void;
  onEdit?: (deal: Record<string, unknown>) => void;
  onCreateQuotation?: (deal: Record<string, unknown>) => void;
  onAddInStage?: (stageName: string) => void;
  loading: boolean;
  groupBy: string;
  onGroupByChange: (newGroupBy: string) => void;
}

const UNASSIGNED_KEY = "__unassigned__";
const COLLAPSED_COLS_STORAGE_KEY = "agrocrm.deals.collapsedCols";
const SWIMLANE_STORAGE_KEY = "agrocrm.deals.swimlaneBy";
const COLLAPSED_SWIMLANES_STORAGE_KEY = "agrocrm.deals.collapsedSwimlanes";

function formatCompactNumber(val: number): string {
  if (isNaN(val) || val === 0) return "0";
  if (Math.abs(val) >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (Math.abs(val) >= 1_000) return `${(val / 1_000).toFixed(0)}k`;
  return String(Math.round(val));
}

export function DealKanban({
  meta,
  rows,
  stages,
  onRowClick,
  onEdit,
  onCreateQuotation,
  onAddInStage,
  loading,
  groupBy,
  onGroupByChange,
}: DealKanbanProps) {
  const saveMutation = useSaveDeal();
  const deleteMutation = useDeleteDeal();
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

  // Collapsed columns state
  const [collapsedCols, setCollapsedCols] = useState<string[]>(() => {
    try {
      const raw = window.localStorage.getItem(COLLAPSED_COLS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(COLLAPSED_COLS_STORAGE_KEY, JSON.stringify(collapsedCols));
    } catch {
      // ignore
    }
  }, [collapsedCols]);

  function toggleColumnCollapse(colKey: string) {
    setCollapsedCols((prev) =>
      prev.includes(colKey) ? prev.filter((k) => k !== colKey) : [...prev, colKey]
    );
  }

  // Swimlanes state: "none" | "territory" | "deal_owner" | custom field
  const [swimlaneBy, setSwimlaneBy] = useState<string>(() => {
    try {
      return window.localStorage.getItem(SWIMLANE_STORAGE_KEY) || "none";
    } catch {
      return "none";
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(SWIMLANE_STORAGE_KEY, swimlaneBy);
    } catch {
      // ignore
    }
  }, [swimlaneBy]);

  // Collapsed swimlanes rows state
  const [collapsedSwimlanes, setCollapsedSwimlanes] = useState<string[]>(() => {
    try {
      const raw = window.localStorage.getItem(COLLAPSED_SWIMLANES_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(
        COLLAPSED_SWIMLANES_STORAGE_KEY,
        JSON.stringify(collapsedSwimlanes)
      );
    } catch {
      // ignore
    }
  }, [collapsedSwimlanes]);

  function toggleSwimlaneCollapse(laneKey: string) {
    setCollapsedSwimlanes((prev) =>
      prev.includes(laneKey) ? prev.filter((k) => k !== laneKey) : [...prev, laneKey]
    );
  }

  /** Count of records currently sitting in a column. */
  function countRecordsIn(stageName: string): number {
    return rows.reduce((acc, r) => {
      const v = r[groupBy];
      const key = typeof v === "string" && v.trim() ? v.trim() : UNASSIGNED_KEY;
      return key === stageName ? acc + 1 : acc;
    }, 0);
  }

  function openStageDeleteDialog(stageName: string) {
    const meta = stages.find((s) => s.name === stageName);
    const label = meta?.deal_status ?? stageName;
    const count = countRecordsIn(stageName);
    setConfirmError(null);
    setConfirmDelete({
      title: `Delete stage "${label}"?`,
      confirmLabel: "Delete",
      body:
        count > 0 ? (
          <span>
            This stage is used by <strong>{count} deal{count !== 1 ? "s" : ""}</strong> in your
            pipeline. Deleting it will fail until those deals are moved to another stage
            (drag the cards or use the card menu's <em>Move to Stage</em>). The stage
            definition itself will be permanently removed.
          </span>
        ) : (
          <span>
            This will permanently remove the <strong>{label}</strong> stage from your pipeline.
            Deals currently in this stage will become <strong>Unassigned</strong>. This cannot
            be undone.
          </span>
        ),
      action: async () => {
        await performDeleteStage(stageName);
      },
    });
  }

  async function performDeleteStage(stageName: string) {
    const meta = stages.find((s) => s.name === stageName);
    try {
      await api.deleteDealStatus(stageName);
      toast.success(`Stage "${stageName}" deleted`);
      if (meta && !deletedStages.some((d) => d.name === stageName)) {
        setDeletedStages((prev) => [
          ...prev,
          {
            name: stageName,
            ...(meta.type !== undefined && { type: meta.type }),
            ...(meta.color !== undefined && { color: meta.color }),
            ...(meta.position !== undefined && { position: meta.position }),
            ...(meta.probability !== undefined && { probability: meta.probability }),
          },
        ]);
      }
      await queryClient.invalidateQueries({ queryKey: ["deals", "statuses"] });
      setConfirmDelete(null);
    } catch (err) {
      const message = stripHtml(err instanceof Error ? err.message : String(err));
      setConfirmError(
        isLinkedRecordConflict(err)
          ? stripHtml(err instanceof Error ? err.message : String(err))
          : message || "Failed to delete stage",
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

  async function handleRestoreStage(stageName: string) {
    const meta = deletedStages.find((d) => d.name === stageName);
    try {
      await api.createDealStatus({
        deal_status: stageName,
        ...(meta?.type !== undefined && { type: meta.type }),
        ...(meta?.color !== undefined && { color: meta.color }),
        ...(meta?.position !== undefined && { position: meta.position }),
      });
      toast.success(`Stage "${stageName}" restored`);
      setDeletedStages((prev) => prev.filter((d) => d.name !== stageName));
      await queryClient.invalidateQueries({ queryKey: ["deals", "statuses"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to restore stage");
    }
  }

  const [draggedDealName, setDraggedDealName] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [dragOverSwimlane, setDragOverSwimlane] = useState<string | null>(null);
  const [addStageDialogOpen, setAddStageDialogOpen] = useState(false);
  const [newStageName, setNewStageName] = useState("");
  const [deletedStages, setDeletedStages] = useState<
    Array<{ name: string; type?: string; color?: string; position?: number; probability?: number }>
  >(() => {
    try {
      const raw = window.localStorage.getItem("agrocrm.deletedDealStages");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem("agrocrm.deletedDealStages", JSON.stringify(deletedStages));
    } catch {
      // ignore
    }
  }, [deletedStages]);

  // Groupable fields from metadata
  const groupableFields = useMemo(() => {
    return (meta.fields ?? []).filter(
      (f) =>
        (f.fieldtype === "Select" || f.fieldtype === "Link") &&
        !f.hidden &&
        f.fieldname !== "currency",
    );
  }, [meta]);

  const activeGroupField = useMemo(
    () => (meta.fields ?? []).find((f) => f.fieldname === groupBy),
    [meta, groupBy],
  );

  // Columns setup
  const columns = useMemo(() => {
    if (groupBy === "status") {
      const cols = stages.map((s) => ({
        key: s.name,
        label: s.deal_status || s.name,
        probability: s.probability,
        type: s.type,
      }));
      cols.push({
        key: UNASSIGNED_KEY,
        label: "Unassigned Stage",
        probability: undefined,
        type: undefined,
      });
      return cols;
    }

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
      probability: undefined,
      type: undefined,
    }));
    cols.push({
      key: UNASSIGNED_KEY,
      label: `No ${fieldLabel(activeGroupField ?? { fieldname: groupBy })}`,
      probability: undefined,
      type: undefined,
    });
    return cols;
  }, [groupBy, stages, activeGroupField, rows]);

  // Swimlanes setup
  const swimlanes = useMemo(() => {
    if (swimlaneBy === "none") return [];

    const field = (meta.fields ?? []).find((f) => f.fieldname === swimlaneBy);
    const keys = new Set<string>();

    for (const r of rows) {
      const val = r[swimlaneBy];
      if (typeof val === "string" && val.trim()) {
        keys.add(val.trim());
      }
    }

    const result = Array.from(keys).map((k) => ({
      key: k,
      label: k,
    }));

    // Check if there are any unassigned rows for this swimlane
    const hasUnassigned = rows.some((r) => {
      const v = r[swimlaneBy];
      return !v || (typeof v === "string" && !v.trim());
    });

    if (hasUnassigned) {
      result.push({
        key: UNASSIGNED_KEY,
        label: `Unassigned ${field ? fieldLabel(field) : swimlaneBy === "territory" ? "Territory" : "Owner"}`,
      });
    }

    return result;
  }, [swimlaneBy, rows, meta]);

  // Group deals into columns (and swimlanes if active)
  const groupedDeals = useMemo(() => {
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

  const stageOptions = useMemo(() => {
    return stages.map((s) => ({
      key: s.name,
      label: s.deal_status || s.name,
      value: s.name,
    }));
  }, [stages]);

  const [lostModalState, setLostModalState] = useState<{
    open: boolean;
    dealName: string;
    dealTitle?: string;
    targetStatus: string;
  }>({ open: false, dealName: "", targetStatus: "Lost" });

  function isLostStage(stageKey: string): boolean {
    const stage = stages.find((s) => s.name === stageKey);
    return stageKey.toLowerCase().includes("lost") || stage?.type?.toLowerCase() === "lost";
  }

  const [movingDeals, setMovingDeals] = useState<Record<string, string>>({});

  // Move deal to new column and optionally new swimlane
  async function handleMove(dealName: string, targetColKey: string, targetSwimlaneKey?: string) {
    if (targetColKey === UNASSIGNED_KEY) return;
    if (groupBy === "status" && isLostStage(targetColKey)) {
      const deal = rows.find((r) => r["name"] === dealName);
      setLostModalState({
        open: true,
        dealName,
        dealTitle: String(deal?.["organization_name"] || deal?.["organization"] || dealName),
        targetStatus: targetColKey,
      });
      return;
    }
    const patch: Record<string, unknown> = { [groupBy]: targetColKey };

    // Update swimlane field if dropped into a swimlane
    if (swimlaneBy !== "none" && targetSwimlaneKey) {
      if (targetSwimlaneKey === UNASSIGNED_KEY) {
        patch[swimlaneBy] = null;
      } else {
        patch[swimlaneBy] = targetSwimlaneKey;
      }
    }

    setMovingDeals((prev) => ({ ...prev, [dealName]: targetColKey }));

    // Check if target stage is "Won"
    if (targetColKey.toLowerCase().includes("won")) {
      triggerConfetti();
    }

    try {
      await saveMutation.mutateAsync({ name: dealName, values: patch });
    } finally {
      setMovingDeals((prev) => {
        const next = { ...prev };
        delete next[dealName];
        return next;
      });
    }
  }

  // Render Deal Card Sub-component with smooth Apple/Trello card-lift & 2.5deg tilt animation
  function renderCard(deal: Record<string, unknown>) {
    const name = String(deal["name"] ?? "");
    const orgName =
      String(deal["organization_name"] ?? "") ||
      String(deal["organization"] ?? "Unnamed Deal");
    const dealValue = deal["deal_value"];
    const dealCurrency = (deal["currency"] as string) || "PKR";
    const closeDate = deal["expected_closure_date"];
    const owner = deal["deal_owner"];
    const probability = deal["probability"];
    const currentStage = String(deal["status"] ?? "");
    const email = String(deal["email"] || "");
    const phone = String(deal["mobile_no"] || deal["phone"] || "");
    const isMoving = Boolean(movingDeals[name]);
    const movingTo = movingDeals[name];
    const isDragged = draggedDealName === name;

    return (
      <div
        key={name}
        draggable={!isMoving}
        onDragStart={(e) => {
          e.dataTransfer.setData("text/plain", name);
          e.dataTransfer.effectAllowed = "move";
          setDraggedDealName(name);
        }}
        onDragEnd={() => {
          setDraggedDealName(null);
          setDragOverCol(null);
          setDragOverSwimlane(null);
        }}
        onClick={() => onRowClick?.(name)}
        className={cn(
          "group relative overflow-hidden rounded-xl border bg-card p-3 shadow-2xs transition-all duration-200 select-none shrink-0",
          "hover:-translate-y-0.5 hover:shadow-md hover:border-foreground/20 cursor-grab active:cursor-grabbing",
          "active:scale-[1.02] active:rotate-2 active:shadow-xl",
          isDragged
            ? "opacity-35 scale-95 border-dashed border-primary rotate-2 ring-2 ring-primary/30"
            : "border-border/80",
          isMoving && "pointer-events-none ring-2 ring-primary/40",
        )}
      >
        {isMoving && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-md bg-background/85 backdrop-blur-xs p-2 text-center animate-in fade-in duration-200">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/25 text-[11px] font-semibold text-primary shadow-xs">
              <Loader2 className="size-3.5 animate-spin text-primary" />
              <span className="truncate max-w-[170px]">
                Moving to {movingTo}...
              </span>
            </div>
          </div>
        )}

        {/* Top row: Organization Name & 3-dots */}
        <div className="flex items-start justify-between gap-1.5">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <AvatarGradient name={orgName} size="xs" rounded="md" />
            <div className="flex-1 truncate">
              <h4 className="font-semibold text-xs text-foreground truncate group-hover:text-primary transition-colors">
                {orgName}
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
                <DropdownMenuLabel>Deal Actions</DropdownMenuLabel>
                {onCreateQuotation && (
                  <DropdownMenuItem
                    onClick={() => onCreateQuotation(deal)}
                    className="gap-2 cursor-pointer font-medium text-primary"
                  >
                    <FileText className="size-3.5" />
                    <span>Create Quotation</span>
                  </DropdownMenuItem>
                )}
                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(deal)}>
                    Edit Deal
                  </DropdownMenuItem>
                )}
                <MoveToSubmenu
                  label="Move to Stage"
                  currentValue={currentStage}
                  options={stageOptions}
                  onSelect={(newStage) => {
                    if (isLostStage(newStage)) {
                      setLostModalState({
                        open: true,
                        dealName: name,
                        dealTitle: orgName,
                        targetStatus: newStage,
                      });
                    } else {
                      void saveMutation.mutateAsync({
                        name,
                        values: { status: newStage },
                      });
                    }
                  }}
                />
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => {
                    setConfirmError(null);
                    setConfirmDelete({
                      title: `Delete deal "${name}"?`,
                      confirmLabel: "Delete",
                      body: (
                        <span>
                          This deal will be permanently deleted from your CRM. This
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
                  Delete Deal
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Middle row: Deal Value & Probability */}
        <div className="mt-2.5 flex items-center justify-between">
          <span className="font-bold text-xs text-foreground font-mono">
            {formatCurrency(dealValue, dealCurrency)}
          </span>

          {probability !== undefined && probability !== null && (
            <Badge
              variant="secondary"
              className="text-[10px] px-1.5 py-0 font-mono font-normal"
            >
              {Number(probability)}%
            </Badge>
          )}
        </div>

        {/* Quick 1-click action shortcuts (Quote, Phone, Email) */}
        {(onCreateQuotation || phone || email) && (
          <div className="mt-2 flex items-center justify-between gap-1.5">
            {onCreateQuotation ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCreateQuotation(deal);
                }}
                className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary/10 hover:bg-primary/20 px-1.5 py-0.5 rounded transition-colors"
                title="Create Quotation"
              >
                <FileText className="size-2.5" />
                <span>Quote</span>
              </button>
            ) : (
              <span />
            )}

            <div
              className="flex items-center gap-0.5"
              onClick={(e) => e.stopPropagation()}
            >
              {phone && (
                <a
                  href={`tel:${phone}`}
                  className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                  title={`Call ${phone}`}
                >
                  <Phone className="size-3" />
                </a>
              )}
              {email && (
                <a
                  href={`mailto:${email}`}
                  className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                  title={`Email ${email}`}
                >
                  <Mail className="size-3" />
                </a>
              )}
            </div>
          </div>
        )}

        {/* Bottom row: Close date & Owner */}
        <div className="mt-2 flex items-center justify-between border-t border-border/40 pt-2 text-[10px] text-muted-foreground">
          {closeDate ? (
            <div className="flex items-center gap-1">
              <Calendar className="size-3 opacity-70" />
              <span>{String(closeDate)}</span>
            </div>
          ) : (
            <span />
          )}

          {Boolean(owner) && (
            <div
              className="flex items-center gap-1 font-medium"
              title={`Owner: ${String(owner)}`}
            >
              <AvatarGradient name={String(owner)} size="xs" />
              <span className="truncate max-w-[90px]">{String(owner)}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 min-h-0 h-full flex-col space-y-3">
      {/* Top controls: Group By, Swimlane selector & Pipeline Summary */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 shrink-0">
        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
          <span className="font-medium text-foreground">Pipeline View:</span>
          <span>Showing {rows.length} deals</span>

          {collapsedCols.length > 0 && (
            <button
              type="button"
              onClick={() => setCollapsedCols([])}
              className="text-[11px] text-primary hover:underline font-medium cursor-pointer ml-1"
            >
              Expand all columns ({collapsedCols.length} collapsed)
            </button>
          )}

          {groupBy === "status" && (
            <Select
              value=""
              onValueChange={async (val) => {
                if (!val) return;
                if (val === "__custom__") {
                  setNewStageName("");
                  setAddStageDialogOpen(true);
                  return;
                }
                await handleRestoreStage(val);
              }}
            >
              <SelectTrigger className="h-7 text-xs ml-2 w-36" aria-label="Add stage">
                <SelectValue placeholder="Add stage..." />
              </SelectTrigger>
              {addStageDialogOpen && (
                <Dialog open={addStageDialogOpen} onOpenChange={(open) => setAddStageDialogOpen(open)}>
                  <DialogContent className="p-4">
                    <DialogHeader>
                      <DialogTitle>Add New Stage</DialogTitle>
                    </DialogHeader>
                    <DialogDescription>Enter a name for the new stage</DialogDescription>
                    <Label className="block text-sm font-medium mb-2">Stage Name</Label>
                    <Input
                      value={newStageName}
                      onChange={(event) => setNewStageName(event.target.value)}
                      placeholder="e.g. Won"
                      className="w-full mb-3"
                    />
                    <DialogFooter className="justify-end space-x-2">
                      <Button variant="ghost" onClick={() => setAddStageDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button
                        onClick={async () => {
                          const trimmed = newStageName.trim();
                          if (!trimmed) {
                            setAddStageDialogOpen(false);
                            return;
                          }
                          try {
                            await api.createDealStatus({ deal_status: trimmed });
                            toast.success(`Stage "${trimmed}" created`);
                            await queryClient.invalidateQueries({ queryKey: ["deals", "statuses"] });
                          } catch (err) {
                            toast.error(err instanceof Error ? err.message : "Failed to create stage");
                          }
                          setAddStageDialogOpen(false);
                        }}
                        disabled={!newStageName.trim()}
                      >
                        Create
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
              <SelectContent>
                {deletedStages.length === 0 && (
                  <SelectItem value="__none__" disabled>
                    No deleted stages
                  </SelectItem>
                )}
                {deletedStages.map((d) => (
                  <SelectItem key={d.name} value={d.name}>
                    {d.name}
                  </SelectItem>
                ))}
                <SelectItem value="__custom__">Custom...</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Swimlane Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Layers className="size-3.5" />
              Swimlanes:
            </span>
            <Select value={swimlaneBy} onValueChange={(val) => setSwimlaneBy(val)}>
              <SelectTrigger aria-label="Swimlane by" className="h-8 w-36 text-xs">
                <SelectValue placeholder="Swimlanes..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (Standard)</SelectItem>
                <SelectItem value="territory">Territory</SelectItem>
                <SelectItem value="deal_owner">Salesperson (Owner)</SelectItem>
                {groupableFields
                  .filter(
                    (f) =>
                      f.fieldname !== "status" &&
                      f.fieldname !== "territory" &&
                      f.fieldname !== "deal_owner",
                  )
                  .map((f) => (
                    <SelectItem key={f.fieldname} value={f.fieldname}>
                      {fieldLabel(f)}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Group By Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Group by:</span>
            <Select value={groupBy} onValueChange={onGroupByChange}>
              <SelectTrigger aria-label="Group deals by" className="h-8 w-40 text-xs">
                <SelectValue placeholder="Group by field..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="status">Stage (Sales Pipeline)</SelectItem>
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
      </div>

      {/* Main Board View: Standard Single-Board OR Swimlanes Mode */}
      {swimlaneBy === "none" ? (
        /* STANDARD KANBAN BOARD */
        <div className="flex flex-1 min-h-0 gap-3.5 overflow-x-auto pb-3 pt-1 items-stretch">
          {columns.map((col) => {
            const deals = groupedDeals.get(col.key) ?? [];
            const isOver = dragOverCol === col.key;
            const isUnassigned = col.key === UNASSIGNED_KEY;
            const isCollapsed = collapsedCols.includes(col.key);

            // Hide unassigned column if empty
            if (isUnassigned && deals.length === 0) return null;

            // Calculate column totals
            const totalValue = deals.reduce((sum, d) => {
              const val = Number(d["deal_value"]);
              return isNaN(val) ? sum : sum + val;
            }, 0);
            const currency = (deals[0]?.["currency"] as string) || "PKR";
            const style = getStageStyle(col.key);

            // COLLAPSED COLUMN STRIP
            if (isCollapsed) {
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
                    const dealName = e.dataTransfer.getData("text/plain") || draggedDealName;
                    if (dealName && dealName !== col.key) {
                      void handleMove(dealName, col.key);
                    }
                    setDraggedDealName(null);
                  }}
                  onClick={() => toggleColumnCollapse(col.key)}
                  className={cn(
                    "flex w-12 sm:w-14 shrink-0 flex-col items-center justify-between rounded-xl border bg-muted/30 py-3 transition-all duration-200 shadow-2xs h-full cursor-pointer hover:bg-muted/60 hover:border-primary/40 select-none group",
                    isOver ? "border-primary ring-2 ring-primary/30 bg-primary/10" : "border-border/80",
                  )}
                  title={`Click to expand ${col.label} (${deals.length} deals)`}
                >
                  {/* Top: Expand icon & Color Indicator */}
                  <div className="flex flex-col items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 rounded-lg text-muted-foreground group-hover:text-primary group-hover:bg-background/80"
                      aria-label={`Expand ${col.label}`}
                    >
                      <PanelLeftOpen className="size-4" />
                    </Button>
                    <span className={cn("size-2 rounded-full", style.bar)} />
                  </div>

                  {/* Middle: Rotated Vertical Label */}
                  <div className="flex-1 flex items-center justify-center py-4 overflow-hidden">
                    <span className="font-semibold text-xs text-foreground tracking-wide whitespace-nowrap [writing-mode:vertical-rl] rotate-180 truncate max-h-[220px]">
                      {col.label}
                    </span>
                  </div>

                  {/* Bottom: Deal Count & Compact Amount */}
                  <div className="flex flex-col items-center gap-1">
                    <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-mono">
                      {deals.length}
                    </Badge>
                    <span className="text-[10px] font-mono font-medium text-muted-foreground">
                      {formatCompactNumber(totalValue)}
                    </span>
                  </div>
                </div>
              );
            }

            // EXPANDED COLUMN
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
                  const dealName = e.dataTransfer.getData("text/plain") || draggedDealName;
                  if (dealName && dealName !== col.key) {
                    void handleMove(dealName, col.key);
                  }
                  setDraggedDealName(null);
                }}
                className={cn(
                  "flex w-[82vw] sm:w-64 shrink-0 flex-col rounded-xl border bg-muted/20 transition-all duration-200 shadow-2xs h-full max-h-full overflow-hidden",
                  isOver ? "border-primary ring-2 ring-primary/20 bg-primary/5" : "border-border/80",
                )}
              >
                {/* Column Header */}
                <div className="border-b bg-card/70 p-3 rounded-t-xl backdrop-blur-xs shrink-0">
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-2 truncate">
                      <span className={cn("size-2 rounded-full shrink-0", style.bar)} />
                      <h3 className="font-semibold text-xs text-foreground truncate">{col.label}</h3>
                      <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-mono">
                        {deals.length}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-0.5 shrink-0">
                      {/* Collapse Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleColumnCollapse(col.key)}
                        className="size-6 text-muted-foreground hover:text-foreground active:scale-95 transition-transform"
                        title={`Collapse ${col.label} column`}
                        aria-label="Collapse column"
                      >
                        <PanelLeftClose className="size-3.5" />
                      </Button>

                      {!isUnassigned && (
                        <>
                          {groupBy === "status" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openStageDeleteDialog(col.key)}
                              className="size-6 text-muted-foreground hover:text-destructive active:scale-95 transition-transform"
                              title={`Delete stage ${col.label}`}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          )}
                          {onAddInStage && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onAddInStage(col.key)}
                              className="size-6 text-muted-foreground hover:text-foreground active:scale-95 transition-transform"
                              title={`Add deal in ${col.label}`}
                            >
                              <Plus className="size-3.5" />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Column Value & Probability */}
                  <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/40 pt-1.5">
                    <span className="font-semibold text-foreground font-mono">
                      {formatCurrency(totalValue, currency)}
                    </span>
                    {col.probability !== undefined && (
                      <span className="text-[10px] bg-muted/80 px-1.5 py-0.5 rounded-full text-muted-foreground font-medium">
                        {col.probability}% prob
                      </span>
                    )}
                  </div>
                </div>

                {/* Column Cards List */}
                <div className="flex-1 min-h-0 overflow-y-auto p-2.5 flex flex-col gap-2.5">
                  {loading && rows.length === 0 ? (
                    <div className="space-y-2">
                      <Skeleton className="h-24 w-full rounded-xl" />
                      <Skeleton className="h-24 w-full rounded-xl" />
                    </div>
                  ) : deals.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center py-8 text-center text-xs text-muted-foreground border-2 border-dashed border-border/40 rounded-lg m-1">
                      <p className="italic">No deals here</p>
                      <p className="text-[10px] text-muted-foreground">Drag deals to move</p>
                    </div>
                  ) : (
                    deals.map((deal) => renderCard(deal))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* HORIZONTAL SWIMLANES KANBAN MODE */
        <div className="flex-1 min-h-0 overflow-auto pb-4 pt-1 rounded-xl border border-border/60 bg-muted/10">
          <div className="flex flex-col min-w-max">
            {/* Swimlanes Board Header: Synchronized Column Titles */}
            <div className="sticky top-0 z-20 flex gap-3 border-b bg-background/95 backdrop-blur-md px-3 py-2.5 shadow-2xs">
              {/* Left Spacer for Swimlane Row Labels */}
              <div className="w-56 sm:w-64 shrink-0 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                {swimlaneBy === "territory" ? (
                  <MapPin className="size-4 text-primary" />
                ) : swimlaneBy === "deal_owner" ? (
                  <User className="size-4 text-primary" />
                ) : (
                  <Layers className="size-4 text-primary" />
                )}
                <span>
                  Swimlane: {swimlaneBy === "territory" ? "Territory" : swimlaneBy === "deal_owner" ? "Salesperson" : swimlaneBy}
                </span>
              </div>

              {/* Stage Column Titles */}
              <div className="flex gap-3 items-center">
                {columns.map((col) => {
                  const isCollapsed = collapsedCols.includes(col.key);
                  const isUnassigned = col.key === UNASSIGNED_KEY;
                  const deals = groupedDeals.get(col.key) ?? [];
                  const style = getStageStyle(col.key);

                  if (isUnassigned && deals.length === 0) return null;

                  if (isCollapsed) {
                    return (
                      <div
                        key={col.key}
                        onClick={() => toggleColumnCollapse(col.key)}
                        className="w-12 sm:w-14 shrink-0 flex flex-col items-center justify-center p-1 rounded-lg border bg-muted/40 hover:bg-muted/70 cursor-pointer transition-colors"
                        title={`Expand ${col.label}`}
                      >
                        <PanelLeftOpen className="size-3.5 text-muted-foreground mb-0.5" />
                        <span className="text-[10px] font-semibold truncate max-w-full">
                          {col.label.slice(0, 3)}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={col.key}
                      className="w-64 sm:w-72 shrink-0 flex items-center justify-between px-3 py-1.5 rounded-lg border bg-card shadow-2xs"
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span className={cn("size-2 rounded-full shrink-0", style.bar)} />
                        <span className="font-semibold text-xs text-foreground truncate">
                          {col.label}
                        </span>
                        <Badge variant="secondary" className="px-1 py-0 text-[10px] font-mono">
                          {deals.length}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleColumnCollapse(col.key)}
                        className="size-5 text-muted-foreground hover:text-foreground"
                        title="Collapse column"
                      >
                        <PanelLeftClose className="size-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Swimlanes Horizontal Bands */}
            <div className="flex flex-col divide-y divide-border/60">
              {swimlanes.map((lane) => {
                const isLaneCollapsed = collapsedSwimlanes.includes(lane.key);
                // Get all deals belonging to this swimlane
                const laneDeals = rows.filter((r) => {
                  const val = r[swimlaneBy];
                  const key =
                    typeof val === "string" && val.trim() ? val.trim() : UNASSIGNED_KEY;
                  return key === lane.key;
                });
                const laneTotal = laneDeals.reduce((sum, d) => {
                  const val = Number(d["deal_value"]);
                  return isNaN(val) ? sum : sum + val;
                }, 0);
                const laneCurrency = (laneDeals[0]?.["currency"] as string) || "PKR";

                return (
                  <div key={lane.key} className="flex flex-col bg-card/30">
                    {/* Swimlane Horizontal Row Header */}
                    <div
                      onClick={() => toggleSwimlaneCollapse(lane.key)}
                      className="sticky left-0 z-10 flex items-center justify-between px-3 py-2 bg-muted/40 hover:bg-muted/70 cursor-pointer select-none transition-colors border-b border-border/40"
                    >
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6 text-muted-foreground"
                          aria-label={isLaneCollapsed ? "Expand row" : "Collapse row"}
                        >
                          {isLaneCollapsed ? (
                            <ChevronRight className="size-4" />
                          ) : (
                            <ChevronDown className="size-4" />
                          )}
                        </Button>
                        {swimlaneBy === "territory" ? (
                          <MapPin className="size-4 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <AvatarGradient name={lane.label} size="xs" />
                        )}
                        <span className="font-semibold text-xs text-foreground">
                          {lane.label}
                        </span>
                        <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0">
                          {laneDeals.length} deal{laneDeals.length !== 1 ? "s" : ""}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-3 text-xs">
                        <span className="font-mono font-semibold text-foreground">
                          {formatCurrency(laneTotal, laneCurrency)}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {isLaneCollapsed ? "Click to expand" : "Click to collapse"}
                        </span>
                      </div>
                    </div>

                    {/* Swimlane Columns Content */}
                    {!isLaneCollapsed && (
                      <div className="flex gap-3 p-3 items-stretch">
                        {/* Left Info Card */}
                        <div className="w-56 sm:w-64 shrink-0 flex flex-col justify-between p-3 rounded-xl border border-border/60 bg-muted/10 text-xs">
                          <div>
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                              Swimlane Info
                            </span>
                            <h4 className="font-bold text-sm text-foreground mt-0.5 truncate">
                              {lane.label}
                            </h4>
                            <p className="text-[11px] text-muted-foreground mt-1">
                              {laneDeals.length} active deals in this lane.
                            </p>
                          </div>
                          <div className="mt-3 pt-2 border-t border-border/40">
                            <span className="text-[10px] text-muted-foreground block">Lane Total</span>
                            <span className="font-mono font-bold text-xs text-foreground">
                              {formatCurrency(laneTotal, laneCurrency)}
                            </span>
                          </div>
                        </div>

                        {/* Stage Cells in this Swimlane */}
                        <div className="flex gap-3 items-stretch">
                          {columns.map((col) => {
                            const isColCollapsed = collapsedCols.includes(col.key);
                            const isUnassigned = col.key === UNASSIGNED_KEY;
                            const isCellOver =
                              dragOverCol === col.key && dragOverSwimlane === lane.key;

                            // Filter deals in this specific cell: stage + swimlane
                            const cellDeals = laneDeals.filter((d) => {
                              const v = d[groupBy];
                              const k =
                                typeof v === "string" && v.trim() ? v.trim() : UNASSIGNED_KEY;
                              return k === col.key;
                            });

                            if (isUnassigned && cellDeals.length === 0) return null;

                            if (isColCollapsed) {
                              return (
                                <div
                                  key={col.key}
                                  onDragOver={(e) => {
                                    e.preventDefault();
                                    e.dataTransfer.dropEffect = "move";
                                    if (dragOverCol !== col.key || dragOverSwimlane !== lane.key) {
                                      setDragOverCol(col.key);
                                      setDragOverSwimlane(lane.key);
                                    }
                                  }}
                                  onDragLeave={() => {
                                    if (dragOverCol === col.key && dragOverSwimlane === lane.key) {
                                      setDragOverCol(null);
                                      setDragOverSwimlane(null);
                                    }
                                  }}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    setDragOverCol(null);
                                    setDragOverSwimlane(null);
                                    const dealName =
                                      e.dataTransfer.getData("text/plain") || draggedDealName;
                                    if (dealName) {
                                      void handleMove(dealName, col.key, lane.key);
                                    }
                                    setDraggedDealName(null);
                                  }}
                                  className={cn(
                                    "w-12 sm:w-14 shrink-0 rounded-xl border bg-muted/20 p-2 flex flex-col items-center justify-center transition-all",
                                    isCellOver
                                      ? "border-primary ring-2 ring-primary/30 bg-primary/10"
                                      : "border-border/60",
                                  )}
                                  title={`Drop here for ${col.label}`}
                                >
                                  <Badge
                                    variant="secondary"
                                    className="text-[10px] font-mono px-1 py-0"
                                  >
                                    {cellDeals.length}
                                  </Badge>
                                </div>
                              );
                            }

                            return (
                              <div
                                key={col.key}
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  e.dataTransfer.dropEffect = "move";
                                  if (dragOverCol !== col.key || dragOverSwimlane !== lane.key) {
                                    setDragOverCol(col.key);
                                    setDragOverSwimlane(lane.key);
                                  }
                                }}
                                onDragLeave={() => {
                                  if (dragOverCol === col.key && dragOverSwimlane === lane.key) {
                                    setDragOverCol(null);
                                    setDragOverSwimlane(null);
                                  }
                                }}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  setDragOverCol(null);
                                  setDragOverSwimlane(null);
                                  const dealName =
                                    e.dataTransfer.getData("text/plain") || draggedDealName;
                                  if (dealName) {
                                    void handleMove(dealName, col.key, lane.key);
                                  }
                                  setDraggedDealName(null);
                                }}
                                className={cn(
                                  "w-64 sm:w-72 shrink-0 rounded-xl border bg-muted/15 p-2.5 flex flex-col gap-2.5 min-h-[140px] transition-all duration-150",
                                  isCellOver
                                    ? "border-primary ring-2 ring-primary/20 bg-primary/5 scale-[1.01]"
                                    : "border-border/60",
                                )}
                              >
                                {cellDeals.length === 0 ? (
                                  <div className="flex flex-1 flex-col items-center justify-center py-6 text-center text-[11px] text-muted-foreground border-2 border-dashed border-border/30 rounded-lg">
                                    <span className="italic">No deals</span>
                                    <span className="text-[10px] text-muted-foreground/80 mt-0.5">
                                      Drop deal here
                                    </span>
                                  </div>
                                ) : (
                                  cellDeals.map((deal) => renderCard(deal))
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation & Lost Modal */}
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
        {...(confirmDelete?.confirmDisabled !== undefined
          ? { confirmDisabled: confirmDelete.confirmDisabled }
          : {})}
        pending={confirmPending}
        error={confirmError}
        onConfirm={() => void handleConfirmDelete()}
      />
      <DealLostModal
        open={lostModalState.open}
        onOpenChange={(open) => setLostModalState((prev) => ({ ...prev, open }))}
        dealNames={lostModalState.dealName ? [lostModalState.dealName] : []}
        dealTitle={lostModalState.dealTitle}
        targetStatus={lostModalState.targetStatus}
      />
    </div>
  );
}

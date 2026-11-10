import { useState, useMemo } from "react";
import {
  Building2,
  Calendar,
  GripVertical,
  MoreVertical,
  Plus,
  User,
  CheckCircle2,
  XCircle,
  ArrowRight,
  TrendingUp,
  Loader2,
  FileText,
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
import { StageBadge, formatCurrency, getStageStyle } from "@/components/deals/deal-stage-badge";
import { AvatarGradient } from "@/components/ui/avatar-gradient";
import { DealLostModal } from "@/components/deals/deal-lost-modal";
import { useSaveDeal, useDeleteDeal, type FrappeDocTypeMeta } from "@/hooks/use-deals";
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

  const [draggedDealName, setDraggedDealName] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

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
    // If grouping by status (default pipeline mode), use stages ordered by position
    if (groupBy === "status") {
      const cols = stages.map((s) => ({
        key: s.name,
        label: s.deal_status || s.name,
        probability: s.probability,
        type: s.type,
      }));
      // Also add unassigned if any deals have null/empty status
      cols.push({
        key: UNASSIGNED_KEY,
        label: "Unassigned Stage",
        probability: undefined,
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

  // Group deals into columns
  const groupedDeals = useMemo(() => {
    const map = new Map<string, Record<string, unknown>[]>();
    for (const col of columns) {
      map.set(col.key, []);
    }
    for (const row of rows) {
      const val = row[groupBy];
      const key =
        typeof val === "string" && val.trim() && map.has(val.trim())
          ? val.trim()
          : UNASSIGNED_KEY;
      const list = map.get(key);
      if (list) list.push(row);
      else map.set(key, [row]);
    }
    return map;
  }, [columns, rows, groupBy]);

  // All stage options for the Move To submenu
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
    return (
      stageKey.toLowerCase().includes("lost") ||
      stage?.type?.toLowerCase() === "lost"
    );
  }

  const [movingDeals, setMovingDeals] = useState<Record<string, string>>({});

  // Move deal to new column
  async function handleMove(dealName: string, targetColKey: string) {
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

  return (
    <div className="flex flex-1 min-h-0 h-full flex-col space-y-3">
      {/* Top controls: Group By selector & Pipeline Summary */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 shrink-0">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Pipeline View:</span>
          <span>Showing {rows.length} total deals</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Group by:</span>
          <Select value={groupBy} onValueChange={onGroupByChange}>
            <SelectTrigger className="h-8 w-44 text-xs">
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

      {/* Kanban Board Horizontal Scroll */}
      <div className="flex flex-1 min-h-0 gap-4 overflow-x-auto pb-3 pt-1 items-stretch">
        {columns.map((col) => {
          const deals = groupedDeals.get(col.key) ?? [];
          const isOver = dragOverCol === col.key;
          const isUnassigned = col.key === UNASSIGNED_KEY;

          // Hide unassigned column if empty
          if (isUnassigned && deals.length === 0) return null;

          // Calculate column totals
          const totalValue = deals.reduce((sum, d) => {
            const val = Number(d["deal_value"]);
            return isNaN(val) ? sum : sum + val;
          }, 0);
          const currency = (deals[0]?.["currency"] as string) || "PKR";
          const style = getStageStyle(col.key);

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
                "flex w-[82vw] sm:w-80 shrink-0 flex-col rounded-xl border bg-muted/20 transition-all duration-200 shadow-2xs h-full max-h-full overflow-hidden",
                isOver ? "border-primary ring-2 ring-primary/20 bg-primary/5" : "border-border/80",
              )}
            >
              {/* Column Header */}
              <div className="border-b bg-card/70 p-3 rounded-t-xl backdrop-blur-xs shrink-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 truncate">
                    <span className={cn("size-2 rounded-full shrink-0", style.bar)} />
                    <h3 className="font-semibold text-xs text-foreground truncate">
                      {col.label}
                    </h3>
                    <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-mono">
                      {deals.length}
                    </Badge>
                  </div>

                  {!isUnassigned && onAddInStage && (
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
                    <p className="text-[10px] opacity-75">Drag deals to move</p>
                  </div>
                ) : (
                  deals.map((deal) => {
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
                    const isMoving = Boolean(movingDeals[name]);
                    const movingTo = movingDeals[name];

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
                        }}
                        onClick={() => onRowClick?.(name)}
                        className={cn(
                          "group relative overflow-hidden rounded-xl border bg-card p-3.5 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-foreground/20 cursor-grab active:cursor-grabbing active:scale-[0.98] shrink-0",
                          draggedDealName === name ? "opacity-40 border-dashed" : "border-border/80",
                          isMoving && "pointer-events-none ring-2 ring-primary/40",
                        )}
                      >
                        {isMoving && (
                          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-md bg-background/85 backdrop-blur-xs p-2 text-center animate-in fade-in duration-200">
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/25 text-[11px] font-semibold text-primary shadow-xs">
                              <Loader2 className="size-3.5 animate-spin text-primary" />
                              <span className="truncate max-w-[170px]">Moving to {movingTo}...</span>
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

                          <div
                            className="shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-6 text-muted-foreground opacity-90 sm:opacity-60 sm:group-hover:opacity-100"
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
                                    if (
                                      window.confirm(
                                        `Are you sure you want to delete deal ${name}?`,
                                      )
                                    ) {
                                      void deleteMutation.mutate(name);
                                    }
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

                        {/* Bottom row: Close date & Owner */}
                        <div className="mt-2 flex items-center justify-between border-t border-border/40 pt-2 text-[10px] text-muted-foreground">
                          {Boolean(closeDate) ? (
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
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

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

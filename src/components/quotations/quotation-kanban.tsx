import { useMemo, useState, useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Building2,
  Calendar,
  FileText,
  MoreVertical,
  ShoppingCart,
  CheckCircle2,
  Trash2,
  Loader2,
  Eye,
  Plus,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useSaveQuotation,
  useSubmitQuotation,
  useCancelQuotation,
  useDeleteQuotation,
  type Quotation,
} from "@/hooks/use-quotations";
import { useCreateSalesOrderFromQuotation } from "@/hooks/use-sales-orders";
import { triggerConfetti } from "@/lib/confetti";
import { cn } from "@/lib/utils";

interface QuotationKanbanProps {
  rows: Quotation[];
  loading?: boolean;
  onEdit?: (quotation: Quotation) => void;
  onAddQuotation?: () => void;
  onConvertToSalesOrder?: (quotation: Quotation) => void;
  onRowClick?: (name: string) => void;
}

export const QUOTATION_STAGES = [
  {
    key: "Draft",
    label: "Draft",
    headerBg: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-300",
  },
  {
    key: "Open",
    label: "Open (Sent)",
    headerBg: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-300",
  },
  {
    key: "Ordered",
    label: "Ordered (Won)",
    headerBg: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-300",
  },
  {
    key: "Lost",
    label: "Lost / Cancelled",
    headerBg: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-300",
  },
] as const;

function getQuotationStageKey(status?: string): string {
  const s = (status || "Draft").trim().toLowerCase();
  if (s === "open" || s === "replied") return "Open";
  if (s === "ordered") return "Ordered";
  if (s === "lost" || s === "cancelled") return "Lost";
  return "Draft";
}

export function QuotationKanban({
  rows,
  loading,
  onEdit,
  onAddQuotation,
  onConvertToSalesOrder,
  onRowClick,
}: QuotationKanbanProps) {
  const navigate = useNavigate();
  const saveMutation = useSaveQuotation();
  const submitMutation = useSubmitQuotation();
  const cancelMutation = useCancelQuotation();
  const deleteMutation = useDeleteQuotation();
  const createOrderMutation = useCreateSalesOrderFromQuotation();

  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Quotation | null>(null);
  const [hiddenColumns, setHiddenColumns] = useState<string[]>(() => {
    try {
      const raw = window.localStorage.getItem("agrocrm.hiddenQuotationColumns");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  useEffect(() => {
    try {
      window.localStorage.setItem("agrocrm.hiddenQuotationColumns", JSON.stringify(hiddenColumns));
    } catch {
      // ignore
    }
  }, [hiddenColumns]);
  const [draggedQuotationName, setDraggedQuotationName] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [movingToStage, setMovingToStage] = useState<string | null>(null);

  function handleCardClick(quotationName: string) {
    if (onRowClick) {
      onRowClick(quotationName);
    } else {
      void navigate({
        to: "/quotations/$quotationId",
        params: { quotationId: quotationName },
      });
    }
  }

  async function handleMove(quotationName: string, targetStage: string) {
    const q = rows.find((r) => r.name === quotationName);
    if (!q) return;

    const currentStage = getQuotationStageKey(q.status);
    if (currentStage === targetStage) return;

    setMovingId(quotationName);
    setMovingToStage(targetStage);

    try {
      if (targetStage === "Open" && q.docstatus === 0) {
        // Submitting moves a draft quotation to Open in Frappe
        await submitMutation.mutateAsync(quotationName);
        toast.success(`Quotation ${quotationName} submitted and marked as Open`);
      } else if (targetStage === "Ordered") {
        if (onConvertToSalesOrder) {
          onConvertToSalesOrder(q);
          toast.info(`Please submit the Sales Order to mark ${quotationName} as Ordered.`);
        } else {
          await handleCreateSalesOrder(q);
        }
      } else if (targetStage === "Lost") {
        if (q.docstatus === 1) {
          await cancelMutation.mutateAsync(quotationName);
        } else {
          await saveMutation.mutateAsync({
            name: quotationName,
            values: { status: "Lost" },
          });
        }
      } else if (targetStage === "Draft") {
        if (q.docstatus === 1) {
          toast.error("Submitted quotations cannot be reverted to Draft.");
        } else {
          await saveMutation.mutateAsync({
            name: quotationName,
            values: { status: "Draft" },
          });
        }
      } else {
        await saveMutation.mutateAsync({
          name: quotationName,
          values: { status: targetStage },
        });
        toast.success(`Quotation ${quotationName} moved to ${targetStage}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to move quotation stage");
    } finally {
      setMovingId(null);
      setMovingToStage(null);
    }
  }

  async function handleSubmit(q: Quotation, e?: React.MouseEvent) {
    e?.stopPropagation();
    setActiveActionId(q.name);
    try {
      await submitMutation.mutateAsync(q.name);
    } finally {
      setActiveActionId(null);
    }
  }

  function handleDelete(q: Quotation, e?: React.MouseEvent) {
    e?.stopPropagation();
    setDeleteTarget(q);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const name = deleteTarget.name;
    setActiveActionId(name);
    try {
      await deleteMutation.mutateAsync(name);
      setDeleteTarget(null);
    } finally {
      setActiveActionId(null);
    }
  }

  async function handleCreateSalesOrder(q: Quotation, e?: React.MouseEvent) {
    e?.stopPropagation();
    if (onConvertToSalesOrder) {
      onConvertToSalesOrder(q);
      return;
    }
    setActiveActionId(q.name);
    try {
      await createOrderMutation.mutateAsync({ quotation: q });
    } finally {
      setActiveActionId(null);
    }
  }

  const grouped = useMemo(() => {
    const map = new Map<string, Quotation[]>();
    for (const stage of QUOTATION_STAGES) {
      map.set(stage.key, []);
    }

    for (const q of rows) {
      const stageKey = getQuotationStageKey(q.status);
      const list = map.get(stageKey);
      if (list) {
        list.push(q);
      } else {
        map.get("Draft")?.push(q);
      }
    }
    return map;
  }, [rows]);

  if (loading && rows.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 h-full">
      {hiddenColumns.length > 0 && (
        <div className="flex items-center gap-2 px-1 text-xs">
          <span className="text-muted-foreground">Hidden columns:</span>
          <Select
            value=""
            onValueChange={(val) => {
              if (!val) return;
              setHiddenColumns((prev) => prev.filter((c) => c !== val));
            }}
          >
            <SelectTrigger className="h-7 text-xs w-40">
              <SelectValue placeholder="Restore column..." />
            </SelectTrigger>
            <SelectContent>
              {hiddenColumns.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="flex flex-1 min-h-0 gap-4 overflow-x-auto pb-3 pt-1 items-stretch h-full">
        {QUOTATION_STAGES.filter((col) => !hiddenColumns.includes(col.key)).map((col) => {
        const list = grouped.get(col.key) ?? [];
        const isOver = dragOverCol === col.key;
        const totalAmount = list.reduce((sum, q) => sum + (Number(q.grand_total) || 0), 0);
        const laneCurrency = (list[0]?.currency as string) || "PKR";

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
              const qName = e.dataTransfer.getData("text/plain") || draggedQuotationName;
              if (qName) {
                void handleMove(qName, col.key);
              }
              setDraggedQuotationName(null);
            }}
            className={cn(
              "flex w-[84vw] max-w-[320px] sm:w-[272px] sm:max-w-none shrink-0 flex-col rounded-2xl border bg-muted/[0.35] transition-[border-color,box-shadow,background-color] duration-200 h-full max-h-full overflow-hidden",
              isOver ? "border-primary/50 ring-2 ring-primary/15 bg-primary/[0.03]" : "border-border/60",
            )}
          >
            {/* Stage Column Header */}
            <div className="border-b border-border/50 bg-background/60 px-3.5 py-3 rounded-t-2xl backdrop-blur-sm shrink-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-semibold text-[13px] text-foreground tracking-tight truncate">{col.label}</span>
                  <span className="text-[11px] font-medium text-muted-foreground tabular-nums">{list.length}</span>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setHiddenColumns((prev) => [...prev, col.key])}
                    className="size-7 rounded-md text-muted-foreground/70 hover:text-destructive hover:bg-destructive/10"
                    title={`Hide column ${col.label}`}
                    aria-label={`Hide ${col.label} column`}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                  {col.key === "Draft" && onAddQuotation && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onAddQuotation}
                      className="size-7 rounded-md text-muted-foreground/70 hover:text-foreground hover:bg-muted/60"
                      title="Add Quotation"
                      aria-label="Add quotation"
                    >
                      <Plus className="size-3.5" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="mt-1">
                <span className="text-[12px] font-medium text-muted-foreground tabular-nums tracking-tight">
                  {laneCurrency} {totalAmount.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Stage Cards Container */}
            <div className="flex-1 min-h-0 overflow-y-auto p-2 sm:p-2.5 flex flex-col gap-2.5">
              {list.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center py-10 px-4 text-center text-muted-foreground/70">
                  <div className="size-8 rounded-full border border-dashed border-border/70 mb-2.5" />
                  <p className="text-xs font-medium text-muted-foreground">No quotations</p>
                  <p className="text-[11px] mt-0.5">Drop a quotation here</p>
                </div>
              ) : (
                list.map((q) => {
                  const isRowBusy = activeActionId === q.name;
                  const isMoving = movingId === q.name;
                  const isDraft = q.docstatus === 0;

                  return (
                    <div
                      key={q.name}
                      draggable={!isRowBusy && !isMoving}
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", q.name);
                        e.dataTransfer.effectAllowed = "move";
                        setDraggedQuotationName(q.name);
                      }}
                      onDragEnd={() => {
                        setDraggedQuotationName(null);
                        setDragOverCol(null);
                      }}
                      onClick={() => handleCardClick(q.name)}
                      className={cn(
                        "group relative flex flex-col justify-between rounded-xl border bg-card p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-[transform,box-shadow,border-color,opacity] duration-200 cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.18)] hover:border-border active:scale-[0.995] shrink-0",
                        draggedQuotationName === q.name
                          ? "opacity-40 border-dashed border-primary/50 shadow-none"
                          : "border-border/70",
                        isMoving && "pointer-events-none ring-2 ring-primary/30",
                      )}
                    >
                      {/* In-Flight Moving Overlay */}
                      {isMoving && (
                        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-xl bg-background/85 backdrop-blur-xs p-2 text-center animate-in fade-in duration-200">
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/25 text-[11px] font-semibold text-primary shadow-xs">
                            <Loader2 className="size-3.5 animate-spin text-primary" />
                            <span>Moving to {movingToStage}...</span>
                          </div>
                        </div>
                      )}

                      {/* Header: Customer Name & 3-Dots Menu */}
                      <div className="flex items-start justify-between gap-2 mb-2.5">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-[13px] leading-5 text-foreground truncate group-hover:text-primary transition-colors">
                            {q.party_name}
                          </h4>
                          <span className="block font-mono text-[10px] leading-4 text-muted-foreground/80 mt-0.5 truncate">
                            {q.name}
                          </span>
                        </div>

                        <div onClick={(e) => e.stopPropagation()} className="-mr-1 -mt-1">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7 rounded-md text-muted-foreground/80 hover:text-foreground hover:bg-muted/60 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                                disabled={isRowBusy || isMoving}
                                aria-label={`Actions for quotation ${q.name}`}
                              >
                                {isRowBusy ? (
                                  <Loader2 className="size-3.5 animate-spin" />
                                ) : (
                                  <MoreVertical className="size-4" />
                                )}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 text-xs">
                              <DropdownMenuLabel className="text-[11px] text-muted-foreground">
                                Actions ({q.name})
                              </DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleCardClick(q.name)}
                                className="gap-2 cursor-pointer font-medium"
                              >
                                <Eye className="size-3.5 text-muted-foreground" />
                                <span>View Quotation Detail</span>
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={(e) => handleCreateSalesOrder(q, e)}
                                className="gap-2 cursor-pointer font-medium text-emerald-700 dark:text-emerald-400"
                              >
                                <ShoppingCart className="size-3.5" />
                                <span>Convert to Sales Order</span>
                              </DropdownMenuItem>

                              {isDraft && (
                                <DropdownMenuItem
                                  onClick={(e) => handleSubmit(q, e)}
                                  className="gap-2 cursor-pointer text-blue-700 dark:text-blue-400"
                                >
                                  <CheckCircle2 className="size-3.5" />
                                  <span>Submit Quotation</span>
                                </DropdownMenuItem>
                              )}

                              {isDraft && onEdit && (
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onEdit(q);
                                  }}
                                  className="gap-2 cursor-pointer"
                                >
                                  <FileText className="size-3.5" />
                                  <span>Edit Details</span>
                                </DropdownMenuItem>
                              )}

                              <DropdownMenuSeparator />
                              <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-wider">
                                Move Stage
                              </DropdownMenuLabel>
                              {QUOTATION_STAGES.filter(
                                (s) => s.key !== getQuotationStageKey(q.status),
                              ).map((stage) => (
                                <DropdownMenuItem
                                  key={stage.key}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void handleMove(q.name, stage.key);
                                  }}
                                  className="gap-2 cursor-pointer text-xs"
                                >
                                  <ArrowRight className="size-3.5 text-muted-foreground" />
                                  <span>Move to {stage.label}</span>
                                </DropdownMenuItem>
                              ))}

                              {isDraft && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={(e) => handleDelete(q, e)}
                                    className="gap-2 cursor-pointer text-rose-700 dark:text-rose-400 focus:text-rose-700 dark:text-rose-400"
                                  >
                                    <Trash2 className="size-3.5" />
                                    <span>Delete Quotation</span>
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      {q.crm_deal && (
                        <div className="mb-2.5 text-[11px] text-muted-foreground flex items-center gap-1.5 min-w-0">
                          <span className="shrink-0">Deal</span>
                          <span className="font-mono text-foreground/80 truncate">{q.crm_deal}</span>
                        </div>
                      )}

                      <div className="flex items-end justify-between gap-2 border-t border-border/50 pt-2.5">
                        <span className="text-muted-foreground flex items-center gap-1.5 text-[11px] min-w-0">
                          <Calendar className="size-3.5 opacity-60 shrink-0" />
                          <span className="truncate">{q.transaction_date || "-"}</span>
                        </span>
                        <span className="font-semibold text-[15px] leading-none tracking-tight text-foreground tabular-nums shrink-0">
                          {(q.currency as string) || "PKR"} {Number(q.grand_total || 0).toLocaleString()}
                        </span>
                      </div>

                      <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => handleCreateSalesOrder(q, e)}
                          disabled={isRowBusy || isMoving}
                          className="w-full h-8 text-[11px] font-medium gap-1.5 text-foreground/85 hover:text-foreground"
                        >
                          <ShoppingCart className="size-3.5 text-muted-foreground" />
                          <span>Create sales order</span>
                        </Button>
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

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !deleteMutation.isPending) setDeleteTarget(null);
        }}
        title={`Delete quotation ${deleteTarget?.name || ""}?`}
        description="This quotation will be permanently removed. This action cannot be undone."
        pending={
          deleteMutation.isPending ||
          (deleteTarget !== null && activeActionId === deleteTarget.name)
        }
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}

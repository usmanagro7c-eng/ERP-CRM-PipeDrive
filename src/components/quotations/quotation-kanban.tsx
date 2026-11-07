import { useMemo, useState } from "react";
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
  { key: "Draft", label: "Draft", headerBg: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-300" },
  { key: "Open", label: "Open (Sent)", headerBg: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-300" },
  { key: "Ordered", label: "Ordered (Won)", headerBg: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-300" },
  { key: "Lost", label: "Lost / Cancelled", headerBg: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-300" },
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

  async function handleDelete(q: Quotation, e?: React.MouseEvent) {
    e?.stopPropagation();
    if (!confirm(`Are you sure you want to delete quotation ${q.name}?`)) return;
    setActiveActionId(q.name);
    try {
      await deleteMutation.mutateAsync(q.name);
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
    <div className="flex gap-4 overflow-x-auto pb-4 pt-1 items-start min-h-[550px]">
      {QUOTATION_STAGES.map((col) => {
        const list = grouped.get(col.key) ?? [];
        const isOver = dragOverCol === col.key;
        const totalAmount = list.reduce(
          (sum, q) => sum + (Number(q.grand_total) || 0),
          0,
        );

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
              "flex w-[82vw] sm:w-80 shrink-0 flex-col rounded-xl border bg-muted/20 transition-all duration-200 shadow-2xs",
              isOver ? "border-primary ring-2 ring-primary/20 bg-primary/5" : "border-border/80",
            )}
          >
            {/* Stage Column Header */}
            <div className="flex items-center justify-between border-b bg-card/60 backdrop-blur-xs p-3 rounded-t-xl border-border/70">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-xs text-foreground">
                  {col.label}
                </span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                  {list.length}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-muted-foreground">
                  PKR {totalAmount.toLocaleString()}
                </span>
                {col.key === "Draft" && onAddQuotation && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onAddQuotation}
                    className="size-6 text-muted-foreground hover:text-foreground cursor-pointer"
                    title="Add Quotation"
                  >
                    <Plus className="size-3.5" />
                  </Button>
                )}
              </div>
            </div>

            {/* Stage Cards Container */}
            <div className="flex flex-col gap-2.5 p-2.5 min-h-[180px] max-h-[calc(100vh-270px)] overflow-y-auto">
              {list.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center py-12 text-center text-xs text-muted-foreground border-2 border-dashed border-border/40 rounded-lg m-1">
                  <span>Drop quotations here</span>
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
                        "group relative flex flex-col justify-between rounded-xl border bg-card p-3.5 shadow-2xs transition-all duration-200 cursor-pointer hover:-translate-y-0.5 hover:shadow-md hover:border-foreground/20 active:scale-[0.99]",
                        draggedQuotationName === q.name ? "opacity-40 border-dashed" : "border-border/80",
                        isMoving && "pointer-events-none ring-2 ring-primary/40",
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
                      <div className="flex items-start justify-between gap-1 mb-2">
                        <div className="flex-1 min-w-0 pr-1">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="size-3.5 text-primary shrink-0" />
                            <h4 className="font-semibold text-xs text-foreground truncate group-hover:text-primary transition-colors">
                              {q.party_name}
                            </h4>
                          </div>
                          <span className="font-mono text-[10px] text-muted-foreground block mt-0.5">
                            {q.name}
                          </span>
                        </div>

                        <div onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-6 text-muted-foreground hover:text-foreground cursor-pointer"
                                disabled={isRowBusy || isMoving}
                                aria-label={`Actions for quotation ${q.name}`}
                              >
                                {isRowBusy ? (
                                  <Loader2 className="size-3 animate-spin" />
                                ) : (
                                  <MoreVertical className="size-3.5" />
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
                                className="gap-2 cursor-pointer font-medium text-emerald-600 dark:text-emerald-400"
                              >
                                <ShoppingCart className="size-3.5" />
                                <span>Convert to Sales Order</span>
                              </DropdownMenuItem>

                              {isDraft && (
                                <DropdownMenuItem
                                  onClick={(e) => handleSubmit(q, e)}
                                  className="gap-2 cursor-pointer text-blue-600 dark:text-blue-400"
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
                              {QUOTATION_STAGES.filter((s) => s.key !== getQuotationStageKey(q.status)).map((stage) => (
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
                                    className="gap-2 cursor-pointer text-rose-600 focus:text-rose-600"
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

                      {/* Linked Deal if any */}
                      {q.crm_deal && (
                        <div className="mb-2 text-[10px] text-muted-foreground flex items-center gap-1">
                          <span>Deal:</span>
                          <span className="font-mono font-medium text-foreground bg-muted/60 px-1.5 py-0.5 rounded border border-border/40">
                            {q.crm_deal}
                          </span>
                        </div>
                      )}

                      {/* Bottom row: Date & Grand Total */}
                      <div className="flex items-center justify-between border-t border-border/50 pt-2 text-[11px]">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Calendar className="size-3" />
                          <span>{q.transaction_date || "-"}</span>
                        </span>
                        <span className="font-bold text-xs text-foreground">
                          PKR {Number(q.grand_total || 0).toLocaleString()}
                        </span>
                      </div>

                      {/* Quick "Convert to Order" CTA button on card */}
                      <div className="mt-2.5 pt-2 border-t border-border/40" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          onClick={(e) => handleCreateSalesOrder(q, e)}
                          disabled={isRowBusy || isMoving}
                          className="w-full h-6.5 text-[11px] font-semibold gap-1.5 bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-black cursor-pointer shadow-2xs"
                        >
                          <ShoppingCart className="size-3" />
                          <span>Convert to Sales Order</span>
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
  );
}

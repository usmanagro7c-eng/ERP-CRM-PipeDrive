import { useMemo, useState } from "react";
import {
  Building2,
  Calendar,
  FileText,
  MoreVertical,
  ShoppingCart,
  CheckCircle2,
  Trash2,
  Loader2,
  Clock,
  Check,
  XCircle,
} from "lucide-react";
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
  useSubmitQuotation,
  useDeleteQuotation,
  type Quotation,
} from "@/hooks/use-quotations";
import { useCreateSalesOrderFromQuotation } from "@/hooks/use-sales-orders";
import { cn } from "@/lib/utils";

interface QuotationKanbanProps {
  rows: Quotation[];
  loading?: boolean;
  onEdit?: (quotation: Quotation) => void;
  onAddQuotation?: () => void;
}

const QUOTATION_STAGES = [
  { key: "Draft", label: "Draft", color: "bg-slate-500/10 text-slate-700 border-slate-300" },
  { key: "Open", label: "Open (Sent)", color: "bg-blue-500/10 text-blue-700 border-blue-300" },
  { key: "Ordered", label: "Ordered (Won)", color: "bg-emerald-500/10 text-emerald-700 border-emerald-300" },
  { key: "Lost", label: "Lost / Cancelled", color: "bg-red-500/10 text-red-700 border-red-300" },
] as const;

export function QuotationKanban({
  rows,
  loading,
  onEdit,
  onAddQuotation,
}: QuotationKanbanProps) {
  const submitMutation = useSubmitQuotation();
  const deleteMutation = useDeleteQuotation();
  const createOrderMutation = useCreateSalesOrderFromQuotation();

  const [activeActionId, setActiveActionId] = useState<string | null>(null);

  async function handleSubmit(q: Quotation) {
    setActiveActionId(q.name);
    try {
      await submitMutation.mutateAsync(q.name);
    } finally {
      setActiveActionId(null);
    }
  }

  async function handleDelete(q: Quotation) {
    if (!confirm(`Are you sure you want to delete quotation ${q.name}?`)) return;
    setActiveActionId(q.name);
    try {
      await deleteMutation.mutateAsync(q.name);
    } finally {
      setActiveActionId(null);
    }
  }

  async function handleCreateSalesOrder(q: Quotation) {
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
      const s = (q.status || "Draft").toLowerCase();
      if (s === "open") {
        map.get("Open")?.push(q);
      } else if (s === "ordered") {
        map.get("Ordered")?.push(q);
      } else if (s === "lost" || s === "cancelled") {
        map.get("Lost")?.push(q);
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
    <div className="flex gap-4 overflow-x-auto pb-4 pt-1 items-start min-h-[500px]">
      {QUOTATION_STAGES.map((col) => {
        const list = grouped.get(col.key) ?? [];
        const totalAmount = list.reduce(
          (sum, q) => sum + (Number(q.grand_total) || 0),
          0,
        );

        return (
          <div
            key={col.key}
            className="flex w-[82vw] sm:w-80 shrink-0 flex-col rounded-lg border bg-muted/30 border-border"
          >
            {/* Stage Column Header */}
            <div className="flex items-center justify-between border-b bg-card/50 p-3 rounded-t-lg">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-xs text-foreground">
                  {col.label}
                </span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {list.length}
                </span>
              </div>
              <span className="text-[11px] font-semibold text-muted-foreground">
                PKR {totalAmount.toLocaleString()}
              </span>
            </div>

            {/* Stage Cards Container */}
            <div className="flex flex-col gap-2.5 p-2.5 min-h-[160px] max-h-[calc(100vh-270px)] overflow-y-auto">
              {list.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center py-8 text-center text-xs text-muted-foreground italic">
                  No quotations in this stage
                </div>
              ) : (
                list.map((q) => {
                  const isRowBusy = activeActionId === q.name;
                  const isDraft = q.docstatus === 0;

                  return (
                    <div
                      key={q.name}
                      className="group relative flex flex-col justify-between rounded-md border bg-card p-3 shadow-xs hover:shadow-md transition-all border-border"
                    >
                      <div className="flex items-start justify-between gap-1 mb-2">
                        <div className="flex-1 truncate">
                          <h4 className="font-semibold text-xs text-foreground truncate">
                            {q.party_name}
                          </h4>
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {q.name}
                          </span>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-6 text-muted-foreground"
                              disabled={isRowBusy}
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
                              onClick={() => handleCreateSalesOrder(q)}
                              className="gap-2 cursor-pointer font-medium text-primary"
                            >
                              <ShoppingCart className="size-3.5" />
                              <span>Create Sales Order</span>
                            </DropdownMenuItem>

                            {isDraft && (
                              <DropdownMenuItem
                                onClick={() => handleSubmit(q)}
                                className="gap-2 cursor-pointer text-blue-600"
                              >
                                <CheckCircle2 className="size-3.5" />
                                <span>Submit Quotation</span>
                              </DropdownMenuItem>
                            )}

                            {isDraft && onEdit && (
                              <DropdownMenuItem
                                onClick={() => onEdit(q)}
                                className="gap-2 cursor-pointer"
                              >
                                <FileText className="size-3.5" />
                                <span>Edit Details</span>
                              </DropdownMenuItem>
                            )}

                            {isDraft && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDelete(q)}
                                  className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="size-3.5" />
                                  <span>Delete Quotation</span>
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {q.crm_deal && (
                        <div className="mb-2 text-[10px] text-muted-foreground">
                          Deal:{" "}
                          <span className="font-mono font-medium text-foreground">
                            {q.crm_deal}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between border-t pt-2 text-[11px]">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Calendar className="size-3" />
                          <span>{q.transaction_date}</span>
                        </span>
                        <span className="font-bold text-xs text-primary">
                          PKR {Number(q.grand_total || 0).toLocaleString()}
                        </span>
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

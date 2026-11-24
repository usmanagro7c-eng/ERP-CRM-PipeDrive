import { useMemo, useState, useEffect } from "react";
import {
  Building2,
  Calendar,
  ShoppingCart,
  MoreVertical,
  CheckCircle2,
  Loader2,
  Clock,
  Check,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSubmitSalesOrder, type SalesOrder } from "@/hooks/use-sales-orders";
import { cn } from "@/lib/utils";

interface SalesOrderKanbanProps {
  rows: SalesOrder[];
  loading?: boolean;
  onEdit?: (order: SalesOrder) => void;
  onAddOrder?: () => void;
}

const SALES_ORDER_STAGES = [
  { key: "Draft", label: "Draft Orders", color: "bg-slate-500/10 text-slate-700 border-slate-300" },
  {
    key: "To Deliver and Bill",
    label: "To Deliver & Bill",
    color: "bg-blue-500/10 text-blue-700 border-blue-300",
  },
  {
    key: "Completed",
    label: "Completed",
    color: "bg-emerald-500/10 text-emerald-700 border-emerald-300",
  },
  {
    key: "Cancelled",
    label: "Cancelled / Closed",
    color: "bg-red-500/10 text-red-700 border-red-300",
  },
] as const;

export function SalesOrderKanban({ rows, loading, onEdit, onAddOrder }: SalesOrderKanbanProps) {
  const submitMutation = useSubmitSalesOrder();
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [hiddenColumns, setHiddenColumns] = useState<string[]>(() => {
    try {
      const raw = window.localStorage.getItem("agrocrm.hiddenSalesOrderColumns");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  useEffect(() => {
    try {
      window.localStorage.setItem("agrocrm.hiddenSalesOrderColumns", JSON.stringify(hiddenColumns));
    } catch {
      // ignore
    }
  }, [hiddenColumns]);

  async function handleSubmit(order: SalesOrder) {
    setActiveActionId(order.name);
    try {
      await submitMutation.mutateAsync(order.name);
    } finally {
      setActiveActionId(null);
    }
  }

  const grouped = useMemo(() => {
    const map = new Map<string, SalesOrder[]>();
    for (const stage of SALES_ORDER_STAGES) {
      map.set(stage.key, []);
    }

    for (const order of rows) {
      const s = (order.status || "Draft").toLowerCase();
      if (s.includes("completed")) {
        map.get("Completed")?.push(order);
      } else if (s.includes("deliver") || s.includes("bill")) {
        map.get("To Deliver and Bill")?.push(order);
      } else if (s === "cancelled" || s === "closed") {
        map.get("Cancelled")?.push(order);
      } else {
        map.get("Draft")?.push(order);
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
      <div className="flex flex-1 min-h-0 gap-3 sm:gap-4 overflow-x-auto pb-3 pt-1 items-stretch h-full">
        {SALES_ORDER_STAGES.filter((col) => !hiddenColumns.includes(col.key)).map((col) => {
        const list = grouped.get(col.key) ?? [];
        const totalAmount = list.reduce((sum, o) => sum + (Number(o.grand_total) || 0), 0);
        const laneCurrency = (list[0]?.currency as string) || "PKR";

        return (
          <div
            key={col.key}
            className="flex w-[84vw] max-w-[320px] sm:w-[272px] sm:max-w-none shrink-0 flex-col rounded-2xl border border-border/60 bg-muted/[0.35] h-full max-h-full overflow-hidden"
          >
            {/* Stage Column Header */}
            <div className="border-b border-border/50 bg-background/60 px-3.5 py-3 rounded-t-2xl backdrop-blur-sm shrink-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-semibold text-[13px] tracking-tight text-foreground truncate">{col.label}</span>
                  <span className="text-[11px] font-medium text-muted-foreground tabular-nums">{list.length}</span>
                </div>
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
                  <p className="text-xs font-medium text-muted-foreground">No orders</p>
                  <p className="text-[11px] mt-0.5">Nothing in this stage</p>
                </div>
              ) : (
                list.map((order) => {
                  const isRowBusy = activeActionId === order.name;
                  const isDraft = order.docstatus === 0;

                  return (
                    <div
                      key={order.name}
                      onClick={() => onEdit?.(order)}
                      role="button"
                      tabIndex={0}
                      aria-label={`Sales order: ${order.customer} (${order.name})`}
                      onKeyDown={(e) => {
                        if (e.target !== e.currentTarget) return;
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onEdit?.(order);
                        }
                      }}
                      className="group relative flex flex-col justify-between rounded-xl border border-border/70 bg-card p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-[transform,box-shadow,border-color] duration-200 cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.18)] hover:border-border shrink-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2.5">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-[13px] leading-5 text-foreground truncate group-hover:text-primary transition-colors">
                            {order.customer}
                          </h4>
                          <span className="block font-mono text-[10px] leading-4 text-muted-foreground/80 mt-0.5 truncate">
                            {order.name}
                          </span>
                        </div>

                        {isDraft && (
                          <div onClick={(e) => e.stopPropagation()} className="-mr-1 -mt-1">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-7 rounded-md text-muted-foreground/80 hover:text-foreground hover:bg-muted/60 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                                  disabled={isRowBusy}
                                  aria-label={`Actions for sales order ${order.name}`}
                                >
                                  {isRowBusy ? (
                                    <Loader2 className="size-3.5 animate-spin" />
                                  ) : (
                                    <MoreVertical className="size-4" />
                                  )}
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44 text-xs">
                                <DropdownMenuLabel className="text-[11px] text-muted-foreground">
                                  Actions ({order.name})
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleSubmit(order)}
                                  className="gap-2 cursor-pointer text-emerald-700 dark:text-emerald-400 font-medium"
                                >
                                  <CheckCircle2 className="size-3.5 text-emerald-700 dark:text-emerald-400" />
                                  <span>Submit Order</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}
                      </div>

                      {order.delivery_date && (
                        <div className="mb-2.5 text-[11px] text-muted-foreground flex items-center gap-1.5 min-w-0">
                          <span className="shrink-0">Delivery</span>
                          <span className="text-foreground/80 truncate">{order.delivery_date}</span>
                        </div>
                      )}

                      <div className="flex items-end justify-between gap-2 border-t border-border/50 pt-2.5">
                        <span className="text-muted-foreground flex items-center gap-1.5 text-[11px] min-w-0">
                          <Calendar className="size-3.5 opacity-60 shrink-0" />
                          <span className="truncate">{order.transaction_date}</span>
                        </span>
                        <span className="font-semibold text-[15px] leading-none tracking-tight text-foreground tabular-nums shrink-0">
                          {(order.currency as string) || "PKR"} {Number(order.grand_total || 0).toLocaleString()}
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
    </div>
  );
}

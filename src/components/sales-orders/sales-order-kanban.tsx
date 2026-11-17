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
      <div className="flex flex-1 min-h-0 gap-4 overflow-x-auto pb-3 pt-1 items-stretch h-full">
        {SALES_ORDER_STAGES.filter((col) => !hiddenColumns.includes(col.key)).map((col) => {
        const list = grouped.get(col.key) ?? [];
        const totalAmount = list.reduce((sum, o) => sum + (Number(o.grand_total) || 0), 0);

        return (
          <div
            key={col.key}
            className="flex w-[82vw] sm:w-64 shrink-0 flex-col rounded-lg border bg-muted/30 border-border h-full max-h-full overflow-hidden"
          >
            {/* Stage Column Header */}
            <div className="flex items-center justify-between border-b bg-card/50 p-3 rounded-t-lg shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-xs text-foreground">{col.label}</span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {list.length}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setHiddenColumns((prev) => [...prev, col.key])}
                  className="size-6 text-muted-foreground hover:text-destructive"
                  title={`Hide column ${col.label}`}
                >
                  <Trash2 className="size-3.5" />
                </Button>
                <span className="text-[11px] font-semibold text-muted-foreground">
                  PKR {totalAmount.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Stage Cards Container */}
            <div className="flex-1 min-h-0 overflow-y-auto p-2.5 flex flex-col gap-2.5">
              {list.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center py-8 text-center text-xs text-muted-foreground border-2 border-dashed border-border/40 rounded-lg m-1 italic">
                  No orders in this stage
                </div>
              ) : (
                list.map((order) => {
                  const isRowBusy = activeActionId === order.name;
                  const isDraft = order.docstatus === 0;

                  return (
                    <div
                      key={order.name}
                      onClick={() => onEdit?.(order)}
                      className="group relative flex flex-col justify-between rounded-md border bg-card p-3 shadow-xs hover:shadow-md transition-all border-border cursor-pointer hover:border-primary/40 shrink-0"
                    >
                      <div className="flex items-start justify-between gap-1 mb-2">
                        <div className="flex-1 truncate">
                          <h4 className="font-semibold text-xs text-foreground truncate hover:underline">
                            {order.customer}
                          </h4>
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {order.name}
                          </span>
                        </div>

                        {isDraft && (
                          <div onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-6 text-muted-foreground"
                                  disabled={isRowBusy}
                                  aria-label={`Actions for sales order ${order.name}`}
                                >
                                  {isRowBusy ? (
                                    <Loader2 className="size-3 animate-spin" />
                                  ) : (
                                    <MoreVertical className="size-3.5" />
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
                        <div className="mb-2 text-[10px] text-muted-foreground flex items-center gap-1">
                          <span>Delivery:</span>
                          <span className="font-medium text-foreground">{order.delivery_date}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between border-t pt-2 text-[11px]">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Calendar className="size-3" />
                          <span>{order.transaction_date}</span>
                        </span>
                        <span className="font-bold text-xs text-primary">
                          PKR {Number(order.grand_total || 0).toLocaleString()}
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

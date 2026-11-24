import { useState } from "react";
import {
  Building2,
  Calendar,
  ShoppingCart,
  MoreVertical,
  CheckCircle2,
  Loader2,
  Clock,
  Check,
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
import { Plus } from "lucide-react";
import { useSubmitSalesOrder, type SalesOrder } from "@/hooks/use-sales-orders";

interface SalesOrderGridProps {
  rows: SalesOrder[];
  loading?: boolean;
  onEdit?: (order: SalesOrder) => void;
  onCreate?: () => void;
}

function SalesOrderStatusBadge({ status }: { status: string }) {
  const s = (status || "Draft").toLowerCase();
  if (s.includes("completed")) {
    return (
      <Badge
        variant="outline"
        className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[11px] font-medium gap-1"
      >
        <Check className="size-3" />
        <span>Completed</span>
      </Badge>
    );
  }
  if (s.includes("deliver") || s.includes("bill")) {
    return (
      <Badge
        variant="outline"
        className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30 text-[11px] font-medium gap-1"
      >
        <Clock className="size-3" />
        <span>{status}</span>
      </Badge>
    );
  }
  if (s === "cancelled" || s === "closed") {
    return (
      <Badge
        variant="outline"
        className="bg-destructive/10 text-destructive border-destructive/30 text-[11px] font-medium"
      >
        {status}
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="text-[11px] font-medium">
      {status || "Draft"}
    </Badge>
  );
}

export function SalesOrderGrid({ rows, loading, onEdit, onCreate }: SalesOrderGridProps) {
  const submitMutation = useSubmitSalesOrder();
  const [activeActionId, setActiveActionId] = useState<string | null>(null);

  async function handleSubmit(order: SalesOrder) {
    setActiveActionId(order.name);
    try {
      await submitMutation.mutateAsync(order.name);
    } finally {
      setActiveActionId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 p-12 text-center bg-card/30">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-3">
          <ShoppingCart className="size-6" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">No sales orders found</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm">
          Confirmed customer purchase orders ready for fulfillment, delivery, and invoicing.
        </p>
        {onCreate && (
          <Button
            size="sm"
            variant="contrast"
            onClick={onCreate}
            className="mt-4 h-8 text-xs font-medium px-4 rounded-md cursor-pointer shadow-xs gap-1.5"
          >
            <Plus className="size-3.5" />
            <span>Create Sales Order</span>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
      {rows.map((row) => {
        const isRowBusy = activeActionId === row.name;
        const isDraft = row.docstatus === 0;

        return (
          <div
            key={row.name}
            onClick={() => onEdit?.(row)}
            className="group flex flex-col justify-between rounded-xl border border-border/70 bg-card p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-border hover:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.18)] relative cursor-pointer"
          >
            {/* Header: Title, ID & Actions */}
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <div className="font-semibold text-[13px] leading-5 text-foreground truncate group-hover:text-primary transition-colors max-w-[220px]">
                    {row.customer}
                  </div>
                  <span className="font-mono text-[10px] leading-4 text-muted-foreground/80 block mt-0.5">{row.name}</span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <SalesOrderStatusBadge status={row.status} />
                  {isDraft && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 -mr-1 rounded-md text-muted-foreground/80 hover:text-foreground hover:bg-muted/60 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                          disabled={isRowBusy}
                          aria-label={`Actions for sales order ${row.name}`}
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
                          Actions ({row.name})
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleSubmit(row)}
                          className="gap-2 cursor-pointer text-blue-700 dark:text-blue-400"
                        >
                          <CheckCircle2 className="size-3.5" />
                          <span>Submit Order</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom details: Dates & Grand Total */}
            <div className="border-t border-border/50 pt-3 mt-3 space-y-2.5">
              <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5 min-w-0">
                  <Calendar className="size-3.5 opacity-60 shrink-0" />
                  <span className="truncate">{row.transaction_date}</span>
                </span>
                {row.delivery_date && <span className="shrink-0">Delivery {row.delivery_date}</span>}
              </div>

              <div className="flex items-end justify-between gap-2">
                <span className="text-[11px] font-medium text-muted-foreground">Total</span>
                <span className="text-[15px] font-semibold tracking-tight tabular-nums text-foreground">
                  {(row.currency as string) || "PKR"} {Number(row.grand_total || 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

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
import {
  useSubmitSalesOrder,
  type SalesOrder,
} from "@/hooks/use-sales-orders";

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
      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[11px] font-medium gap-1">
        <Check className="size-3" />
        <span>Completed</span>
      </Badge>
    );
  }
  if (s.includes("deliver") || s.includes("bill")) {
    return (
      <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30 text-[11px] font-medium gap-1">
        <Clock className="size-3" />
        <span>{status}</span>
      </Badge>
    );
  }
  if (s === "cancelled" || s === "closed") {
    return (
      <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 text-[11px] font-medium">
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
            onClick={onCreate}
            className="mt-4 h-8 text-xs font-medium px-4 rounded-md bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-black cursor-pointer shadow-xs gap-1.5"
          >
            <Plus className="size-3.5" />
            <span>Create Sales Order</span>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {rows.map((row) => {
        const isRowBusy = activeActionId === row.name;
        const isDraft = row.docstatus === 0;

        return (
          <div
            key={row.name}
            onClick={() => onEdit?.(row)}
            className="flex flex-col justify-between rounded-xl border bg-card p-4 shadow-xs hover:shadow-md transition-all border-border hover:border-primary/40 relative cursor-pointer"
          >
            {/* Header: Title, ID & Actions */}
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <div className="flex items-center gap-1.5 font-semibold text-sm text-foreground">
                    <Building2 className="size-4 text-primary shrink-0" />
                    <span className="truncate max-w-[200px]">{row.customer}</span>
                  </div>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {row.name}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <SalesOrderStatusBadge status={row.status} />
                  {isDraft && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground"
                          disabled={isRowBusy}
                          aria-label={`Actions for sales order ${row.name}`}
                        >
                          {isRowBusy ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <MoreVertical className="size-3.5" />
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
                          className="gap-2 cursor-pointer text-blue-600"
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
            <div className="border-t pt-3 mt-3 space-y-2 text-xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="size-3" />
                  <span>{row.transaction_date}</span>
                </span>
                {row.delivery_date && (
                  <span>Delivery: {row.delivery_date}</span>
                )}
              </div>

              <div className="flex items-baseline justify-between pt-1">
                <span className="text-[11px] font-medium text-muted-foreground">
                  Grand Total:
                </span>
                <span className="text-base font-bold text-primary">
                  PKR {Number(row.grand_total || 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

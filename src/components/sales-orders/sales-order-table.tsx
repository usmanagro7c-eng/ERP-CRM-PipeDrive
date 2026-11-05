import { useState } from "react";
import {
  MoreVertical,
  CheckCircle2,
  ShoppingCart,
  Calendar,
  Building2,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useSubmitSalesOrder,
  type SalesOrder,
} from "@/hooks/use-sales-orders";

interface SalesOrderTableProps {
  rows: SalesOrder[];
  loading?: boolean;
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

export function SalesOrderTable({ rows, loading }: SalesOrderTableProps) {
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
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-12 text-center bg-card/40">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
          <ShoppingCart className="size-6" />
        </div>
        <h3 className="text-sm font-semibold">No sales orders found</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm">
          Sales orders are generated automatically when a customer accepts a quotation.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border bg-card shadow-2xs">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead className="w-[150px] text-xs font-semibold">Order ID</TableHead>
            <TableHead className="text-xs font-semibold">Customer</TableHead>
            <TableHead className="hidden sm:table-cell text-xs font-semibold">Date</TableHead>
            <TableHead className="hidden md:table-cell text-xs font-semibold">Delivery Date</TableHead>
            <TableHead className="text-right text-xs font-semibold">Grand Total</TableHead>
            <TableHead className="text-center text-xs font-semibold">Status</TableHead>
            <TableHead className="w-[70px] text-right text-xs font-semibold">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const isRowBusy = activeActionId === row.name;
            const isDraft = row.docstatus === 0;

            return (
              <TableRow key={row.name} className="hover:bg-muted/40 transition-colors">
                <TableCell className="font-semibold text-xs text-primary">
                  {row.name}
                </TableCell>
                <TableCell className="text-xs">
                  <div className="flex items-center gap-1.5 font-medium">
                    <Building2 className="size-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate max-w-[180px]">{row.customer}</span>
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="size-3 text-muted-foreground" />
                    <span>{row.transaction_date}</span>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                  {row.delivery_date || "—"}
                </TableCell>
                <TableCell className="text-right font-semibold text-xs">
                  PKR {Number(row.grand_total || 0).toLocaleString()}
                </TableCell>
                <TableCell className="text-center">
                  <SalesOrderStatusBadge status={row.status} />
                </TableCell>
                <TableCell className="text-right">
                  {isDraft ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground"
                          disabled={isRowBusy}
                          aria-label={`Actions for sales order ${row.name}`}
                        >
                          {isRowBusy ? (
                            <Loader2 className="size-4 animate-spin" />
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
                          className="gap-2 cursor-pointer text-blue-600"
                        >
                          <CheckCircle2 className="size-3.5" />
                          <span>Submit Order</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <span className="text-[11px] text-muted-foreground pr-2">—</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

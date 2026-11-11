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
  Plus,
  Edit,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  onEdit?: (order: SalesOrder) => void;
  onCreate?: () => void;
}

export function SalesOrderStatusBadge({ status }: { status: string }) {
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

export function SalesOrderTable({ rows, loading, onEdit, onCreate }: SalesOrderTableProps) {
  const submitMutation = useSubmitSalesOrder();
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  const allSelected = rows.length > 0 && selectedRows.length === rows.length;

  function toggleSelectAll(checked: boolean) {
    if (checked) {
      setSelectedRows(rows.map((r) => r.name));
    } else {
      setSelectedRows([]);
    }
  }

  function toggleRow(name: string) {
    setSelectedRows((prev) =>
      prev.includes(name) ? prev.filter((id) => id !== name) : [...prev, name],
    );
  }

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
    <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-2xs">
      <Table className="min-w-[850px]">
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableHead className="w-[40px] px-3">
              <Checkbox
                checked={allSelected}
                onCheckedChange={toggleSelectAll}
                aria-label="Select all"
              />
            </TableHead>
            <TableHead className="w-[200px] min-w-[190px] text-xs font-semibold">Order ID</TableHead>
            <TableHead className="text-xs font-semibold">Customer</TableHead>
            <TableHead className="text-center text-xs font-semibold whitespace-nowrap">Status</TableHead>
            <TableHead className="text-right text-xs font-semibold whitespace-nowrap">Grand Total</TableHead>
            <TableHead className="hidden md:table-cell text-xs font-semibold whitespace-nowrap">Delivery Date</TableHead>
            <TableHead className="hidden sm:table-cell text-xs font-semibold whitespace-nowrap">Order Date</TableHead>
            <TableHead className="w-[70px] text-right text-xs font-semibold">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const isRowBusy = activeActionId === row.name;
            const isDraft = row.docstatus === 0;
            const isSelected = selectedRows.includes(row.name);

            return (
              <TableRow
                key={row.name}
                data-state={isSelected ? "selected" : undefined}
                className="hover:bg-muted/40 transition-colors cursor-pointer"
                onClick={() => onEdit?.(row)}
              >
                <TableCell className="px-3" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleRow(row.name)}
                    aria-label={`Select ${row.name}`}
                  />
                </TableCell>
                <TableCell className="font-mono text-xs font-semibold text-primary hover:underline whitespace-nowrap min-w-[190px]">
                  {row.name}
                </TableCell>
                <TableCell className="text-xs">
                  <div className="flex items-center gap-1.5 font-medium">
                    <Building2 className="size-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate max-w-[200px]">{row.customer}</span>
                  </div>
                </TableCell>
                <TableCell className="text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                  <SalesOrderStatusBadge status={row.status} />
                </TableCell>
                <TableCell className="text-right font-semibold text-xs whitespace-nowrap">
                  PKR {Number(row.grand_total || 0).toLocaleString()}
                </TableCell>
                <TableCell className="hidden md:table-cell text-xs text-muted-foreground whitespace-nowrap">
                  {row.delivery_date || "—"}
                </TableCell>
                <TableCell className="hidden sm:table-cell text-xs text-muted-foreground whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <Calendar className="size-3 text-muted-foreground" />
                    <span>{row.transaction_date}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:text-foreground cursor-pointer"
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
                      {onEdit && (
                        <DropdownMenuItem
                          onClick={() => onEdit(row)}
                          className="gap-2 cursor-pointer"
                        >
                          <Edit className="size-3.5" />
                          <span>View / Edit Details</span>
                        </DropdownMenuItem>
                      )}
                      {isDraft && (
                        <DropdownMenuItem
                          onClick={() => handleSubmit(row)}
                          className="gap-2 cursor-pointer text-emerald-600 font-medium"
                        >
                          <CheckCircle2 className="size-3.5 text-emerald-600" />
                          <span>Submit Order</span>
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

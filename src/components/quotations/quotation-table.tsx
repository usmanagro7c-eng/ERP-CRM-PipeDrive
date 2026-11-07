import { useState } from "react";
import {
  MoreVertical,
  CheckCircle2,
  ShoppingCart,
  Trash2,
  FileText,
  Calendar,
  Building2,
  Loader2,
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
  useSubmitQuotation,
  useDeleteQuotation,
  type Quotation,
} from "@/hooks/use-quotations";
import { useCreateSalesOrderFromQuotation } from "@/hooks/use-sales-orders";
import { cn } from "@/lib/utils";

interface QuotationTableProps {
  rows: Quotation[];
  loading?: boolean;
  onEdit?: (quotation: Quotation) => void;
  onViewOrder?: (orderName: string) => void;
  onConvertToSalesOrder?: (quotation: Quotation) => void;
  emptyAction?: React.ReactNode;
}

function QuotationStatusBadge({ status }: { status?: string }) {
  const s = (status || "Draft").trim().toLowerCase();
  let color = "bg-muted text-muted-foreground border-border/40";
  if (s === "ordered") {
    color = "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800";
  } else if (s === "open") {
    color = "bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-400 border-sky-200 dark:border-sky-800";
  } else if (s === "lost" || s === "cancelled") {
    color = "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border-rose-200 dark:border-rose-800";
  }

  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border", color)}>
      {status || "Draft"}
    </span>
  );
}

export function QuotationTable({
  rows,
  loading,
  onEdit,
  onConvertToSalesOrder,
  emptyAction,
}: QuotationTableProps) {
  const submitMutation = useSubmitQuotation();
  const deleteMutation = useDeleteQuotation();
  const createOrderMutation = useCreateSalesOrderFromQuotation();

  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const allIds = rows.map((r) => r.name);
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.includes(id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(allIds);
    }
  };

  const toggleSelectRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

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

  if (loading && rows.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!loading && rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20 max-w-md mx-auto">
        <div className="size-12 rounded-xl bg-muted flex items-center justify-center text-muted-foreground mb-3">
          <FileText className="size-6" />
        </div>
        <h3 className="text-base font-semibold text-foreground">No quotations found</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm leading-relaxed">
          Prepare a formal quotation with pricing, line items, and terms.
        </p>
        {emptyAction}
      </div>
    );
  }

  return (
    <div className="relative overflow-x-auto">
      <Table className="min-w-[850px]">
        <TableHeader>
          <TableRow className="hover:bg-transparent border-b border-border/70 text-muted-foreground text-xs">
            {/* Checkbox */}
            <TableHead className="w-[40px] pl-4">
              <Checkbox
                checked={allSelected}
                onCheckedChange={toggleSelectAll}
                aria-label="Select all"
              />
            </TableHead>
            <TableHead className="w-[15%]">Quotation ID</TableHead>
            <TableHead className="w-[25%]">Customer / Party</TableHead>
            <TableHead className="w-[12%]">Status</TableHead>
            <TableHead className="w-[15%] text-right">Grand Total</TableHead>
            <TableHead className="w-[12%]">Valid Till</TableHead>
            <TableHead className="w-[10%]">Date</TableHead>
            <TableHead className="w-[11%]">CRM Deal</TableHead>
            <TableHead className="w-[40px] text-right pr-2" />
          </TableRow>
        </TableHeader>

        <TableBody>
          {rows.map((row) => {
            const isSelected = selectedIds.includes(row.name);
            const isRowBusy = activeActionId === row.name;
            const isDraft = row.docstatus === 0;

            return (
              <TableRow
                key={row.name}
                onClick={() => onEdit?.(row)}
                className={cn(
                  "group cursor-pointer hover:bg-muted/40 transition-colors border-b border-border/50 h-10",
                  isSelected && "bg-muted/30",
                )}
              >
                {/* Checkbox */}
                <TableCell className="w-[40px] pl-4 py-2" onClick={(e) => toggleSelectRow(row.name, e)}>
                  <Checkbox checked={isSelected} aria-label={`Select ${row.name}`} />
                </TableCell>

                {/* Quotation ID */}
                <TableCell className="text-xs font-mono font-medium text-foreground py-2 truncate">
                  <span className="hover:underline">{row.name}</span>
                </TableCell>

                {/* Customer */}
                <TableCell className="text-xs font-medium text-foreground py-2 truncate max-w-[220px]">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="size-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">{row.party_name}</span>
                  </div>
                </TableCell>

                {/* Status */}
                <TableCell className="py-2">
                  <QuotationStatusBadge status={row.status} />
                </TableCell>

                {/* Grand Total */}
                <TableCell className="text-xs font-semibold text-foreground text-right py-2">
                  PKR {Number(row.grand_total || 0).toLocaleString()}
                </TableCell>

                {/* Valid Till */}
                <TableCell className="text-xs text-muted-foreground py-2">
                  {row.valid_till || "-"}
                </TableCell>

                {/* Date */}
                <TableCell className="text-xs text-muted-foreground py-2">
                  {row.transaction_date || "-"}
                </TableCell>

                {/* CRM Deal */}
                <TableCell className="text-xs text-muted-foreground py-2 truncate max-w-[120px]">
                  {row.crm_deal ? (
                    <span className="font-mono text-[10px] bg-muted/60 px-1.5 py-0.5 rounded border border-border/40">
                      {row.crm_deal}
                    </span>
                  ) : (
                    "-"
                  )}
                </TableCell>

                {/* Actions Menu & Quick Convert */}
                <TableCell className="text-right pr-3 py-1.5" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1.5">
                    <Button
                      size="sm"
                      onClick={() => handleCreateSalesOrder(row)}
                      disabled={isRowBusy}
                      className="h-6.5 text-[11px] font-semibold gap-1 px-2.5 bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-black cursor-pointer shadow-2xs"
                      title="Convert this quotation to a Sales Order"
                    >
                      <ShoppingCart className="size-3" />
                      <span className="hidden sm:inline">Convert to Order</span>
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 opacity-70 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                          disabled={isRowBusy}
                          aria-label={`Actions for quotation ${row.name}`}
                        >
                          {isRowBusy ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <MoreVertical className="size-3.5 text-muted-foreground" />
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 text-xs">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        {onEdit && (
                          <DropdownMenuItem onClick={() => onEdit(row)}>
                            Edit Quotation
                          </DropdownMenuItem>
                        )}
                        {isDraft && (
                          <DropdownMenuItem
                            onClick={() => handleSubmit(row)}
                            className="text-primary font-medium"
                          >
                            <CheckCircle2 className="size-3.5 mr-1.5" />
                            Submit Quotation
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handleCreateSalesOrder(row)}>
                          <ShoppingCart className="size-3.5 mr-1.5 text-emerald-600" />
                          Convert to Sales Order
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDelete(row)}
                        >
                          <Trash2 className="size-3.5 mr-1.5" />
                          Delete Quotation
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

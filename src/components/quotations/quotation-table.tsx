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
}

function QuotationStatusBadge({ status }: { status: string }) {
  const s = (status || "Draft").toLowerCase();
  if (s === "open") {
    return (
      <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30 text-[11px] font-medium">
        Open
      </Badge>
    );
  }
  if (s === "ordered") {
    return (
      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[11px] font-medium">
        Ordered
      </Badge>
    );
  }
  if (s === "lost" || s === "cancelled") {
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

export function QuotationTable({ rows, loading, onEdit }: QuotationTableProps) {
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
          <FileText className="size-6" />
        </div>
        <h3 className="text-sm font-semibold">No quotations found</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm">
          Create a new quotation from here or directly from a Deal card to initiate the sales pipeline.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border bg-card shadow-2xs">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead className="w-[140px] text-xs font-semibold">Quotation ID</TableHead>
            <TableHead className="text-xs font-semibold">Customer</TableHead>
            <TableHead className="hidden md:table-cell text-xs font-semibold">CRM Deal</TableHead>
            <TableHead className="hidden sm:table-cell text-xs font-semibold">Date</TableHead>
            <TableHead className="hidden lg:table-cell text-xs font-semibold">Valid Till</TableHead>
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
                    <span className="truncate max-w-[180px]">{row.party_name}</span>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                  {row.crm_deal ? (
                    <span className="font-mono text-[11px] bg-muted/60 px-1.5 py-0.5 rounded">
                      {row.crm_deal}
                    </span>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="size-3 text-muted-foreground" />
                    <span>{row.transaction_date}</span>
                  </div>
                </TableCell>
                <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                  {row.valid_till || "—"}
                </TableCell>
                <TableCell className="text-right font-semibold text-xs">
                  PKR {Number(row.grand_total || 0).toLocaleString()}
                </TableCell>
                <TableCell className="text-center">
                  <QuotationStatusBadge status={row.status} />
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground"
                        disabled={isRowBusy}
                        aria-label={`Actions for quotation ${row.name}`}
                      >
                        {isRowBusy ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <MoreVertical className="size-4" />
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 text-xs">
                      <DropdownMenuLabel className="text-[11px] text-muted-foreground">
                        Actions ({row.name})
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />

                      {/* Convert to Sales Order */}
                      <DropdownMenuItem
                        onClick={() => handleCreateSalesOrder(row)}
                        className="gap-2 cursor-pointer font-medium text-primary"
                      >
                        <ShoppingCart className="size-3.5" />
                        <span>Create Sales Order</span>
                      </DropdownMenuItem>

                      {/* Submit if Draft */}
                      {isDraft && (
                        <DropdownMenuItem
                          onClick={() => handleSubmit(row)}
                          className="gap-2 cursor-pointer text-blue-600"
                        >
                          <CheckCircle2 className="size-3.5" />
                          <span>Submit Quotation</span>
                        </DropdownMenuItem>
                      )}

                      {/* Edit if Draft */}
                      {isDraft && onEdit && (
                        <DropdownMenuItem
                          onClick={() => onEdit(row)}
                          className="gap-2 cursor-pointer"
                        >
                          <FileText className="size-3.5" />
                          <span>Edit Details</span>
                        </DropdownMenuItem>
                      )}

                      {/* Delete if Draft */}
                      {isDraft && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(row)}
                            className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                          >
                            <Trash2 className="size-3.5" />
                            <span>Delete Quotation</span>
                          </DropdownMenuItem>
                        </>
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

import { useState } from "react";
import { Link } from "@tanstack/react-router";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSubmitQuotation, useDeleteQuotation, type Quotation } from "@/hooks/use-quotations";
import { useCreateSalesOrderFromQuotation } from "@/hooks/use-sales-orders";

interface QuotationGridProps {
  rows: Quotation[];
  loading?: boolean;
  onEdit?: (quotation: Quotation) => void;
  onConvertToSalesOrder?: (quotation: Quotation) => void;
  emptyAction?: React.ReactNode;
}

function QuotationStatusBadge({ status }: { status: string }) {
  const s = (status || "Draft").toLowerCase();
  if (s === "open") {
    return (
      <Badge
        variant="outline"
        className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30 text-[11px] font-medium"
      >
        Open
      </Badge>
    );
  }
  if (s === "ordered") {
    return (
      <Badge
        variant="outline"
        className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[11px] font-medium"
      >
        Ordered
      </Badge>
    );
  }
  if (s === "lost" || s === "cancelled") {
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

export function QuotationGrid({
  rows,
  loading,
  onEdit,
  onConvertToSalesOrder,
  emptyAction,
}: QuotationGridProps) {
  const submitMutation = useSubmitQuotation();
  const deleteMutation = useDeleteQuotation();
  const createOrderMutation = useCreateSalesOrderFromQuotation();

  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Quotation | null>(null);

  async function handleSubmit(q: Quotation) {
    setActiveActionId(q.name);
    try {
      await submitMutation.mutateAsync(q.name);
    } finally {
      setActiveActionId(null);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const name = deleteTarget.name;
    setActiveActionId(name);
    try {
      await deleteMutation.mutateAsync(name);
      setDeleteTarget(null);
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
          Create a new quotation to begin tracking customer proposals.
        </p>
        {emptyAction && <div className="mt-4">{emptyAction}</div>}
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
            className="group flex flex-col justify-between rounded-xl border border-border/70 bg-card p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-border hover:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.18)] relative"
          >
            {/* Header: Title, ID & Actions */}
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <Link
                    to="/quotations/$quotationId"
                    params={{ quotationId: row.name }}
                    className="font-semibold text-[13px] leading-5 text-foreground hover:text-primary transition-colors cursor-pointer block truncate max-w-[220px]"
                  >
                    {row.party_name}
                  </Link>
                  <Link
                    to="/quotations/$quotationId"
                    params={{ quotationId: row.name }}
                    className="font-mono text-[10px] leading-4 text-muted-foreground/80 hover:text-foreground inline-block cursor-pointer mt-0.5"
                  >
                    {row.name}
                  </Link>
                </div>

                <div className="flex items-center gap-1">
                  <QuotationStatusBadge status={row.status} />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 -mr-1 -mt-1 rounded-md text-muted-foreground/80 hover:text-foreground hover:bg-muted/60 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                        disabled={isRowBusy}
                        aria-label={`Actions for quotation ${row.name}`}
                      >
                        {isRowBusy ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <MoreVertical className="size-3.5" />
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 text-xs">
                      <DropdownMenuLabel className="text-[11px] text-muted-foreground">
                        Actions ({row.name})
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link
                          to="/quotations/$quotationId"
                          params={{ quotationId: row.name }}
                          className="gap-2 cursor-pointer font-medium flex items-center"
                        >
                          <Eye className="size-3.5 text-muted-foreground" />
                          <span>View Quotation Detail</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleCreateSalesOrder(row)}
                        className="gap-2 cursor-pointer font-medium text-primary"
                      >
                        <ShoppingCart className="size-3.5" />
                        <span>Create Sales Order</span>
                      </DropdownMenuItem>

                      {isDraft && (
                        <DropdownMenuItem
                          onClick={() => handleSubmit(row)}
                          className="gap-2 cursor-pointer text-blue-700 dark:text-blue-400"
                        >
                          <CheckCircle2 className="size-3.5" />
                          <span>Submit Quotation</span>
                        </DropdownMenuItem>
                      )}

                      {isDraft && onEdit && (
                        <DropdownMenuItem
                          onClick={() => onEdit(row)}
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
                            onClick={() => setDeleteTarget(row)}
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
              </div>

              {/* Deal Link if any */}
              {row.crm_deal && (
                <div className="mt-2 text-[11px] text-muted-foreground flex items-center gap-1.5 min-w-0">
                  <span className="shrink-0">Deal</span>
                  <span className="font-mono text-foreground/80 truncate">{row.crm_deal}</span>
                </div>
              )}
            </div>

            <div className="border-t border-border/50 pt-3 mt-3 space-y-3">
              <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5 min-w-0">
                  <Calendar className="size-3.5 opacity-60 shrink-0" />
                  <span className="truncate">{row.transaction_date}</span>
                </span>
                {row.valid_till && <span className="shrink-0">Valid {row.valid_till}</span>}
              </div>

              <div className="flex items-end justify-between gap-2">
                <span className="text-[11px] font-medium text-muted-foreground">Total</span>
                <span className="text-[15px] font-semibold tracking-tight tabular-nums text-foreground">
                  {(row.currency as string) || "PKR"} {Number(row.grand_total || 0).toLocaleString()}
                </span>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCreateSalesOrder(row)}
                disabled={isRowBusy}
                className="w-full h-8 text-[11px] font-medium gap-1.5 text-foreground/85 hover:text-foreground"
              >
                <ShoppingCart className="size-3.5 text-muted-foreground" />
                <span>Create sales order</span>
              </Button>
            </div>
          </div>
        );
      })}

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !deleteMutation.isPending) setDeleteTarget(null);
        }}
        title={`Delete quotation ${deleteTarget?.name || ""}?`}
        description="This quotation will be permanently removed. This action cannot be undone."
        pending={
          deleteMutation.isPending ||
          (deleteTarget !== null && activeActionId === deleteTarget.name)
        }
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}

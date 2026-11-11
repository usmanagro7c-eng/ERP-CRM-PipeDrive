import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  Copy,
  Edit2,
  ExternalLink,
  FileText,
  List,
  Loader2,
  MoreVertical,
  Plus,
  RefreshCw,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
  quotationDetailOptions,
  useDeleteQuotation,
  useSubmitQuotation,
  type Quotation,
} from "@/hooks/use-quotations";
import { QuotationFormModal } from "@/components/quotations/quotation-form-modal";
import { SalesOrderFormModal } from "@/components/sales-orders/sales-order-form-modal";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/quotations_/$quotationId")({
  head: ({ params }) => ({
    meta: [{ title: `Quotation ${params.quotationId} · AgroCRM` }],
  }),
  component: QuotationDetailPage,
});

function QuotationStatusBadge({ status }: { status?: string }) {
  const s = (status || "Draft").trim().toLowerCase();
  let badgeClass = "bg-muted text-muted-foreground border-border/60";

  if (s === "open") {
    badgeClass = "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30";
  } else if (s === "ordered") {
    badgeClass = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
  } else if (s === "replied") {
    badgeClass = "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30";
  } else if (s === "lost" || s === "cancelled") {
    badgeClass = "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30";
  }

  return (
    <Badge variant="outline" className={cn("text-xs font-medium px-2 py-0.5", badgeClass)}>
      {status || "Draft"}
    </Badge>
  );
}

function QuotationDetailPage() {
  const { quotationId } = Route.useParams();
  const navigate = useNavigate();

  const {
    data: quotation,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery(quotationDetailOptions(quotationId));

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [salesOrderModalOpen, setSalesOrderModalOpen] = useState(false);

  const submitMutation = useSubmitQuotation();
  const deleteMutation = useDeleteQuotation();

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-60px)] items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
          <p className="text-xs text-muted-foreground">Loading quotation details...</p>
        </div>
      </div>
    );
  }

  if (isError || !quotation) {
    return (
      <div className="flex h-[calc(100vh-60px)] flex-col items-center justify-center bg-background gap-3">
        <div className="size-12 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center">
          <FileText className="size-6" />
        </div>
        <h2 className="text-base font-semibold text-foreground">Quotation not found</h2>
        <p className="text-xs text-muted-foreground max-w-sm text-center">
          {error instanceof Error
            ? error.message
            : `Could not load quotation "${quotationId}". It might have been deleted.`}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void navigate({ to: "/quotations" })}
          className="mt-2 text-xs"
        >
          <ArrowLeft className="size-3.5 mr-1" />
          <span>Back to Quotations</span>
        </Button>
      </div>
    );
  }

  const isDraft = quotation.docstatus === 0;
  const isOrdered = quotation.status?.toLowerCase() === "ordered";
  const items = quotation.items || [];
  const totalQty = items.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  const grandTotal = Number(quotation.grand_total || 0);

  async function handleSubmit() {
    try {
      await submitMutation.mutateAsync(quotationId);
      await refetch();
    } catch {
      // toast handled in hook
    }
  }

  async function handleDelete() {
    if (!confirm(`Are you sure you want to delete quotation ${quotationId}?`)) return;
    try {
      await deleteMutation.mutateAsync(quotationId);
      void navigate({ to: "/quotations" });
    } catch {
      // toast handled in hook
    }
  }

  function handleCopyId() {
    void navigator.clipboard.writeText(quotationId);
    toast.success("Quotation ID copied to clipboard");
  }

  return (
    <div className="flex h-full flex-col bg-background overflow-hidden">
      {/* Top Breadcrumb & Action Bar matching Frappe CRM */}
      <div className="flex items-center justify-between border-b border-border bg-card/60 px-4 sm:px-6 py-2.5 backdrop-blur-xs shrink-0 gap-3 min-h-[48px]">
        {/* Left: Breadcrumbs & Quotation ID */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-0 shrink-0">
          <Link
            to="/quotations"
            className="hover:text-foreground transition-colors font-medium flex items-center gap-1 shrink-0"
          >
            <ArrowLeft className="size-3.5" />
            <span>Quotations</span>
          </Link>
          <span className="opacity-40">/</span>
          <span className="font-mono text-foreground font-semibold truncate max-w-[140px] sm:max-w-none">
            {quotationId}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCopyId}
            className="size-6 text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
            title="Copy ID"
          >
            <Copy className="size-3" />
          </Button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 shrink-0 overflow-x-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => void refetch()}
            className="size-7 text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
            title="Refresh"
          >
            <RefreshCw className={cn("size-3.5", isFetching && "animate-spin")} />
          </Button>

          {/* Submit Button (if draft) */}
          {isDraft && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleSubmit}
              disabled={submitMutation.isPending}
              className="h-7 text-xs font-medium px-2.5 border-border/70 cursor-pointer gap-1 shrink-0"
            >
              {submitMutation.isPending ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <CheckCircle2 className="size-3.5 text-emerald-600" />
              )}
              <span>Submit</span>
            </Button>
          )}

          {/* Prominent CONVERT TO SALES ORDER Button */}
          <Button
            size="sm"
            onClick={() => setSalesOrderModalOpen(true)}
            title="Convert to Sales Order"
            aria-label="Convert to Sales Order"
            className="h-7 text-xs font-semibold px-2.5 sm:px-3 rounded-md cursor-pointer bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-black shadow-xs gap-1.5 transition-colors shrink-0"
          >
            <ShoppingCart className="size-3.5" />
            <span className="hidden sm:inline">Convert to Sales Order</span>
            <span className="sm:hidden">Convert</span>
          </Button>

          {/* Edit / More Dropdown */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setEditModalOpen(true)}
            className="h-7 text-xs font-medium px-2.5 border-border/70 cursor-pointer gap-1 shrink-0"
          >
            <Edit2 className="size-3" />
            <span className="hidden sm:inline">Edit</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground cursor-pointer shrink-0"
              >
                <MoreVertical className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 text-xs">
              <DropdownMenuItem
                onClick={() => setEditModalOpen(true)}
                className="cursor-pointer gap-2"
              >
                <Edit2 className="size-3.5" />
                <span>Edit Quotation</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setSalesOrderModalOpen(true)}
                className="cursor-pointer gap-2 font-medium text-emerald-600 dark:text-emerald-400"
              >
                <ShoppingCart className="size-3.5" />
                <span>Convert to Sales Order</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleDelete}
                className="cursor-pointer gap-2 text-rose-600 focus:text-rose-600"
              >
                <Trash2 className="size-3.5" />
                <span>Delete Quotation</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header Banner Card */}
          <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Left: Customer & Deal info */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                    {quotation.party_name || quotation.customer_name || "Quotation"}
                  </h1>
                  <QuotationStatusBadge status={quotation.status} />
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="size-3.5 text-muted-foreground/70" />
                    <span>Customer: <strong className="text-foreground">{quotation.party_name || "-"}</strong></span>
                  </div>

                  {quotation.crm_deal && (
                    <div className="flex items-center gap-1.5">
                      <Briefcase className="size-3.5 text-muted-foreground/70" />
                      <span>Deal: </span>
                      <Link
                        to="/deals/$dealId"
                        params={{ dealId: quotation.crm_deal }}
                        className="font-mono text-foreground font-semibold hover:underline bg-muted/60 px-1.5 py-0.5 rounded border border-border/40 inline-flex items-center gap-1"
                      >
                        <span>{quotation.crm_deal}</span>
                        <ExternalLink className="size-3" />
                      </Link>
                    </div>
                  )}

                  <div className="flex items-center gap-1.5">
                    <Calendar className="size-3.5 text-muted-foreground/70" />
                    <span>Date: <span className="text-foreground">{quotation.transaction_date || "-"}</span></span>
                  </div>

                  {quotation.valid_till && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="size-3.5 text-muted-foreground/70" />
                      <span>Valid Till: <span className="text-foreground">{quotation.valid_till}</span></span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Grand Total Display & Fast Conversion CTA */}
              <div className="flex flex-col items-start md:items-end justify-center rounded-lg bg-muted/30 border border-border/60 p-4 shrink-0 gap-2">
                <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Grand Total
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                  <span className="text-xs font-semibold text-muted-foreground mr-1.5">PKR</span>
                  {grandTotal.toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                </div>
                <Button
                  size="sm"
                  onClick={() => setSalesOrderModalOpen(true)}
                  className="w-full h-7 text-xs font-semibold px-3 bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-black cursor-pointer shadow-xs gap-1.5 mt-1"
                >
                  <ShoppingCart className="size-3" />
                  <span>Convert to Sales Order</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Grid Layout: Main Items Table & Metadata Sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Line Items & Pricing */}
            <div className="lg:col-span-2 space-y-6">
              <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-xs">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/70 bg-muted/20">
                  <div className="flex items-center gap-2">
                    <FileText className="size-4 text-primary" />
                    <h2 className="text-sm font-semibold text-foreground">Items & Pricing</h2>
                  </div>
                  <span className="text-xs text-muted-foreground font-medium">
                    {items.length} item{items.length !== 1 ? "s" : ""}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-border/60 hover:bg-transparent text-xs text-muted-foreground">
                        <TableHead className="w-[50px] pl-4">#</TableHead>
                        <TableHead className="min-w-[180px]">Item Code / Name</TableHead>
                        <TableHead className="text-right w-[90px]">Qty</TableHead>
                        <TableHead className="text-right min-w-[110px]">Rate (PKR)</TableHead>
                        <TableHead className="text-right min-w-[120px] pr-4">Amount (PKR)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-xs text-muted-foreground">
                            No items in this quotation. Click "Edit" to add line items.
                          </TableCell>
                        </TableRow>
                      ) : (
                        items.map((it, idx) => (
                          <TableRow key={idx} className="border-b border-border/40 text-xs">
                            <TableCell className="pl-4 py-3 font-mono text-muted-foreground text-[11px]">
                              {idx + 1}
                            </TableCell>
                            <TableCell className="py-3">
                              <div className="font-semibold text-foreground">{it.item_code}</div>
                              {it.item_name && it.item_name !== it.item_code && (
                                <div className="text-[11px] text-muted-foreground">{it.item_name}</div>
                              )}
                              {it.description && typeof it.description === "string" && it.description !== it.item_name && (
                                <div className="text-[10px] text-muted-foreground/80 line-clamp-1 mt-0.5">
                                  {it.description}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="py-3 text-right font-medium text-foreground">
                              {Number(it.qty || 0).toLocaleString()}
                            </TableCell>
                            <TableCell className="py-3 text-right font-mono text-muted-foreground">
                              {Number(it.rate || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="py-3 text-right font-mono font-semibold text-foreground pr-4">
                              {Number(it.amount || (it.qty * it.rate) || 0).toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                              })}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Subtotals & Grand Total Footer */}
                <div className="border-t border-border/70 p-4 bg-muted/20 flex flex-col items-end gap-1.5 text-xs">
                  <div className="flex justify-between w-full sm:w-64 text-muted-foreground">
                    <span>Total Quantity:</span>
                    <strong className="text-foreground">{totalQty}</strong>
                  </div>
                  {quotation.net_total && quotation.net_total !== quotation.grand_total ? (
                    <div className="flex justify-between w-full sm:w-64 text-muted-foreground">
                      <span>Net Total:</span>
                      <strong className="text-foreground">
                        PKR {Number(quotation.net_total).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </strong>
                    </div>
                  ) : null}
                  <div className="flex justify-between w-full sm:w-64 pt-2 border-t border-border/60 text-sm font-bold text-foreground">
                    <span>Grand Total:</span>
                    <span>
                      PKR {grandTotal.toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right 1 Col: Quotation Metadata & Conversion Card */}
            <div className="space-y-6">
              {/* Conversion Highlight Card */}
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10 p-5 shadow-xs space-y-3">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold text-sm">
                  <ShoppingCart className="size-4" />
                  <span>Convert to Sales Order</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Ready to book this order? Transfer all line items and customer details directly into an ERPNext Sales Order with 1 click.
                </p>
                <Button
                  size="sm"
                  onClick={() => setSalesOrderModalOpen(true)}
                  className="w-full h-8 text-xs font-semibold rounded-md bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-black cursor-pointer shadow-xs gap-1.5"
                >
                  <ShoppingCart className="size-3.5" />
                  <span>Convert to Sales Order</span>
                </Button>
              </div>

              {/* Details Card */}
              <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs space-y-4">
                <h3 className="text-sm font-semibold text-foreground pb-2 border-b border-border/60">
                  Quotation Details
                </h3>

                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Quotation ID</span>
                    <span className="font-mono font-medium text-foreground">{quotation.name}</span>
                  </div>

                  <div>
                    <span className="text-muted-foreground block text-[11px]">Customer / Party</span>
                    <span className="font-semibold text-foreground">{quotation.party_name || "-"}</span>
                  </div>

                  {quotation.crm_deal && (
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Linked CRM Deal</span>
                      <Link
                        to="/deals/$dealId"
                        params={{ dealId: quotation.crm_deal }}
                        className="font-mono text-primary hover:underline font-semibold inline-flex items-center gap-1"
                      >
                        <span>{quotation.crm_deal}</span>
                        <ExternalLink className="size-3" />
                      </Link>
                    </div>
                  )}

                  <div>
                    <span className="text-muted-foreground block text-[11px]">Status</span>
                    <div className="mt-1">
                      <QuotationStatusBadge status={quotation.status} />
                    </div>
                  </div>

                  <div>
                    <span className="text-muted-foreground block text-[11px]">Transaction Date</span>
                    <span className="text-foreground">{quotation.transaction_date || "-"}</span>
                  </div>

                  <div>
                    <span className="text-muted-foreground block text-[11px]">Valid Until</span>
                    <span className="text-foreground">{quotation.valid_till || "-"}</span>
                  </div>

                  <div>
                    <span className="text-muted-foreground block text-[11px]">Order Type</span>
                    <span className="text-foreground">{quotation.order_type || "Sales"}</span>
                  </div>

                  <div>
                    <span className="text-muted-foreground block text-[11px]">Currency</span>
                    <span className="text-foreground">{quotation.currency || "PKR"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Quotation Modal */}
      <QuotationFormModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        quotation={quotation}
        onConvertToSalesOrder={() => setSalesOrderModalOpen(true)}
      />

      {/* Convert to Sales Order Modal */}
      <SalesOrderFormModal
        open={salesOrderModalOpen}
        onOpenChange={setSalesOrderModalOpen}
        order={null}
        initialValues={{
          customer: quotation.party_name,
          items: quotation.items,
          quotation_ref: quotation.name,
        }}
      />
    </div>
  );
}

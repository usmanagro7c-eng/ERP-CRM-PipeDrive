import { FileText, Plus, ExternalLink, ShoppingCart } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { quotationListOptions, type Quotation } from "@/hooks/use-quotations";

interface RecordQuotationsTabProps {
  dealId: string;
  customerName?: string;
  onNewQuotation?: () => void;
  onConvertToSalesOrder?: (quotation: Quotation) => void;
}

export function RecordQuotationsTab({
  dealId,
  customerName,
  onNewQuotation,
  onConvertToSalesOrder,
}: RecordQuotationsTabProps) {
  const { data: quotations = [], isLoading } = useQuery(
    quotationListOptions({
      search: "",
      filters: [],
      start: 0,
      limit: 50,
      orderBy: "creation desc",
    }),
  );

  // Filter linked quotations by dealId or party
  const quotationList = (quotations as Quotation[]) || [];
  const linkedQuotations = quotationList.filter((q: Quotation) => {
    const raw = q as Record<string, unknown>;
    const crmDeal = String(raw["crm_deal"] || "");
    const party = String(q.party_name || "");
    if (crmDeal && crmDeal === dealId) return true;
    if (customerName && party.toLowerCase() === customerName.toLowerCase()) return true;
    return false;
  });

  function getStatusBadge(status?: string) {
    switch (status?.toLowerCase()) {
      case "submitted":
        return <Badge variant="outline" className="text-[10px] h-4 bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Submitted</Badge>;
      case "ordered":
        return <Badge variant="outline" className="text-[10px] h-4 bg-blue-500/10 text-blue-500 border-blue-500/20">Ordered</Badge>;
      case "lost":
      case "cancelled":
        return <Badge variant="outline" className="text-[10px] h-4 bg-red-500/10 text-red-500 border-red-500/20">Lost</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px] h-4 bg-secondary text-muted-foreground border-border/60">Draft</Badge>;
    }
  }

  return (
    <div className="flex flex-col h-full min-h-[460px] max-w-4xl px-1 sm:px-4">
      {/* Header matching Frappe CRM */}
      <div className="flex shrink-0 items-center justify-between pb-4 pt-2">
        <h2 className="text-2xl font-semibold text-foreground">Quotations</h2>
        {onNewQuotation && (
          <Button
            size="sm"
            onClick={onNewQuotation}
            className="h-7 text-xs font-medium px-2.5 rounded-md gap-1 bg-white text-black hover:bg-neutral-200 dark:bg-white dark:text-black cursor-pointer shadow-xs"
          >
            <Plus className="size-3.5" />
            <span>New Quotation</span>
          </Button>
        )}
      </div>

      {linkedQuotations.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-24 select-none">
          <div className="flex items-center justify-center size-14 rounded-full mb-2">
            <FileText className="size-10 stroke-[1.2] text-muted-foreground/45" />
          </div>
          <p className="text-sm font-medium text-foreground">No Quotations Found</p>
          <p className="text-xs text-muted-foreground mt-1">
            No quotations have been linked to this deal yet. Create one to prepare formal pricing.
          </p>
        </div>
      ) : (
        <div className="space-y-2 pb-8">
          {linkedQuotations.map((q: Quotation) => {
            const amount = Number(q.grand_total) || 0;
            const dateStr = q.transaction_date || "";
            return (
              <div
                key={q.name}
                className="group flex items-center justify-between rounded-lg border bg-card p-3 text-xs shadow-2xs hover:border-primary/40 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-foreground">
                    <FileText className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Link
                        to="/quotations/$quotationId"
                        params={{ quotationId: q.name }}
                        className="font-semibold text-foreground truncate hover:underline hover:text-primary cursor-pointer"
                      >
                        {q.name}
                      </Link>
                      {getStatusBadge(q.status)}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      <span>PKR {amount.toLocaleString("en-PK", { minimumFractionDigits: 2 })}</span>
                      {dateStr && <span className="ml-2">· {dateStr}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {onConvertToSalesOrder && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onConvertToSalesOrder(q)}
                      className="h-6.5 text-[11px] font-semibold gap-1 px-2.5 bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-black cursor-pointer shadow-2xs"
                    >
                      <ShoppingCart className="size-3" />
                      <span>Convert to Sales Order</span>
                    </Button>
                  )}
                  <Link
                    to="/quotations/$quotationId"
                    params={{ quotationId: q.name }}
                    className="p-1 text-muted-foreground hover:text-foreground cursor-pointer rounded hover:bg-secondary/50"
                    title="View Quotation Detail"
                  >
                    <ExternalLink className="size-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

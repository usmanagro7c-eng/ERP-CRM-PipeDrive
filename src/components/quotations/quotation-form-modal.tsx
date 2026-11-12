import { useEffect, useMemo, useState } from "react";
import { Loader2, CheckCircle2, Maximize2, Minimize2, X, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ItemRowPicker } from "./item-row-picker";
import {
  customersListOptions,
  useSaveQuotation,
  useSubmitQuotation,
  type Quotation,
  itemsListOptions,
} from "@/hooks/use-quotations";
import type { QuotationItem } from "@/lib/api";
import { cn } from "@/lib/utils";

interface QuotationFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quotation?: Quotation | null;
  initialValues?: {
    party_name?: string;
    crm_deal?: string;
    items?: QuotationItem[];
  } | null;
  onConvertToSalesOrder?: (quotation: Quotation) => void;
}

export function QuotationFormModal({
  open,
  onOpenChange,
  quotation,
  initialValues,
  onConvertToSalesOrder,
}: QuotationFormModalProps) {
  const { data: customerOptions = [] } = useQuery(customersListOptions());
  const { data: catalogItems = [] } = useQuery(itemsListOptions());

  const saveMutation = useSaveQuotation();
  const submitMutation = useSubmitQuotation();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [partyName, setPartyName] = useState("");
  const [crmDeal, setCrmDeal] = useState("");
  const [transactionDate, setTransactionDate] = useState("");
  const [validTill, setValidTill] = useState("");
  const [items, setItems] = useState<QuotationItem[]>([]);

  // Initialize or reset form state when modal opens
  useEffect(() => {
    if (!open) return;

    const today = new Date().toISOString().split("T")[0]!;
    const in30Days = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0]!;

    if (quotation) {
      setPartyName(quotation.party_name || "");
      setCrmDeal(quotation.crm_deal || "");
      setTransactionDate(quotation.transaction_date || today);
      setValidTill(quotation.valid_till || in30Days);
      setItems(quotation.items || []);
    } else {
      const defaultParty = initialValues?.party_name || customerOptions[0]?.name || "";
      setPartyName(defaultParty);
      setCrmDeal(initialValues?.crm_deal || "");
      setTransactionDate(today);
      setValidTill(in30Days);

      if (initialValues?.items && initialValues.items.length > 0) {
        setItems(initialValues.items);
      } else {
        setItems([]);
      }
    }
  }, [open, quotation, initialValues, customerOptions, catalogItems]);

  const grandTotal = useMemo(() => {
    return items.reduce(
      (sum, item) => sum + (Number(item.amount) || Number(item.qty * item.rate) || 0),
      0,
    );
  }, [items]);

  const totalQty = useMemo(() => {
    return items.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  }, [items]);

  async function handleSave(submitAfterSave: boolean) {
    if (!partyName.trim()) {
      toast.error("Please select or enter a Customer");
      return;
    }
    if (items.length === 0) {
      toast.error("Please add at least one line item");
      return;
    }

    try {
      const payload: Record<string, unknown> = {
        quotation_to: "Customer",
        party_name: partyName.trim(),
        transaction_date: transactionDate,
        valid_till: validTill,
        crm_deal: crmDeal.trim() || undefined,
        items: items.map((i) => ({
          item_code: i.item_code,
          item_name: i.item_name,
          qty: Number(i.qty),
          rate: Number(i.rate),
          discount_percentage: Number(i.discount_percentage || 0),
        })),
      };

      const result = await saveMutation.mutateAsync({
        name: quotation?.name,
        values: payload,
      });

      if (submitAfterSave && result?.name) {
        await submitMutation.mutateAsync(result.name);
      }

      onOpenChange(false);
    } catch {
      // Error handled by mutations
    }
  }

  const isSaving = saveMutation.isPending || submitMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "p-0 overflow-hidden flex flex-col transition-all duration-200 border border-border bg-card shadow-2xl",
          isFullscreen
            ? "w-screen h-screen max-w-none max-h-none rounded-none"
            : "w-[96vw] sm:max-w-3xl lg:max-w-4xl max-h-[92vh] rounded-xl",
        )}
      >
        {/* Header Matching Frappe CRM */}
        <div className="flex items-center justify-between px-4 sm:px-6 pt-4 sm:pt-5 pb-2.5 border-b border-border/50">
          <DialogTitle className="text-base font-semibold text-foreground">
            {quotation ? `Edit Quotation ${quotation.name}` : "Create Quotation"}
          </DialogTitle>
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setIsFullscreen((p) => !p)}
              className="size-7 text-muted-foreground hover:text-foreground cursor-pointer"
              title={isFullscreen ? "Restore window" : "Maximize window"}
            >
              {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="size-7 text-muted-foreground hover:text-foreground cursor-pointer"
              title="Close"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        {/* Modal Form Body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4 sm:space-y-5">
          {/* Header Details (2 Columns) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Customer */}
            <div className="space-y-1.5">
              <Label htmlFor="party-name" className="text-xs font-normal text-muted-foreground">
                Customer / Party <span className="text-destructive">*</span>
              </Label>
              {customerOptions.length > 0 ? (
                <Select value={partyName} onValueChange={setPartyName}>
                  <SelectTrigger
                    id="party-name"
                    className="h-8 text-xs bg-muted/30 border-muted-foreground/20 cursor-pointer"
                  >
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    {customerOptions.map((opt: { name: string }) => (
                      <SelectItem
                        key={opt.name}
                        value={opt.name}
                        className="text-xs cursor-pointer"
                      >
                        {opt.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="party-name"
                  value={partyName}
                  onChange={(e) => setPartyName(e.target.value)}
                  placeholder="Customer name"
                  className="h-8 text-xs bg-muted/30 border-muted-foreground/20 focus-visible:bg-background"
                />
              )}
            </div>

            {/* Linked Deal */}
            <div className="space-y-1.5">
              <Label htmlFor="crm-deal" className="text-xs font-normal text-muted-foreground">
                CRM Deal (Optional)
              </Label>
              <Input
                id="crm-deal"
                value={crmDeal}
                onChange={(e) => setCrmDeal(e.target.value)}
                placeholder="e.g. CRM-DEAL-2026-00001"
                className="h-8 text-xs bg-muted/30 border-muted-foreground/20 focus-visible:bg-background"
              />
            </div>

            {/* Transaction Date */}
            <div className="space-y-1.5">
              <Label htmlFor="trans-date" className="text-xs font-normal text-muted-foreground">
                Date
              </Label>
              <Input
                id="trans-date"
                type="date"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                className="h-8 text-xs bg-muted/30 border-muted-foreground/20 focus-visible:bg-background"
              />
            </div>

            {/* Valid Till */}
            <div className="space-y-1.5">
              <Label htmlFor="valid-till" className="text-xs font-normal text-muted-foreground">
                Valid Till
              </Label>
              <Input
                id="valid-till"
                type="date"
                value={validTill}
                onChange={(e) => setValidTill(e.target.value)}
                className="h-8 text-xs bg-muted/30 border-muted-foreground/20 focus-visible:bg-background"
              />
            </div>
          </div>

          {/* Line Items Editor */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground">Items & Pricing</Label>
            <ItemRowPicker items={items} onChange={setItems} />
          </div>

          {/* Grand Total Summary */}
          <div className="flex flex-col sm:flex-row items-end sm:items-center justify-between rounded-lg bg-muted/30 border border-border/60 p-3.5 gap-2">
            <div className="text-xs text-muted-foreground">
              <span>Total Items: </span>
              <strong className="text-foreground">{items.length}</strong>
              <span className="mx-2">•</span>
              <span>Total Quantity: </span>
              <strong className="text-foreground">{totalQty}</strong>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-medium text-muted-foreground">Grand Total:</span>
              <span className="text-base sm:text-lg font-bold text-foreground">
                PKR {grandTotal.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Submit Buttons matching Frappe CRM */}
        <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-border/40 bg-card">
          {quotation && onConvertToSalesOrder ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                onOpenChange(false);
                onConvertToSalesOrder(quotation);
              }}
              className="mr-auto h-8 text-xs font-semibold border-emerald-500/30 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500/40 dark:text-emerald-400 dark:hover:bg-emerald-950/40 cursor-pointer gap-1.5 shadow-xs"
            >
              <ShoppingCart className="size-3.5" />
              <span>Convert to Sales Order</span>
            </Button>
          ) : null}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleSave(false)}
            disabled={isSaving}
            className="h-8 text-xs border-border/60 cursor-pointer"
          >
            {isSaving ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : null}
            <span>Save as Draft</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => handleSave(true)}
            disabled={isSaving}
            className="h-8 text-xs px-4 rounded-md font-medium bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 cursor-pointer shadow-xs gap-1.5"
          >
            {isSaving ? (
              <Loader2 className="size-3.5 animate-spin mr-1" />
            ) : (
              <CheckCircle2 className="size-3.5 mr-1" />
            )}
            <span>Submit Quotation</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

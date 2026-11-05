import { useEffect, useMemo, useState } from "react";
import { Loader2, FileText, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
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

interface QuotationFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quotation?: Quotation | null;
  initialValues?: {
    party_name?: string;
    crm_deal?: string;
  } | null;
}

export function QuotationFormModal({
  open,
  onOpenChange,
  quotation,
  initialValues,
}: QuotationFormModalProps) {
  const { data: customerOptions = [] } = useQuery(customersListOptions());
  const { data: catalogItems = [] } = useQuery(itemsListOptions());

  const saveMutation = useSaveQuotation();
  const submitMutation = useSubmitQuotation();

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
      const defaultParty =
        initialValues?.party_name ||
        customerOptions[0]?.name ||
        "West View Software Ltd.";
      setPartyName(defaultParty);
      setCrmDeal(initialValues?.crm_deal || "");
      setTransactionDate(today);
      setValidTill(in30Days);

      // Default with 1 item from catalog if available
      if (catalogItems.length > 0) {
        const item = catalogItems[0]!;
        setItems([
          {
            item_code: item.name,
            item_name: item.item_name || item.name,
            qty: 1,
            rate: Number(item.standard_rate) || 1500,
            amount: Number(item.standard_rate) || 1500,
            discount_percentage: 0,
          },
        ]);
      } else {
        setItems([]);
      }
    }
  }, [open, quotation, initialValues, customerOptions, catalogItems]);

  const grandTotal = useMemo(() => {
    return items.reduce((sum, item) => sum + (Number(item.amount) || Number(item.qty * item.rate) || 0), 0);
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
      <DialogContent className="w-[95vw] sm:max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 sm:p-6 pb-2">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileText className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg">
                {quotation ? `Edit Quotation ${quotation.name}` : "Create New Quotation"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Prepare a formal quotation with pricing, line items, and terms.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 px-4 sm:px-6 py-2 overflow-y-auto">
          <div className="space-y-5 pb-4">
            {/* Header Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-lg border bg-muted/20 p-4">
              {/* Customer */}
              <div className="space-y-1.5">
                <Label htmlFor="party-name" className="text-xs font-semibold">
                  Customer / Party <span className="text-destructive">*</span>
                </Label>
                {customerOptions.length > 0 ? (
                  <Select value={partyName} onValueChange={setPartyName}>
                    <SelectTrigger id="party-name" className="h-9 text-xs">
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customerOptions.map((opt: { name: string }) => (
                        <SelectItem key={opt.name} value={opt.name} className="text-xs">
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
                    className="h-9 text-xs"
                  />
                )}
              </div>

              {/* Linked Deal */}
              <div className="space-y-1.5">
                <Label htmlFor="crm-deal" className="text-xs font-semibold">
                  CRM Deal (Optional)
                </Label>
                <Input
                  id="crm-deal"
                  value={crmDeal}
                  onChange={(e) => setCrmDeal(e.target.value)}
                  placeholder="e.g. CRM-DEAL-2026-00001"
                  className="h-9 text-xs"
                />
              </div>

              {/* Transaction Date */}
              <div className="space-y-1.5">
                <Label htmlFor="trans-date" className="text-xs font-semibold">
                  Date
                </Label>
                <Input
                  id="trans-date"
                  type="date"
                  value={transactionDate}
                  onChange={(e) => setTransactionDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              {/* Valid Till */}
              <div className="space-y-1.5">
                <Label htmlFor="valid-till" className="text-xs font-semibold">
                  Valid Till
                </Label>
                <Input
                  id="valid-till"
                  type="date"
                  value={validTill}
                  onChange={(e) => setValidTill(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Line Items Editor */}
            <ItemRowPicker items={items} onChange={setItems} />

            {/* Grand Total Summary */}
            <div className="flex flex-col sm:flex-row items-end sm:items-center justify-between rounded-lg bg-primary/5 border border-primary/20 p-4 gap-2">
              <div className="text-xs text-muted-foreground">
                <span>Total Items: </span>
                <strong className="text-foreground">{items.length}</strong>
                <span className="mx-2">•</span>
                <span>Total Quantity: </span>
                <strong className="text-foreground">{totalQty}</strong>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-medium text-muted-foreground">Grand Total:</span>
                <span className="text-lg sm:text-xl font-bold text-primary">
                  PKR {grandTotal.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="p-4 sm:p-6 pt-3 border-t bg-card/60 flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
            className="w-full sm:w-auto h-9 text-xs order-2 sm:order-1"
          >
            Cancel
          </Button>
          <div className="flex items-center gap-2 w-full sm:w-auto order-1 sm:order-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleSave(false)}
              disabled={isSaving}
              className="flex-1 sm:flex-initial h-9 text-xs"
            >
              {isSaving ? <Loader2 className="size-3.5 animate-spin mr-1" /> : null}
              <span>Save as Draft</span>
            </Button>
            <Button
              type="button"
              onClick={() => handleSave(true)}
              disabled={isSaving}
              className="flex-1 sm:flex-initial h-9 text-xs gap-1.5"
            >
              {isSaving ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="size-3.5" />
              )}
              <span>Submit Quotation</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

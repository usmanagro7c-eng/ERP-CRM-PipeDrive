import { useEffect, useMemo, useState } from "react";
import { Loader2, Maximize2, Minimize2, X, ShoppingCart, Calendar } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ItemRowPicker } from "@/components/quotations/item-row-picker";
import { customersListOptions, itemsListOptions } from "@/hooks/use-quotations";
import {
  useSaveSalesOrder,
  useSubmitSalesOrder,
  salesOrderDetailOptions,
  type SalesOrder,
} from "@/hooks/use-sales-orders";
import type { QuotationItem } from "@/lib/api";

export interface SalesOrderInitialValues {
  customer?: string | undefined;
  items?: QuotationItem[] | undefined;
  quotation_ref?: string | undefined;
}

export interface SalesOrderFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order?: SalesOrder | null;
  initialValues?: SalesOrderInitialValues | null | undefined;
}

export function SalesOrderFormModal({
  open,
  onOpenChange,
  order,
  initialValues,
}: SalesOrderFormModalProps) {
  const { data: customerOptions = [] } = useQuery(customersListOptions());
  const { data: catalogItems = [] } = useQuery(itemsListOptions());

  const orderName = order?.name;
  const { data: fullOrder } = useQuery({
    ...salesOrderDetailOptions(orderName || ""),
    enabled: Boolean(open && orderName),
  });
  const activeOrder = fullOrder || order;

  const saveMutation = useSaveSalesOrder();
  const submitMutation = useSubmitSalesOrder();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [customer, setCustomer] = useState("");
  const [transactionDate, setTransactionDate] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [orderType, setOrderType] = useState("Sales");
  const [items, setItems] = useState<QuotationItem[]>([]);
  const [isSubmittingDirect, setIsSubmittingDirect] = useState(false);

  useEffect(() => {
    if (!open) return;

    const today = new Date().toISOString().split("T")[0]!;
    const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0]!;

    if (activeOrder) {
      setCustomer(activeOrder.customer || "");
      setTransactionDate(activeOrder.transaction_date || today);
      setDeliveryDate(activeOrder.delivery_date || nextWeek);
      setOrderType(activeOrder.order_type || "Sales");
      setItems(
        (activeOrder.items || []).map((i) => ({
          item_code: i.item_code,
          item_name: i.item_name || i.item_code,
          qty: i.qty || 1,
          rate: i.rate || 0,
          amount: i.amount || 0,
          discount_percentage: 0,
        })),
      );
    } else {
      const defaultCustomer =
        initialValues?.customer || customerOptions[0]?.name || "";
      setCustomer(defaultCustomer);
      setTransactionDate(today);
      setDeliveryDate(nextWeek);
      setOrderType("Sales");

      if (initialValues?.items && initialValues.items.length > 0) {
        setItems(initialValues.items);
      } else {
        setItems([]);
      }
    }
  }, [open, activeOrder, initialValues, customerOptions, catalogItems]);

  const grandTotal = useMemo(() => {
    return items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }, [items]);

  async function handleSaveOrder(shouldSubmit = false) {
    if (!customer.trim()) {
      toast.error("Please select a customer");
      return;
    }
    if (!deliveryDate) {
      toast.error("Please specify a delivery date");
      return;
    }
    if (items.length === 0) {
      toast.error("Please add at least one line item");
      return;
    }

    const payload = {
      customer: customer.trim(),
      transaction_date: transactionDate,
      delivery_date: deliveryDate,
      order_type: orderType,
      items: items.map((item) => ({
        item_code: item.item_code,
        item_name: item.item_name,
        qty: Number(item.qty) || 1,
        rate: Number(item.rate) || 0,
        discount_percentage: Number(item.discount_percentage) || 0,
        amount: Number(item.amount) || (Number(item.qty || 1) * Number(item.rate || 0)),
        delivery_date: deliveryDate,
        ...(initialValues?.quotation_ref ? { prevdoc_docname: initialValues.quotation_ref } : {}),
      })),
    };

    if (shouldSubmit) {
      setIsSubmittingDirect(true);
    }

    try {
      const created = await saveMutation.mutateAsync({
        name: order ? order.name : undefined,
        values: payload,
      });

      if (shouldSubmit && created?.name) {
        await submitMutation.mutateAsync(created.name);
      }
      onOpenChange(false);
    } catch {
      // Error toasted by mutation hooks
    } finally {
      setIsSubmittingDirect(false);
    }
  }

  const isSaving = saveMutation.isPending || isSubmittingDirect;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={`p-0 overflow-hidden flex flex-col transition-all duration-200 ${
          isFullscreen
            ? "w-screen h-screen max-w-none max-h-none rounded-none"
            : "w-[95vw] sm:max-w-3xl max-h-[92vh] rounded-lg border border-border bg-card"
        }`}
      >
        {/* Header Matching Frappe CRM */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-md bg-muted/60 text-foreground">
              <ShoppingCart className="size-4 text-muted-foreground" />
            </div>
            <DialogTitle className="text-base font-semibold text-foreground">
              {order
                ? `Edit Sales Order: ${order.name}`
                : initialValues?.quotation_ref
                ? `Convert to Sales Order (${initialValues.quotation_ref})`
                : "Create Sales Order"}
            </DialogTitle>
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setIsFullscreen((p) => !p)}
              className="size-7 text-muted-foreground hover:text-foreground cursor-pointer rounded-md"
              title={isFullscreen ? "Minimize" : "Maximize"}
            >
              {isFullscreen ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="size-7 text-muted-foreground hover:text-foreground cursor-pointer rounded-md"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        {/* Modal Form Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* 2-Column Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-normal text-muted-foreground">
                Customer <span className="text-destructive">*</span>
              </Label>
              <Select value={customer} onValueChange={setCustomer}>
                <SelectTrigger className="h-8.5 text-xs bg-muted/30 border-muted-foreground/20 cursor-pointer rounded-md">
                  <SelectValue placeholder="Select Customer..." />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {customerOptions.map((c) => (
                    <SelectItem key={c.name} value={c.name} className="text-xs cursor-pointer">
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-normal text-muted-foreground">Order Type</Label>
              <Select value={orderType} onValueChange={setOrderType}>
                <SelectTrigger className="h-8.5 text-xs bg-muted/30 border-muted-foreground/20 cursor-pointer rounded-md">
                  <SelectValue placeholder="Sales" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sales" className="text-xs">Sales</SelectItem>
                  <SelectItem value="Maintenance" className="text-xs">Maintenance</SelectItem>
                  <SelectItem value="Shopping Cart" className="text-xs">Shopping Cart</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-normal text-muted-foreground flex items-center gap-1.5">
                <Calendar className="size-3 text-muted-foreground" />
                <span>Order Date</span>
              </Label>
              <Input
                type="date"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                className="h-8.5 text-xs bg-muted/30 border-muted-foreground/20 focus-visible:bg-background rounded-md"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-normal text-muted-foreground flex items-center gap-1.5">
                <Calendar className="size-3 text-muted-foreground" />
                <span>Delivery Date</span> <span className="text-destructive">*</span>
              </Label>
              <Input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="h-8.5 text-xs bg-muted/30 border-muted-foreground/20 focus-visible:bg-background rounded-md"
                required
              />
            </div>
          </div>

          {/* Items & Pricing Table */}
          <div className="pt-2">
            <ItemRowPicker items={items} onChange={setItems} />
          </div>

          {/* Grand Total Summary Box */}
          <div className="flex justify-end pt-1">
            <div className="bg-muted/40 rounded-lg p-3.5 border border-border/60 min-w-[240px] space-y-1.5 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Total Items:</span>
                <span className="font-medium text-foreground">{items.length}</span>
              </div>
              <div className="flex justify-between font-semibold text-sm pt-1 border-t border-border/60">
                <span>Grand Total:</span>
                <span className="text-foreground">PKR {grandTotal.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions Matching Frappe CRM */}
        <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-border/60 bg-muted/20">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-8 text-xs px-3.5 rounded-md cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isSaving}
            onClick={() => void handleSaveOrder(false)}
            className="h-8 text-xs px-4 rounded-md cursor-pointer border-border hover:bg-muted"
          >
            {saveMutation.isPending && !isSubmittingDirect ? (
              <Loader2 className="size-3.5 animate-spin mr-1" />
            ) : null}
            <span>Save as Draft</span>
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={isSaving}
            onClick={() => void handleSaveOrder(true)}
            className="h-8 text-xs px-5 rounded-md font-medium bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 cursor-pointer shadow-xs gap-1.5"
          >
            {isSubmittingDirect ? (
              <Loader2 className="size-3.5 animate-spin mr-1" />
            ) : null}
            <span>Submit Sales Order</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

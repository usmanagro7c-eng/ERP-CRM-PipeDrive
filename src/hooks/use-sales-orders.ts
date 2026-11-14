import { keepPreviousData, queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as api from "@/lib/api";
import type { SalesOrder, Quotation } from "@/lib/api";
import { notifyEntityChange } from "@/lib/change-notifications";
import { QUOTATION_QUERY_ROOT } from "./use-quotations";

export const SALES_ORDER_QUERY_ROOT = "sales-orders";

export interface SalesOrderListVariables {
  search: string;
  filters: Array<[string, string, string]>;
  limit: number;
  start: number;
  orderBy?: string | undefined;
}

export function salesOrderListOptions(variables: SalesOrderListVariables) {
  return queryOptions({
    queryKey: [SALES_ORDER_QUERY_ROOT, "list", variables],
    queryFn: () => api.listSalesOrders(variables),
    placeholderData: keepPreviousData,
  });
}

export function salesOrderCountOptions(
  search: string,
  filters: Array<[string, string, string]> = [],
) {
  return queryOptions({
    queryKey: [SALES_ORDER_QUERY_ROOT, "count", search, filters],
    queryFn: () => api.countSalesOrders(search, filters),
  });
}

export function salesOrderDetailOptions(name: string) {
  return queryOptions({
    queryKey: [SALES_ORDER_QUERY_ROOT, "detail", name],
    queryFn: () => api.getSalesOrder(name),
    retry: (failureCount, error) =>
      !(error instanceof api.FrappeApiError) || ![403, 404].includes(error.status)
        ? failureCount < 2
        : false,
  });
}

function useInvalidateSalesOrders() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: [SALES_ORDER_QUERY_ROOT] });
    void queryClient.invalidateQueries({ queryKey: [QUOTATION_QUERY_ROOT] });
  };
}

export interface SaveSalesOrderInput {
  name?: string | undefined;
  values: Record<string, unknown>;
}

export function useSaveSalesOrder() {
  const invalidate = useInvalidateSalesOrders();
  return useMutation({
    mutationFn: async ({ values }: SaveSalesOrderInput) => {
      return api.createSalesOrder(values);
    },
    onSuccess: async (order) => {
      invalidate();
      toast.success("Sales Order created");
      const itemsList = Array.isArray(order.items) ? order.items : [];
      const itemsText = itemsList.length > 0
        ? itemsList.map((it) => `${it.item_code || it.item_name} (x${it.qty || 1} @ PKR ${Number(it.rate || 0).toLocaleString()})`).join("; ")
        : "";

      void notifyEntityChange({
        doctype: "Sales Order",
        docname: order.name,
        title: order.customer_name || order.customer || order.name,
        action: "Created",
        eventCategory: "salesOrders",
        summary: `New Sales Order created for ${order.customer_name || order.customer || "customer"} with value ${order.currency || "PKR"} ${order.grand_total?.toLocaleString() ?? 0}.${itemsList.length > 0 ? ` (${itemsList.length} line items)` : ""}`,
        linkPath: `/orders/${order.name}`,
        details: {
          "Customer": order.customer_name || order.customer,
          "Grand Total": `${order.currency || "PKR"} ${order.grand_total?.toLocaleString() ?? 0}`,
          "Delivery Date": order.delivery_date,
          "Total Items": itemsList.length > 0 ? itemsList.length : undefined,
          "Line Items": itemsText || undefined,
        },
      }).catch((err) => console.warn("Failed to notify sales order create:", err));
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not create sales order");
    },
  });
}

export function useSubmitSalesOrder() {
  const invalidate = useInvalidateSalesOrders();
  return useMutation({
    mutationFn: (name: string) => api.submitSalesOrder(name),
    onSuccess: async (order, name) => {
      invalidate();
      toast.success("Sales Order submitted");
      void notifyEntityChange({
        doctype: "Sales Order",
        docname: order?.name || name,
        title: order?.customer_name || order?.customer || name,
        action: "Submitted",
        eventCategory: "salesOrders",
        summary: `Sales Order ${name} has been officially SUBMITTED to ERP.`,
        linkPath: `/orders/${name}`,
      }).catch((err) => console.warn("Failed to notify sales order submit:", err));
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not submit sales order");
    },
  });
}

export function useCreateSalesOrderFromQuotation() {
  const invalidate = useInvalidateSalesOrders();
  return useMutation({
    mutationFn: async ({
      quotation,
      deliveryDate,
    }: {
      quotation: Quotation;
      deliveryDate?: string;
    }) => {
      const order = await api.createSalesOrderFromQuotation(quotation, deliveryDate);
      return order;
    },
    onSuccess: async (order, variables) => {
      invalidate();
      toast.success(`Sales Order ${order.name} created from Quotation!`);
      const itemsList = Array.isArray(order.items) ? order.items : (variables.quotation.items || []);
      const itemsText = itemsList.length > 0
        ? itemsList.map((it: any) => `${it.item_code || it.item_name} (x${it.qty || 1} @ PKR ${Number(it.rate || 0).toLocaleString()})`).join("; ")
        : "";

      void notifyEntityChange({
        doctype: "Sales Order",
        docname: order.name,
        title: order.customer_name || order.customer || order.name,
        action: "Converted from Quotation",
        eventCategory: "salesOrders",
        summary: `Sales Order ${order.name} was successfully created from Quotation ${variables.quotation.name} for ${order.customer_name || order.customer}.${itemsList.length > 0 ? ` (${itemsList.length} line items)` : ""}`,
        linkPath: `/orders/${order.name}`,
        details: {
          "Customer": order.customer_name || order.customer,
          "Grand Total": `${order.currency || "PKR"} ${order.grand_total?.toLocaleString() ?? 0}`,
          "Source Quotation": variables.quotation.name,
          "Total Items": itemsList.length > 0 ? itemsList.length : undefined,
          "Line Items": itemsText || undefined,
        },
      }).catch((err) => console.warn("Failed to notify sales order conversion:", err));
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Could not create sales order from quotation",
      );
    },
  });
}

export type { SalesOrder };

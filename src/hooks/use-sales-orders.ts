import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import * as api from "@/lib/api";
import type { SalesOrder, Quotation } from "@/lib/api";
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
    onSuccess: async () => {
      invalidate();
      toast.success("Sales Order created");
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
    onSuccess: async () => {
      invalidate();
      toast.success("Sales Order submitted");
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
    onSuccess: async (order) => {
      invalidate();
      toast.success(`Sales Order ${order.name} created from Quotation!`);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not create sales order from quotation",
      );
    },
  });
}

export type { SalesOrder };

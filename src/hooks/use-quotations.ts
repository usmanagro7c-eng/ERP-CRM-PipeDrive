import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import * as api from "@/lib/api";
import type { Quotation, Item } from "@/lib/api";

export const QUOTATION_QUERY_ROOT = "quotations";

export interface QuotationListVariables {
  search: string;
  filters: Array<[string, string, string]>;
  limit: number;
  start: number;
  orderBy?: string | undefined;
}

export function quotationListOptions(variables: QuotationListVariables) {
  return queryOptions({
    queryKey: [QUOTATION_QUERY_ROOT, "list", variables],
    queryFn: () => api.listQuotations(variables),
    placeholderData: keepPreviousData,
  });
}

export function quotationCountOptions(
  search: string,
  filters: Array<[string, string, string]> = [],
) {
  return queryOptions({
    queryKey: [QUOTATION_QUERY_ROOT, "count", search, filters],
    queryFn: () => api.countQuotations(search, filters),
  });
}

export function quotationDetailOptions(name: string) {
  return queryOptions({
    queryKey: [QUOTATION_QUERY_ROOT, "detail", name],
    queryFn: () => api.getQuotation(name),
    retry: (failureCount, error) =>
      !(error instanceof api.FrappeApiError) || ![403, 404].includes(error.status)
        ? failureCount < 2
        : false,
  });
}

export function itemsListOptions(search?: string) {
  return queryOptions({
    queryKey: ["items", "list", search],
    queryFn: () => api.listItems(search),
    staleTime: 5 * 60 * 1000,
  });
}

export function customersListOptions() {
  return queryOptions({
    queryKey: ["customers", "options"],
    queryFn: () => api.getLinkOptions("Customer"),
    staleTime: 5 * 60 * 1000,
  });
}

function useInvalidateQuotations() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: [QUOTATION_QUERY_ROOT] });
}

export interface SaveQuotationInput {
  name?: string | undefined;
  values: Record<string, unknown>;
}

export function useSaveQuotation() {
  const invalidate = useInvalidateQuotations();
  return useMutation({
    mutationFn: async ({ name, values }: SaveQuotationInput) => {
      if (name) {
        return api.updateQuotation(name, values);
      }
      return api.createQuotation(values);
    },
    onSuccess: async (_doc, variables) => {
      await invalidate();
      toast.success(variables.name ? "Quotation updated" : "Quotation created as draft");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not save the quotation");
    },
  });
}

export function useSubmitQuotation() {
  const invalidate = useInvalidateQuotations();
  return useMutation({
    mutationFn: (name: string) => api.submitQuotation(name),
    onSuccess: async () => {
      await invalidate();
      toast.success("Quotation submitted");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not submit quotation");
    },
  });
}

export function useCancelQuotation() {
  const invalidate = useInvalidateQuotations();
  return useMutation({
    mutationFn: (name: string) => api.cancelQuotation(name),
    onSuccess: async () => {
      await invalidate();
      toast.success("Quotation cancelled / marked as lost");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not cancel quotation");
    },
  });
}

export function useDeleteQuotation() {
  const invalidate = useInvalidateQuotations();
  return useMutation({
    mutationFn: (name: string) => api.deleteQuotation(name),
    onSuccess: async () => {
      await invalidate();
      toast.success("Quotation deleted");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not delete quotation");
    },
  });
}

export type { Quotation, Item };

import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import * as api from "@/lib/api";
import type { FrappeDocTypeMeta } from "@/lib/frappe-meta";

export const DEAL_QUERY_ROOT = "deals";

export function dealMetaOptions() {
  return queryOptions({
    queryKey: [DEAL_QUERY_ROOT, "doctype-meta"],
    queryFn: () => api.getDocTypeMeta(api.DEAL_DOCTYPE),
    staleTime: 5 * 60 * 1000,
  });
}

export function dealStatusesOptions() {
  return queryOptions({
    queryKey: [DEAL_QUERY_ROOT, "statuses"],
    queryFn: () => api.getDealStatuses(),
    staleTime: 5 * 60 * 1000,
  });
}

export interface DealListVariables {
  search: string;
  filters: Array<[string, string, string]>;
  limit: number;
  start: number;
  orderBy?: string | undefined;
}

export function dealListOptions(variables: DealListVariables) {
  return queryOptions({
    queryKey: [DEAL_QUERY_ROOT, "list", variables],
    queryFn: () => api.listDeals(variables),
    placeholderData: keepPreviousData,
  });
}

export function dealCountOptions(search: string, filters: Array<[string, string, string]> = []) {
  return queryOptions({
    queryKey: [DEAL_QUERY_ROOT, "count", search, filters],
    queryFn: () => api.countDeals(search, filters),
  });
}

export function dealDetailOptions(name: string) {
  return queryOptions({
    queryKey: [DEAL_QUERY_ROOT, "detail", name],
    queryFn: () => api.getDeal(name),
    retry: (failureCount, error) =>
      !(error instanceof api.FrappeApiError) || ![403, 404].includes(error.status)
        ? failureCount < 2
        : false,
  });
}

function useInvalidateDeals() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: [DEAL_QUERY_ROOT] });
}

export interface SaveDealInput {
  name?: string | undefined; // present => update, absent => create
  values: Record<string, unknown>;
}

export function useSaveDeal() {
  const invalidate = useInvalidateDeals();
  return useMutation({
    mutationFn: async ({ name, values }: SaveDealInput) => {
      if (name) {
        return api.updateDeal(name, values);
      }
      return api.createDeal(values);
    },
    onSuccess: async (_doc, variables) => {
      await invalidate();
      toast.success(variables.name ? "Deal updated" : "Deal created");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not save the deal");
    },
  });
}

export function useDeleteDeal() {
  const invalidate = useInvalidateDeals();
  return useMutation({
    mutationFn: (name: string) => api.deleteDeal(name),
    onSuccess: async () => {
      await invalidate();
      toast.success("Deal deleted");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not delete the deal");
    },
  });
}

export async function uploadDealFile(docname: string, fieldname: string, file: File) {
  return api.uploadAttachment({ doctype: api.DEAL_DOCTYPE, docname, fieldname, file });
}

export function errorMessage(error: unknown): string {
  if (error instanceof api.FrappeApiError) return error.message;
  return error instanceof Error ? error.message : "Something went wrong";
}

export type { FrappeDocTypeMeta };

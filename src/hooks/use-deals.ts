import { keepPreviousData, queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as api from "@/lib/api";
import { friendlyFrappeError } from "@/lib/frappe-error";
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

export function lostReasonsOptions() {
  return queryOptions({
    queryKey: [DEAL_QUERY_ROOT, "lost-reasons"],
    queryFn: () => api.getLinkOptions("CRM Lost Reason"),
    staleTime: 10 * 60 * 1000,
  });
}

export interface DealListVariables {
  search: string;
  filters: Array<[string, string, string]>;
  limit: number;
  start: number;
  orderBy?: string | undefined;
}

/**
 * CRM Deal stores the organisation as a link field called `organization`.
 * There is no `organization_name` field on the doctype, so filtering on it
 * returns nothing at all — the search must use the link field.
 */
const DEAL_SEARCH_FIELD = "organization";

export function dealListOptions(variables: DealListVariables) {
  return queryOptions({
    queryKey: [DEAL_QUERY_ROOT, "list", variables],
    queryFn: () => api.listDeals({ ...variables, searchField: DEAL_SEARCH_FIELD }),
    placeholderData: keepPreviousData,
  });
}

export function dealCountOptions(search: string, filters: Array<[string, string, string]> = []) {
  return queryOptions({
    queryKey: [DEAL_QUERY_ROOT, "count", search, filters],
    queryFn: () => {
      const searchFilter: [string, string, string] = [DEAL_SEARCH_FIELD, "like", `%${search}%`];
      return api.countDeals("", search ? [...filters, searchFilter] : filters);
    },
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
  silent?: boolean;
}

/** Add actionable guidance for the known Frappe CRM → ERPNext sync failure. */
function dealSaveErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  if (/Error while creating customer in ERPNext/i.test(raw)) {
    return (
      "Customer creation in ERPNext failed. Open the ERPNext Error Log " +
      '(search "Error while creating customer against Frappe CRM Deal") — most often the ' +
      "CRM sync is not enabled in ERPNext CRM Settings, or Territory/Currency/Customer " +
      "Group is missing there."
    );
  }
  return friendlyFrappeError(error, "Could not save the deal");
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
      if (!variables.silent) {
        toast.success(variables.name ? "Deal updated" : "Deal created");
      }
    },
    onError: (error) => {
      toast.error(dealSaveErrorMessage(error));
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
      toast.error(friendlyFrappeError(error, "Could not delete the deal"));
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

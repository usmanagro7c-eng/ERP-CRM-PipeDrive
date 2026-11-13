import { keepPreviousData, queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as api from "@/lib/api";
import { friendlyFrappeError } from "@/lib/frappe-error";
import type { FrappeDocTypeMeta } from "@/lib/frappe-meta";

export const LEAD_QUERY_ROOT = "leads";

export function leadMetaOptions() {
  return queryOptions({
    queryKey: [LEAD_QUERY_ROOT, "doctype-meta"],
    queryFn: () => api.getDocTypeMeta(api.LEAD_DOCTYPE),
    staleTime: 5 * 60 * 1000,
  });
}

export function leadStatusesOptions() {
  return queryOptions({
    queryKey: [LEAD_QUERY_ROOT, "statuses"],
    queryFn: () => api.getLeadStatuses(),
    staleTime: 5 * 60 * 1000,
  });
}

export function leadLostReasonsOptions() {
  return queryOptions({
    queryKey: [LEAD_QUERY_ROOT, "lost-reasons"],
    queryFn: () => api.getLinkOptions("CRM Lost Reason"),
    staleTime: 10 * 60 * 1000,
  });
}

export interface LeadListVariables {
  search: string;
  filters: Array<[string, string, string]>;
  limit: number;
  start: number;
  orderBy?: string | undefined;
}

/**
 * `lead_name` holds "First Last" and matches both parts, so searching for a
 * surname works too (the plain `first_name` field does not).
 */
const LEAD_SEARCH_FIELD = "lead_name";

export function leadListOptions(variables: LeadListVariables) {
  return queryOptions({
    queryKey: [LEAD_QUERY_ROOT, "list", variables],
    queryFn: () => api.listLeads({ ...variables, searchField: LEAD_SEARCH_FIELD }),
    placeholderData: keepPreviousData,
  });
}

export function leadCountOptions(search: string, filters: Array<[string, string, string]> = []) {
  return queryOptions({
    queryKey: [LEAD_QUERY_ROOT, "count", search, filters],
    queryFn: () => {
      const searchFilter: [string, string, string] = [LEAD_SEARCH_FIELD, "like", `%${search}%`];
      return api.countLeads("", search ? [...filters, searchFilter] : filters);
    },
  });
}

export function leadDetailOptions(name: string) {
  return queryOptions({
    queryKey: [LEAD_QUERY_ROOT, "detail", name],
    queryFn: () => api.getLead(name),
    retry: (failureCount, error) =>
      !(error instanceof api.FrappeApiError) || ![403, 404].includes(error.status)
        ? failureCount < 2
        : false,
  });
}

function useInvalidateLeads() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: [LEAD_QUERY_ROOT] });
}

export interface SaveLeadInput {
  name?: string | undefined; // present => update, absent => create
  values: Record<string, unknown>;
  silent?: boolean;
}

export function useSaveLead() {
  const invalidate = useInvalidateLeads();
  return useMutation({
    mutationFn: async ({ name, values }: SaveLeadInput) => {
      if (name) {
        return api.updateLead(name, values);
      }
      return api.createLead(values);
    },
    onSuccess: async (_doc, variables) => {
      await invalidate();
      if (!variables.silent) {
        toast.success(variables.name ? "Lead updated" : "Lead created");
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not save the lead");
    },
  });
}

export function useDeleteLead() {
  const invalidate = useInvalidateLeads();
  return useMutation({
    mutationFn: (name: string) => api.deleteLead(name),
    onSuccess: async () => {
      await invalidate();
      toast.success("Lead deleted");
    },
    onError: (error) => {
      toast.error(friendlyFrappeError(error, "Could not delete the lead"));
    },
  });
}

export function useConvertLeadToDeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: api.ConvertLeadToDealParams) => api.convertLeadToDeal(params),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [LEAD_QUERY_ROOT] }),
        queryClient.invalidateQueries({ queryKey: ["deals"] }),
      ]);
    },
  });
}

export async function uploadLeadFile(docname: string, fieldname: string, file: File) {
  return api.uploadAttachment({ doctype: api.LEAD_DOCTYPE, docname, fieldname, file });
}

export function errorMessage(error: unknown): string {
  if (error instanceof api.FrappeApiError) return error.message;
  return error instanceof Error ? error.message : "Something went wrong";
}

export type { FrappeDocTypeMeta };

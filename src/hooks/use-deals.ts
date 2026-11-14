import { keepPreviousData, queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as api from "@/lib/api";
import { friendlyFrappeError } from "@/lib/frappe-error";
import type { FrappeDocTypeMeta } from "@/lib/frappe-meta";
import { notifyStageChange, notifyEntityChange } from "@/lib/change-notifications";

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
  fromStage?: string;
  skipNotification?: boolean;
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
    onSuccess: async (doc, variables) => {
      await invalidate();
      const dealName =
        variables.name ||
        (doc && typeof doc === "object" ? String((doc as Record<string, unknown>)["name"] || "") : "");
      
      if (!variables.skipNotification) {
        if (variables.values["status"]) {
          void notifyStageChange({
            dealId: dealName,
            dealTitle: String((doc as Record<string, unknown>)?.["deal_name"] || dealName),
            ...(variables.fromStage !== undefined ? { fromStage: variables.fromStage } : {}),
            toStage: String(variables.values["status"]),
            dealValue: (doc as Record<string, unknown>)?.["deal_value"] as number,
            organization: String(
              (doc as Record<string, unknown>)?.["organization_name"] ||
                (doc as Record<string, unknown>)?.["organization"] ||
                "",
            ),
          });
        } else {
          // Collect all modified fields to include in the notification email
          const changedDetails: Record<string, unknown> = {};
          const fieldSummaries: string[] = [];

          for (const [k, v] of Object.entries(variables.values)) {
            if (v === undefined || v === null) continue;
            if (k === "products" && Array.isArray(v)) {
              fieldSummaries.push(`Products (${v.length} line item${v.length === 1 ? "" : "s"})`);
              changedDetails["Products"] = v.length > 0
                ? v.map((p: any) => `${p.product_code || p.item || p.product_name || "Item"} (Qty: ${p.qty || 1}, Rate: ${p.rate || 0})`).join("; ")
                : "None";
            } else if (k === "deal_value" || k === "annual_revenue") {
              const label = k === "deal_value" ? "Deal Value" : "Annual Revenue";
              const formattedVal = `PKR ${Number(v).toLocaleString()}`;
              fieldSummaries.push(`${label} (${formattedVal})`);
              changedDetails[label] = formattedVal;
            } else if (k === "probability") {
              fieldSummaries.push(`Probability (${v}%)`);
              changedDetails["Probability"] = `${v}%`;
            } else {
              const label = k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
              const strVal = String(v).trim();
              if (strVal) {
                fieldSummaries.push(`${label}: ${strVal}`);
                changedDetails[label] = strVal;
              }
            }
          }

          const summaryText = fieldSummaries.length > 0
            ? `${variables.name ? "Updated" : "Set"}: ${fieldSummaries.join(" | ")}`
            : variables.name ? "Deal details updated" : "New deal created";

          void notifyEntityChange({
            doctype: api.DEAL_DOCTYPE,
            docname: dealName,
            action: variables.name ? "Data Updated" : "Created",
            eventCategory: "dealUpdates",
            title: String((doc as Record<string, unknown>)?.["deal_name"] || dealName),
            summary: summaryText,
            details: changedDetails,
          });
        }
      }
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
    onSuccess: async (_data, name) => {
      await invalidate();
      void notifyEntityChange({
        doctype: api.DEAL_DOCTYPE,
        docname: name,
        action: "Deleted",
        eventCategory: "dealUpdates",
      });
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

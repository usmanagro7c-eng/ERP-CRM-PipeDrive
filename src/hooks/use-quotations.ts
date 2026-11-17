import { keepPreviousData, queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as api from "@/lib/api";
import type { Quotation, Item } from "@/lib/api";
import { notifyEntityChange } from "@/lib/change-notifications";

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
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, values }: SaveQuotationInput) => {
      if (name) {
        return api.updateQuotation(name, values);
      }
      return api.createQuotation(values);
    },
    onSuccess: async (doc, variables) => {
      await invalidate();
      await queryClient.invalidateQueries({ queryKey: ["deals"] });
      await queryClient.invalidateQueries({ queryKey: ["deal"] });
      const qName =
        variables.name ||
        (doc && typeof doc === "object" ? String((doc as Record<string, unknown>)["name"] || "") : "");
      const itemsList = Array.isArray(variables.values["items"])
        ? (variables.values["items"] as Array<Record<string, unknown>>)
        : [];
      const itemsSummary = itemsList.length > 0
        ? `${itemsList.length} line item(s): ${itemsList.map(it => `${it.item_code || it.item_name || "Item"} (Qty: ${it.qty || 1}, Rate: PKR ${Number(it.rate || 0).toLocaleString()})`).join("; ")}`
        : "";

      const grandTotalVal = variables.values["grand_total"] || (doc && typeof doc === "object" ? (doc as any)["grand_total"] : undefined);
      const partyName = String(variables.values["party_name"] || (doc && typeof doc === "object" ? (doc as any)["party_name"] : "") || "");

      void notifyEntityChange({
        doctype: api.QUOTATION_DOCTYPE,
        docname: qName,
        action: variables.name ? "Data Updated" : "Created",
        eventCategory: "quotations",
        summary: `Customer: ${partyName || "N/A"}${grandTotalVal ? ` | Total: PKR ${Number(grandTotalVal).toLocaleString()}` : ""}${itemsList.length > 0 ? ` | ${itemsList.length} item(s)` : ""}`,
        details: {
          "Customer": partyName || undefined,
          "Grand Total": grandTotalVal ? `PKR ${Number(grandTotalVal).toLocaleString()}` : undefined,
          "Total Line Items": itemsList.length > 0 ? itemsList.length : undefined,
          "Line Items": itemsSummary || undefined,
          "Valid Till": String(variables.values["valid_till"] || (doc && typeof doc === "object" ? (doc as any)["valid_till"] : "") || ""),
          "Source Deal": String(variables.values["crm_deal"] || ""),
        },
      });
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
    onSuccess: async (data, name) => {
      await invalidate();
      const party = (data && typeof data === "object" ? (data as any)["party_name"] : "") || "";
      const grandTotal = (data && typeof data === "object" ? (data as any)["grand_total"] : 0) || 0;
      void notifyEntityChange({
        doctype: api.QUOTATION_DOCTYPE,
        docname: name,
        action: "Submitted to ERP",
        eventCategory: "quotations",
        summary: `Quotation ${name} was officially SUBMITTED to ERPNext for ${party || "customer"}.`,
        details: {
          "Customer": party || undefined,
          "Grand Total": grandTotal ? `PKR ${Number(grandTotal).toLocaleString()}` : undefined,
          "Status": "Submitted",
        },
      });
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
    onSuccess: async (_data, name) => {
      await invalidate();
      void notifyEntityChange({
        doctype: api.QUOTATION_DOCTYPE,
        docname: name,
        action: "Cancelled / Declared Lost",
        eventCategory: "quotations",
        summary: `Quotation ${name} has been cancelled or declared lost.`,
        details: {
          "Status": "Cancelled",
        },
      });
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
    onSuccess: async (_data, name) => {
      await invalidate();
      void notifyEntityChange({
        doctype: api.QUOTATION_DOCTYPE,
        docname: name,
        action: "Deleted",
        eventCategory: "quotations",
      });
      toast.success("Quotation deleted");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not delete quotation");
    },
  });
}

export type { Quotation, Item };

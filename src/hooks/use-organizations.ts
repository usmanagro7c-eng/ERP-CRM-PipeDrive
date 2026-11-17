import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import * as api from "@/lib/api";
import type { FrappeDocTypeMeta } from "@/lib/frappe-meta";
import { notifyEntityChange } from "@/lib/change-notifications";

export const ORG_QUERY_ROOT = "organizations";

export function orgMetaOptions() {
  return queryOptions({
    queryKey: [ORG_QUERY_ROOT, "doctype-meta"],
    queryFn: () => api.getDocTypeMeta(),
    staleTime: 5 * 60 * 1000,
  });
}

export interface OrgListVariables {
  search: string;
  filters: Array<[string, string, string]>;
  limit: number;
  start: number;
  orderBy?: string | undefined;
}

export function orgListOptions(variables: OrgListVariables) {
  return queryOptions({
    queryKey: [ORG_QUERY_ROOT, "list", variables],
    queryFn: () => api.listOrganizations(variables),
    placeholderData: keepPreviousData,
  });
}

export function orgCountOptions(search: string, filters: Array<[string, string, string]> = []) {
  return queryOptions({
    queryKey: [ORG_QUERY_ROOT, "count", search, filters],
    queryFn: () => api.countOrganizations(search, filters),
  });
}

export function orgDetailOptions(name: string) {
  return queryOptions({
    queryKey: [ORG_QUERY_ROOT, "detail", name],
    queryFn: () => api.getOrganization(name),
    retry: (failureCount, error) =>
      !(error instanceof api.FrappeApiError) || ![403, 404].includes(error.status)
        ? failureCount < 2
        : false,
  });
}

export function useLinkOptions(doctype: string | undefined) {
  return useQuery({
    queryKey: ["link-options", doctype],
    queryFn: () => api.getLinkOptions(doctype!),
    enabled: Boolean(doctype),
    staleTime: 5 * 60 * 1000,
    // A missing/forbidden link target will never succeed on retry, and the
    // default retries turn one 404 into a burst of console errors.
    retry: (failureCount, error) =>
      !(error instanceof api.FrappeApiError) || ![403, 404].includes(error.status)
        ? failureCount < 2
        : false,
  });
}

function useInvalidateOrganizations() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: [ORG_QUERY_ROOT] });
}

export interface SaveOrgInput {
  name?: string | undefined; // present => update, absent => create
  values: Record<string, unknown>;
}

export function useSaveOrganization() {
  const invalidate = useInvalidateOrganizations();
  return useMutation({
    mutationFn: async ({ name, values }: SaveOrgInput) => {
      if (name) {
        return api.updateOrganization(name, values);
      }
      return api.createOrganization(values);
    },
    onSuccess: async (doc, variables) => {
      await invalidate();
      toast.success(variables.name ? "Organization updated" : "Organization created");
      const orgName = String(variables.values["organization_name"] || doc?.["organization_name"] || variables.name || "Organization");
      void notifyEntityChange({
        doctype: api.ORG_DOCTYPE,
        docname: doc?.["name"] || variables.name || "Organization",
        title: orgName,
        action: variables.name ? "Updated" : "Created",
        eventCategory: "otherRecords",
        summary: `Organization "${orgName}" was ${variables.name ? "updated" : "created"}.`,
        details: {
          "Name": orgName,
          "Website": variables.values["website"] || doc?.["website"],
          "Territory": variables.values["territory"] || doc?.["territory"],
          "Industry": variables.values["industry"] || doc?.["industry"],
        },
      }).catch((err) => console.warn("Failed to notify org change:", err));
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not save the organization");
    },
  });
}

export function useDeleteOrganization() {
  const invalidate = useInvalidateOrganizations();
  return useMutation({
    mutationFn: (name: string) => api.deleteOrganization(name),
    onSuccess: async (_data, name) => {
      await invalidate();
      toast.success("Organization deleted");
      void notifyEntityChange({
        doctype: api.ORG_DOCTYPE,
        docname: name,
        title: name,
        action: "Deleted",
        eventCategory: "otherRecords",
        summary: `Organization ${name} was deleted.`,
      }).catch((err) => console.warn("Failed to notify org delete:", err));
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not delete the organization");
    },
  });
}

export async function uploadOrgFile(docname: string, fieldname: string, file: File) {
  return api.uploadAttachment({ doctype: api.ORG_DOCTYPE, docname, fieldname, file });
}

export function errorMessage(error: unknown): string {
  if (error instanceof api.FrappeApiError) return error.message;
  return error instanceof Error ? error.message : "Something went wrong";
}

export type { FrappeDocTypeMeta };

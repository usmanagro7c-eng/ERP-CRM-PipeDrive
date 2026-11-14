import { keepPreviousData, queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as api from "@/lib/api";
import type { FrappeDocTypeMeta } from "@/lib/frappe-meta";
import { notifyEntityChange } from "@/lib/change-notifications";

export const CONTACT_QUERY_ROOT = "contacts";

export function contactMetaOptions() {
  return queryOptions({
    queryKey: [CONTACT_QUERY_ROOT, "doctype-meta"],
    queryFn: () => api.getDocTypeMeta(api.CONTACT_DOCTYPE),
    staleTime: 5 * 60 * 1000,
  });
}

export function contactStatusesOptions() {
  return queryOptions({
    queryKey: [CONTACT_QUERY_ROOT, "statuses"],
    queryFn: () => api.getContactStatuses(),
    staleTime: 5 * 60 * 1000,
  });
}

export interface ContactListVariables {
  search: string;
  filters: Array<[string, string, string]>;
  limit: number;
  start: number;
  orderBy?: string | undefined;
}

export function contactListOptions(variables: ContactListVariables) {
  return queryOptions({
    queryKey: [CONTACT_QUERY_ROOT, "list", variables],
    queryFn: () => api.listContacts(variables),
    placeholderData: keepPreviousData,
  });
}

export function contactCountOptions(search: string, filters: Array<[string, string, string]> = []) {
  return queryOptions({
    queryKey: [CONTACT_QUERY_ROOT, "count", search, filters],
    queryFn: () => api.countContacts(search, filters),
  });
}

export function contactDetailOptions(name: string) {
  return queryOptions({
    queryKey: [CONTACT_QUERY_ROOT, "detail", name],
    queryFn: () => api.getContact(name),
    retry: (failureCount, error) =>
      !(error instanceof api.FrappeApiError) || ![403, 404].includes(error.status)
        ? failureCount < 2
        : false,
  });
}

function useInvalidateContacts() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: [CONTACT_QUERY_ROOT] });
}

export interface SaveContactInput {
  name?: string | undefined; // present => update, absent => create
  values: Record<string, unknown>;
}

export function useSaveContact() {
  const invalidate = useInvalidateContacts();
  return useMutation({
    mutationFn: async ({ name, values }: SaveContactInput) => {
      if (name) {
        return api.updateContact(name, values);
      }
      return api.createContact(values);
    },
    onSuccess: async (doc, variables) => {
      await invalidate();
      toast.success(variables.name ? "Contact updated" : "Contact created");
      const cName = String(
        variables.values["full_name"] ||
          variables.values["first_name"] ||
          doc?.["full_name"] ||
          variables.name ||
          "Contact",
      );
      void notifyEntityChange({
        doctype: api.CONTACT_DOCTYPE,
        docname: doc?.["name"] || variables.name || "Contact",
        title: cName,
        action: variables.name ? "Updated" : "Created",
        eventCategory: "otherRecords",
        summary: `Contact "${cName}" was ${variables.name ? "updated" : "created"}.`,
        details: {
          "Name": cName,
          "Email": variables.values["email_id"] || doc?.["email_id"],
          "Mobile": variables.values["mobile_no"] || doc?.["mobile_no"],
          "Organization": variables.values["company_name"] || doc?.["company_name"],
        },
      }).catch((err) => console.warn("Failed to notify contact change:", err));
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not save the contact");
    },
  });
}

export function useDeleteContact() {
  const invalidate = useInvalidateContacts();
  return useMutation({
    mutationFn: (name: string) => api.deleteContact(name),
    onSuccess: async (_data, name) => {
      await invalidate();
      toast.success("Contact deleted");
      void notifyEntityChange({
        doctype: api.CONTACT_DOCTYPE,
        docname: name,
        title: name,
        action: "Deleted",
        eventCategory: "otherRecords",
        summary: `Contact ${name} was deleted.`,
      }).catch((err) => console.warn("Failed to notify contact delete:", err));
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not delete the contact");
    },
  });
}

export function useBulkDeleteContacts() {
  const invalidate = useInvalidateContacts();
  return useMutation({
    mutationFn: async (names: string[]) => {
      let succeeded = 0;
      let failed = 0;
      for (const name of names) {
        try {
          await api.deleteContact(name);
          succeeded += 1;
        } catch {
          failed += 1;
        }
      }
      return { succeeded, failed };
    },
    onSuccess: async ({ succeeded, failed }) => {
      await invalidate();
      if (failed === 0) {
        toast.success(`Deleted ${succeeded} contact${succeeded === 1 ? "" : "s"}`);
      } else {
        toast.warning(`Deleted ${succeeded} contact(s); ${failed} failed.`);
      }
    },
  });
}

export function useBulkMoveContactStatus() {
  const invalidate = useInvalidateContacts();
  return useMutation({
    mutationFn: async ({ names, status }: { names: string[]; status: string }) => {
      let succeeded = 0;
      let failed = 0;
      for (const name of names) {
        try {
          await api.updateContact(name, { status });
          succeeded += 1;
        } catch {
          failed += 1;
        }
      }
      return { succeeded, failed, status };
    },
    onSuccess: async ({ succeeded, failed, status }) => {
      await invalidate();
      if (failed === 0) {
        toast.success(`Moved ${succeeded} contact${succeeded === 1 ? "" : "s"} to ${status}`);
      } else {
        toast.warning(`Updated ${succeeded} contact(s); ${failed} failed.`);
      }
    },
  });
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "An unexpected error occurred.";
}

export type { FrappeDocTypeMeta };

import { keepPreviousData, queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as api from "@/lib/api";
import { friendlyFrappeError } from "@/lib/frappe-error";
import type { FrappeDocTypeMeta } from "@/lib/frappe-meta";

export const ACTIVITY_QUERY_ROOT = "activities";

export function activityMetaOptions() {
  return queryOptions({
    queryKey: [ACTIVITY_QUERY_ROOT, "doctype-meta"],
    queryFn: () => api.getDocTypeMeta(api.TASK_DOCTYPE),
    staleTime: 5 * 60 * 1000,
  });
}

export interface ActivityListVariables {
  search: string;
  filters: Array<[string, string, string]>;
  limit: number;
  start: number;
  orderBy?: string | undefined;
}

export function activityListOptions(variables: ActivityListVariables) {
  return queryOptions({
    queryKey: [ACTIVITY_QUERY_ROOT, "list", variables],
    queryFn: () => api.listTasks(variables),
    placeholderData: keepPreviousData,
  });
}

export function activityCountOptions(
  search: string,
  filters: Array<[string, string, string]> = [],
) {
  return queryOptions({
    queryKey: [ACTIVITY_QUERY_ROOT, "count", search, filters],
    queryFn: () => api.countTasks(search, filters),
  });
}

export function activityDetailOptions(name: string) {
  return queryOptions({
    queryKey: [ACTIVITY_QUERY_ROOT, "detail", name],
    queryFn: () => api.getTask(name),
    retry: (failureCount, error) =>
      !(error instanceof api.FrappeApiError) || ![403, 404].includes(error.status)
        ? failureCount < 2
        : false,
  });
}

function useInvalidateActivities() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: [ACTIVITY_QUERY_ROOT] });
}

export interface SaveActivityInput {
  name?: string | undefined; // present => update, absent => create
  values: Record<string, unknown>;
}

export function useSaveActivity() {
  const invalidate = useInvalidateActivities();
  return useMutation({
    mutationFn: async ({ name, values }: SaveActivityInput) => {
      if (name) {
        return api.updateTask(name, values);
      }
      return api.createTask(values);
    },
    onSuccess: async (_doc, variables) => {
      await invalidate();
      toast.success(variables.name ? "Activity updated" : "Activity created");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not save the activity");
    },
  });
}

export function useDeleteActivity() {
  const invalidate = useInvalidateActivities();
  return useMutation({
    mutationFn: (name: string) => api.deleteTask(name),
    onSuccess: async () => {
      await invalidate();
      toast.success("Activity deleted");
    },
    onError: (error) => {
      toast.error(friendlyFrappeError(error, "Could not delete the activity"));
    },
  });
}

export async function uploadActivityFile(docname: string, fieldname: string, file: File) {
  return api.uploadAttachment({ doctype: api.TASK_DOCTYPE, docname, fieldname, file });
}

export function errorMessage(error: unknown): string {
  if (error instanceof api.FrappeApiError) return error.message;
  return error instanceof Error ? error.message : "Something went wrong";
}

export type { FrappeDocTypeMeta };

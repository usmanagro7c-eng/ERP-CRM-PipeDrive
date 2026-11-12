import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as api from "@/lib/api";
import type { CrmTask } from "@/lib/api";

export const TASKS_QUERY_ROOT = "crm_tasks";

export function tasksListOptions(
  params: {
    search?: string | undefined;
    status?: string | undefined;
    priority?: string | undefined;
    reference_doctype?: string | undefined;
    reference_docname?: string | undefined;
  } = {},
) {
  const filters: Array<[string, string, string]> = [];
  if (params.status && params.status !== "all") {
    filters.push(["status", "=", params.status]);
  }
  if (params.priority && params.priority !== "all") {
    filters.push(["priority", "=", params.priority]);
  }
  if (params.reference_doctype && params.reference_docname) {
    filters.push(["reference_doctype", "=", params.reference_doctype]);
    filters.push(["reference_docname", "=", params.reference_docname]);
  }

  return queryOptions({
    queryKey: [TASKS_QUERY_ROOT, "list", params],
    queryFn: async () => {
      const rows = await api.listTasks({
        search: params.search || "",
        filters,
        limit: 50,
        start: 0,
      });
      return rows as unknown as CrmTask[];
    },
  });
}

export function useSaveTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: Record<string, unknown> & { name?: string | undefined }) => {
      if (values.name) {
        const { name, ...rest } = values;
        return api.updateTask(name, rest);
      }
      return api.createTask(values);
    },
    onSuccess: (_doc, variables) => {
      void queryClient.invalidateQueries({ queryKey: [TASKS_QUERY_ROOT] });
      toast.success(variables.name ? "Task updated" : "Task created");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to save task");
    },
  });
}

export function useToggleTaskComplete() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, currentStatus }: { name: string; currentStatus: string }) => {
      const nextStatus = currentStatus === "Completed" ? "Open" : "Completed";
      return api.updateTask(name, { status: nextStatus });
    },
    onSuccess: (doc) => {
      void queryClient.invalidateQueries({ queryKey: [TASKS_QUERY_ROOT] });
      const status = String(doc["status"] ?? "");
      toast.success(status === "Completed" ? "Task marked as completed" : "Task reopened");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to update task");
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api.deleteTask(name),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [TASKS_QUERY_ROOT] });
      toast.success("Task deleted");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to delete task");
    },
  });
}

export type { CrmTask };

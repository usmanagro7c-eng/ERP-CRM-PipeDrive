import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as api from "@/lib/api";
import type { CrmTask } from "@/lib/api";
import { notifyEntityChange } from "@/lib/change-notifications";

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
    onSuccess: (doc, variables) => {
      void queryClient.invalidateQueries({ queryKey: [TASKS_QUERY_ROOT] });
      toast.success(variables.name ? "Task updated" : "Task created");
      const taskTitle = String(variables["title"] || doc?.["title"] || variables.name || "Task");
      void notifyEntityChange({
        doctype: "CRM Task",
        docname: doc?.["name"] || variables.name || "Task",
        title: taskTitle,
        action: variables.name ? "Updated" : "Created",
        eventCategory: "otherRecords",
        summary: `Task "${taskTitle}" was ${variables.name ? "updated" : "created"}. Status: ${variables["status"] || doc?.["status"] || "Todo"}`,
        details: {
          "Title": taskTitle,
          "Status": variables["status"] || doc?.["status"],
          "Priority": variables["priority"] || doc?.["priority"],
          "Due Date": variables["due_date"] || doc?.["due_date"],
        },
      }).catch((err) => console.warn("Failed to notify task save:", err));
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
      const nextStatus = currentStatus === "Done" ? "Todo" : "Done";
      return api.updateTask(name, { status: nextStatus });
    },
    onSuccess: (doc, variables) => {
      void queryClient.invalidateQueries({ queryKey: [TASKS_QUERY_ROOT] });
      const status = String(doc["status"] ?? "");
      toast.success(status === "Done" ? "Task marked as completed" : "Task reopened");
      void notifyEntityChange({
        doctype: "CRM Task",
        docname: variables.name,
        title: String(doc["title"] || variables.name),
        action: status === "Done" ? "Marked as Completed" : "Reopened",
        eventCategory: "otherRecords",
        summary: `Task "${doc["title"] || variables.name}" was ${status === "Done" ? "completed" : "reopened"}.`,
        details: {
          "Status": status,
        },
      }).catch((err) => console.warn("Failed to notify task toggle:", err));
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

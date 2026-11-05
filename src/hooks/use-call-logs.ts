import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as api from "@/lib/api";
import type { CrmCallLog } from "@/lib/api";

export const CALL_LOGS_QUERY_ROOT = "crm_call_logs";

export function callLogsListOptions(params: {
  search?: string | undefined;
  reference_doctype?: string | undefined;
  reference_docname?: string | undefined;
} = {}) {
  return queryOptions({
    queryKey: [CALL_LOGS_QUERY_ROOT, "list", params],
    queryFn: () => api.listCallLogs(params),
  });
}

export function useSaveCallLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: Partial<CrmCallLog>) => api.createCallLog(values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [CALL_LOGS_QUERY_ROOT] });
      toast.success("Call log saved");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to save call log");
    },
  });
}

export function useDeleteCallLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api.deleteCallLog(name),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [CALL_LOGS_QUERY_ROOT] });
      toast.success("Call log deleted");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to delete call log");
    },
  });
}

export type { CrmCallLog };

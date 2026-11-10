import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as api from "@/lib/api";
import type { CrmAttachment } from "@/lib/api";

export const ATTACHMENTS_QUERY_ROOT = "attachments";

export function attachmentsListOptions(doctype: string, docname: string) {
  return queryOptions({
    queryKey: [ATTACHMENTS_QUERY_ROOT, doctype, docname],
    queryFn: () => api.listAttachments(doctype, docname),
  });
}

export function useUploadAttachment(doctype: string, docname: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) =>
      api.uploadAttachment({
        doctype,
        docname,
        file,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [ATTACHMENTS_QUERY_ROOT, doctype, docname],
      });
      toast.success("File uploaded successfully");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to upload file");
    },
  });
}

export function useDeleteAttachment(doctype: string, docname: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (fileName: string) => api.deleteAttachment(fileName),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [ATTACHMENTS_QUERY_ROOT, doctype, docname],
      });
      toast.success("File deleted");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to delete file");
    },
  });
}

export type { CrmAttachment };

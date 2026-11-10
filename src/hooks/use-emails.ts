import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as api from "@/lib/api";
import type { RecordEmail } from "@/lib/api";

export const EMAILS_QUERY_ROOT = "record-emails";

export function emailsListOptions(referenceDoctype: string, referenceName: string) {
  return queryOptions({
    queryKey: [EMAILS_QUERY_ROOT, referenceDoctype, referenceName],
    queryFn: () => api.getRecordEmails(referenceDoctype, referenceName),
  });
}

export function useSendEmail(referenceDoctype: string, referenceName: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { recipients: string; subject: string; content: string }) =>
      api.sendEmail({
        ...args,
        doctype: referenceDoctype,
        docname: referenceName,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [EMAILS_QUERY_ROOT, referenceDoctype, referenceName],
      });
      void queryClient.invalidateQueries({
        queryKey: ["record-activities", referenceDoctype, referenceName],
      });
      toast.success("Email sent successfully");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to send email");
    },
  });
}

export function useDeleteEmail(referenceDoctype: string, referenceName: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (emailName: string) => api.deleteEmail(emailName),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [EMAILS_QUERY_ROOT, referenceDoctype, referenceName],
      });
      toast.success("Email deleted");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to delete email");
    },
  });
}

export type { RecordEmail };

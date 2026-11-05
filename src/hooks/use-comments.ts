import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as api from "@/lib/api";
import type { CrmComment } from "@/lib/api";

export const COMMENTS_QUERY_ROOT = "comments";

export function commentsListOptions(referenceDoctype: string, referenceName: string) {
  return queryOptions({
    queryKey: [COMMENTS_QUERY_ROOT, referenceDoctype, referenceName],
    queryFn: () => api.listComments(referenceDoctype, referenceName),
  });
}

export function useAddComment(referenceDoctype: string, referenceName: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content: string) =>
      api.addComment({
        referenceDoctype,
        referenceName,
        content,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [COMMENTS_QUERY_ROOT, referenceDoctype, referenceName],
      });
      toast.success("Comment added");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to add comment");
    },
  });
}

export function useDeleteComment(referenceDoctype: string, referenceName: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (commentName: string) => api.deleteComment(commentName),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [COMMENTS_QUERY_ROOT, referenceDoctype, referenceName],
      });
      toast.success("Comment deleted");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to delete comment");
    },
  });
}

export type { CrmComment };

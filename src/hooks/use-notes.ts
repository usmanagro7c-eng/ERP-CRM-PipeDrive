import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as api from "@/lib/api";
import type { CrmNote } from "@/lib/api";

export const NOTES_QUERY_ROOT = "crm_notes";

export function notesListOptions(params: {
  search?: string | undefined;
  reference_doctype?: string | undefined;
  reference_docname?: string | undefined;
} = {}) {
  return queryOptions({
    queryKey: [NOTES_QUERY_ROOT, "list", params],
    queryFn: () => api.listNotes(params),
  });
}

export function useSaveNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: Record<string, unknown> & { name?: string | undefined }) => {
      if (values.name) {
        const { name, ...rest } = values;
        return api.updateNote(name, rest);
      }
      return api.createNote(values);
    },
    onSuccess: (_doc, variables) => {
      void queryClient.invalidateQueries({ queryKey: [NOTES_QUERY_ROOT] });
      toast.success(variables.name ? "Note updated" : "Note created");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to save note");
    },
  });
}

export function useDeleteNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api.deleteNote(name),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [NOTES_QUERY_ROOT] });
      toast.success("Note deleted");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to delete note");
    },
  });
}

export type { CrmNote };

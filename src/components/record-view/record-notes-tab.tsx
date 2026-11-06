import { useState } from "react";
import { Plus, StickyNote, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  notesListOptions,
  useSaveNote,
  useDeleteNote,
} from "@/hooks/use-notes";

interface RecordNotesTabProps {
  referenceDoctype: string;
  referenceName: string;
}

export function RecordNotesTab({
  referenceDoctype,
  referenceName,
}: RecordNotesTabProps) {
  const { data: notes = [], isLoading } = useQuery(
    notesListOptions({
      reference_doctype: referenceDoctype,
      reference_docname: referenceName,
    }),
  );
  const saveMutation = useSaveNote();
  const deleteMutation = useDeleteNote();

  const [showNewNote, setShowNewNote] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");

  async function handleCreateNote() {
    if (!noteTitle.trim()) return;
    try {
      await saveMutation.mutateAsync({
        title: noteTitle.trim(),
        content: noteContent.trim(),
        reference_doctype: referenceDoctype,
        reference_docname: referenceName,
      });
      setNoteTitle("");
      setNoteContent("");
      setShowNewNote(false);
    } catch {
      // handled
    }
  }

  return (
    <div className="flex flex-col h-full min-h-[460px] max-w-4xl px-1 sm:px-4">
      {/* Notes Header matching Frappe CRM */}
      <div className="flex shrink-0 items-center justify-between pb-4 pt-2">
        <h2 className="text-2xl font-semibold text-foreground">Notes</h2>
        <Button
          size="sm"
          onClick={() => setShowNewNote(true)}
          className="h-7 text-xs font-medium px-2.5 rounded-md gap-1 bg-white text-black hover:bg-neutral-200 dark:bg-white dark:text-black cursor-pointer shadow-xs"
        >
          <Plus className="size-3.5" />
          <span>New Note</span>
        </Button>
      </div>

      {showNewNote && (
        <div className="rounded-lg border bg-card p-3 space-y-2.5 shadow-xs mb-5">
          <Input
            value={noteTitle}
            onChange={(e) => setNoteTitle(e.target.value)}
            placeholder="Note Title (e.g. Call summary or pricing agreement)"
            className="text-xs h-8 font-medium bg-secondary/30"
            autoFocus
          />
          <Textarea
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            placeholder="Type your notes here..."
            className="text-xs min-h-[90px] resize-none bg-secondary/30"
          />
          <div className="flex justify-end gap-1.5 pt-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowNewNote(false)}
              className="h-7 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreateNote}
              disabled={!noteTitle.trim() || saveMutation.isPending}
              className="h-7 text-xs cursor-pointer"
            >
              {saveMutation.isPending ? "Saving..." : "Save Note"}
            </Button>
          </div>
        </div>
      )}

      {notes.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-24 select-none">
          <div className="flex items-center justify-center size-14 rounded-full mb-2">
            <StickyNote className="size-10 stroke-[1.2] text-muted-foreground/45" />
          </div>
          <p className="text-sm font-medium text-foreground">No Notes Found</p>
          <p className="text-xs text-muted-foreground mt-1">
            Nothing here for now. Add a note to keep track of things.
          </p>
        </div>
      ) : (
        <div className="space-y-3 pb-8">
          {notes.map((n) => (
            <div
              key={n.name}
              className="group relative rounded-lg border bg-card p-3.5 text-xs shadow-2xs hover:border-primary/40 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="font-semibold text-foreground text-sm">{n.title}</div>
                <button
                  onClick={() => deleteMutation.mutate(n.name)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive cursor-pointer p-0.5"
                  title="Delete note"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
              {n.content && (
                <p className="mt-1.5 text-muted-foreground text-xs whitespace-pre-wrap leading-relaxed">
                  {n.content}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

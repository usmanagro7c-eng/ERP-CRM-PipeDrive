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
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Notes ({notes.length})</h3>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowNewNote(true)}
          className="h-7 text-xs gap-1"
        >
          <Plus className="size-3" />
          <span>New Note</span>
        </Button>
      </div>

      {showNewNote && (
        <div className="rounded-lg border bg-card p-3 space-y-2.5 shadow-2xs">
          <Input
            value={noteTitle}
            onChange={(e) => setNoteTitle(e.target.value)}
            placeholder="Note Title (e.g. Call summary or pricing agreement)"
            className="text-xs h-8 font-medium"
            autoFocus
          />
          <Textarea
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            placeholder="Type your notes here..."
            className="text-xs min-h-[90px] resize-none"
          />
          <div className="flex justify-end gap-1.5 pt-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowNewNote(false)}
              className="h-7 text-xs text-muted-foreground"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreateNote}
              disabled={!noteTitle.trim() || saveMutation.isPending}
              className="h-7 text-xs"
            >
              {saveMutation.isPending ? "Saving..." : "Save Note"}
            </Button>
          </div>
        </div>
      )}

      {notes.length === 0 ? (
        <div className="py-12 text-center text-xs text-muted-foreground">
          No notes added to this record yet.
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div
              key={note.name}
              className="group rounded-lg border bg-card p-3.5 space-y-1.5 text-xs shadow-2xs hover:shadow-xs transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <StickyNote className="size-3.5 text-amber-500" />
                  <span className="font-semibold text-foreground">{note.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">
                    {note.creation?.split(" ")[0]}
                  </span>
                  <button
                    onClick={() => deleteMutation.mutate(note.name)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive cursor-pointer"
                    title="Delete note"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              </div>
              {note.content && (
                <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {note.content}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

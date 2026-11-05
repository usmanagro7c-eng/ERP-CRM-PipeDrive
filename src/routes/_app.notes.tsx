import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Plus, Search, StickyNote, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  notesListOptions,
  useSaveNote,
  useDeleteNote,
  type CrmNote,
} from "@/hooks/use-notes";

export const Route = createFileRoute("/_app/notes")({
  head: () => ({ meta: [{ title: "Notes · AgroCRM" }] }),
  component: NotesPage,
});

function NotesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const { data: notes = [], isLoading } = useQuery(
    notesListOptions({ search: searchTerm || undefined }),
  );
  const saveMutation = useSaveNote();
  const deleteMutation = useDeleteNote();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<CrmNote | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  function handleOpenCreate() {
    setEditingNote(null);
    setTitle("");
    setContent("");
    setModalOpen(true);
  }

  function handleOpenEdit(note: CrmNote) {
    setEditingNote(note);
    setTitle(note.title || "");
    setContent(note.content || "");
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    await saveMutation.mutateAsync({
      name: editingNote?.name,
      title: title.trim(),
      content: content.trim(),
    });
    setModalOpen(false);
  }

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6 max-w-7xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Notes</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Internal team documentation, meeting summaries, and customer notes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search notes..."
              className="pl-8 text-xs h-8"
            />
          </div>
          <Button size="sm" onClick={handleOpenCreate} className="h-8 gap-1.5 text-xs">
            <Plus className="size-3.5" />
            <span>Note</span>
          </Button>
        </div>
      </div>

      {/* Content Area */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      ) : notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-12 text-center bg-card/40 my-8">
          <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
            <StickyNote className="size-6" />
          </div>
          <h3 className="text-sm font-semibold">No notes found</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            Create your first standalone note or attach notes directly to Leads and Deals.
          </p>
          <Button size="sm" onClick={handleOpenCreate} className="mt-4 h-8 text-xs gap-1">
            <Plus className="size-3.5" />
            <span>Create Note</span>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {notes.map((note) => (
            <div
              key={note.name}
              onClick={() => handleOpenEdit(note)}
              className="group relative rounded-xl border bg-card p-4 shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between min-h-[160px]"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-xs text-foreground line-clamp-1">
                    {note.title}
                  </h3>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("Delete this note?")) deleteMutation.mutate(note.name);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive cursor-pointer"
                    title="Delete note"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
                {note.content && (
                  <p className="text-xs text-muted-foreground line-clamp-4 leading-relaxed">
                    {note.content}
                  </p>
                )}
              </div>

              <div className="pt-2 border-t flex items-center justify-between text-[10px] text-muted-foreground mt-3">
                <span>{note.creation?.split(" ")[0]}</span>
                {note.reference_docname && (
                  <span className="font-mono bg-muted px-1.5 py-0.5 rounded-sm">
                    {note.reference_docname}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Note Creation / Editing Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle className="text-base font-semibold">
                {editingNote ? "Edit Note" : "Create New Note"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Write team notes, meeting minutes, or client follow-up details.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-4 text-xs">
              <div className="space-y-1.5">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Note Title *"
                  className="text-xs h-8 font-semibold"
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write your note contents here..."
                  className="text-xs min-h-[130px] resize-none"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalOpen(false)}
                className="text-xs h-8"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={saveMutation.isPending || !title.trim()}
                className="text-xs h-8 gap-1"
              >
                {saveMutation.isPending && <Loader2 className="size-3 animate-spin" />}
                <span>{editingNote ? "Update" : "Save Note"}</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpDown,
  Filter,
  List,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  StickyNote,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  notesListOptions,
  useDeleteNote,
  type CrmNote,
} from "@/hooks/use-notes";
import { NoteFormModal } from "@/components/notes/note-form-modal";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/notes")({
  head: () => ({ meta: [{ title: "Notes · AgroCRM" }] }),
  component: NotesPage,
});

function formatRelativeTime(dateStr: unknown): string {
  if (!dateStr || typeof dateStr !== "string") return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays === 0) {
      if (diffHours === 0) {
        if (diffMin <= 1) return "just now";
        return `${diffMin}m ago`;
      }
      return `${diffHours}h ago`;
    }
    if (diffDays === 1) return "yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  } catch {
    return String(dateStr);
  }
}

function NotesPage() {
  const [searchTitle, setSearchTitle] = useState("");
  const [searchContent, setSearchContent] = useState("");

  const { data: notes = [], isLoading, refetch } = useQuery(
    notesListOptions({ search: searchTitle || undefined }),
  );
  const deleteMutation = useDeleteNote();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<CrmNote | null>(null);

  function handleOpenCreate() {
    setEditingNote(null);
    setModalOpen(true);
  }

  function handleOpenEdit(note: CrmNote) {
    setEditingNote(note);
    setModalOpen(true);
  }

  // Filter notes by content if searchContent is entered
  const filteredNotes = notes.filter((n) => {
    if (!searchContent.trim()) return true;
    return (n.content || "").toLowerCase().includes(searchContent.trim().toLowerCase());
  });

  return (
    <div className="flex h-full flex-col bg-background overflow-hidden">
      {/* Top Banner Matching Frappe CRM */}
      <div className="flex items-center justify-between border-b border-border px-6 py-2.5 bg-card/60 backdrop-blur-xs">
        {/* Breadcrumb: Notes / ☰ Notes View */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link to="/notes" className="hover:text-foreground transition-colors font-medium">
            Notes
          </Link>
          <span className="opacity-60">/</span>
          <button
            type="button"
            className="flex items-center gap-1 text-foreground font-semibold hover:text-foreground/80 cursor-pointer"
          >
            <List className="size-3.5" />
            <span>Notes View</span>
          </button>
        </div>

        {/* Right Action: Solid Black "+ Create" Button matching Frappe CRM */}
        <Button
          size="sm"
          onClick={handleOpenCreate}
          className="h-7 text-xs font-medium px-3 rounded-md bg-foreground text-background hover:bg-foreground/90 cursor-pointer shadow-xs gap-1.5 transition-colors"
        >
          <Plus className="size-3.5" />
          <span>Create</span>
        </Button>
      </div>

      {/* Filter Bar Matching Frappe CRM */}
      <div className="border-b border-border/80 px-6 py-2 bg-card/20 flex flex-wrap items-center justify-between gap-3">
        {/* Left Inputs */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-40 sm:w-48">
            <Input
              value={searchTitle}
              onChange={(e) => setSearchTitle(e.target.value)}
              placeholder="Title"
              className="h-7 text-xs bg-muted/30 border-border/60 placeholder:text-muted-foreground focus:bg-background"
            />
          </div>

          <div className="relative w-40 sm:w-48">
            <Input
              value={searchContent}
              onChange={(e) => setSearchContent(e.target.value)}
              placeholder="Content"
              className="h-7 text-xs bg-muted/30 border-border/60 placeholder:text-muted-foreground focus:bg-background"
            />
          </div>
        </div>

        {/* Right Toolbar Actions */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => void refetch()}
            className="size-7 text-muted-foreground hover:text-foreground cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className="size-3.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground border-border/60 cursor-pointer gap-1.5"
          >
            <Filter className="size-3.5" />
            <span>Filter</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground border-border/60 cursor-pointer gap-1.5"
          >
            <ArrowUpDown className="size-3.5" />
            <span>Sort</span>
          </Button>
        </div>
      </div>

      {/* Main Canvas Body */}
      <div className="flex-1 flex flex-col p-6 overflow-y-auto">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        ) : filteredNotes.length === 0 ? (
          /* Empty State Matching Frappe CRM */
          <div className="flex flex-col items-center justify-center text-center py-20 max-w-md mx-auto">
            <div className="size-12 rounded-xl bg-muted flex items-center justify-center text-muted-foreground mb-3">
              <StickyNote className="size-6" />
            </div>
            <h3 className="text-base font-semibold text-foreground">No notes yet</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm leading-relaxed">
              Notes keep what you learned on a call or in a meeting next to the lead or deal it belongs to.
            </p>
            <Button
              size="sm"
              onClick={handleOpenCreate}
              className="mt-4 h-8 text-xs font-medium px-4 rounded-md bg-foreground text-background hover:bg-foreground/90 cursor-pointer shadow-xs gap-1.5 transition-colors"
            >
              <Plus className="size-3.5" />
              <span>Create</span>
            </Button>
          </div>
        ) : (
          /* Notes Card Grid Matching Frappe CRM */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredNotes.map((note) => {
              const author = note.owner || "User";
              const authorInitial = author.charAt(0).toUpperCase();
              return (
                <div
                  key={note.name}
                  onClick={() => handleOpenEdit(note)}
                  className="group relative rounded-xl border border-border bg-card p-4 hover:border-foreground/40 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between min-h-[150px]"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-xs text-foreground line-clamp-1 group-hover:underline">
                        {note.title}
                      </h3>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Delete note "${note.title}"?`)) {
                            void deleteMutation.mutate(note.name);
                          }
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive cursor-pointer p-0.5"
                        title="Delete note"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>

                    {note.content && (
                      <p className="text-xs text-muted-foreground line-clamp-4 leading-relaxed break-words">
                        {note.content}
                      </p>
                    )}
                  </div>

                  {/* Card Footer */}
                  <div className="pt-3 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground mt-3">
                    {/* Linked Record badge */}
                    {note.reference_docname ? (
                      <Badge variant="outline" className="text-[10px] font-mono font-normal truncate max-w-[140px] px-1.5 py-0">
                        {note.reference_doctype ? `${note.reference_doctype}: ` : ""}
                        {note.reference_docname}
                      </Badge>
                    ) : (
                      <span className="text-[10px] opacity-60">Standalone</span>
                    )}

                    {/* Author & Relative Date */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="size-4 rounded-full bg-neutral-200 dark:bg-neutral-700 text-foreground flex items-center justify-center text-[9px] font-semibold">
                        {authorInitial}
                      </div>
                      <span className="text-[11px]">{formatRelativeTime(note.modified || note.creation)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Note Form Modal */}
      <NoteFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        note={editingNote}
        onSuccess={() => void refetch()}
      />
    </div>
  );
}

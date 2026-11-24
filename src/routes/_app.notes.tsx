import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpDown,
  Check,
  Filter,
  Loader2,
  Plus,
  RefreshCw,
  StickyNote,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { notesListOptions, useDeleteNote, type CrmNote } from "@/hooks/use-notes";
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
    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} ${weeks === 1 ? "week" : "weeks"} ago`;
    }
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  } catch {
    return String(dateStr);
  }
}

function stripHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function NotesPage() {
  const [searchTitle, setSearchTitle] = useState("");
  const [searchContent, setSearchContent] = useState("");

  const {
    data: notes = [],
    isLoading,
    refetch,
  } = useQuery(notesListOptions({ search: searchTitle || undefined }));
  const deleteMutation = useDeleteNote();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<CrmNote | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CrmNote | null>(null);
  const [filterMode, setFilterMode] = useState<"all" | "linked" | "standalone">("all");
  const [sortBy, setSortBy] = useState<"modified" | "creation" | "title">("modified");

  function handleOpenCreate() {
    setEditingNote(null);
    setModalOpen(true);
  }

  function handleOpenEdit(note: CrmNote) {
    setEditingNote(note);
    setModalOpen(true);
  }

  // Filter notes by content and linked-record state, then keep the list sorted.
  const visibleNotes = useMemo(() => {
    const contentTerm = searchContent.trim().toLowerCase();
    const filtered = notes.filter((note) => {
      if (
        contentTerm &&
        !(note.content || "").toLowerCase().includes(contentTerm)
      ) {
        return false;
      }
      if (filterMode === "linked") return Boolean(note.reference_docname);
      if (filterMode === "standalone") return !note.reference_docname;
      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === "title") {
        return String(a.title || "").localeCompare(String(b.title || ""));
      }
      const aDate = new Date(String(a[sortBy] || "")).getTime();
      const bDate = new Date(String(b[sortBy] || "")).getTime();
      return (Number.isNaN(bDate) ? 0 : bDate) - (Number.isNaN(aDate) ? 0 : aDate);
    });
  }, [notes, searchContent, filterMode, sortBy]);

  const hasAnyNotes = notes.length > 0;
  const hasActiveFilters = Boolean(searchTitle.trim() || searchContent.trim() || filterMode !== "all");

  return (
    <div className="flex h-full flex-col bg-background overflow-hidden">
      <div className="shrink-0 border-b border-border/70 bg-card/40 px-3 py-3 sm:px-6 sm:py-4 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground">Notes</h1>
              <span className="text-xs font-medium text-muted-foreground tabular-nums">{visibleNotes.length}</span>
            </div>
            <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">Capture context, meetings, and follow-ups.</p>
          </div>
          <Button size="sm" onClick={handleOpenCreate} className="h-9 sm:h-8 px-3 sm:px-3.5 gap-1.5 text-xs font-semibold shrink-0">
            <Plus className="size-3.5" />
            <span>New</span>
          </Button>
        </div>

        <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="grid grid-cols-2 gap-2 flex-1">
            <Input
              value={searchTitle}
              onChange={(e) => setSearchTitle(e.target.value)}
              placeholder="Search title"
              aria-label="Search notes by title"
              className="h-9 sm:h-8 text-sm sm:text-xs bg-background/70 border-border/70"
            />
            <Input
              value={searchContent}
              onChange={(e) => setSearchContent(e.target.value)}
              placeholder="Search content"
              aria-label="Search notes by content"
              className="h-9 sm:h-8 text-sm sm:text-xs bg-background/70 border-border/70"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => void refetch()}
              className="size-9 sm:size-8 text-muted-foreground shrink-0"
              title="Refresh"
              aria-label="Refresh notes"
            >
              <RefreshCw className="size-4 sm:size-3.5" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" aria-label="Filter notes" className="h-9 sm:h-8 px-2.5 text-xs gap-1.5 bg-background/70 border-border/70">
                  <Filter className="size-3.5 text-muted-foreground" />
                  <span className="hidden sm:inline">Filter</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 text-xs">
                <DropdownMenuLabel>Show</DropdownMenuLabel>
                {[
                  { value: "all", label: "All notes" },
                  { value: "linked", label: "Linked records" },
                  { value: "standalone", label: "Standalone" },
                ].map((option) => (
                  <DropdownMenuItem key={option.value} onClick={() => setFilterMode(option.value as typeof filterMode)} className="flex cursor-pointer items-center justify-between">
                    <span>{option.label}</span>
                    {filterMode === option.value && <Check className="size-3.5" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" aria-label="Sort notes" className="h-9 sm:h-8 px-2.5 text-xs gap-1.5 bg-background/70 border-border/70">
                  <ArrowUpDown className="size-3.5 text-muted-foreground" />
                  <span className="hidden sm:inline">Sort</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 text-xs">
                <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                {[
                  { value: "modified", label: "Last updated" },
                  { value: "creation", label: "Newest first" },
                  { value: "title", label: "Title A–Z" },
                ].map((option) => (
                  <DropdownMenuItem key={option.value} onClick={() => setSortBy(option.value as typeof sortBy)} className="flex cursor-pointer items-center justify-between">
                    <span>{option.label}</span>
                    {sortBy === option.value && <Check className="size-3.5" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Main Canvas Body */}
      <div className="flex-1 flex flex-col p-3 sm:p-6 overflow-y-auto">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="size-7 animate-spin text-muted-foreground" />
          </div>
        ) : visibleNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-16 max-w-md mx-auto">
            <div className="size-12 rounded-2xl bg-muted/60 border border-border/60 flex items-center justify-center text-muted-foreground mb-3">
              <StickyNote className="size-5" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">
              {hasAnyNotes ? "No notes match these filters" : "No notes yet"}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm leading-relaxed">
              {hasAnyNotes
                ? "Try a different search term or switch the filter back to all notes."
                : "Capture key context from calls, meetings, and deals."}
            </p>
            {hasAnyNotes && hasActiveFilters ? (
              <Button size="sm" variant="outline" onClick={() => { setSearchTitle(""); setSearchContent(""); setFilterMode("all"); }} className="mt-4 h-9 sm:h-8 text-xs px-4">
                Clear filters
              </Button>
            ) : (
              <Button size="sm" onClick={handleOpenCreate} className="mt-4 h-9 sm:h-8 text-xs font-semibold px-4 gap-1.5">
                <Plus className="size-3.5" />
                <span>Create note</span>
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {visibleNotes.map((note) => {
              const author = note.owner || "User";
              const authorInitial = author.charAt(0).toUpperCase();
              return (
                <div
                  key={note.name}
                  onClick={() => handleOpenEdit(note)}
                  className="group relative rounded-xl border border-border/70 bg-card p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.18)] hover:border-border transition-[transform,box-shadow,border-color] duration-200 cursor-pointer flex flex-col justify-between min-h-[156px]"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-[13px] leading-5 text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                        {note.title}
                      </h3>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(note); }}
                        className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100 transition-opacity text-muted-foreground/80 hover:text-destructive hover:bg-destructive/10 rounded-md p-1.5 -m-1.5"
                        title="Delete note"
                        aria-label={`Delete note ${note.title}`}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                    {note.content && (
                      <p className="text-[11px] text-muted-foreground line-clamp-4 leading-relaxed break-words">
                        {stripHtml(note.content)}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-border/50 flex items-center justify-between gap-2 text-[11px] text-muted-foreground mt-3">
                    {note.reference_docname ? (
                      <Badge variant="outline" className="text-[10px] font-normal truncate max-w-[140px] px-1.5 py-0 bg-muted/30 border-border/60">
                        {note.reference_doctype ? `${note.reference_doctype}: ` : ""}
                        {note.reference_docname}
                      </Badge>
                    ) : (
                      <span className="text-[10px] text-muted-foreground/70">Standalone</span>
                    )}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="size-5 rounded-full bg-muted text-foreground/80 flex items-center justify-center text-[9px] font-semibold">
                        {authorInitial}
                      </div>
                      <span className="text-[11px] tabular-nums">{formatRelativeTime(note.modified || note.creation)}</span>
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

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !deleteMutation.isPending) setDeleteTarget(null);
        }}
        title={`Delete note "${deleteTarget?.title || "Untitled"}"?`}
        description="This note will be permanently removed. This action cannot be undone."
        pending={deleteMutation.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          const name = deleteTarget.name;
          void deleteMutation.mutateAsync(name).finally(() => setDeleteTarget(null));
        }}
      />
    </div>
  );
}

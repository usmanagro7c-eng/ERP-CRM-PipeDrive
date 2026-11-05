import { createFileRoute } from "@tanstack/react-router";
import { StickyNote, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/notes")({
  head: () => ({ meta: [{ title: "Notes · AgroCRM" }] }),
  component: NotesPage,
});

function NotesPage() {
  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Notes</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Internal team documentation, meeting summaries, and customer notes.
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-12 text-center bg-card/40 my-8">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
          <StickyNote className="size-6" />
        </div>
        <h3 className="text-sm font-semibold">No standalone notes yet</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm">
          Notes can also be attached directly to Leads, Deals, and Organizations from their detail views.
        </p>
      </div>
    </div>
  );
}

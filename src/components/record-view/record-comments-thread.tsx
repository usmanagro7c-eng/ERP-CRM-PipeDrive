import { useState } from "react";
import { MessageSquare, Plus, Send, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  commentsListOptions,
  useAddComment,
  useDeleteComment,
} from "@/hooks/use-comments";

interface RecordCommentsThreadProps {
  referenceDoctype: string;
  referenceName: string;
  defaultOpenEditor?: boolean;
}

export function RecordCommentsThread({
  referenceDoctype,
  referenceName,
  defaultOpenEditor = false,
}: RecordCommentsThreadProps) {
  const { data: comments = [], isLoading } = useQuery(
    commentsListOptions(referenceDoctype, referenceName),
  );
  const addMutation = useAddComment(referenceDoctype, referenceName);
  const deleteMutation = useDeleteComment(referenceDoctype, referenceName);

  const [showEditor, setShowEditor] = useState(defaultOpenEditor);
  const [commentText, setCommentText] = useState("");

  async function handleAdd() {
    if (!commentText.trim()) return;
    try {
      await addMutation.mutateAsync(commentText.trim());
      setCommentText("");
      setShowEditor(false);
    } catch {
      // handled by hook
    }
  }

  function formatTime(creation?: string) {
    if (!creation) return "Just now";
    try {
      const date = new Date(creation);
      return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return creation;
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Comments ({comments.length})</h3>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowEditor(true)}
          className="h-7 text-xs gap-1"
        >
          <Plus className="size-3" />
          <span>New Comment</span>
        </Button>
      </div>

      {showEditor && (
        <div className="space-y-2 rounded-lg border bg-card p-3 shadow-2xs">
          <Textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Write a comment, note, or @mention a teammate..."
            className="min-h-[80px] text-xs resize-none border-none focus-visible:ring-0 p-0 shadow-none"
            autoFocus
          />
          <div className="flex items-center justify-between pt-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowEditor(false)}
              className="h-7 text-xs text-muted-foreground"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={!commentText.trim() || addMutation.isPending}
              className="h-7 text-xs gap-1"
            >
              <Send className="size-3" />
              <span>{addMutation.isPending ? "Posting..." : "Submit"}</span>
            </Button>
          </div>
        </div>
      )}

      {comments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
          <MessageSquare className="size-10 stroke-[1.25] text-muted-foreground/40 mb-2" />
          <p className="text-sm font-medium text-foreground/80">No Comments Found</p>
          <p className="text-xs text-muted-foreground mt-0.5">Be the first to add one.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map((c) => {
            const author = c.comment_by || c.comment_email || "Teammate";
            return (
              <div
                key={c.name}
                className="group flex gap-2.5 rounded-lg border bg-card p-3 text-xs"
              >
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                  {author.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">{author}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">
                        {formatTime(c.creation)}
                      </span>
                      <button
                        onClick={() => deleteMutation.mutate(c.name)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive cursor-pointer"
                        title="Delete comment"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  </div>
                  <div
                    className="mt-1 text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: c.content }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

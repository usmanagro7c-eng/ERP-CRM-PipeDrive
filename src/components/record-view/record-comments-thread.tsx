import { useState, useEffect, useRef } from "react";
import { MessageSquare, Plus, Send, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { commentsListOptions, useAddComment, useDeleteComment } from "@/hooks/use-comments";

interface RecordCommentsThreadProps {
  referenceDoctype: string;
  referenceName: string;
  defaultOpenEditor?: boolean;
  isOpenEditor?: boolean;
  onOpenEditorChange?: (open: boolean) => void;
}

export function RecordCommentsThread({
  referenceDoctype,
  referenceName,
  defaultOpenEditor = false,
  isOpenEditor,
  onOpenEditorChange,
}: RecordCommentsThreadProps) {
  const { data: comments = [], isLoading } = useQuery(
    commentsListOptions(referenceDoctype, referenceName),
  );
  const addMutation = useAddComment(referenceDoctype, referenceName);
  const deleteMutation = useDeleteComment(referenceDoctype, referenceName);

  const [internalEditor, setInternalEditor] = useState(defaultOpenEditor);
  const showEditor = isOpenEditor !== undefined ? isOpenEditor : internalEditor;
  const setShowEditor = (val: boolean) => {
    if (onOpenEditorChange) {
      onOpenEditorChange(val);
    } else {
      setInternalEditor(val);
    }
  };

  const [commentText, setCommentText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (showEditor) {
      textareaRef.current?.focus();
    }
  }, [showEditor]);

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
    <div className="flex flex-col h-full min-h-[460px]">
      {/* Top Header Row matching Frappe CRM: Title on left, + New Comment on right */}
      <div className="flex items-center justify-between pb-5">
        <h2 className="text-base font-semibold text-foreground">Comments</h2>
        <Button
          size="sm"
          onClick={() => setShowEditor(true)}
          className="h-7 text-xs font-medium gap-1 bg-white text-black hover:bg-neutral-200 dark:bg-neutral-100 dark:text-neutral-900 rounded-md cursor-pointer shadow-xs"
        >
          <Plus className="size-3" />
          <span>New Comment</span>
        </Button>
      </div>

      {/* Editor Box */}
      {showEditor && (
        <div className="rounded-lg border bg-card p-3 shadow-xs space-y-2 mb-6">
          <Textarea
            ref={textareaRef}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Write a comment..."
            className="min-h-[85px] text-xs resize-none bg-transparent border-0 focus-visible:ring-0 p-1 shadow-none"
          />
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowEditor(false);
                setCommentText("");
              }}
              className="h-7 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={!commentText.trim() || addMutation.isPending}
              className="h-7 text-xs gap-1.5 cursor-pointer"
            >
              <Send className="size-3" />
              <span>{addMutation.isPending ? "Posting..." : "Comment"}</span>
            </Button>
          </div>
        </div>
      )}

      {/* Empty State vs Comments Feed */}
      {comments.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-24 select-none">
          <div className="flex items-center justify-center size-14 rounded-full mb-2">
            <MessageSquare className="size-10 stroke-[1.2] text-muted-foreground/45" />
          </div>
          <p className="text-sm font-medium text-foreground">No Comments Found</p>
          <p className="text-xs text-muted-foreground mt-1">Be the first to add one.</p>
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

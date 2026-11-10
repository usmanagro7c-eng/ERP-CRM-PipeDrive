import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  Clock,
  Loader2,
  Mail,
  Plus,
  RefreshCw,
  Send,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  emailsListOptions,
  useSendEmail,
  useDeleteEmail,
  type RecordEmail,
} from "@/hooks/use-emails";
import { cn } from "@/lib/utils";

interface RecordEmailsTabProps {
  referenceDoctype: string;
  referenceName: string;
  defaultRecipientEmail?: string;
}

function formatEmailDate(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr.replace(" ", "T"));
    if (isNaN(d.getTime())) return dateStr;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  } catch {
    return dateStr;
  }
}

export function RecordEmailsTab({
  referenceDoctype,
  referenceName,
  defaultRecipientEmail,
}: RecordEmailsTabProps) {
  const {
    data: emails = [],
    isLoading,
    isFetching,
    refetch,
  } = useQuery(emailsListOptions(referenceDoctype, referenceName));

  const sendMutation = useSendEmail(referenceDoctype, referenceName);
  const deleteMutation = useDeleteEmail(referenceDoctype, referenceName);

  const [showComposer, setShowComposer] = useState(false);
  const [recipient, setRecipient] = useState(defaultRecipientEmail || "");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  async function handleSend() {
    if (!recipient.trim() || !subject.trim() || !body.trim()) {
      toast.error("Please fill in recipient, subject, and email body");
      return;
    }

    try {
      await sendMutation.mutateAsync({
        recipients: recipient.trim(),
        subject: subject.trim(),
        content: body.trim(),
      });
      setSubject("");
      setBody("");
      setShowComposer(false);
    } catch {
      // toast shown by hook
    }
  }

  return (
    <div className="flex flex-col h-full min-h-[460px] max-w-4xl px-1 sm:px-4">
      {/* Emails Header matching Frappe CRM */}
      <div className="flex shrink-0 items-center justify-between pb-4 pt-2">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-semibold text-foreground">Emails</h2>
          {emails.length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
              {emails.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void refetch()}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            title="Refresh emails"
          >
            <RefreshCw className={cn("size-3.5", isFetching && "animate-spin")} />
          </Button>
          <Button
            size="sm"
            onClick={() => {
              if (!recipient && defaultRecipientEmail) {
                setRecipient(defaultRecipientEmail);
              }
              setShowComposer((p) => !p);
            }}
            className="h-7 text-xs font-medium px-2.5 rounded-md gap-1 bg-white text-black hover:bg-neutral-200 dark:bg-white dark:text-black cursor-pointer shadow-xs"
          >
            <Plus className="size-3.5" />
            <span>New Email</span>
          </Button>
        </div>
      </div>

      {showComposer && (
        <div className="rounded-lg border bg-card p-4 space-y-3 shadow-xs mb-5 animate-in fade-in-50 duration-150">
          <div className="flex items-center justify-between pb-1 border-b border-border/50">
            <span className="text-xs font-semibold text-foreground">Compose Email</span>
            <button
              onClick={() => setShowComposer(false)}
              className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              ✕
            </button>
          </div>
          <div>
            <label className="text-[11px] font-medium text-muted-foreground">To *</label>
            <Input
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="recipient@example.com"
              className="text-xs h-8 mt-1 bg-secondary/30"
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-muted-foreground">Subject *</label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Follow-up regarding Quotation"
              className="text-xs h-8 mt-1 bg-secondary/30"
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-muted-foreground">Message *</label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your email message..."
              rows={5}
              className="text-xs mt-1 bg-secondary/30 resize-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowComposer(false)}
              className="h-7 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSend}
              disabled={sendMutation.isPending}
              className="h-7 text-xs gap-1.5 cursor-pointer bg-white text-black hover:bg-neutral-200 dark:bg-white dark:text-black font-semibold"
            >
              {sendMutation.isPending ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Send className="size-3" />
              )}
              <span>{sendMutation.isPending ? "Sending..." : "Send Email"}</span>
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : emails.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-24 select-none">
          <div className="flex items-center justify-center size-14 rounded-full bg-muted/40 mb-3">
            <Mail className="size-8 stroke-[1.2] text-muted-foreground/60" />
          </div>
          <p className="text-sm font-semibold text-foreground">No Emails Found</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            No emails have been sent or received for this record yet. Click &quot;New Email&quot; above to compose your first message.
          </p>
          <Button
            size="sm"
            onClick={() => {
              if (!recipient && defaultRecipientEmail) {
                setRecipient(defaultRecipientEmail);
              }
              setShowComposer(true);
            }}
            className="mt-4 h-7 text-xs gap-1.5 bg-white text-black hover:bg-neutral-200 dark:bg-white dark:text-black font-medium cursor-pointer"
          >
            <Plus className="size-3" />
            <span>Send Email</span>
          </Button>
        </div>
      ) : (
        <div className="space-y-3 pb-8">
          {emails.map((email: RecordEmail) => {
            const senderInitial = (
              email.sender_full_name ||
              email.sender ||
              "U"
            ).charAt(0).toUpperCase();

            const isSent = email.delivery_status === "Sent";

            return (
              <div
                key={email.name}
                className="group rounded-lg border border-border bg-card/60 p-4 text-xs shadow-2xs space-y-2.5 hover:border-border/80 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="size-7 rounded-full bg-neutral-800 text-neutral-200 flex items-center justify-center font-bold text-xs shrink-0">
                      {senderInitial}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-foreground truncate">
                          {email.sender_full_name || email.sender}
                        </span>
                        <span className="text-muted-foreground text-[11px]">
                          to <span className="font-medium text-foreground">{email.recipients}</span>
                        </span>
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate">
                        {email.sender}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isSent ? (
                      <Badge
                        variant="outline"
                        className="h-5 px-1.5 text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 gap-1 font-normal"
                      >
                        <CheckCircle2 className="size-2.5" />
                        <span>Sent</span>
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="h-5 px-1.5 text-[10px] bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20 gap-1 font-normal"
                      >
                        <Clock className="size-2.5" />
                        <span>{email.delivery_status || "Delivered"}</span>
                      </Badge>
                    )}
                    <span className="text-[11px] text-muted-foreground">
                      {formatEmailDate(email.communication_date || email.creation)}
                    </span>
                    <button
                      onClick={() => {
                        if (confirm("Delete this email log?")) {
                          deleteMutation.mutate(email.name);
                        }
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive cursor-pointer p-0.5 rounded"
                      title="Delete email"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                </div>

                <div className="font-medium text-foreground text-xs pt-0.5">
                  {email.subject}
                </div>

                <div
                  className="text-xs text-muted-foreground leading-relaxed prose prose-sm dark:prose-invert max-w-none break-words [&>p]:mb-1 [&>p:last-child]:mb-0"
                  dangerouslySetInnerHTML={{ __html: email.content }}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import { Mail, Plus, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import * as api from "@/lib/api";

interface RecordEmailsTabProps {
  referenceDoctype: string;
  referenceName: string;
  defaultRecipientEmail?: string;
}

export function RecordEmailsTab({
  referenceDoctype,
  referenceName,
  defaultRecipientEmail,
}: RecordEmailsTabProps) {
  const [showComposer, setShowComposer] = useState(false);
  const [recipient, setRecipient] = useState(defaultRecipientEmail || "");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  // Local state for sent emails in session
  const [sentEmails, setSentEmails] = useState<
    Array<{ id: string; to: string; subject: string; body: string; time: string }>
  >([]);

  async function handleSend() {
    if (!recipient.trim() || !subject.trim() || !body.trim()) {
      toast.error("Please fill in recipient, subject, and email body");
      return;
    }
    setSending(true);
    try {
      await api.sendEmail({
        recipients: recipient.trim(),
        subject: subject.trim(),
        content: body.trim(),
        doctype: referenceDoctype,
        docname: referenceName,
      });
      setSentEmails((prev) => [
        {
          id: String(Date.now()),
          to: recipient.trim(),
          subject: subject.trim(),
          body: body.trim(),
          time: "Just now",
        },
        ...prev,
      ]);
      setSubject("");
      setBody("");
      setShowComposer(false);
      toast.success("Email sent successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send email");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col h-full min-h-[460px] max-w-4xl px-1 sm:px-4">
      {/* Emails Header matching Frappe CRM */}
      <div className="flex shrink-0 items-center justify-between pb-4 pt-2">
        <h2 className="text-2xl font-semibold text-foreground">Emails</h2>
        <Button
          size="sm"
          onClick={() => setShowComposer(true)}
          className="h-7 text-xs font-medium px-2.5 rounded-md gap-1 bg-white text-black hover:bg-neutral-200 dark:bg-white dark:text-black cursor-pointer shadow-xs"
        >
          <Plus className="size-3.5" />
          <span>New Email</span>
        </Button>
      </div>

      {showComposer && (
        <div className="rounded-lg border bg-card p-3.5 space-y-2.5 shadow-xs mb-5">
          <div>
            <label className="text-[11px] text-muted-foreground">To</label>
            <Input
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="recipient@example.com"
              className="text-xs h-7 mt-0.5 bg-secondary/30"
            />
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground">Subject</label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Follow-up regarding Quotation #1002"
              className="text-xs h-7 mt-0.5 bg-secondary/30"
            />
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground">Message</label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your email message..."
              rows={5}
              className="text-xs mt-0.5 bg-secondary/30 resize-none"
            />
          </div>
          <div className="flex justify-end gap-1.5 pt-1">
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
              disabled={sending}
              className="h-7 text-xs gap-1 cursor-pointer"
            >
              <Send className="size-3" />
              <span>{sending ? "Sending..." : "Send Email"}</span>
            </Button>
          </div>
        </div>
      )}

      {sentEmails.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-24 select-none">
          <div className="flex items-center justify-center size-14 rounded-full mb-2">
            <Mail className="size-10 stroke-[1.2] text-muted-foreground/45" />
          </div>
          <p className="text-sm font-medium text-foreground">No Emails Found</p>
          <p className="text-xs text-muted-foreground mt-1">
            No emails found in your inbox. New messages will appear here soon.
          </p>
        </div>
      ) : (
        <div className="space-y-3 pb-8">
          {sentEmails.map((e) => (
            <div key={e.id} className="rounded-lg border bg-card p-3.5 text-xs shadow-2xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">{e.subject}</span>
                <span className="text-[10px] text-muted-foreground">{e.time}</span>
              </div>
              <div className="text-[11px] text-muted-foreground">To: {e.to}</div>
              <p className="text-xs text-foreground/90 whitespace-pre-wrap">{e.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

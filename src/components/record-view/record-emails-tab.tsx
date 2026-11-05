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
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Emails ({sentEmails.length})</h3>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowComposer(true)}
          className="h-7 text-xs gap-1"
        >
          <Plus className="size-3" />
          <span>Compose Email</span>
        </Button>
      </div>

      {showComposer && (
        <div className="rounded-lg border bg-card p-3 space-y-2.5 shadow-2xs">
          <div>
            <label className="text-[11px] text-muted-foreground">To</label>
            <Input
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="recipient@example.com"
              className="text-xs h-7 mt-0.5"
            />
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground">Subject</label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Follow-up regarding Quotation #1002"
              className="text-xs h-7 mt-0.5"
            />
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground">Message</label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Type your email message..."
              className="text-xs min-h-[100px] mt-0.5 resize-none"
            />
          </div>
          <div className="flex justify-end gap-1.5 pt-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowComposer(false)}
              className="h-7 text-xs text-muted-foreground"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSend}
              disabled={sending}
              className="h-7 text-xs gap-1"
            >
              <Send className="size-3" />
              <span>{sending ? "Sending..." : "Send Email"}</span>
            </Button>
          </div>
        </div>
      )}

      {sentEmails.length === 0 ? (
        <div className="py-12 text-center text-xs text-muted-foreground">
          <Mail className="size-8 mx-auto opacity-30 mb-2" />
          <p className="font-medium text-foreground/80">No Emails Sent</p>
          <p className="text-[11px] opacity-75 mt-0.5">
            Click &ldquo;Compose Email&rdquo; to send a message directly to this contact.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sentEmails.map((email) => (
            <div
              key={email.id}
              className="rounded-lg border bg-card p-3.5 space-y-2 text-xs shadow-2xs"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="size-3.5 text-primary" />
                  <span className="font-semibold text-foreground">{email.subject}</span>
                </div>
                <span className="text-[10px] text-muted-foreground">{email.time}</span>
              </div>
              <p className="text-[11px] text-muted-foreground">To: {email.to}</p>
              <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {email.body}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

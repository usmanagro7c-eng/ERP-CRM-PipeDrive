import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronDown,
  Copy,
  ExternalLink,
  FileText,
  List,
  Loader2,
  Mail,
  MessageSquare,
  Paperclip,
  Phone,
  Sparkles,
  Trash2,
  UserPlus,
  Activity,
  CheckCircle2,
  PhoneCall,
  StickyNote,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  contactDetailOptions,
  useSaveContact,
  useDeleteContact,
} from "@/hooks/use-contacts";
import { RecordCommentsThread } from "@/components/record-view/record-comments-thread";
import { RecordAttachmentsTab } from "@/components/record-view/record-attachments-tab";
import { RecordTasksTab } from "@/components/record-view/record-tasks-tab";
import { RecordNotesTab } from "@/components/record-view/record-notes-tab";
import { RecordCallsTab } from "@/components/record-view/record-calls-tab";
import { RecordEmailsTab } from "@/components/record-view/record-emails-tab";
import { RecordActivityFeed } from "@/components/record-view/record-activity-feed";
import { RecordDataTab } from "@/components/record-view/record-data-tab";
import * as api from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/contacts_/$contactId")({
  head: () => ({ meta: [{ title: "Contact Detail · AgroCRM" }] }),
  component: ContactDetailPage,
});

type TabKey =
  | "activity"
  | "emails"
  | "comments"
  | "data"
  | "calls"
  | "tasks"
  | "notes"
  | "attachments";

function ContactDetailPage() {
  const { contactId } = Route.useParams();
  const navigate = useNavigate();

  const { data: contact, isLoading } = useQuery(contactDetailOptions(contactId));
  const saveMutation = useSaveContact();
  const deleteMutation = useDeleteContact();

  const [activeTab, setActiveTab] = useState<TabKey>("comments");
  const [detailsOpen, setDetailsOpen] = useState(true);

  const contactName = useMemo(() => {
    if (!contact) return contactId;
    return (
      String(contact["full_name"] || "") ||
      `${String(contact["first_name"] || "")} ${String(contact["last_name"] || "")}`.trim() ||
      contactId
    );
  }, [contact, contactId]);

  const email = String(contact?.["email_id"] || contact?.["email"] || "");
  const phone = String(contact?.["mobile_no"] || contact?.["phone"] || "");
  const organization = String(
    contact?.["company_name"] || contact?.["organization"] || "",
  );
  const designation = String(contact?.["designation"] || contact?.["job_title"] || "");

  async function handleDelete() {
    if (!confirm(`Are you sure you want to delete contact ${contactName}?`)) return;
    try {
      await deleteMutation.mutateAsync(contactId);
      toast.success("Contact deleted");
      void navigate({ to: "/contacts" });
    } catch {
      // handled
    }
  }

  function handleCopyLink() {
    void navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied to clipboard");
  }

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-base font-semibold">Contact not found</h2>
        <Button asChild size="sm" variant="outline" className="mt-4">
          <Link to="/contacts">Back to Contacts</Link>
        </Button>
      </div>
    );
  }

  const tabs: Array<{ key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { key: "activity", label: "Activity", icon: Activity },
    { key: "emails", label: "Emails", icon: Mail },
    { key: "comments", label: "Comments", icon: MessageSquare },
    { key: "data", label: "Data", icon: FileText },
    { key: "calls", label: "Calls", icon: PhoneCall },
    { key: "tasks", label: "Tasks", icon: CheckCircle2 },
    { key: "notes", label: "Notes", icon: StickyNote },
    { key: "attachments", label: "Attachments", icon: Paperclip },
  ];

  return (
    <div className="flex flex-col min-h-[calc(100vh-60px)] bg-background">
      {/* Top Header / Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b px-4 py-2.5 bg-card/60 backdrop-blur-xs">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
          <Link to="/contacts" className="hover:text-foreground transition-colors font-medium">
            Contacts
          </Link>
          <span>/</span>
          <Link to="/contacts" className="flex items-center gap-1 hover:text-foreground transition-colors">
            <List className="size-3.5" />
            <span>List</span>
          </Link>
          <span>/</span>
          <span className="font-semibold text-foreground truncate max-w-[200px]">
            {contactName}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {email && (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1.5 bg-secondary/50"
            >
              <a href={`mailto:${email}`}>
                <Mail className="size-3" />
                <span>Send Email</span>
              </a>
            </Button>
          )}
          {phone && (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1.5 bg-secondary/50"
            >
              <a href={`tel:${phone}`}>
                <Phone className="size-3" />
                <span>Call</span>
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Main 2-Column Content Layout */}
      <div className="flex flex-col lg:flex-row flex-1 min-h-0">
        {/* Left / Center Tab Canvas */}
        <div className="flex-1 flex flex-col min-w-0 border-b lg:border-b-0 lg:border-r border-border justify-between">
          <div>
            {/* Horizontal Tabs */}
            <div className="flex items-center gap-1 border-b px-4 overflow-x-auto scrollbar-none bg-card/30">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 -mb-px transition-colors cursor-pointer shrink-0",
                      isActive
                        ? "border-primary text-foreground font-semibold"
                        : "border-transparent text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon className="size-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab Body */}
            <div className="p-4 sm:p-6 overflow-y-auto">
              {activeTab === "comments" && (
                <RecordCommentsThread
                  referenceDoctype={api.CONTACT_DOCTYPE}
                  referenceName={contactId}
                />
              )}

              {activeTab === "activity" && (
                <RecordActivityFeed
                  referenceDoctype={api.CONTACT_DOCTYPE}
                  referenceName={contactId}
                  creation={String(contact["creation"] || "")}
                />
              )}

              {activeTab === "emails" && (
                <RecordEmailsTab
                  referenceDoctype={api.CONTACT_DOCTYPE}
                  referenceName={contactId}
                  defaultRecipientEmail={email}
                />
              )}

              {activeTab === "tasks" && (
                <RecordTasksTab
                  referenceDoctype={api.CONTACT_DOCTYPE}
                  referenceName={contactId}
                />
              )}

              {activeTab === "notes" && (
                <RecordNotesTab
                  referenceDoctype={api.CONTACT_DOCTYPE}
                  referenceName={contactId}
                />
              )}

              {activeTab === "calls" && (
                <RecordCallsTab
                  referenceDoctype={api.CONTACT_DOCTYPE}
                  referenceName={contactId}
                  phoneNumber={phone}
                />
              )}

              {activeTab === "attachments" && (
                <RecordAttachmentsTab
                  referenceDoctype={api.CONTACT_DOCTYPE}
                  referenceName={contactId}
                />
              )}

              {activeTab === "data" && (
                <RecordDataTab data={contact} />
              )}
            </div>
          </div>

          {/* Bottom Bar: Reply & Comment Actions */}
          <div className="border-t px-4 py-2.5 bg-card/40 flex items-center gap-3">
            <button
              onClick={() => setActiveTab("emails")}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <Mail className="size-3.5" />
              <span>Reply</span>
            </button>
            <button
              onClick={() => setActiveTab("comments")}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <MessageSquare className="size-3.5" />
              <span>Comment</span>
            </button>
          </div>
        </div>

        {/* Right Sidebar (Record Attributes & Details Panel) */}
        <div className="w-full lg:w-80 shrink-0 bg-card/40 p-4 sm:p-5 flex flex-col gap-4 overflow-y-auto">
          {/* Top Identifier & Avatar */}
          <div>
            <div className="text-[11px] font-mono font-medium text-muted-foreground">{contactId}</div>
            <div className="flex items-center gap-3 mt-2">
              <div className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-base shadow-xs shrink-0">
                {contactName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-sm text-foreground truncate">{contactName}</h2>
                {organization && (
                  <p className="text-xs text-muted-foreground truncate">{organization}</p>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-1.5 mt-3 pt-3 border-t">
              {email && (
                <Button
                  asChild
                  variant="outline"
                  size="icon"
                  className="size-7 rounded-sm text-muted-foreground hover:text-foreground bg-secondary/30"
                  title="Send Email"
                >
                  <a href={`mailto:${email}`}>
                    <Mail className="size-3.5" />
                  </a>
                </Button>
              )}
              {phone && (
                <Button
                  asChild
                  variant="outline"
                  size="icon"
                  className="size-7 rounded-sm text-muted-foreground hover:text-foreground bg-secondary/30"
                  title="Call Contact"
                >
                  <a href={`tel:${phone}`}>
                    <Phone className="size-3.5" />
                  </a>
                </Button>
              )}
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyLink}
                className="size-7 rounded-sm text-muted-foreground hover:text-foreground bg-secondary/30"
                title="Copy Link"
              >
                <Copy className="size-3.5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleDelete}
                className="size-7 rounded-sm text-destructive hover:bg-destructive/10 bg-secondary/30"
                title="Delete Contact"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>

          {/* Collapsible Details */}
          <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen} className="space-y-2 border-t pt-3">
            <CollapsibleTrigger className="flex items-center justify-between w-full text-xs font-semibold text-foreground cursor-pointer">
              <span className="flex items-center gap-1.5">
                <ChevronDown className={cn("size-3.5 transition-transform", !detailsOpen && "-rotate-90")} />
                <span>Details</span>
              </span>
              <ExternalLink className="size-3 text-muted-foreground" />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-1 text-xs">
              <div className="flex justify-between items-center py-0.5">
                <span className="text-muted-foreground">Organization</span>
                <span className="font-medium text-foreground truncate max-w-[150px]">{organization || "—"}</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-muted-foreground">Designation</span>
                <span className="text-foreground truncate max-w-[150px]">{designation || "—"}</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-muted-foreground">Email</span>
                <span className="text-foreground truncate max-w-[150px]">{email || "—"}</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-muted-foreground">Mobile No.</span>
                <span className="text-foreground">{phone || "—"}</span>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>
    </div>
  );
}

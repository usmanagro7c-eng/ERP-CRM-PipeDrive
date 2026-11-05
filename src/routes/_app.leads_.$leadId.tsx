import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  CheckCircle2,
  ChevronDown,
  Copy,
  ExternalLink,
  FileText,
  Globe,
  List,
  Loader2,
  Mail,
  MessageSquare,
  Paperclip,
  Phone,
  PhoneCall,
  Sparkles,
  StickyNote,
  Trash2,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ConvertLeadModal } from "@/components/leads/convert-lead-modal";
import {
  leadDetailOptions,
  leadStatusesOptions,
  useSaveLead,
  useDeleteLead,
} from "@/hooks/use-leads";
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

export const Route = createFileRoute("/_app/leads_/$leadId")({
  head: () => ({ meta: [{ title: "Lead Detail · AgroCRM" }] }),
  component: LeadDetailPage,
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

function LeadDetailPage() {
  const { leadId } = Route.useParams();
  const navigate = useNavigate();

  const { data: lead, isLoading } = useQuery(leadDetailOptions(leadId));
  const { data: statuses = [] } = useQuery(leadStatusesOptions());
  const saveMutation = useSaveLead();
  const deleteMutation = useDeleteLead();

  const [activeTab, setActiveTab] = useState<TabKey>("comments");
  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [personOpen, setPersonOpen] = useState(true);

  const leadName = useMemo(() => {
    if (!lead) return leadId;
    return (
      String(lead["lead_name"] || "") ||
      String(lead["organization_name"] || "") ||
      String(lead["organization"] || "") ||
      leadId
    );
  }, [lead, leadId]);

  const currentStatus = String(lead?.["status"] || "Open");

  async function handleStatusChange(newStatus: string) {
    if (!lead) return;
    try {
      await saveMutation.mutateAsync({
        name: leadId,
        values: { status: newStatus },
      });
      toast.success(`Status updated to ${newStatus}`);
    } catch {
      // toast shown by hook
    }
  }

  async function handleDelete() {
    if (!confirm(`Are you sure you want to delete lead ${leadName}?`)) return;
    try {
      await deleteMutation.mutateAsync(leadId);
      toast.success("Lead deleted successfully");
      void navigate({ to: "/leads" });
    } catch {
      // toast shown by hook
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

  if (!lead) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-base font-semibold">Lead not found</h2>
        <Button asChild size="sm" variant="outline" className="mt-4">
          <Link to="/leads">Back to Leads</Link>
        </Button>
      </div>
    );
  }

  const email = String(lead["email"] || "");
  const phone = String(lead["mobile_no"] || lead["phone"] || "");
  const organization = String(lead["organization_name"] || lead["organization"] || "");
  const website = String(lead["website"] || "");
  const jobTitle = String(lead["job_title"] || "");
  const industry = String(lead["industry"] || "");
  const territory = String(lead["territory"] || "");
  const employees = String(lead["no_of_employees"] || "");
  const salutation = String(lead["salutation"] || "");
  const firstName = String(lead["first_name"] || leadName.split(" ")[0] || "");
  const lastName = String(lead["last_name"] || leadName.split(" ").slice(1).join(" ") || "");

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
      {/* Top Header / Breadcrumbs & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b px-4 py-2.5 bg-card/60 backdrop-blur-xs">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
          <Link to="/leads" className="hover:text-foreground transition-colors font-medium">
            Leads
          </Link>
          <span>/</span>
          <Link to="/leads" className="flex items-center gap-1 hover:text-foreground transition-colors">
            <List className="size-3.5" />
            <span>List</span>
          </Link>
          <span>/</span>
          <span className="font-semibold text-foreground truncate max-w-[200px]">
            {leadName}
          </span>
        </div>

        {/* Top Right Actions Matching Frappe CRM */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.info("Enrich feature: Lead intelligence validated")}
            className="h-7 text-xs gap-1.5 bg-secondary/50 text-muted-foreground hover:text-foreground"
          >
            <Sparkles className="size-3 text-amber-500" />
            <span>Enrich</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.info("Assign To feature opened")}
            className="h-7 text-xs gap-1.5 bg-secondary/50 text-muted-foreground hover:text-foreground"
          >
            <UserPlus className="size-3" />
            <span>Assign To</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1 bg-secondary/50 text-muted-foreground hover:text-foreground"
              >
                <span>New</span>
                <ChevronDown className="size-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="text-xs">
              <DropdownMenuItem onClick={() => setActiveTab("tasks")}>
                Task
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveTab("calls")}>
                Call Log
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveTab("notes")}>
                Note
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveTab("emails")}>
                Email
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            size="sm"
            onClick={() => setConvertModalOpen(true)}
            className="h-7 gap-1.5 text-xs font-semibold shadow-xs"
          >
            <Sparkles className="size-3" />
            <span>Convert to Deal</span>
          </Button>
        </div>
      </div>

      {/* Main 2-Column Content Layout (Feed Tabs + Right Side-Panel) */}
      <div className="flex flex-col lg:flex-row flex-1 min-h-0">
        {/* Left / Center Tab Canvas */}
        <div className="flex-1 flex flex-col min-w-0 border-b lg:border-b-0 lg:border-r border-border justify-between">
          <div>
            {/* Horizontal Tabs List */}
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

            {/* Tab Content Panel */}
            <div className="p-4 sm:p-6 overflow-y-auto">
              {activeTab === "comments" && (
                <RecordCommentsThread
                  referenceDoctype={api.LEAD_DOCTYPE}
                  referenceName={leadId}
                />
              )}

              {activeTab === "activity" && (
                <RecordActivityFeed
                  referenceDoctype={api.LEAD_DOCTYPE}
                  referenceName={leadId}
                  owner={String(lead["owner"] || "system")}
                  status={currentStatus}
                  creation={String(lead["creation"] || "")}
                />
              )}

              {activeTab === "emails" && (
                <RecordEmailsTab
                  referenceDoctype={api.LEAD_DOCTYPE}
                  referenceName={leadId}
                  defaultRecipientEmail={email}
                />
              )}

              {activeTab === "tasks" && (
                <RecordTasksTab
                  referenceDoctype={api.LEAD_DOCTYPE}
                  referenceName={leadId}
                />
              )}

              {activeTab === "notes" && (
                <RecordNotesTab
                  referenceDoctype={api.LEAD_DOCTYPE}
                  referenceName={leadId}
                />
              )}

              {activeTab === "calls" && (
                <RecordCallsTab
                  referenceDoctype={api.LEAD_DOCTYPE}
                  referenceName={leadId}
                  phoneNumber={phone}
                />
              )}

              {activeTab === "attachments" && (
                <RecordAttachmentsTab
                  referenceDoctype={api.LEAD_DOCTYPE}
                  referenceName={leadId}
                />
              )}

              {activeTab === "data" && (
                <RecordDataTab data={lead} />
              )}
            </div>
          </div>

          {/* Bottom Bar: Reply & Comment Actions (matching Frappe CRM bottom strip) */}
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
            <div className="text-[11px] font-mono font-medium text-muted-foreground">{leadId}</div>
            <div className="flex items-center gap-3 mt-2">
              <div className="flex size-11 items-center justify-center rounded-full bg-muted text-foreground font-bold text-base shadow-xs shrink-0">
                {leadName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-sm text-foreground truncate">{leadName}</h2>
                {organization && (
                  <p className="text-xs text-muted-foreground truncate">{organization}</p>
                )}
              </div>
            </div>

            {/* Quick Action Icons Matching Screenshot: Mail, Copy Link, Attachment, Delete */}
            <div className="flex items-center gap-1.5 mt-3 pt-3 border-t">
              {email ? (
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
              ) : (
                <Button
                  variant="outline"
                  size="icon"
                  disabled
                  className="size-7 rounded-sm opacity-40 bg-secondary/30"
                >
                  <Mail className="size-3.5" />
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
                onClick={() => setActiveTab("attachments")}
                className="size-7 rounded-sm text-muted-foreground hover:text-foreground bg-secondary/30"
                title="View Attachments"
              >
                <Paperclip className="size-3.5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleDelete}
                className="size-7 rounded-sm text-destructive hover:bg-destructive/10 bg-secondary/30"
                title="Delete Lead"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>

          {/* First Response & Status */}
          <div className="space-y-2 border-t pt-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">First Response</span>
              <span className="text-muted-foreground">—</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Status</span>
              <Select value={currentStatus} onValueChange={handleStatusChange}>
                <SelectTrigger className="h-7 w-28 text-xs bg-card">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((s) => (
                    <SelectItem key={s.name} value={s.name} className="text-xs">
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Collapsible Details Section */}
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
                <span className="text-muted-foreground">Company Desc...</span>
                <span className="text-muted-foreground italic truncate max-w-[150px]">Add Description...</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-muted-foreground">Website</span>
                {website ? (
                  <a
                    href={website.startsWith("http") ? website : `https://${website}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline truncate max-w-[150px]"
                  >
                    {website}
                  </a>
                ) : (
                  <span className="text-muted-foreground italic">Add Website...</span>
                )}
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-muted-foreground">Territory</span>
                <span className="text-foreground">{territory || "Add Territory..."}</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-muted-foreground">Industry</span>
                <span className="text-foreground">{industry || "Add Industry..."}</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-muted-foreground">No. of Employe...</span>
                <span className="text-foreground">{employees || "1-10"}</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-muted-foreground">Job Title</span>
                <span className="text-foreground">{jobTitle || "Add Job Title..."}</span>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Collapsible Person Section */}
          <Collapsible open={personOpen} onOpenChange={setPersonOpen} className="space-y-2 border-t pt-3">
            <CollapsibleTrigger className="flex items-center justify-between w-full text-xs font-semibold text-foreground cursor-pointer">
              <span className="flex items-center gap-1.5">
                <ChevronDown className={cn("size-3.5 transition-transform", !personOpen && "-rotate-90")} />
                <span>Person</span>
              </span>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-1 text-xs">
              <div className="flex justify-between items-center py-0.5">
                <span className="text-muted-foreground">Salutation</span>
                <span className="text-muted-foreground italic">{salutation || "Add Salutation..."}</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-muted-foreground">First Name *</span>
                <span className="font-medium text-foreground">{firstName || "—"}</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-muted-foreground">Last Name</span>
                <span className="text-foreground">{lastName || "—"}</span>
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

      {/* Convert to Deal Modal */}
      <ConvertLeadModal
        open={convertModalOpen}
        onOpenChange={setConvertModalOpen}
        lead={lead}
      />
    </div>
  );
}

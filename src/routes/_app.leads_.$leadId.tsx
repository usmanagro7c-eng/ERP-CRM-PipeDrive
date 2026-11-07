import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Camera,
  CheckCircle2,
  ChevronDown,
  Copy,
  ExternalLink,
  FileText,
  List,
  Loader2,
  Mail,
  MessageSquare,
  Paperclip,
  PhoneCall,
  Sparkles,
  StickyNote,
  Trash2,
  UserPlus,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { LeadFormModal } from "@/components/leads/lead-form-modal";
import {
  leadDetailOptions,
  leadStatusesOptions,
  useSaveLead,
  useDeleteLead,
} from "@/hooks/use-leads";
import { useCrmUsers } from "@/hooks/use-dashboard";
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

const SALUTATIONS = ["Mr", "Ms", "Mx", "Dr", "Mrs", "Madam", "Miss", "Master", "Prof"];
const SOURCES = [
  "Email",
  "Existing Customer",
  "Reference",
  "Advertisement",
  "Cold Calling",
  "Exhibition",
  "Supplier Reference",
  "Mass Mailing",
  "Campaign",
  "Walk In",
  "Facebook",
  "Website",
  "WhatsApp",
];
const EMPLOYEE_RANGES = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"];
const INDUSTRIES = [
  "Accounting",
  "Advertising",
  "Aerospace",
  "Agriculture",
  "Airline",
  "Apparel & Accessories",
  "Automotive",
  "Banking",
  "Biotechnology",
  "Chemical",
  "Computer",
  "Consulting",
  "Consumer Products",
  "Defense",
  "Education",
  "Electronics",
  "Manufacturing",
  "Other",
];

interface SidebarState {
  salutation: string;
  first_name: string;
  last_name: string;
  email: string;
  mobile_no: string;
  organization: string;
  company_description: string;
  website: string;
  territory: string;
  industry: string;
  no_of_employees: string;
  job_title: string;
  source: string;
  lead_owner: string;
}

const initialSidebarState: SidebarState = {
  salutation: "",
  first_name: "",
  last_name: "",
  email: "",
  mobile_no: "",
  organization: "",
  company_description: "",
  website: "",
  territory: "",
  industry: "",
  no_of_employees: "",
  job_title: "",
  source: "",
  lead_owner: "",
};

function LeadDetailPage() {
  const { leadId } = Route.useParams();
  const navigate = useNavigate();

  const { data: lead, isLoading } = useQuery(leadDetailOptions(leadId));
  const { data: statuses = [] } = useQuery(leadStatusesOptions());
  const { data: users = [] } = useCrmUsers();

  const saveMutation = useSaveLead();
  const deleteMutation = useDeleteLead();

  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [commentComposerOpen, setCommentComposerOpen] = useState(false);

  // Hash tab router sync
  const [activeTab, setActiveTab] = useState<TabKey>("activity");

  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace("#", "") as TabKey;
      if (
        [
          "activity",
          "emails",
          "comments",
          "data",
          "calls",
          "tasks",
          "notes",
          "attachments",
        ].includes(hash)
      ) {
        setActiveTab(hash);
      }
    };

    handleHash();
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  // Collapsible sections
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [personOpen, setPersonOpen] = useState(true);

  // Editable local form fields for sidebar
  const [sidebarValues, setSidebarValues] = useState<SidebarState>(initialSidebarState);

  useEffect(() => {
    if (lead) {
      setSidebarValues({
        salutation: String(lead["salutation"] || ""),
        first_name: String(lead["first_name"] || ""),
        last_name: String(lead["last_name"] || ""),
        email: String(lead["email"] || ""),
        mobile_no: String(lead["mobile_no"] || lead["phone"] || ""),
        organization: String(lead["organization_name"] || lead["organization"] || ""),
        company_description: String(lead["company_description"] || ""),
        website: String(lead["website"] || ""),
        territory: String(lead["territory"] || ""),
        industry: String(lead["industry"] || ""),
        no_of_employees: String(lead["no_of_employees"] || "1-10"),
        job_title: String(lead["job_title"] || ""),
        source: String(lead["source"] || ""),
        lead_owner: String(lead["lead_owner"] || lead["owner"] || ""),
      });
    }
  }, [lead]);

  const leadName = useMemo(() => {
    if (!lead) return leadId;
    const sal = String(lead["salutation"] || "").trim();
    const fn = String(lead["first_name"] || "").trim();
    const ln = String(lead["last_name"] || "").trim();
    if (fn || ln) {
      return [sal, fn, ln].filter(Boolean).join(" ");
    }
    return (
      String(lead["lead_name"] || "") ||
      String(lead["organization_name"] || "") ||
      String(lead["organization"] || "") ||
      leadId
    );
  }, [lead, leadId]);

  const currentStatus = String(lead?.["status"] || "Open");

  // Save single field on blur / selection
  async function handleFieldSave(fieldname: string, val: string) {
    if (!lead) return;
    const existing = String(lead[fieldname] || "");
    if (existing.trim() === val.trim()) return;

    try {
      await saveMutation.mutateAsync({
        name: leadId,
        values: { [fieldname]: val },
      });
      toast.success(`${fieldname.replace(/_/g, " ")} updated`);
    } catch {
      // toast shown by hook
    }
  }

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

  const tabs: Array<{
    key: TabKey;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { key: "activity", label: "Activity", icon: Activity },
    { key: "emails", label: "Emails", icon: Mail },
    { key: "comments", label: "Comments", icon: MessageSquare },
    { key: "data", label: "Data", icon: FileText },
    { key: "calls", label: "Calls", icon: PhoneCall },
    { key: "tasks", label: "Tasks", icon: CheckCircle2 },
    { key: "notes", label: "Notes", icon: StickyNote },
    { key: "attachments", label: "Attachments", icon: Paperclip },
  ];

  const email = sidebarValues.email || "";
  const phone = sidebarValues.mobile_no || "";

  return (
    <div className="flex h-full flex-col bg-background overflow-hidden">
      {/* Top Header / Breadcrumbs & Action Bar Matching Frappe CRM */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b px-4 py-2.5 bg-card/60 backdrop-blur-xs">
        {/* Breadcrumb: Leads / ☰ List / Zubair Khan */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
          <Link to="/leads" className="hover:text-foreground transition-colors font-medium">
            Leads
          </Link>
          <span className="opacity-60">/</span>
          <Link to="/leads" className="flex items-center gap-1 hover:text-foreground transition-colors">
            <List className="size-3.5" />
            <span>List</span>
          </Link>
          <span className="opacity-60">/</span>
          <span className="font-semibold text-foreground truncate max-w-[240px]">
            {leadName}
          </span>
        </div>

        {/* Top Right Actions Matching Frappe CRM: ⚡ Enrich, Assign To, ● New ▾, Convert to Deal */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.info("Enrich feature: Lead data validated")}
            className="h-7 text-xs gap-1.5 bg-secondary/50 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <Zap className="size-3 text-muted-foreground" />
            <span>Enrich</span>
          </Button>

          {/* Assign To dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1.5 bg-secondary/50 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <UserPlus className="size-3" />
                <span>Assign To</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="text-xs w-48">
              {users.map((u) => (
                <DropdownMenuItem
                  key={u.name}
                  onClick={() => {
                    void handleFieldSave("lead_owner", u.name);
                    toast.success(`Assigned to ${u.full_name || u.name}`);
                  }}
                  className="cursor-pointer"
                >
                  {u.full_name || u.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* New Item Dropdown with bullet dot */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1.5 bg-secondary/50 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <span className="size-1.5 rounded-full bg-foreground inline-block" />
                <span>New</span>
                <ChevronDown className="size-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="text-xs">
              <DropdownMenuItem onClick={() => setActiveTab("tasks")} className="cursor-pointer">
                Task
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveTab("calls")} className="cursor-pointer">
                Call Log
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveTab("notes")} className="cursor-pointer">
                Note
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveTab("emails")} className="cursor-pointer">
                Email
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Convert to Deal Button */}
          <Button
            size="sm"
            onClick={() => setConvertModalOpen(true)}
            className="h-7 gap-1.5 text-xs font-semibold shadow-xs cursor-pointer bg-white text-black hover:bg-neutral-200 dark:bg-neutral-100 dark:text-neutral-900"
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
          <div className="flex-1 flex flex-col">
            {/* Horizontal Tabs List */}
            <div className="flex items-center gap-1 border-b px-4 overflow-x-auto scrollbar-none bg-card/30 shrink-0">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => {
                      setActiveTab(tab.key);
                      window.location.hash = tab.key;
                    }}
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
            <div className="p-4 sm:p-6 flex-1 flex flex-col overflow-y-auto">
              {activeTab === "activity" && (
                <RecordActivityFeed
                  referenceDoctype={api.LEAD_DOCTYPE}
                  referenceName={leadId}
                  owner={String(lead["owner"] || "system")}
                  status={currentStatus}
                  creation={String(lead["creation"] || "")}
                  onNewTask={() => setActiveTab("tasks")}
                  onNewCall={() => setActiveTab("calls")}
                  onNewNote={() => setActiveTab("notes")}
                  onNewComment={() => {
                    setActiveTab("comments");
                    window.location.hash = "comments";
                    setCommentComposerOpen(true);
                  }}
                />
              )}

              {activeTab === "emails" && (
                <RecordEmailsTab
                  referenceDoctype={api.LEAD_DOCTYPE}
                  referenceName={leadId}
                  defaultRecipientEmail={email}
                />
              )}

              {activeTab === "comments" && (
                <RecordCommentsThread
                  referenceDoctype={api.LEAD_DOCTYPE}
                  referenceName={leadId}
                  isOpenEditor={commentComposerOpen}
                  onOpenEditorChange={setCommentComposerOpen}
                />
              )}

              {activeTab === "data" && (
                <RecordDataTab
                  data={lead}
                  users={users}
                  onOpenModal={() => setEditModalOpen(true)}
                  onSave={async (values) => {
                    await saveMutation.mutateAsync({ name: leadId, values });
                  }}
                />
              )}

              {activeTab === "calls" && (
                <RecordCallsTab
                  referenceDoctype={api.LEAD_DOCTYPE}
                  referenceName={leadId}
                  phoneNumber={phone}
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

              {activeTab === "attachments" && (
                <RecordAttachmentsTab
                  referenceDoctype={api.LEAD_DOCTYPE}
                  referenceName={leadId}
                />
              )}
            </div>
          </div>

          {/* Bottom Bar: Reply & Comment Actions (matching Frappe CRM bottom strip) */}
          <div className="border-t px-4 py-2.5 bg-card/40 flex items-center gap-4 shrink-0">
            <button
              onClick={() => {
                setActiveTab("emails");
                window.location.hash = "emails";
              }}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <Mail className="size-3.5" />
              <span>Reply</span>
            </button>
            <button
              onClick={() => {
                setActiveTab("comments");
                window.location.hash = "comments";
                setCommentComposerOpen(true);
              }}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <MessageSquare className="size-3.5" />
              <span>Comment</span>
            </button>
          </div>
        </div>

        {/* Right Sidebar (Record Attributes & Details Panel) Matching Frappe CRM */}
        <div className="w-full lg:w-80 shrink-0 bg-card/30 p-4 sm:p-5 flex flex-col gap-4 overflow-y-auto">
          {/* Top Identifier & Avatar */}
          <div>
            <div className="text-xs text-muted-foreground font-sans">{leadId}</div>
            <div className="flex items-center gap-3 mt-2.5">
              <div className="relative group flex size-13 items-center justify-center rounded-full bg-neutral-800 text-neutral-300 font-bold text-lg shadow-xs shrink-0 cursor-pointer overflow-hidden">
                <span>{leadName.charAt(0).toUpperCase()}</span>
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="size-4 text-white" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-base text-foreground truncate">{leadName}</h2>

                {/* 4 Action Icons Row Matching Frappe CRM: Mail, Link, Attachment, Delete */}
                <div className="flex items-center gap-1.5 mt-1.5">
                  {email ? (
                    <Button
                      asChild
                      variant="outline"
                      size="icon"
                      className="size-6 rounded-md text-muted-foreground hover:text-foreground bg-secondary/50 border-0"
                      title="Send Email"
                    >
                      <a href={`mailto:${email}`}>
                        <Mail className="size-3" />
                      </a>
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="icon"
                      disabled
                      className="size-6 rounded-md opacity-30 bg-secondary/50 border-0"
                    >
                      <Mail className="size-3" />
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyLink}
                    className="size-6 rounded-md text-muted-foreground hover:text-foreground bg-secondary/50 border-0 cursor-pointer"
                    title="Copy Link"
                  >
                    <Copy className="size-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      setActiveTab("attachments");
                      window.location.hash = "attachments";
                    }}
                    className="size-6 rounded-md text-muted-foreground hover:text-foreground bg-secondary/50 border-0 cursor-pointer"
                    title="View Attachments"
                  >
                    <Paperclip className="size-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleDelete}
                    className="size-6 rounded-md text-red-400 bg-red-950/40 hover:bg-red-900/60 border-0 cursor-pointer"
                    title="Delete Lead"
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* First Response & Status */}
          <div className="space-y-2 border-t pt-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">First Response</span>
              <span className="text-muted-foreground font-medium">
                {String(lead["communication_status"] || "—")}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Status</span>
              <Select value={currentStatus} onValueChange={handleStatusChange}>
                <SelectTrigger className="h-7 w-28 text-xs bg-card/60 cursor-pointer border-border/60">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((s) => (
                    <SelectItem key={s.name} value={s.name} className="text-xs cursor-pointer">
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Collapsible Details Section with 2-Column Key-Value Rows & Edit Modal Trigger */}
          <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen} className="space-y-2 border-t pt-3">
            <div className="flex items-center justify-between w-full text-xs font-semibold text-foreground">
              <CollapsibleTrigger className="flex items-center gap-1.5 cursor-pointer hover:text-foreground/80">
                <ChevronDown className={cn("size-3.5 transition-transform", !detailsOpen && "-rotate-90")} />
                <span>Details</span>
              </CollapsibleTrigger>
              <button
                type="button"
                onClick={() => setEditModalOpen(true)}
                className="p-1 text-muted-foreground hover:text-foreground cursor-pointer rounded hover:bg-secondary/50"
                title="Edit Lead in Modal"
              >
                <ExternalLink className="size-3.5" />
              </button>
            </div>

            <CollapsibleContent className="space-y-1.5 pt-1 text-xs">
              {/* Organization */}
              <div className="grid grid-cols-[100px_1fr] items-center gap-1 text-xs py-0.5">
                <span className="text-muted-foreground truncate">Organization</span>
                <Input
                  value={sidebarValues.organization || ""}
                  onChange={(e) => setSidebarValues((p) => ({ ...p, organization: e.target.value }))}
                  onBlur={(e) => void handleFieldSave("organization", e.target.value)}
                  placeholder="Add Organization..."
                  className="h-6 w-full border-0 bg-transparent px-1 py-0 text-xs text-foreground placeholder:text-muted-foreground/60 hover:bg-muted/40 focus:ring-1 focus:ring-ring focus:bg-background rounded shadow-none"
                />
              </div>

              {/* Company Description */}
              <div className="grid grid-cols-[100px_1fr] items-start gap-1 text-xs py-0.5">
                <span className="text-muted-foreground truncate pt-0.5">Company Desc...</span>
                <Textarea
                  value={sidebarValues.company_description || ""}
                  onChange={(e) => setSidebarValues((p) => ({ ...p, company_description: e.target.value }))}
                  onBlur={(e) => void handleFieldSave("company_description", e.target.value)}
                  placeholder="Add Company Description..."
                  rows={1}
                  className="min-h-[26px] h-6 w-full border-0 bg-transparent px-1 py-0.5 text-xs text-foreground placeholder:text-muted-foreground/60 hover:bg-muted/40 focus:ring-1 focus:ring-ring focus:bg-background rounded resize-none shadow-none"
                />
              </div>

              {/* Website */}
              <div className="grid grid-cols-[100px_1fr] items-center gap-1 text-xs py-0.5">
                <span className="text-muted-foreground truncate">Website</span>
                <Input
                  value={sidebarValues.website || ""}
                  onChange={(e) => setSidebarValues((p) => ({ ...p, website: e.target.value }))}
                  onBlur={(e) => void handleFieldSave("website", e.target.value)}
                  placeholder="Add Website..."
                  className="h-6 w-full border-0 bg-transparent px-1 py-0 text-xs text-foreground placeholder:text-muted-foreground/60 hover:bg-muted/40 focus:ring-1 focus:ring-ring focus:bg-background rounded shadow-none"
                />
              </div>

              {/* Territory */}
              <div className="grid grid-cols-[100px_1fr] items-center gap-1 text-xs py-0.5">
                <span className="text-muted-foreground truncate">Territory</span>
                <Select
                  value={sidebarValues.territory || undefined}
                  onValueChange={(val) => {
                    setSidebarValues((p) => ({ ...p, territory: val }));
                    void handleFieldSave("territory", val);
                  }}
                >
                  <SelectTrigger className="h-6 w-full justify-between border-0 bg-transparent px-1 py-0 text-xs text-foreground shadow-none hover:bg-muted/40 focus:ring-0 focus:bg-background rounded">
                    <SelectValue placeholder="Add Territory... ▾" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All Territories">All Territories</SelectItem>
                    <SelectItem value="Pakistan">Pakistan</SelectItem>
                    <SelectItem value="Punjab">Punjab</SelectItem>
                    <SelectItem value="Sindh">Sindh</SelectItem>
                    <SelectItem value="KPK">KPK</SelectItem>
                    <SelectItem value="Balochistan">Balochistan</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Industry */}
              <div className="grid grid-cols-[100px_1fr] items-center gap-1 text-xs py-0.5">
                <span className="text-muted-foreground truncate">Industry</span>
                <Select
                  value={sidebarValues.industry || undefined}
                  onValueChange={(val) => {
                    setSidebarValues((p) => ({ ...p, industry: val }));
                    void handleFieldSave("industry", val);
                  }}
                >
                  <SelectTrigger className="h-6 w-full justify-between border-0 bg-transparent px-1 py-0 text-xs text-foreground shadow-none hover:bg-muted/40 focus:ring-0 focus:bg-background rounded">
                    <SelectValue placeholder="Add Industry... ▾" />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    {INDUSTRIES.map((ind) => (
                      <SelectItem key={ind} value={ind} className="text-xs cursor-pointer">
                        {ind}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* No. of Employees */}
              <div className="grid grid-cols-[100px_1fr] items-center gap-1 text-xs py-0.5">
                <span className="text-muted-foreground truncate">No. of Employe...</span>
                <Select
                  value={sidebarValues.no_of_employees || undefined}
                  onValueChange={(val) => {
                    setSidebarValues((p) => ({ ...p, no_of_employees: val }));
                    void handleFieldSave("no_of_employees", val);
                  }}
                >
                  <SelectTrigger className="h-6 w-full justify-between border-0 bg-transparent px-1 py-0 text-xs text-foreground shadow-none hover:bg-muted/40 focus:ring-0 focus:bg-background rounded">
                    <SelectValue placeholder="Select Range... ▾" />
                  </SelectTrigger>
                  <SelectContent>
                    {EMPLOYEE_RANGES.map((r) => (
                      <SelectItem key={r} value={r} className="text-xs cursor-pointer">
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Job Title */}
              <div className="grid grid-cols-[100px_1fr] items-center gap-1 text-xs py-0.5">
                <span className="text-muted-foreground truncate">Job Title</span>
                <Input
                  value={sidebarValues.job_title || ""}
                  onChange={(e) => setSidebarValues((p) => ({ ...p, job_title: e.target.value }))}
                  onBlur={(e) => void handleFieldSave("job_title", e.target.value)}
                  placeholder="Add Job Title..."
                  className="h-6 w-full border-0 bg-transparent px-1 py-0 text-xs text-foreground placeholder:text-muted-foreground/60 hover:bg-muted/40 focus:ring-1 focus:ring-ring focus:bg-background rounded shadow-none"
                />
              </div>

              {/* Source */}
              <div className="grid grid-cols-[100px_1fr] items-center gap-1 text-xs py-0.5">
                <span className="text-muted-foreground truncate">Source</span>
                <Select
                  value={sidebarValues.source || undefined}
                  onValueChange={(val) => {
                    setSidebarValues((p) => ({ ...p, source: val }));
                    void handleFieldSave("source", val);
                  }}
                >
                  <SelectTrigger className="h-6 w-full justify-between border-0 bg-transparent px-1 py-0 text-xs text-foreground shadow-none hover:bg-muted/40 focus:ring-0 focus:bg-background rounded">
                    <SelectValue placeholder="Add Source... ▾" />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    {SOURCES.map((src) => (
                      <SelectItem key={src} value={src} className="text-xs cursor-pointer">
                        {src}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Lead Owner */}
              <div className="grid grid-cols-[100px_1fr] items-center gap-1 text-xs py-0.5">
                <span className="text-muted-foreground truncate">Lead Owner</span>
                <Select
                  value={sidebarValues.lead_owner || undefined}
                  onValueChange={(val) => {
                    setSidebarValues((p) => ({ ...p, lead_owner: val }));
                    void handleFieldSave("lead_owner", val);
                  }}
                >
                  <SelectTrigger className="h-6 w-full justify-between border-0 bg-transparent px-1 py-0 text-xs text-foreground shadow-none hover:bg-muted/40 focus:ring-0 focus:bg-background rounded">
                    <SelectValue placeholder="Select Owner... ▾" />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    {users.map((u) => (
                      <SelectItem key={u.name} value={u.name} className="text-xs cursor-pointer">
                        {u.full_name || u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Collapsible Person Section with 2-Column Key-Value Rows */}
          <Collapsible open={personOpen} onOpenChange={setPersonOpen} className="space-y-2 border-t pt-3">
            <CollapsibleTrigger className="flex items-center justify-between w-full text-xs font-semibold text-foreground cursor-pointer">
              <span className="flex items-center gap-1.5">
                <ChevronDown className={cn("size-3.5 transition-transform", !personOpen && "-rotate-90")} />
                <span>Person</span>
              </span>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-1.5 pt-1 text-xs">
              {/* Salutation */}
              <div className="grid grid-cols-[100px_1fr] items-center gap-1 text-xs py-0.5">
                <span className="text-muted-foreground truncate">Salutation</span>
                <Select
                  value={sidebarValues.salutation || undefined}
                  onValueChange={(val) => {
                    setSidebarValues((p) => ({ ...p, salutation: val }));
                    void handleFieldSave("salutation", val);
                  }}
                >
                  <SelectTrigger className="h-6 w-full justify-between border-0 bg-transparent px-1 py-0 text-xs text-foreground shadow-none hover:bg-muted/40 focus:ring-0 focus:bg-background rounded">
                    <SelectValue placeholder="Add Salutation... ▾" />
                  </SelectTrigger>
                  <SelectContent>
                    {SALUTATIONS.map((sal) => (
                      <SelectItem key={sal} value={sal} className="text-xs cursor-pointer">
                        {sal}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* First Name * */}
              <div className="grid grid-cols-[100px_1fr] items-center gap-1 text-xs py-0.5">
                <span className="text-muted-foreground truncate">
                  First Name <span className="text-destructive">*</span>
                </span>
                <Input
                  value={sidebarValues.first_name || ""}
                  onChange={(e) => setSidebarValues((p) => ({ ...p, first_name: e.target.value }))}
                  onBlur={(e) => void handleFieldSave("first_name", e.target.value)}
                  placeholder="First Name..."
                  className="h-6 w-full border-0 bg-transparent px-1 py-0 text-xs text-foreground placeholder:text-muted-foreground/60 hover:bg-muted/40 focus:ring-1 focus:ring-ring focus:bg-background rounded shadow-none"
                />
              </div>

              {/* Last Name */}
              <div className="grid grid-cols-[100px_1fr] items-center gap-1 text-xs py-0.5">
                <span className="text-muted-foreground truncate">Last Name</span>
                <Input
                  value={sidebarValues.last_name || ""}
                  onChange={(e) => setSidebarValues((p) => ({ ...p, last_name: e.target.value }))}
                  onBlur={(e) => void handleFieldSave("last_name", e.target.value)}
                  placeholder="Last Name..."
                  className="h-6 w-full border-0 bg-transparent px-1 py-0 text-xs text-foreground placeholder:text-muted-foreground/60 hover:bg-muted/40 focus:ring-1 focus:ring-ring focus:bg-background rounded shadow-none"
                />
              </div>

              {/* Email */}
              <div className="grid grid-cols-[100px_1fr] items-center gap-1 text-xs py-0.5">
                <span className="text-muted-foreground truncate">Email</span>
                <Input
                  value={sidebarValues.email || ""}
                  type="email"
                  onChange={(e) => setSidebarValues((p) => ({ ...p, email: e.target.value }))}
                  onBlur={(e) => void handleFieldSave("email", e.target.value)}
                  placeholder="Add Email..."
                  className="h-6 w-full border-0 bg-transparent px-1 py-0 text-xs text-foreground placeholder:text-muted-foreground/60 hover:bg-muted/40 focus:ring-1 focus:ring-ring focus:bg-background rounded shadow-none"
                />
              </div>

              {/* Mobile No. */}
              <div className="grid grid-cols-[100px_1fr] items-center gap-1 text-xs py-0.5">
                <span className="text-muted-foreground truncate">Mobile No.</span>
                <Input
                  value={sidebarValues.mobile_no || ""}
                  onChange={(e) => setSidebarValues((p) => ({ ...p, mobile_no: e.target.value }))}
                  onBlur={(e) => void handleFieldSave("mobile_no", e.target.value)}
                  placeholder="Add Mobile No...."
                  className="h-6 w-full border-0 bg-transparent px-1 py-0 text-xs text-foreground placeholder:text-muted-foreground/60 hover:bg-muted/40 focus:ring-1 focus:ring-ring focus:bg-background rounded shadow-none"
                />
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

      {/* Edit Lead Modal Matching Create/Edit Layout */}
      <LeadFormModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        lead={lead}
      />
    </div>
  );
}

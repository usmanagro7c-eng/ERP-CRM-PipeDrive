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

  // Read URL hash if available (e.g. #activity, #emails)
  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    if (typeof window !== "undefined" && window.location.hash) {
      const h = window.location.hash.replace("#", "") as TabKey;
      if (
        ["activity", "emails", "comments", "data", "calls", "tasks", "notes", "attachments"].includes(
          h,
        )
      ) {
        return h;
      }
    }
    return "activity";
  });

  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [personOpen, setPersonOpen] = useState(true);

  // Local form state for inline editing in the sidebar
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
        no_of_employees: String(lead["no_of_employees"] || ""),
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
    <div className="flex flex-col min-h-[calc(100vh-60px)] bg-background">
      {/* Top Header / Breadcrumbs & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b px-4 py-2.5 bg-card/60 backdrop-blur-xs">
        {/* Breadcrumb matching Frappe CRM */}
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
          <span className="font-semibold text-foreground truncate max-w-[200px]">
            {leadName}
          </span>
        </div>

        {/* Top Right Actions Matching Frappe CRM */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.info("Enrich feature: Lead data validated")}
            className="h-7 text-xs gap-1.5 bg-secondary/50 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <Sparkles className="size-3 text-amber-500" />
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

          {/* New Item Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1 bg-secondary/50 text-muted-foreground hover:text-foreground cursor-pointer"
              >
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
            className="h-7 gap-1.5 text-xs font-semibold shadow-xs cursor-pointer"
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
            <div className="p-4 sm:p-6 overflow-y-auto">
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
                  onNewComment={() => setActiveTab("comments")}
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
                />
              )}

              {activeTab === "data" && <RecordDataTab data={lead} />}

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
          <div className="border-t px-4 py-2.5 bg-card/40 flex items-center gap-3">
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
              }}
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
              <div className="relative group flex size-12 items-center justify-center rounded-full bg-secondary text-secondary-foreground font-bold text-base shadow-xs shrink-0 cursor-pointer overflow-hidden">
                <span>{leadName.charAt(0).toUpperCase()}</span>
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="size-4 text-white" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-sm text-foreground truncate">{leadName}</h2>
                {sidebarValues.organization && (
                  <p className="text-xs text-muted-foreground truncate">{sidebarValues.organization}</p>
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
                className="size-7 rounded-sm text-muted-foreground hover:text-foreground bg-secondary/30 cursor-pointer"
                title="Copy Link"
              >
                <Copy className="size-3.5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  setActiveTab("attachments");
                  window.location.hash = "attachments";
                }}
                className="size-7 rounded-sm text-muted-foreground hover:text-foreground bg-secondary/30 cursor-pointer"
                title="View Attachments"
              >
                <Paperclip className="size-3.5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleDelete}
                className="size-7 rounded-sm text-destructive hover:bg-destructive/10 bg-secondary/30 cursor-pointer"
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
              <span className="text-muted-foreground font-medium">
                {String(lead["communication_status"] || "—")}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Status</span>
              <Select value={currentStatus} onValueChange={handleStatusChange}>
                <SelectTrigger className="h-7 w-32 text-xs bg-card cursor-pointer">
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

          {/* Collapsible Details Section with INLINE EDITABLE FIELDS */}
          <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen} className="space-y-2 border-t pt-3">
            <CollapsibleTrigger className="flex items-center justify-between w-full text-xs font-semibold text-foreground cursor-pointer">
              <span className="flex items-center gap-1.5">
                <ChevronDown className={cn("size-3.5 transition-transform", !detailsOpen && "-rotate-90")} />
                <span>Details</span>
              </span>
              <ExternalLink className="size-3 text-muted-foreground" />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-2 text-xs">
              {/* Organization */}
              <div className="space-y-1">
                <span className="text-muted-foreground block text-[11px]">Organization</span>
                <Input
                  value={sidebarValues.organization || ""}
                  onChange={(e) => setSidebarValues((p) => ({ ...p, organization: e.target.value }))}
                  onBlur={(e) => void handleFieldSave("organization", e.target.value)}
                  placeholder="Add Organization..."
                  className="h-7 text-xs bg-card"
                />
              </div>

              {/* Company Description */}
              <div className="space-y-1">
                <span className="text-muted-foreground block text-[11px]">Company Description</span>
                <Textarea
                  value={sidebarValues.company_description || ""}
                  onChange={(e) => setSidebarValues((p) => ({ ...p, company_description: e.target.value }))}
                  onBlur={(e) => void handleFieldSave("company_description", e.target.value)}
                  placeholder="Add Company Description..."
                  rows={2}
                  className="text-xs bg-card resize-none"
                />
              </div>

              {/* Website */}
              <div className="space-y-1">
                <span className="text-muted-foreground block text-[11px]">Website</span>
                <Input
                  value={sidebarValues.website || ""}
                  onChange={(e) => setSidebarValues((p) => ({ ...p, website: e.target.value }))}
                  onBlur={(e) => void handleFieldSave("website", e.target.value)}
                  placeholder="Add Website..."
                  className="h-7 text-xs bg-card"
                />
              </div>

              {/* Territory */}
              <div className="space-y-1">
                <span className="text-muted-foreground block text-[11px]">Territory</span>
                <Input
                  value={sidebarValues.territory || ""}
                  onChange={(e) => setSidebarValues((p) => ({ ...p, territory: e.target.value }))}
                  onBlur={(e) => void handleFieldSave("territory", e.target.value)}
                  placeholder="Add Territory..."
                  className="h-7 text-xs bg-card"
                />
              </div>

              {/* Industry */}
              <div className="space-y-1">
                <span className="text-muted-foreground block text-[11px]">Industry</span>
                <Select
                  value={sidebarValues.industry || undefined}
                  onValueChange={(val) => {
                    setSidebarValues((p) => ({ ...p, industry: val }));
                    void handleFieldSave("industry", val);
                  }}
                >
                  <SelectTrigger className="h-7 text-xs bg-card cursor-pointer">
                    <SelectValue placeholder="Add Industry..." />
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
              <div className="space-y-1">
                <span className="text-muted-foreground block text-[11px]">No. of Employees</span>
                <Select
                  value={sidebarValues.no_of_employees || undefined}
                  onValueChange={(val) => {
                    setSidebarValues((p) => ({ ...p, no_of_employees: val }));
                    void handleFieldSave("no_of_employees", val);
                  }}
                >
                  <SelectTrigger className="h-7 text-xs bg-card cursor-pointer">
                    <SelectValue placeholder="1-10" />
                  </SelectTrigger>
                  <SelectContent>
                    {EMPLOYEE_RANGES.map((rng) => (
                      <SelectItem key={rng} value={rng} className="text-xs cursor-pointer">
                        {rng}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Job Title */}
              <div className="space-y-1">
                <span className="text-muted-foreground block text-[11px]">Job Title</span>
                <Input
                  value={sidebarValues.job_title || ""}
                  onChange={(e) => setSidebarValues((p) => ({ ...p, job_title: e.target.value }))}
                  onBlur={(e) => void handleFieldSave("job_title", e.target.value)}
                  placeholder="Add Job Title..."
                  className="h-7 text-xs bg-card"
                />
              </div>

              {/* Source */}
              <div className="space-y-1">
                <span className="text-muted-foreground block text-[11px]">Source</span>
                <Select
                  value={sidebarValues.source || undefined}
                  onValueChange={(val) => {
                    setSidebarValues((p) => ({ ...p, source: val }));
                    void handleFieldSave("source", val);
                  }}
                >
                  <SelectTrigger className="h-7 text-xs bg-card cursor-pointer">
                    <SelectValue placeholder="Add Source..." />
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
              <div className="space-y-1">
                <span className="text-muted-foreground block text-[11px]">Lead Owner</span>
                <Select
                  value={sidebarValues.lead_owner || undefined}
                  onValueChange={(val) => {
                    setSidebarValues((p) => ({ ...p, lead_owner: val }));
                    void handleFieldSave("lead_owner", val);
                  }}
                >
                  <SelectTrigger className="h-7 text-xs bg-card cursor-pointer">
                    <SelectValue placeholder="Select Lead Owner..." />
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

          {/* Collapsible Person Section with INLINE EDITABLE FIELDS */}
          <Collapsible open={personOpen} onOpenChange={setPersonOpen} className="space-y-2 border-t pt-3">
            <CollapsibleTrigger className="flex items-center justify-between w-full text-xs font-semibold text-foreground cursor-pointer">
              <span className="flex items-center gap-1.5">
                <ChevronDown className={cn("size-3.5 transition-transform", !personOpen && "-rotate-90")} />
                <span>Person</span>
              </span>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-2 text-xs">
              {/* Salutation */}
              <div className="space-y-1">
                <span className="text-muted-foreground block text-[11px]">Salutation</span>
                <Select
                  value={sidebarValues.salutation || undefined}
                  onValueChange={(val) => {
                    setSidebarValues((p) => ({ ...p, salutation: val }));
                    void handleFieldSave("salutation", val);
                  }}
                >
                  <SelectTrigger className="h-7 text-xs bg-card cursor-pointer">
                    <SelectValue placeholder="Add Salutation..." />
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
              <div className="space-y-1">
                <span className="text-muted-foreground block text-[11px]">
                  First Name <span className="text-destructive">*</span>
                </span>
                <Input
                  value={sidebarValues.first_name || ""}
                  onChange={(e) => setSidebarValues((p) => ({ ...p, first_name: e.target.value }))}
                  onBlur={(e) => void handleFieldSave("first_name", e.target.value)}
                  placeholder="Add First Name..."
                  className="h-7 text-xs bg-card"
                />
              </div>

              {/* Last Name */}
              <div className="space-y-1">
                <span className="text-muted-foreground block text-[11px]">Last Name</span>
                <Input
                  value={sidebarValues.last_name || ""}
                  onChange={(e) => setSidebarValues((p) => ({ ...p, last_name: e.target.value }))}
                  onBlur={(e) => void handleFieldSave("last_name", e.target.value)}
                  placeholder="Add Last Name..."
                  className="h-7 text-xs bg-card"
                />
              </div>

              {/* Email */}
              <div className="space-y-1">
                <span className="text-muted-foreground block text-[11px]">Email</span>
                <Input
                  value={sidebarValues.email || ""}
                  type="email"
                  onChange={(e) => setSidebarValues((p) => ({ ...p, email: e.target.value }))}
                  onBlur={(e) => void handleFieldSave("email", e.target.value)}
                  placeholder="Add Email..."
                  className="h-7 text-xs bg-card"
                />
              </div>

              {/* Mobile No. */}
              <div className="space-y-1">
                <span className="text-muted-foreground block text-[11px]">Mobile No.</span>
                <Input
                  value={sidebarValues.mobile_no || ""}
                  onChange={(e) => setSidebarValues((p) => ({ ...p, mobile_no: e.target.value }))}
                  onBlur={(e) => void handleFieldSave("mobile_no", e.target.value)}
                  placeholder="Add Mobile No...."
                  className="h-7 text-xs bg-card"
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
    </div>
  );
}

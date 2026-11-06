import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  CheckCircle2,
  ChevronDown,
  Copy,
  ExternalLink,
  FileSpreadsheet,
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
  Plus,
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
import { QuotationFormModal } from "@/components/quotations/quotation-form-modal";
import { DealFormModal } from "@/components/deals/deal-form-modal";
import { DealLostModal } from "@/components/deals/deal-lost-modal";
import {
  dealDetailOptions,
  dealStatusesOptions,
  useSaveDeal,
  useDeleteDeal,
} from "@/hooks/use-deals";
import { useCrmUsers } from "@/hooks/use-dashboard";
import { RecordCommentsThread } from "@/components/record-view/record-comments-thread";
import { RecordAttachmentsTab } from "@/components/record-view/record-attachments-tab";
import { RecordTasksTab } from "@/components/record-view/record-tasks-tab";
import { RecordNotesTab } from "@/components/record-view/record-notes-tab";
import { RecordCallsTab } from "@/components/record-view/record-calls-tab";
import { RecordEmailsTab } from "@/components/record-view/record-emails-tab";
import { RecordActivityFeed } from "@/components/record-view/record-activity-feed";
import { DealDataTab } from "@/components/deals/deal-data-tab";
import { RecordQuotationsTab } from "@/components/record-view/record-quotations-tab";
import * as api from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/deals_/$dealId")({
  head: () => ({ meta: [{ title: "Deal Detail · AgroCRM" }] }),
  component: DealDetailPage,
});

type TabKey =
  | "activity"
  | "emails"
  | "comments"
  | "data"
  | "calls"
  | "tasks"
  | "notes"
  | "attachments"
  | "quotations";

const SALUTATIONS = ["Mr", "Ms", "Mx", "Dr", "Mrs", "Madam", "Miss", "Master", "Prof"];
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
const TERRITORIES = [
  "All Territories",
  "Pakistan",
  "Punjab",
  "Sindh",
  "KPK",
  "Balochistan",
];

interface SidebarState {
  organization: string;
  company_description: string;
  website: string;
  territory: string;
  industry: string;
  no_of_employees: string;
  annual_revenue: string;
  closed_date: string;
  probability: string;
  next_step: string;
  deal_owner: string;
  lost_reason: string;
  lost_notes: string;
}

const initialSidebarState: SidebarState = {
  organization: "",
  company_description: "",
  website: "",
  territory: "",
  industry: "",
  no_of_employees: "",
  annual_revenue: "",
  closed_date: "",
  probability: "",
  next_step: "",
  deal_owner: "",
  lost_reason: "",
  lost_notes: "",
};

function DealDetailPage() {
  const { dealId } = Route.useParams();
  const navigate = useNavigate();

  const { data: deal, isLoading, refetch } = useQuery(dealDetailOptions(dealId));
  const { data: stages = [] } = useQuery(dealStatusesOptions());
  const { data: users = [] } = useCrmUsers();

  const saveMutation = useSaveDeal();
  const deleteMutation = useDeleteDeal();

  const [activeTab, setActiveTab] = useState<TabKey>("activity");
  const [commentComposerOpen, setCommentComposerOpen] = useState(false);
  const [quotationModalOpen, setQuotationModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [lostModalOpen, setLostModalOpen] = useState(false);

  // Hash tab router sync
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
          "quotations",
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
  const [contactsOpen, setContactsOpen] = useState(true);
  const [lostReasonOpen, setLostReasonOpen] = useState(false);
  const [orgDetailsOpen, setOrgDetailsOpen] = useState(true);

  // Editable local form fields for sidebar
  const [sidebarValues, setSidebarValues] = useState<SidebarState>(initialSidebarState);

  useEffect(() => {
    if (deal) {
      setSidebarValues({
        organization: String(deal["organization_name"] || deal["organization"] || ""),
        company_description: String(deal["company_description"] || ""),
        website: String(deal["website"] || ""),
        territory: String(deal["territory"] || ""),
        industry: String(deal["industry"] || ""),
        no_of_employees: String(deal["no_of_employees"] || "1-10"),
        annual_revenue: String(deal["annual_revenue"] || deal["deal_value"] || ""),
        closed_date: String(deal["closed_date"] || deal["expected_closing"] || ""),
        probability: String(deal["probability"] || ""),
        next_step: String(deal["next_step"] || ""),
        deal_owner: String(deal["deal_owner"] || deal["owner"] || ""),
        lost_reason: String(deal["lost_reason"] || ""),
        lost_notes: String(deal["lost_notes"] || ""),
      });
    }
  }, [deal]);

  const dealName = useMemo(() => {
    if (!deal) return dealId;
    return (
      String(deal["deal_name"] || "") ||
      String(deal["organization_name"] || "") ||
      String(deal["organization"] || "") ||
      dealId
    );
  }, [deal, dealId]);

  const currentStage = String(deal?.["status"] || "Qualification");
  const dealValue = Number(deal?.["annual_revenue"] || deal?.["deal_value"] || 0);
  const email = String(deal?.["email"] || "");
  const phone = String(deal?.["mobile_no"] || deal?.["phone"] || "");

  // Save single field on blur / selection
  async function handleFieldSave(fieldname: string, val: string) {
    if (!deal) return;
    const existing = String(deal[fieldname] || "");
    if (existing.trim() === val.trim()) return;

    try {
      await saveMutation.mutateAsync({
        name: dealId,
        values: { [fieldname]: val },
      });
      toast.success(`${fieldname.replace(/_/g, " ")} updated`);
    } catch {
      // toast handled
    }
  }

  async function handleStageChange(newStage: string) {
    if (!deal) return;
    try {
      await saveMutation.mutateAsync({
        name: dealId,
        values: { status: newStage },
      });
      toast.success(`Stage updated to ${newStage}`);
    } catch {
      // toast handled
    }
  }

  async function handleMarkWon() {
    if (!deal) return;
    try {
      await saveMutation.mutateAsync({
        name: dealId,
        values: { status: "Closed Won" },
      });
      toast.success("Deal marked as Won! 🎉");
    } catch {
      // toast handled
    }
  }

  async function handleDelete() {
    if (!confirm(`Are you sure you want to delete deal ${dealName}?`)) return;
    try {
      await deleteMutation.mutateAsync(dealId);
      toast.success("Deal deleted successfully");
      void navigate({ to: "/deals" });
    } catch {
      // toast handled
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

  if (!deal) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-base font-semibold">Deal not found</h2>
        <Button asChild size="sm" variant="outline" className="mt-4">
          <Link to="/deals">Back to Deals</Link>
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
    { key: "quotations", label: "Quotations", icon: FileSpreadsheet },
  ];

  return (
    <div className="flex flex-col min-h-[calc(100vh-60px)] bg-background">
      {/* Top Header / Breadcrumbs & Action Bar Matching Frappe CRM */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b px-4 py-2.5 bg-card/60 backdrop-blur-xs">
        {/* Breadcrumb: Deals / ☰ List / {dealName} */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
          <Link to="/deals" className="hover:text-foreground transition-colors font-medium">
            Deals
          </Link>
          <span className="opacity-60">/</span>
          <Link to="/deals" className="flex items-center gap-1 hover:text-foreground transition-colors">
            <List className="size-3.5" />
            <span>List</span>
          </Link>
          <span className="opacity-60">/</span>
          <span className="font-semibold text-foreground truncate max-w-[240px]">
            {dealName}
          </span>
        </div>

        {/* Top Right Actions Matching Frappe CRM: ⚡ Enrich, Assign To, ● New ▾, Won, Lost */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.info("Enrich feature: Deal intelligence updated")}
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
                    void handleFieldSave("deal_owner", u.name);
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
                className="h-7 text-xs gap-1.5 bg-secondary/50 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <span className="size-1.5 rounded-full bg-foreground inline-block" />
                <span>New</span>
                <ChevronDown className="size-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="text-xs">
              <DropdownMenuItem onClick={() => { setActiveTab("tasks"); window.location.hash = "tasks"; }} className="cursor-pointer">
                Task
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setActiveTab("calls"); window.location.hash = "calls"; }} className="cursor-pointer">
                Call Log
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setActiveTab("notes"); window.location.hash = "notes"; }} className="cursor-pointer">
                Note
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setQuotationModalOpen(true)} className="cursor-pointer">
                Quotation
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Won Button */}
          <Button
            size="sm"
            onClick={handleMarkWon}
            className="h-7 text-xs font-semibold px-2.5 rounded-md cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
          >
            <span>Won</span>
          </Button>

          {/* Lost Button */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setLostModalOpen(true)}
            className="h-7 text-xs font-semibold px-2.5 rounded-md cursor-pointer bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border-rose-500/20"
          >
            <span>Lost</span>
          </Button>
        </div>
      </div>

      {/* Main 2-Column Content Layout (Feed Tabs + Right Side-Panel) */}
      <div className="flex flex-col lg:flex-row flex-1 min-h-0">
        {/* Left / Center Tab Canvas */}
        <div className="flex-1 flex flex-col min-w-0 border-b lg:border-b-0 lg:border-r border-border justify-between">
          <div className="flex-1 flex flex-col">
            {/* Horizontal Tabs List (All 9 Tabs) */}
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
                  referenceDoctype={api.DEAL_DOCTYPE}
                  referenceName={dealId}
                  owner={String(deal["owner"] || "system")}
                  status={currentStage}
                  creation={String(deal["creation"] || "")}
                  onNewTask={() => { setActiveTab("tasks"); window.location.hash = "tasks"; }}
                  onNewCall={() => { setActiveTab("calls"); window.location.hash = "calls"; }}
                  onNewNote={() => { setActiveTab("notes"); window.location.hash = "notes"; }}
                  onNewComment={() => {
                    setActiveTab("comments");
                    window.location.hash = "comments";
                    setCommentComposerOpen(true);
                  }}
                />
              )}

              {activeTab === "emails" && (
                <RecordEmailsTab
                  referenceDoctype={api.DEAL_DOCTYPE}
                  referenceName={dealId}
                  defaultRecipientEmail={email}
                />
              )}

              {activeTab === "comments" && (
                <RecordCommentsThread
                  referenceDoctype={api.DEAL_DOCTYPE}
                  referenceName={dealId}
                  isOpenEditor={commentComposerOpen}
                  onOpenEditorChange={setCommentComposerOpen}
                />
              )}

              {activeTab === "data" && (
                <DealDataTab
                  deal={deal}
                  users={users}
                  onOpenModal={() => setEditModalOpen(true)}
                  onReload={() => void refetch()}
                  onSave={async (values) => {
                    await saveMutation.mutateAsync({ name: dealId, values });
                  }}
                />
              )}

              {activeTab === "calls" && (
                <RecordCallsTab
                  referenceDoctype={api.DEAL_DOCTYPE}
                  referenceName={dealId}
                  phoneNumber={phone}
                />
              )}

              {activeTab === "tasks" && (
                <RecordTasksTab
                  referenceDoctype={api.DEAL_DOCTYPE}
                  referenceName={dealId}
                />
              )}

              {activeTab === "notes" && (
                <RecordNotesTab
                  referenceDoctype={api.DEAL_DOCTYPE}
                  referenceName={dealId}
                />
              )}

              {activeTab === "attachments" && (
                <RecordAttachmentsTab
                  referenceDoctype={api.DEAL_DOCTYPE}
                  referenceName={dealId}
                />
              )}

              {activeTab === "quotations" && (
                <RecordQuotationsTab
                  dealId={dealId}
                  customerName={sidebarValues.organization}
                  onNewQuotation={() => setQuotationModalOpen(true)}
                />
              )}
            </div>
          </div>

          {/* Bottom Bar: Reply & Comment Actions */}
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
            <div className="text-xs text-muted-foreground font-sans">{dealId}</div>
            <div className="flex items-center gap-3 mt-2.5">
              <div className="relative group flex size-13 items-center justify-center rounded-full bg-neutral-800 text-neutral-300 font-bold text-lg shadow-xs shrink-0 cursor-pointer overflow-hidden">
                <span>{dealName.charAt(0).toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-base text-foreground truncate">{dealName}</h2>

                {/* 4 Action Icons Row: Mail, Link, Attachment, Delete */}
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
                    title="Delete Deal"
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Deal Value & Stage Selector */}
          <div className="space-y-2 border-t pt-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Deal Value</span>
              <span className="font-bold text-foreground">
                PKR {dealValue.toLocaleString("en-PK", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Status</span>
              <Select value={currentStage} onValueChange={handleStageChange}>
                <SelectTrigger className="h-7 w-32 text-xs bg-card/60 cursor-pointer border-border/60">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="size-1.5 rounded-full bg-foreground inline-block shrink-0" />
                    <SelectValue placeholder="Stage" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {stages.map((s) => (
                    <SelectItem key={s.name} value={s.name} className="text-xs cursor-pointer">
                      <div className="flex items-center gap-1.5">
                        <span className="size-1.5 rounded-full bg-foreground inline-block" />
                        <span>{s.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Section 1: Contacts (Collapsible) matching Frappe CRM */}
          <Collapsible open={contactsOpen} onOpenChange={setContactsOpen} className="space-y-2 border-t pt-3">
            <div className="flex items-center justify-between w-full text-xs font-semibold text-foreground">
              <CollapsibleTrigger className="flex items-center gap-1.5 cursor-pointer hover:text-foreground/80">
                <ChevronDown className={cn("size-3.5 transition-transform", !contactsOpen && "-rotate-90")} />
                <span>Contacts</span>
              </CollapsibleTrigger>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-5 text-muted-foreground hover:text-foreground cursor-pointer"
                onClick={() => toast.info("Add Contact to Deal")}
                title="Add Contact"
              >
                <Plus className="size-3" />
              </Button>
            </div>
            <CollapsibleContent className="pt-1 text-xs">
              <div className="text-muted-foreground text-xs py-2 text-center bg-muted/20 rounded-md">
                No Contacts Added
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Section 2: Lost Reason (Collapsible) matching Frappe CRM */}
          <Collapsible open={lostReasonOpen} onOpenChange={setLostReasonOpen} className="space-y-2 border-t pt-3">
            <CollapsibleTrigger className="flex items-center gap-1.5 w-full text-xs font-semibold text-foreground cursor-pointer hover:text-foreground/80">
              <ChevronDown className={cn("size-3.5 transition-transform", !lostReasonOpen && "-rotate-90")} />
              <span>Lost Reason</span>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-1 text-xs">
              <div className="grid grid-cols-[100px_1fr] items-center gap-1 text-xs py-0.5">
                <span className="text-muted-foreground truncate">Lost Reason</span>
                <Input
                  value={sidebarValues.lost_reason || ""}
                  onChange={(e) => setSidebarValues((p) => ({ ...p, lost_reason: e.target.value }))}
                  onBlur={(e) => void handleFieldSave("lost_reason", e.target.value)}
                  placeholder="Add Lost Reason..."
                  className="h-6 w-full border-0 bg-transparent px-1 py-0 text-xs text-foreground placeholder:text-muted-foreground/60 hover:bg-muted/40 focus:ring-1 focus:ring-ring focus:bg-background rounded shadow-none"
                />
              </div>
              <div className="grid grid-cols-[100px_1fr] items-start gap-1 text-xs py-0.5">
                <span className="text-muted-foreground truncate pt-0.5">Lost Notes</span>
                <Textarea
                  value={sidebarValues.lost_notes || ""}
                  onChange={(e) => setSidebarValues((p) => ({ ...p, lost_notes: e.target.value }))}
                  onBlur={(e) => void handleFieldSave("lost_notes", e.target.value)}
                  placeholder="Add Lost Notes..."
                  rows={2}
                  className="min-h-[26px] h-6 w-full border-0 bg-transparent px-1 py-0.5 text-xs text-foreground placeholder:text-muted-foreground/60 hover:bg-muted/40 focus:ring-1 focus:ring-ring focus:bg-background rounded resize-none shadow-none"
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Section 3: Organization Details (Collapsible) matching Frappe CRM */}
          <Collapsible open={orgDetailsOpen} onOpenChange={setOrgDetailsOpen} className="space-y-2 border-t pt-3">
            <div className="flex items-center justify-between w-full text-xs font-semibold text-foreground">
              <CollapsibleTrigger className="flex items-center gap-1.5 cursor-pointer hover:text-foreground/80">
                <ChevronDown className={cn("size-3.5 transition-transform", !orgDetailsOpen && "-rotate-90")} />
                <span>Organization Details</span>
              </CollapsibleTrigger>
              <button
                type="button"
                onClick={() => setEditModalOpen(true)}
                className="p-1 text-muted-foreground hover:text-foreground cursor-pointer rounded hover:bg-secondary/50"
                title="Edit Deal in Modal"
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
                    {TERRITORIES.map((t) => (
                      <SelectItem key={t} value={t} className="text-xs cursor-pointer">
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Annual Revenue */}
              <div className="grid grid-cols-[100px_1fr] items-center gap-1 text-xs py-0.5">
                <span className="text-muted-foreground truncate">Annual Revenue</span>
                <Input
                  value={sidebarValues.annual_revenue || ""}
                  onChange={(e) => setSidebarValues((p) => ({ ...p, annual_revenue: e.target.value }))}
                  onBlur={(e) => void handleFieldSave("annual_revenue", e.target.value)}
                  placeholder="Add Annual Revenue..."
                  className="h-6 w-full border-0 bg-transparent px-1 py-0 text-xs text-foreground placeholder:text-muted-foreground/60 hover:bg-muted/40 focus:ring-1 focus:ring-ring focus:bg-background rounded shadow-none"
                />
              </div>

              {/* Closed Date */}
              <div className="grid grid-cols-[100px_1fr] items-center gap-1 text-xs py-0.5">
                <span className="text-muted-foreground truncate">Closed Date</span>
                <Input
                  type="date"
                  value={sidebarValues.closed_date || ""}
                  onChange={(e) => setSidebarValues((p) => ({ ...p, closed_date: e.target.value }))}
                  onBlur={(e) => void handleFieldSave("closed_date", e.target.value)}
                  className="h-6 w-full border-0 bg-transparent px-1 py-0 text-xs text-foreground placeholder:text-muted-foreground/60 hover:bg-muted/40 focus:ring-1 focus:ring-ring focus:bg-background rounded shadow-none"
                />
              </div>

              {/* Probability */}
              <div className="grid grid-cols-[100px_1fr] items-center gap-1 text-xs py-0.5">
                <span className="text-muted-foreground truncate">Probability</span>
                <Input
                  value={sidebarValues.probability || ""}
                  onChange={(e) => setSidebarValues((p) => ({ ...p, probability: e.target.value }))}
                  onBlur={(e) => void handleFieldSave("probability", e.target.value)}
                  placeholder="Add Probability..."
                  className="h-6 w-full border-0 bg-transparent px-1 py-0 text-xs text-foreground placeholder:text-muted-foreground/60 hover:bg-muted/40 focus:ring-1 focus:ring-ring focus:bg-background rounded shadow-none"
                />
              </div>

              {/* Next Step */}
              <div className="grid grid-cols-[100px_1fr] items-center gap-1 text-xs py-0.5">
                <span className="text-muted-foreground truncate">Next Step</span>
                <Input
                  value={sidebarValues.next_step || ""}
                  onChange={(e) => setSidebarValues((p) => ({ ...p, next_step: e.target.value }))}
                  onBlur={(e) => void handleFieldSave("next_step", e.target.value)}
                  placeholder="Add Next Step..."
                  className="h-6 w-full border-0 bg-transparent px-1 py-0 text-xs text-foreground placeholder:text-muted-foreground/60 hover:bg-muted/40 focus:ring-1 focus:ring-ring focus:bg-background rounded shadow-none"
                />
              </div>

              {/* Deal Owner */}
              <div className="grid grid-cols-[100px_1fr] items-center gap-1 text-xs py-0.5">
                <span className="text-muted-foreground truncate">Deal Owner</span>
                <Select
                  value={sidebarValues.deal_owner || undefined}
                  onValueChange={(val) => {
                    setSidebarValues((p) => ({ ...p, deal_owner: val }));
                    void handleFieldSave("deal_owner", val);
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
        </div>
      </div>

      {/* Edit Deal Modal */}
      <DealFormModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        deal={deal}
      />

      {/* Deal Lost Modal */}
      <DealLostModal
        open={lostModalOpen}
        onOpenChange={setLostModalOpen}
        dealNames={[dealId]}
        dealTitle={dealName}
      />

      {/* Create / Edit Quotation Modal */}
      <QuotationFormModal
        open={quotationModalOpen}
        onOpenChange={setQuotationModalOpen}
        quotation={null}
        initialValues={{ party_name: sidebarValues.organization }}
      />
    </div>
  );
}

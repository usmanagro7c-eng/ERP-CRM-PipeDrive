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
import {
  dealDetailOptions,
  dealStatusesOptions,
  useSaveDeal,
  useDeleteDeal,
} from "@/hooks/use-deals";
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
  | "attachments";

function DealDetailPage() {
  const { dealId } = Route.useParams();
  const navigate = useNavigate();

  const { data: deal, isLoading } = useQuery(dealDetailOptions(dealId));
  const { data: stages = [] } = useQuery(dealStatusesOptions());
  const saveMutation = useSaveDeal();
  const deleteMutation = useDeleteDeal();

  const [activeTab, setActiveTab] = useState<TabKey>("comments");
  const [quotationModalOpen, setQuotationModalOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(true);

  const dealName = useMemo(() => {
    if (!deal) return dealId;
    return (
      String(deal["deal_name"] || "") ||
      String(deal["organization_name"] || "") ||
      String(deal["organization"] || "") ||
      dealId
    );
  }, [deal, dealId]);

  const currentStage = String(deal?.["status"] || "Demo/Making");
  const dealValue = Number(deal?.["annual_revenue"] || deal?.["deal_value"] || 0);
  const organization = String(deal?.["organization_name"] || deal?.["organization"] || "");
  const expectedClose = String(deal?.["expected_closure_date"] || deal?.["close_date"] || "");
  const probability = deal?.["probability"] ? `${deal["probability"]}%` : "";
  const pipeline = String(deal?.["pipeline"] || "Standard Sales Pipeline");

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
          <Link to="/deals" className="hover:text-foreground transition-colors font-medium">
            Deals
          </Link>
          <span>/</span>
          <Link to="/deals" className="flex items-center gap-1 hover:text-foreground transition-colors">
            <List className="size-3.5" />
            <span>List</span>
          </Link>
          <span>/</span>
          <span className="font-semibold text-foreground truncate max-w-[200px]">
            {dealName}
          </span>
        </div>

        {/* Top Right Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.info("Enrich feature: Deal intelligence updated")}
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
            onClick={() => setQuotationModalOpen(true)}
            className="h-7 gap-1.5 text-xs font-semibold shadow-xs bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <FileText className="size-3" />
            <span>Create Quotation</span>
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
                  referenceDoctype={api.DEAL_DOCTYPE}
                  referenceName={dealId}
                />
              )}

              {activeTab === "activity" && (
                <RecordActivityFeed
                  referenceDoctype={api.DEAL_DOCTYPE}
                  referenceName={dealId}
                  owner={String(deal["owner"] || "system")}
                  status={currentStage}
                  creation={String(deal["creation"] || "")}
                />
              )}

              {activeTab === "emails" && (
                <RecordEmailsTab
                  referenceDoctype={api.DEAL_DOCTYPE}
                  referenceName={dealId}
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

              {activeTab === "calls" && (
                <RecordCallsTab
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

              {activeTab === "data" && (
                <RecordDataTab data={deal} />
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
            <div className="text-[11px] font-mono font-medium text-muted-foreground">{dealId}</div>
            <div className="flex items-center gap-3 mt-2">
              <div className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-base shadow-xs shrink-0">
                {dealName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-sm text-foreground truncate">{dealName}</h2>
                {organization && (
                  <p className="text-xs text-muted-foreground truncate">{organization}</p>
                )}
              </div>
            </div>

            {/* Quick Action Icons */}
            <div className="flex items-center gap-1.5 mt-3 pt-3 border-t">
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
                title="Delete Deal"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>

          {/* Deal Value & Stage Selector */}
          <div className="space-y-2 border-t pt-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Deal Value</span>
              <span className="font-bold text-foreground">
                PKR {dealValue.toLocaleString("en-PK")}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Stage</span>
              <Select value={currentStage} onValueChange={handleStageChange}>
                <SelectTrigger className="h-7 w-32 text-xs bg-card">
                  <SelectValue placeholder="Stage" />
                </SelectTrigger>
                <SelectContent>
                  {stages.map((s) => (
                    <SelectItem key={s.name} value={s.name} className="text-xs">
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {expectedClose && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Expected Close</span>
                <span className="text-foreground">{expectedClose}</span>
              </div>
            )}
            {probability && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Probability</span>
                <span className="text-foreground">{probability}</span>
              </div>
            )}
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
                <span className="text-muted-foreground">Pipeline</span>
                <span className="text-foreground truncate max-w-[150px]">{pipeline}</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-muted-foreground">Currency</span>
                <span className="text-foreground">PKR</span>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>

      {/* Quotation Creation Modal */}
      <QuotationFormModal
        open={quotationModalOpen}
        onOpenChange={setQuotationModalOpen}
        initialValues={{
          crm_deal: dealId,
          party_name: organization,
        }}
      />
    </div>
  );
}

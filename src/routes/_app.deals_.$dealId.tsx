import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Copy,
  DollarSign,
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
  Plus,
  Send,
  Sparkles,
  StickyNote,
  Trash2,
  TrendingUp,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  dealDetailOptions,
  dealStatusesOptions,
  useSaveDeal,
  useDeleteDeal,
} from "@/hooks/use-deals";
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

interface CommentItem {
  id: string;
  author: string;
  time: string;
  text: string;
}

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
  const [dealInfoOpen, setDealInfoOpen] = useState(true);

  // Comments state
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [commentText, setCommentText] = useState("");
  const [showCommentEditor, setShowCommentEditor] = useState(false);

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

  function handleAddComment() {
    if (!commentText.trim()) return;
    const newComment: CommentItem = {
      id: String(Date.now()),
      author: "Usman (You)",
      time: "Just now",
      text: commentText.trim(),
    };
    setComments((prev) => [newComment, ...prev]);
    setCommentText("");
    setShowCommentEditor(false);
    toast.success("Comment added");
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
              <DropdownMenuItem onClick={() => { setActiveTab("tasks"); toast.info("New task modal"); }}>
                Task
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setActiveTab("calls"); toast.info("Log call modal"); }}>
                Call Log
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setActiveTab("notes"); toast.info("New note modal"); }}>
                Note
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
                <div className="space-y-4 max-w-2xl">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Comments</h3>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowCommentEditor(true)}
                      className="h-7 text-xs gap-1"
                    >
                      <Plus className="size-3" />
                      <span>New Comment</span>
                    </Button>
                  </div>

                  {/* Add Comment Input */}
                  {showCommentEditor && (
                    <div className="space-y-2 rounded-lg border bg-card p-3 shadow-2xs">
                      <Textarea
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Write a comment, note, or @mention a teammate..."
                        className="min-h-[80px] text-xs resize-none border-none focus-visible:ring-0 p-0 shadow-none"
                        autoFocus
                      />
                      <div className="flex items-center justify-between pt-2 border-t">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowCommentEditor(false)}
                          className="h-7 text-xs text-muted-foreground"
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleAddComment}
                          disabled={!commentText.trim()}
                          className="h-7 text-xs gap-1"
                        >
                          <Send className="size-3" />
                          <span>Submit</span>
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Comments Thread or Empty State */}
                  {comments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
                      <MessageSquare className="size-10 stroke-[1.25] text-muted-foreground/40 mb-2" />
                      <p className="text-sm font-medium text-foreground/80">No Comments Found</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Be the first to add one.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {comments.map((c) => (
                        <div key={c.id} className="flex gap-2.5 rounded-lg border bg-card p-3 text-xs">
                          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                            {c.author.charAt(0)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-foreground">{c.author}</span>
                              <span className="text-[10px] text-muted-foreground">{c.time}</span>
                            </div>
                            <p className="mt-1 text-xs text-foreground/90 whitespace-pre-wrap">{c.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "activity" && (
                <div className="space-y-3 max-w-2xl">
                  <h3 className="text-sm font-semibold">Timeline & Activity</h3>
                  <div className="relative pl-6 space-y-4 border-l-2 border-muted ml-2">
                    <div className="relative">
                      <div className="absolute -left-[31px] top-1 size-3 rounded-full bg-primary" />
                      <div className="text-xs">
                        <span className="font-semibold">Deal Created</span>
                        <p className="text-muted-foreground text-[11px]">
                          Created by {String(deal["owner"] || "system")}
                        </p>
                      </div>
                    </div>
                    <div className="relative">
                      <div className="absolute -left-[31px] top-1 size-3 rounded-full bg-blue-500" />
                      <div className="text-xs">
                        <span className="font-semibold">Pipeline Stage</span>
                        <p className="text-muted-foreground text-[11px]">
                          Current Stage: &ldquo;{currentStage}&rdquo;
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "data" && (
                <div className="max-w-3xl space-y-3">
                  <h3 className="text-sm font-semibold">Raw Field Attributes</h3>
                  <div className="rounded-lg border bg-card overflow-hidden text-xs">
                    <div className="divide-y divide-border">
                      {Object.entries(deal)
                        .filter(([key]) => !key.startsWith("_") && typeof deal[key] !== "object")
                        .map(([key, val]) => (
                          <div key={key} className="flex py-2 px-3 justify-between items-center">
                            <span className="font-mono text-muted-foreground">{key}</span>
                            <span className="font-medium text-foreground">{String(val ?? "—")}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab !== "comments" && activeTab !== "activity" && activeTab !== "data" && (
                <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
                  <p className="text-xs font-semibold capitalize text-foreground/80">{activeTab} Section</p>
                  <p className="text-[11px] opacity-75 mt-1">No records or communications logged yet.</p>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Bar: Reply & Comment Actions */}
          <div className="border-t px-4 py-2.5 bg-card/40 flex items-center gap-3">
            <button
              onClick={() => {
                setActiveTab("emails");
                toast.info("Compose email modal");
              }}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <Mail className="size-3.5" />
              <span>Reply</span>
            </button>
            <button
              onClick={() => {
                setActiveTab("comments");
                setShowCommentEditor(true);
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
                onClick={() => {
                  setActiveTab("attachments");
                  toast.info("Attachments tab opened");
                }}
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

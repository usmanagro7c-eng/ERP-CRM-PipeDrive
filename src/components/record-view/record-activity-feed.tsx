import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronRight,
  Clock,
  Plus,
  Sparkles,
  User as UserIcon,
  CheckCircle2,
  PhoneCall,
  StickyNote,
  MessageSquare,
} from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getRecordActivities, type CrmActivityEvent } from "@/lib/api";

interface RecordActivityFeedProps {
  referenceDoctype: string;
  referenceName: string;
  owner?: string;
  status?: string;
  creation?: string;
  onNewTask?: () => void;
  onNewCall?: () => void;
  onNewNote?: () => void;
  onNewComment?: () => void;
}

export function RecordActivityFeed({
  referenceDoctype,
  referenceName,
  owner,
  status,
  creation,
  onNewTask,
  onNewCall,
  onNewNote,
  onNewComment,
}: RecordActivityFeedProps) {
  const { data: rawActivities = [] } = useQuery({
    queryKey: ["record-activities", referenceDoctype, referenceName],
    queryFn: () => getRecordActivities(referenceDoctype, referenceName),
    staleTime: 30 * 1000,
  });

  const [expandedEvents, setExpandedEvents] = useState<Record<number, boolean>>({});

  const toggleExpand = (idx: number) => {
    setExpandedEvents((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const authorName = (email?: string) => {
    if (!email) return "System";
    const prefix = email.split("@")[0] || email;
    return prefix.charAt(0).toUpperCase() + prefix.slice(1);
  };

  const timeAgo = (dateStr?: string) => {
    if (!dateStr) return "recently";
    try {
      const d = parseISO(dateStr.replace(" ", "T"));
      return formatDistanceToNow(d, { addSuffix: true });
    } catch {
      return dateStr.split(" ")[0] || "recently";
    }
  };

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Activity Header with "+ New" button matching Frappe CRM */}
      <div className="flex items-center justify-between border-b pb-3">
        <h3 className="text-sm font-semibold text-foreground">Activity</h3>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1 cursor-pointer font-medium"
            >
              <Plus className="size-3" />
              <span>New</span>
              <ChevronDown className="size-3 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="text-xs w-36">
            <DropdownMenuItem onClick={onNewTask} className="gap-2 cursor-pointer">
              <CheckCircle2 className="size-3.5 text-blue-500" />
              <span>Task</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onNewCall} className="gap-2 cursor-pointer">
              <PhoneCall className="size-3.5 text-rose-500" />
              <span>Call Log</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onNewNote} className="gap-2 cursor-pointer">
              <StickyNote className="size-3.5 text-amber-500" />
              <span>Note</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onNewComment} className="gap-2 cursor-pointer">
              <MessageSquare className="size-3.5 text-emerald-500" />
              <span>Comment</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Activity Timeline List */}
      <div className="space-y-4 pt-1">
        {rawActivities.length > 0 ? (
          rawActivities.map((act, idx) => {
            const author = authorName(act.owner);
            const isCreation = act.activity_type === "creation";
            const isChanged = act.activity_type === "changed";
            const changeData = (act.data && typeof act.data === "object" ? act.data : null) as {
              field_label?: string;
              old_value?: string;
              value?: string;
            } | null;

            return (
              <div key={idx} className="flex items-start gap-3 text-xs">
                {/* Author Avatar Initial */}
                <div className="flex size-7 items-center justify-center rounded-full bg-secondary text-secondary-foreground font-semibold shrink-0">
                  {author.charAt(0)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-foreground">{author}</span>
                      {isCreation && (
                        <span className="text-muted-foreground">created this {referenceDoctype.toLowerCase().replace("crm ", "")}</span>
                      )}
                      {isChanged && changeData && (
                        <button
                          type="button"
                          onClick={() => toggleExpand(idx)}
                          className="inline-flex items-center gap-1 text-primary hover:underline cursor-pointer font-medium"
                        >
                          <span>Show changes</span>
                          {expandedEvents[idx] ? (
                            <ChevronDown className="size-3" />
                          ) : (
                            <ChevronRight className="size-3" />
                          )}
                        </button>
                      )}
                      {!isCreation && !isChanged && (
                        <span className="text-muted-foreground">{String(act.data || act.activity_type)}</span>
                      )}
                    </div>
                    <span className="text-[11px] text-muted-foreground shrink-0">
                      {timeAgo(act.creation)}
                    </span>
                  </div>

                  {/* Expandable Change Diff Box */}
                  {isChanged && changeData && expandedEvents[idx] && (
                    <div className="mt-2 rounded-md border border-border/80 bg-muted/40 p-2.5 text-xs space-y-1">
                      <div className="font-medium text-foreground">
                        {changeData.field_label || "Field"}:
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span className="line-through text-rose-500/80">
                          {changeData.old_value || "(empty)"}
                        </span>
                        <span>→</span>
                        <span className="text-emerald-500 font-medium">
                          {changeData.value || "(empty)"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="space-y-4">
            {/* Fallback default creation event */}
            <div className="flex items-start gap-3 text-xs">
              <div className="flex size-7 items-center justify-center rounded-full bg-secondary text-secondary-foreground font-semibold shrink-0">
                {(owner ? authorName(owner) : "U").charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-foreground">
                      {owner ? authorName(owner) : "Usman"}
                    </span>
                    <span className="text-muted-foreground">created this lead</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {timeAgo(creation)}
                  </span>
                </div>
              </div>
            </div>

            {/* Current status item */}
            <div className="flex items-start gap-3 text-xs">
              <div className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold shrink-0">
                <CheckCircle2 className="size-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-foreground">Status</span>
                    <span className="text-muted-foreground">is currently &quot;{status || "New"}&quot;</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground">current</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronRight,
  Plus,
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
import { AvatarGradient } from "@/components/ui/avatar-gradient";
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
    <div className="flex flex-col h-full max-w-4xl px-1 sm:px-4">
      {/* Activity Header with "+ New ▾" button matching Frappe CRM */}
      <div className="flex shrink-0 items-center justify-between pb-4 pt-2">
        <h2 className="text-2xl font-semibold text-foreground">Activity</h2>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              className="h-7 text-xs font-medium px-2.5 rounded-md gap-1 bg-white text-black hover:bg-neutral-200 dark:bg-white dark:text-black cursor-pointer shadow-xs"
            >
              <Plus className="size-3.5" />
              <span>New</span>
              <ChevronDown className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="text-xs w-36">
            <DropdownMenuItem onClick={onNewTask} className="gap-2 cursor-pointer">
              <CheckCircle2 className="size-3.5 text-blue-500" />
              <span>Task</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onNewCall} className="gap-2 cursor-pointer">
              <PhoneCall className="size-3.5 text-emerald-500" />
              <span>Call Log</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onNewNote} className="gap-2 cursor-pointer">
              <StickyNote className="size-3.5 text-amber-500" />
              <span>Note</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onNewComment} className="gap-2 cursor-pointer">
              <MessageSquare className="size-3.5 text-violet-500" />
              <span>Comment</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Timeline Stream */}
      <div className="relative pl-6 space-y-5 border-l-2 border-border/60 ml-3.5 mt-3 pb-8">
        {/* Creation Event Node (Always shown matching Frappe CRM) */}
        <div className="relative group p-1 -ml-1 rounded-xl transition-colors hover:bg-muted/20">
          <div className="absolute -left-[35px] top-0 ring-4 ring-background rounded-full">
            <AvatarGradient name={authorName(owner)} size="xs" />
          </div>
          <div className="text-xs">
            <span className="font-semibold text-foreground">{authorName(owner)}</span>{" "}
            <span className="text-muted-foreground">
              created this {referenceDoctype.toLowerCase().replace("crm ", "")}
            </span>
            {creation && (
              <span className="text-[11px] text-muted-foreground/70 ml-2">{timeAgo(creation)}</span>
            )}
          </div>
        </div>

        {/* Live Timeline Items from Frappe Backend */}
        {rawActivities.map((event: CrmActivityEvent, idx: number) => {
          const isExpanded = !!expandedEvents[idx];
          const eventData = (event.data && typeof event.data === "object" ? event.data : {}) as {
            changed?: Array<{
              fieldName?: string;
              field_label?: string;
              oldValue?: unknown;
              newValue?: unknown;
            }>;
            added?: unknown[];
            removed?: unknown[];
            field_label?: string;
            old_value?: string;
            value?: string;
          };

          const hasDiff = Boolean(
            (eventData.changed && eventData.changed.length > 0) ||
            (eventData.added && eventData.added.length > 0) ||
            (eventData.removed && eventData.removed.length > 0) ||
            (eventData.field_label &&
              (eventData.value !== undefined || eventData.old_value !== undefined)),
          );

          const author = authorName(event.owner);
          const subject =
            event.activity_type === "creation"
              ? "created this record"
              : event.activity_type === "changed" && eventData.field_label
                ? `updated ${eventData.field_label}`
                : event.activity_type || "updated";

          return (
            <div
              key={idx}
              className="relative group p-1 -ml-1 rounded-xl transition-colors hover:bg-muted/20"
            >
              <div className="absolute -left-[35px] top-0 ring-4 ring-background rounded-full">
                <AvatarGradient name={author} size="xs" />
              </div>

              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold text-foreground">{author}</span>
                  <span className="text-muted-foreground">{subject}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {timeAgo(event.creation)}
                  </span>
                </div>

                {/* Collapsible Changes Diff (matching Frappe CRM "Show changes") */}
                {hasDiff && (
                  <div className="mt-1">
                    <button
                      type="button"
                      onClick={() => toggleExpand(idx)}
                      className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline font-medium cursor-pointer"
                    >
                      <ChevronRight
                        className={`size-3 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                      />
                      <span>{isExpanded ? "Hide changes" : "Show changes"}</span>
                    </button>

                    {isExpanded && (
                      <div className="mt-2 rounded-md border bg-muted/30 p-2.5 space-y-1 text-[11px] font-mono">
                        {eventData.changed && eventData.changed.length > 0 ? (
                          eventData.changed.map((c, ci) => (
                            <div key={ci} className="flex items-center gap-2">
                              <span className="text-muted-foreground font-semibold">
                                {c.fieldName || c.field_label || "field"}:
                              </span>
                              <span className="text-red-500 line-through">
                                {String(c.oldValue ?? "empty")}
                              </span>
                              <span>→</span>
                              <span className="text-emerald-500 font-semibold">
                                {String(c.newValue ?? "empty")}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground font-semibold">
                              {eventData.field_label || "field"}:
                            </span>
                            <span className="text-red-500 line-through">
                              {String(eventData.old_value ?? "empty")}
                            </span>
                            <span>→</span>
                            <span className="text-emerald-500 font-semibold">
                              {String(eventData.value ?? "empty")}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import { useState } from "react";
import { ArrowDownLeft, ArrowUpRight, PhoneCall, Plus, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { callLogsListOptions, useSaveCallLog, useDeleteCallLog } from "@/hooks/use-call-logs";

interface RecordCallsTabProps {
  referenceDoctype: string;
  referenceName: string;
  phoneNumber?: string;
}

export function RecordCallsTab({
  referenceDoctype,
  referenceName,
  phoneNumber,
}: RecordCallsTabProps) {
  const { data: calls = [], isLoading } = useQuery(
    callLogsListOptions({
      reference_doctype: referenceDoctype,
      reference_docname: referenceName,
    }),
  );
  const saveMutation = useSaveCallLog();
  const deleteMutation = useDeleteCallLog();

  const [showLogModal, setShowLogModal] = useState(false);
  const [callType, setCallType] = useState<string>("Outgoing");
  const [callStatus, setCallStatus] = useState<string>("Completed");
  const [durationSec, setDurationSec] = useState<string>("0");
  const [summary, setSummary] = useState<string>("");

  async function handleSaveCall() {
    try {
      await saveMutation.mutateAsync({
        type: callType,
        status: callStatus,
        duration: Number(durationSec) || 0,
        to: phoneNumber || "",
        summary: summary.trim(),
        reference_doctype: referenceDoctype,
        reference_docname: referenceName,
      });
      setSummary("");
      setShowLogModal(false);
    } catch {
      // handled
    }
  }

  function formatDuration(sec?: number) {
    if (!sec) return "0s";
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }

  return (
    <div className="flex flex-col h-full min-h-[460px] max-w-4xl px-1 sm:px-4">
      {/* Calls Header matching Frappe CRM */}
      <div className="flex shrink-0 items-center justify-between pb-4 pt-2">
        <h2 className="text-2xl font-semibold text-foreground">Calls</h2>
        <Button
          size="sm"
          onClick={() => setShowLogModal(true)}
          className="h-7 text-xs font-medium px-2.5 rounded-md gap-1 bg-white text-black hover:bg-neutral-200 dark:bg-white dark:text-black cursor-pointer shadow-xs"
        >
          <Plus className="size-3.5" />
          <span>Log a Call</span>
        </Button>
      </div>

      {showLogModal && (
        <div className="rounded-lg border bg-card p-3.5 space-y-3 shadow-xs mb-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="text-[11px] text-muted-foreground">Type</label>
              <Select value={callType} onValueChange={setCallType}>
                <SelectTrigger className="h-7 text-xs mt-1 bg-secondary/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Outgoing">Outgoing</SelectItem>
                  <SelectItem value="Incoming">Incoming</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground">Outcome</label>
              <Select value={callStatus} onValueChange={setCallStatus}>
                <SelectTrigger className="h-7 text-xs mt-1 bg-secondary/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="No Answer">No Answer</SelectItem>
                  <SelectItem value="Busy">Busy</SelectItem>
                  <SelectItem value="Failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground">Duration (seconds)</label>
              <Input
                type="number"
                value={durationSec}
                onChange={(e) => setDurationSec(e.target.value)}
                className="h-7 text-xs mt-1 bg-secondary/30"
              />
            </div>
          </div>

          <Textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Call notes & key takeaway points..."
            className="text-xs min-h-[75px] resize-none bg-secondary/30"
          />

          <div className="flex justify-end gap-1.5 pt-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowLogModal(false)}
              className="h-7 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveCall}
              disabled={saveMutation.isPending}
              className="h-7 text-xs cursor-pointer"
            >
              {saveMutation.isPending ? "Logging..." : "Save Call Log"}
            </Button>
          </div>
        </div>
      )}

      {calls.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-24 select-none">
          <div className="flex items-center justify-center size-14 rounded-full mb-2">
            <PhoneCall className="size-10 stroke-[1.2] text-muted-foreground/45" />
          </div>
          <p className="text-sm font-medium text-foreground">No Call History</p>
          <p className="text-xs text-muted-foreground mt-1">
            No recent calls to display. Log a call or call someone now!
          </p>
        </div>
      ) : (
        <div className="space-y-3 pb-8">
          {calls.map((c) => (
            <div
              key={c.name}
              className="group flex items-start justify-between rounded-lg border bg-card p-3 text-xs shadow-2xs hover:border-primary/40 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-foreground mt-0.5">
                  {c.type === "Incoming" ? (
                    <ArrowDownLeft className="size-3.5 text-blue-500" />
                  ) : (
                    <ArrowUpRight className="size-3.5 text-emerald-500" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">{c.type || "Call"}</span>
                    <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-normal">
                      {c.status || "Completed"}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground font-mono">
                      ⏱ {formatDuration(c.duration)}
                    </span>
                  </div>
                  {c.to && (
                    <div className="text-[11px] text-muted-foreground mt-0.5">To: {c.to}</div>
                  )}
                  {c.summary && (
                    <p className="text-xs text-foreground/90 mt-1 whitespace-pre-wrap">
                      {c.summary}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => deleteMutation.mutate(c.name)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive cursor-pointer p-0.5"
                title="Delete call log"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

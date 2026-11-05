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
import {
  callLogsListOptions,
  useSaveCallLog,
  useDeleteCallLog,
} from "@/hooks/use-call-logs";

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
  const [callType, setCallType] = useState<string>("Outbound");
  const [callStatus, setCallStatus] = useState<string>("Connected");
  const [durationSec, setDurationSec] = useState<string>("120");
  const [summary, setSummary] = useState<string>("");

  async function handleSaveCall() {
    try {
      await saveMutation.mutateAsync({
        type: callType,
        status: callStatus,
        duration: Number(durationSec) || 60,
        to: phoneNumber || "Customer",
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
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Call Logs ({calls.length})</h3>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowLogModal(true)}
          className="h-7 text-xs gap-1"
        >
          <Plus className="size-3" />
          <span>Log Call</span>
        </Button>
      </div>

      {showLogModal && (
        <div className="rounded-lg border bg-card p-3 space-y-3 shadow-2xs">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[11px] text-muted-foreground">Type</label>
              <Select value={callType} onValueChange={setCallType}>
                <SelectTrigger className="h-7 text-xs mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Outbound">Outbound</SelectItem>
                  <SelectItem value="Inbound">Inbound</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground">Outcome</label>
              <Select value={callStatus} onValueChange={setCallStatus}>
                <SelectTrigger className="h-7 text-xs mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Connected">Connected</SelectItem>
                  <SelectItem value="No Answer">No Answer</SelectItem>
                  <SelectItem value="Busy">Busy</SelectItem>
                  <SelectItem value="Wrong Number">Wrong Number</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground">Duration (seconds)</label>
              <Input
                type="number"
                value={durationSec}
                onChange={(e) => setDurationSec(e.target.value)}
                className="h-7 text-xs mt-1"
              />
            </div>
          </div>

          <Textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Call notes & key takeaway points..."
            className="text-xs min-h-[70px] resize-none"
          />

          <div className="flex justify-end gap-1.5 pt-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowLogModal(false)}
              className="h-7 text-xs text-muted-foreground"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveCall}
              disabled={saveMutation.isPending}
              className="h-7 text-xs"
            >
              {saveMutation.isPending ? "Logging..." : "Save Log"}
            </Button>
          </div>
        </div>
      )}

      {calls.length === 0 ? (
        <div className="py-12 text-center text-xs text-muted-foreground">
          No calls recorded for this record yet.
        </div>
      ) : (
        <div className="divide-y divide-border rounded-lg border bg-card overflow-hidden">
          {calls.map((c) => (
            <div
              key={c.name}
              className="group flex items-center justify-between p-3 text-xs hover:bg-muted/40 transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex size-7 items-center justify-center rounded-full bg-muted text-foreground shrink-0">
                  {c.type === "Inbound" ? (
                    <ArrowDownLeft className="size-3.5 text-blue-500" />
                  ) : (
                    <ArrowUpRight className="size-3.5 text-emerald-500" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">
                      {c.type} Call ({formatDuration(c.duration)})
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1 py-0 h-4 border-muted-foreground/30"
                    >
                      {c.status}
                    </Badge>
                  </div>
                  {c.summary && (
                    <p className="mt-0.5 text-muted-foreground truncate">{c.summary}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] text-muted-foreground">
                  {c.creation?.split(" ")[0]}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteMutation.mutate(c.name)}
                  className="size-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                  title="Delete call log"
                >
                  <Trash2 className="size-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

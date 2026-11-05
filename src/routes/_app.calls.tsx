import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  Loader2,
  PhoneCall,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  type CrmCallLog,
} from "@/hooks/use-call-logs";

export const Route = createFileRoute("/_app/calls")({
  head: () => ({ meta: [{ title: "Call Logs · AgroCRM" }] }),
  component: CallLogsPage,
});

function CallLogsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const { data: calls = [], isLoading } = useQuery(
    callLogsListOptions({ search: searchTerm || undefined }),
  );
  const saveMutation = useSaveCallLog();
  const deleteMutation = useDeleteCallLog();

  const [modalOpen, setModalOpen] = useState(false);
  const [callType, setCallType] = useState<string>("Outbound");
  const [callStatus, setCallStatus] = useState<string>("Connected");
  const [durationSec, setDurationSec] = useState("180");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [summary, setSummary] = useState("");

  function formatDuration(sec?: number) {
    if (!sec) return "0s";
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }

  function getStatusBadge(status?: string) {
    switch (status?.toLowerCase()) {
      case "connected":
        return "bg-emerald-500/10 text-emerald-600 border-emerald-200";
      case "no answer":
        return "bg-amber-500/10 text-amber-600 border-amber-200";
      case "busy":
        return "bg-rose-500/10 text-rose-600 border-rose-200";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  }

  async function handleSaveCall(e: React.FormEvent) {
    e.preventDefault();
    await saveMutation.mutateAsync({
      type: callType,
      status: callStatus,
      duration: Number(durationSec) || 60,
      to: phoneNumber || "Customer",
      summary: summary.trim(),
    });
    setModalOpen(false);
    setPhoneNumber("");
    setSummary("");
  }

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6 max-w-7xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Call Logs</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Outbound and inbound customer phone calls, recordings, and duration logs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search call logs..."
              className="pl-8 text-xs h-8"
            />
          </div>
          <Button size="sm" onClick={() => setModalOpen(true)} className="h-8 gap-1.5 text-xs">
            <Plus className="size-3.5" />
            <span>Log Call</span>
          </Button>
        </div>
      </div>

      {/* Content Area */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      ) : calls.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-12 text-center bg-card/40 my-8">
          <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
            <PhoneCall className="size-6" />
          </div>
          <h3 className="text-sm font-semibold">No call records found</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            Record client conversations and follow-up outcomes here or directly from Leads and Deals.
          </p>
          <Button size="sm" onClick={() => setModalOpen(true)} className="mt-4 h-8 text-xs gap-1">
            <Plus className="size-3.5" />
            <span>Log Call</span>
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <Table className="text-xs">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-12"></TableHead>
                <TableHead className="font-semibold">Type</TableHead>
                <TableHead className="font-semibold">Phone Number / Contact</TableHead>
                <TableHead className="font-semibold">Outcome</TableHead>
                <TableHead className="font-semibold">Duration</TableHead>
                <TableHead className="font-semibold">Summary & Notes</TableHead>
                <TableHead className="font-semibold">Date</TableHead>
                <TableHead className="w-10 text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {calls.map((c) => (
                <TableRow key={c.name} className="hover:bg-muted/40 transition-colors">
                  <TableCell className="py-2.5">
                    <div className="flex size-7 items-center justify-center rounded-full bg-muted">
                      {c.type === "Inbound" ? (
                        <ArrowDownLeft className="size-3.5 text-blue-500" />
                      ) : (
                        <ArrowUpRight className="size-3.5 text-emerald-500" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-2.5 font-medium">{c.type}</TableCell>
                  <TableCell className="py-2.5 font-mono text-muted-foreground">
                    {c.to || c.from || "—"}
                  </TableCell>
                  <TableCell className="py-2.5">
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-1.5 py-0 h-4 ${getStatusBadge(c.status)}`}
                    >
                      {c.status || "Completed"}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-2.5 text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" />
                      <span>{formatDuration(c.duration)}</span>
                    </span>
                  </TableCell>
                  <TableCell className="py-2.5 max-w-[250px] truncate text-muted-foreground">
                    {c.summary || "—"}
                  </TableCell>
                  <TableCell className="py-2.5 text-muted-foreground">
                    {c.creation?.split(" ")[0] || "—"}
                  </TableCell>
                  <TableCell className="py-2.5 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(c.name)}
                      className="size-7 text-muted-foreground hover:text-destructive"
                      title="Delete log"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Log Call Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSaveCall}>
            <DialogHeader>
              <DialogTitle className="text-base font-semibold">Log Phone Call</DialogTitle>
              <DialogDescription className="text-xs">
                Record details and duration of a client or prospect phone call.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-semibold text-xs">Direction</label>
                  <Select value={callType} onValueChange={setCallType}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Outbound">Outbound Call</SelectItem>
                      <SelectItem value="Inbound">Inbound Call</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-xs">Outcome Status</label>
                  <Select value={callStatus} onValueChange={setCallStatus}>
                    <SelectTrigger className="h-8 text-xs">
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
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-semibold text-xs">Phone Number / Contact</label>
                  <Input
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+92 300 1234567"
                    className="h-8 text-xs font-mono"
                    autoFocus
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-xs">Duration (seconds)</label>
                  <Input
                    type="number"
                    value={durationSec}
                    onChange={(e) => setDurationSec(e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-xs">Call Summary & Notes</label>
                <Textarea
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Discussed pricing, quotation terms, and schedule..."
                  className="min-h-[80px] text-xs resize-none"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalOpen(false)}
                className="text-xs h-8"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={saveMutation.isPending}
                className="text-xs h-8 gap-1"
              >
                {saveMutation.isPending && <Loader2 className="size-3 animate-spin" />}
                <span>Save Call Log</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

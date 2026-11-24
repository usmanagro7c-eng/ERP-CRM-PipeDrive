import { useState, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  Loader2,
  MoreVertical,
  PhoneCall,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { callLogsListOptions, useDeleteCallLog, type CrmCallLog } from "@/hooks/use-call-logs";
import { CallFormModal } from "@/components/calls/call-form-modal";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/calls")({
  head: () => ({ meta: [{ title: "Call Logs · AgroCRM" }] }),
  component: CallLogsPage,
});

const CALL_TYPES = ["Outbound", "Inbound"];
const CALL_STATUSES = ["Connected", "No Answer", "Busy", "Failed"];

function formatRelativeTime(dateStr: unknown): string {
  if (!dateStr || typeof dateStr !== "string") return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays === 0) {
      if (diffHours === 0) {
        if (diffMin <= 1) return "just now";
        return `${diffMin}m ago`;
      }
      return `${diffHours}h ago`;
    }
    if (diffDays === 1) return "yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} ${weeks === 1 ? "week" : "weeks"} ago`;
    }
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  } catch {
    return String(dateStr);
  }
}

function formatDuration(sec?: number) {
  if (!sec) return "0s";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function StatusBadge({ status }: { status?: string | undefined }) {
  const s = (status || "Connected").trim().toLowerCase();
  let color = "bg-muted text-muted-foreground border-border/40";
  if (s === "connected") {
    color =
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800";
  } else if (s === "no answer") {
    color =
      "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border-amber-200 dark:border-amber-800";
  } else if (s === "busy" || s === "failed") {
    color =
      "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border-rose-200 dark:border-rose-800";
  }

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border",
        color,
      )}
    >
      {status || "Connected"}
    </span>
  );
}

function CallLogsPage() {
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [fromFilter, setFromFilter] = useState<string>("");
  const [toFilter, setToFilter] = useState<string>("");
  const [pageSize, setPageSize] = useState<number>(20);

  const { data: calls = [], isLoading, refetch } = useQuery(callLogsListOptions());
  const deleteMutation = useDeleteCallLog();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCall, setEditingCall] = useState<CrmCallLog | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CrmCallLog | null>(null);

  // Filter call logs locally
  const filteredCalls = useMemo(() => {
    return calls.filter((c) => {
      if (filterType !== "all" && c.type !== filterType) return false;
      if (filterStatus !== "all" && c.status !== filterStatus) return false;
      if (
        fromFilter.trim() &&
        !(c.from || "").toLowerCase().includes(fromFilter.trim().toLowerCase())
      ) {
        return false;
      }
      if (toFilter.trim() && !(c.to || "").toLowerCase().includes(toFilter.trim().toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [calls, filterType, filterStatus, fromFilter, toFilter]);

  const hasActiveFilters = Boolean(
    filterType !== "all" || filterStatus !== "all" || fromFilter.trim() || toFilter.trim(),
  );

  function handleOpenCreate() {
    setEditingCall(null);
    setModalOpen(true);
  }

  function handleOpenEdit(call: CrmCallLog) {
    setEditingCall(call);
    setModalOpen(true);
  }

  return (
    <div className="flex h-full flex-col bg-background overflow-hidden">
      <div className="shrink-0 border-b border-border/70 bg-card/40 px-3 py-3 sm:px-6 sm:py-4 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground">Call Logs</h1>
              <span className="text-xs font-medium text-muted-foreground tabular-nums">{filteredCalls.length}</span>
            </div>
            <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">Track inbound, outbound, and missed calls.</p>
          </div>
          <Button size="sm" onClick={handleOpenCreate} className="h-9 sm:h-8 px-3 sm:px-3.5 gap-1.5 text-xs font-semibold shrink-0">
            <Plus className="size-3.5" />
            <span>New</span>
          </Button>
        </div>

        <div className="mt-3 flex flex-col gap-2">
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger aria-label="Filter by type" className="h-9 sm:h-8 text-xs sm:w-[120px] bg-background/70 border-border/70">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All types</SelectItem>
                {CALL_TYPES.map((t) => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger aria-label="Filter by status" className="h-9 sm:h-8 text-xs sm:w-[130px] bg-background/70 border-border/70">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All statuses</SelectItem>
                {CALL_STATUSES.map((s) => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
              </SelectContent>
            </Select>

            <Input value={fromFilter} onChange={(e) => setFromFilter(e.target.value)} placeholder="From number" className="h-9 sm:h-8 text-sm sm:text-xs sm:w-[150px] bg-background/70 border-border/70" />
            <Input value={toFilter} onChange={(e) => setToFilter(e.target.value)} placeholder="To number" className="h-9 sm:h-8 text-sm sm:text-xs sm:w-[150px] bg-background/70 border-border/70" />
          </div>

          <div className="flex items-center gap-1 ml-auto">
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={() => { setFilterType("all"); setFilterStatus("all"); setFromFilter(""); setToFilter(""); }} className="h-9 sm:h-8 px-2.5 text-xs text-muted-foreground" aria-label="Clear all call log filters">
                <X className="size-3.5 sm:mr-1" />
                <span className="hidden sm:inline">Clear</span>
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => void refetch()} className="size-9 sm:size-8 text-muted-foreground" title="Refresh" aria-label="Refresh call logs">
              <RefreshCw className="size-4 sm:size-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Canvas Body */}
      <div className="flex-1 flex flex-col min-h-0">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="size-7 animate-spin text-muted-foreground" />
          </div>
        ) : filteredCalls.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-16 max-w-md mx-auto flex-1 px-4">
            <div className="size-12 rounded-2xl bg-muted/60 border border-border/60 flex items-center justify-center text-muted-foreground mb-3">
              <PhoneCall className="size-5" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">No call logs found</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm leading-relaxed">
              Log calls manually or sync them from your telephony provider.
            </p>
            <Button size="sm" onClick={handleOpenCreate} className="mt-4 h-9 sm:h-8 text-xs font-semibold px-4 gap-1.5">
              <Plus className="size-3.5" />
              <span>Create call log</span>
            </Button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <Table className="min-w-[640px] md:min-w-[750px]">
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-border/70 text-muted-foreground text-xs">
                  <TableHead className="w-[12%]">ID</TableHead>
                  <TableHead className="w-[12%]">Type</TableHead>
                  <TableHead className="w-[14%]">Status</TableHead>
                  <TableHead className="w-[12%]">Duration</TableHead>
                  <TableHead className="hidden md:table-cell w-[18%]">From</TableHead>
                  <TableHead className="w-[18%]">To</TableHead>
                  <TableHead className="hidden md:table-cell w-[14%] text-right pr-4">
                    Last Modified
                  </TableHead>
                  <TableHead className="w-[40px] text-right pr-2" />
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredCalls.map((c) => {
                  const isOutbound = c.type === "Outbound";
                  return (
                    <TableRow
                      key={c.name}
                      onClick={() => handleOpenEdit(c)}
                      className="group cursor-pointer hover:bg-muted/40 transition-colors border-b border-border/50 h-10"
                    >
                      {/* ID */}
                      <TableCell className="text-xs font-mono font-medium text-foreground py-2 truncate">
                        <span className="hover:underline">{c.name}</span>
                      </TableCell>

                      {/* Type */}
                      <TableCell className="text-xs py-2">
                        <div className="flex items-center gap-1.5">
                          {isOutbound ? (
                            <ArrowUpRight className="size-3.5 text-blue-500" />
                          ) : (
                            <ArrowDownLeft className="size-3.5 text-emerald-500" />
                          )}
                          <span className="font-medium text-foreground">
                            {c.type || "Outbound"}
                          </span>
                        </div>
                      </TableCell>

                      {/* Status */}
                      <TableCell className="py-2">
                        <StatusBadge status={c.status} />
                      </TableCell>

                      {/* Duration */}
                      <TableCell className="text-xs text-muted-foreground py-2">
                        <div className="flex items-center gap-1">
                          <Clock className="size-3" />
                          <span>{formatDuration(c.duration)}</span>
                        </div>
                      </TableCell>

                      {/* From */}
                      <TableCell className="hidden md:table-cell text-xs font-mono text-muted-foreground py-2 truncate">
                        {c.from || "-"}
                      </TableCell>

                      {/* To */}
                      <TableCell className="text-xs font-mono text-foreground font-medium py-2 truncate">
                        {c.to || "-"}
                      </TableCell>

                      {/* Last Modified */}
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground text-right pr-4 py-2">
                        {formatRelativeTime(c.creation)}
                      </TableCell>

                      {/* Dropdown Menu Actions */}
                      <TableCell
                        className="text-right pr-2 py-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                              aria-label="More actions"
                            >
                              <MoreVertical className="size-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40 text-xs">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleOpenEdit(c)}>
                              Edit Call Log
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeleteTarget(c)}
                            >
                              <Trash2 className="size-3.5 mr-1.5" />
                              <span>Delete</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Footer Pagination matching CRM Backend */}
        <div className="border-t border-border px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-y-2 text-xs text-muted-foreground bg-card/20 shrink-0">
          {/* Page size toggle pills: 20 | 50 | 100 */}
          <div className="flex items-center gap-1 bg-muted/40 p-0.5 rounded-md border border-border/60">
            {[20, 50, 100].map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setPageSize(size)}
                className={cn(
                  "px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer",
                  pageSize === size
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {size}
              </button>
            ))}
          </div>

          {/* Count e.g. "X of Y" */}
          <div className="text-xs font-medium text-muted-foreground">
            {filteredCalls.length} of {calls.length}
          </div>
        </div>
      </div>

      {/* Call Log Form Modal */}
      <CallFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        callLog={editingCall}
        onSuccess={() => void refetch()}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !deleteMutation.isPending) setDeleteTarget(null);
        }}
        title={`Delete call log ${deleteTarget?.name || ""}?`}
        description="This call log will be permanently removed. This action cannot be undone."
        pending={deleteMutation.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          const name = deleteTarget.name;
          void deleteMutation.mutateAsync(name).finally(() => setDeleteTarget(null));
        }}
      />
    </div>
  );
}

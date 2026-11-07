import { useState, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDownLeft,
  ArrowUpDown,
  ArrowUpRight,
  Clock,
  Columns3,
  Filter,
  List,
  Loader2,
  MoreVertical,
  PhoneCall,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  callLogsListOptions,
  useDeleteCallLog,
  type CrmCallLog,
} from "@/hooks/use-call-logs";
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
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
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
    color = "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800";
  } else if (s === "no answer") {
    color = "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border-amber-200 dark:border-amber-800";
  } else if (s === "busy" || s === "failed") {
    color = "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border-rose-200 dark:border-rose-800";
  }

  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border", color)}>
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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Filter call logs locally
  const filteredCalls = useMemo(() => {
    return calls.filter((c) => {
      if (filterType !== "all" && c.type !== filterType) return false;
      if (filterStatus !== "all" && c.status !== filterStatus) return false;
      if (fromFilter.trim() && !(c.from || "").toLowerCase().includes(fromFilter.trim().toLowerCase())) {
        return false;
      }
      if (toFilter.trim() && !(c.to || "").toLowerCase().includes(toFilter.trim().toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [calls, filterType, filterStatus, fromFilter, toFilter]);

  const allIds = filteredCalls.map((c) => c.name);
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.includes(id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(allIds);
    }
  };

  const toggleSelectRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

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
      {/* Top Banner Matching Frappe CRM */}
      <div className="flex items-center justify-between border-b border-border px-6 py-2.5 bg-card/60 backdrop-blur-xs">
        {/* Breadcrumb: Call Logs / ☰ List */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link to="/calls" className="hover:text-foreground transition-colors font-medium">
            Call Logs
          </Link>
          <span className="opacity-60">/</span>
          <button
            type="button"
            className="flex items-center gap-1 text-foreground font-semibold hover:text-foreground/80 cursor-pointer"
          >
            <List className="size-3.5" />
            <span>List</span>
          </button>
        </div>

        {/* Right Action: Solid Black "+ Create" Button matching Frappe CRM */}
        <Button
          size="sm"
          onClick={handleOpenCreate}
          className="h-7 text-xs font-medium px-3 rounded-md bg-foreground text-background hover:bg-foreground/90 cursor-pointer shadow-xs gap-1.5 transition-colors"
        >
          <Plus className="size-3.5" />
          <span>Create</span>
        </Button>
      </div>

      {/* Filter Bar Matching Frappe CRM */}
      <div className="border-b border-border/80 px-6 py-2 bg-card/20 flex flex-wrap items-center justify-between gap-3">
        {/* Left Inputs */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Type Dropdown */}
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="h-7 text-xs w-28 bg-muted/30 border-border/60 cursor-pointer text-muted-foreground">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs cursor-pointer">
                Type: All
              </SelectItem>
              {CALL_TYPES.map((t) => (
                <SelectItem key={t} value={t} className="text-xs cursor-pointer">
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status Dropdown */}
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-7 text-xs w-28 bg-muted/30 border-border/60 cursor-pointer text-muted-foreground">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs cursor-pointer">
                Status: All
              </SelectItem>
              {CALL_STATUSES.map((s) => (
                <SelectItem key={s} value={s} className="text-xs cursor-pointer">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* From Number Input */}
          <div className="relative w-36 sm:w-44">
            <Input
              value={fromFilter}
              onChange={(e) => setFromFilter(e.target.value)}
              placeholder="From Number"
              className="h-7 text-xs bg-muted/30 border-border/60 placeholder:text-muted-foreground focus:bg-background"
            />
          </div>

          {/* To Number Input */}
          <div className="relative w-36 sm:w-44">
            <Input
              value={toFilter}
              onChange={(e) => setToFilter(e.target.value)}
              placeholder="To Number"
              className="h-7 text-xs bg-muted/30 border-border/60 placeholder:text-muted-foreground focus:bg-background"
            />
          </div>
        </div>

        {/* Right Toolbar Actions */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => void refetch()}
            className="size-7 text-muted-foreground hover:text-foreground cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className="size-3.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground border-border/60 cursor-pointer gap-1.5"
          >
            <Filter className="size-3.5" />
            <span>Filter</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground border-border/60 cursor-pointer gap-1.5"
          >
            <ArrowUpDown className="size-3.5" />
            <span>Sort</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground border-border/60 cursor-pointer gap-1.5"
          >
            <Columns3 className="size-3.5" />
            <span>Columns</span>
          </Button>
        </div>
      </div>

      {/* Main Canvas Body */}
      <div className="flex-1 flex flex-col min-h-0">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        ) : filteredCalls.length === 0 ? (
          /* Empty State Matching Frappe CRM */
          <div className="flex flex-col items-center justify-center text-center py-20 max-w-md mx-auto flex-1">
            <div className="size-12 rounded-xl bg-muted flex items-center justify-center text-muted-foreground mb-3">
              <PhoneCall className="size-6" />
            </div>
            <h3 className="text-base font-semibold text-foreground">No call logs yet</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm leading-relaxed">
              Calls made through Twilio or Exotel are logged here, along with calls you log by hand on a lead or deal.
            </p>
            <Button
              size="sm"
              onClick={handleOpenCreate}
              className="mt-4 h-8 text-xs font-medium px-4 rounded-md bg-foreground text-background hover:bg-foreground/90 cursor-pointer shadow-xs gap-1.5 transition-colors"
            >
              <Plus className="size-3.5" />
              <span>Create</span>
            </Button>
          </div>
        ) : (
          /* Call Logs Table Matching Frappe CRM */
          <div className="flex-1 overflow-y-auto">
            <Table className="min-w-[750px]">
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-border/70 text-muted-foreground text-xs">
                  {/* Checkbox */}
                  <TableHead className="w-[40px] pl-4">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead className="w-[12%]">ID</TableHead>
                  <TableHead className="w-[12%]">Type</TableHead>
                  <TableHead className="w-[14%]">Status</TableHead>
                  <TableHead className="w-[12%]">Duration</TableHead>
                  <TableHead className="w-[18%]">From</TableHead>
                  <TableHead className="w-[18%]">To</TableHead>
                  <TableHead className="w-[14%] text-right pr-4">Last Modified</TableHead>
                  <TableHead className="w-[40px] text-right pr-2" />
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredCalls.map((c) => {
                  const isSelected = selectedIds.includes(c.name);
                  const isOutbound = c.type === "Outbound";
                  return (
                    <TableRow
                      key={c.name}
                      onClick={() => handleOpenEdit(c)}
                      className={cn(
                        "group cursor-pointer hover:bg-muted/40 transition-colors border-b border-border/50 h-10",
                        isSelected && "bg-muted/30",
                      )}
                    >
                      {/* Checkbox */}
                      <TableCell className="w-[40px] pl-4 py-2" onClick={(e) => toggleSelectRow(c.name, e)}>
                        <Checkbox checked={isSelected} aria-label={`Select ${c.name}`} />
                      </TableCell>

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
                          <span className="font-medium text-foreground">{c.type || "Outbound"}</span>
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
                      <TableCell className="text-xs font-mono text-muted-foreground py-2 truncate">
                        {c.from || "-"}
                      </TableCell>

                      {/* To */}
                      <TableCell className="text-xs font-mono text-foreground font-medium py-2 truncate">
                        {c.to || "-"}
                      </TableCell>

                      {/* Last Modified */}
                      <TableCell className="text-xs text-muted-foreground text-right pr-4 py-2">
                        {formatRelativeTime(c.creation)}
                      </TableCell>

                      {/* Dropdown Menu Actions */}
                      <TableCell className="text-right pr-2 py-2" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
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
                              onClick={() => {
                                if (window.confirm(`Are you sure you want to delete call log "${c.name}"?`)) {
                                  void deleteMutation.mutate(c.name);
                                }
                              }}
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

        {/* Footer Pagination matching Frappe CRM */}
        <div className="border-t border-border px-6 py-2.5 flex items-center justify-between text-xs text-muted-foreground bg-card/20 shrink-0">
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
    </div>
  );
}

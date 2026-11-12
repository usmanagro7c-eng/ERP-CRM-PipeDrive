import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  Columns3,
  LayoutGrid,
  LayoutList,
  Plus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SalesOrderTable } from "@/components/sales-orders/sales-order-table";
import { SalesOrderKanban } from "@/components/sales-orders/sales-order-kanban";
import { SalesOrderGrid } from "@/components/sales-orders/sales-order-grid";
import { SalesOrderFormModal } from "@/components/sales-orders/sales-order-form-modal";
import {
  salesOrderCountOptions,
  salesOrderListOptions,
  type SalesOrder,
} from "@/hooks/use-sales-orders";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;
const KANBAN_PAGE_SIZE = 100;
const VIEW_STORAGE_KEY = "agrocrm.sales-orders.view";

export type ViewMode = "table" | "kanban" | "grid";

interface SalesOrderSearch {
  q?: string | undefined;
  page?: number | undefined;
  view?: ViewMode | undefined;
  status?: string | undefined;
}

const SALES_ORDER_STATUSES = [
  "Draft",
  "To Deliver and Bill",
  "To Deliver",
  "To Bill",
  "Completed",
  "Cancelled",
  "Closed",
];

function loadSavedView(): ViewMode {
  try {
    const raw = window.localStorage.getItem(VIEW_STORAGE_KEY);
    if (raw === "table" || raw === "kanban" || raw === "grid") return raw;
    return "table";
  } catch {
    return "table";
  }
}

function saveView(view: ViewMode) {
  try {
    window.localStorage.setItem(VIEW_STORAGE_KEY, view);
  } catch {
    // storage unavailable
  }
}

export const Route = createFileRoute("/_app/sales-orders")({
  head: () => ({ meta: [{ title: "Sales Orders · AgroCRM" }] }),
  validateSearch: (search: Record<string, unknown>): SalesOrderSearch => {
    const s: SalesOrderSearch = {};
    if (typeof search["q"] === "string" && search["q"].trim()) {
      s.q = search["q"].trim();
    }
    const p = Number(search["page"]);
    if (Number.isInteger(p) && p > 1) {
      s.page = p;
    }
    if (search["view"] === "table" || search["view"] === "kanban" || search["view"] === "grid") {
      s.view = search["view"];
    }
    if (typeof search["status"] === "string" && search["status"].trim()) {
      s.status = search["status"].trim();
    }
    return s;
  },
  component: SalesOrdersPage,
});

function SalesOrdersPage() {
  const navigate = Route.useNavigate();
  const search = Route.useSearch();
  const q = search.q ?? "";
  const page = search.page ?? 1;

  const [term, setTerm] = useState(q);
  const [localView, setLocalView] = useState<ViewMode>(search.view ?? "table");
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE);
  const [statusFilter, setStatusFilter] = useState<string>(search.status ?? "");

  const [createOpen, setCreateOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);

  useEffect(() => {
    if (!search.view) {
      const saved = loadSavedView();
      if (saved !== "table") {
        setLocalView(saved);
        void navigate({ search: (prev) => ({ ...prev, view: saved }) });
      }
    }
  }, [search.view, navigate]);

  useEffect(() => {
    setTerm(q);
  }, [q]);

  const activeView: ViewMode = search.view ?? localView;

  const filters: Array<[string, string, string]> = useMemo(() => {
    const list: Array<[string, string, string]> = [];
    if (statusFilter) {
      list.push(["status", "=", statusFilter]);
    }
    return list;
  }, [statusFilter]);

  const listVariables = {
    search: q,
    filters,
    limit: activeView === "kanban" ? KANBAN_PAGE_SIZE : pageSize,
    start: activeView === "kanban" ? 0 : (page - 1) * pageSize,
    orderBy: "modified desc",
  };

  const {
    data: orders = [],
    isLoading,
    isFetching,
    refetch,
  } = useQuery(salesOrderListOptions(listVariables));

  const { data: totalCount = 0 } = useQuery(salesOrderCountOptions(q, filters));

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const firstRow = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastRow = Math.min(page * pageSize, totalCount);

  function handleViewChange(mode: ViewMode) {
    setLocalView(mode);
    saveView(mode);
    void navigate({
      search: (prev) => ({ ...prev, view: mode, page: undefined }),
    });
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    void navigate({
      search: (prev) => ({ ...prev, q: term.trim() || undefined, page: undefined }),
    });
  }

  function handleStatusChange(val: string) {
    const nextStatus = val === "all" ? "" : val;
    setStatusFilter(nextStatus);
    void navigate({
      search: (prev) => ({
        ...prev,
        status: nextStatus || undefined,
        page: undefined,
      }),
    });
  }

  function handlePageChange(newPage: number) {
    void navigate({
      search: (prev) => ({ ...prev, page: newPage > 1 ? newPage : undefined }),
    });
  }

  function handleOpenCreate() {
    setSelectedOrder(null);
    setCreateOpen(true);
  }

  function handleEditOrder(order: SalesOrder) {
    setSelectedOrder(order);
    setCreateOpen(true);
  }

  const viewOptions = [
    { mode: "table" as const, label: "List", icon: LayoutList },
    { mode: "kanban" as const, label: "Kanban", icon: Columns3 },
    { mode: "grid" as const, label: "Cards", icon: LayoutGrid },
  ] as const;

  const currentViewObj = viewOptions.find((v) => v.mode === activeView) ?? viewOptions[0];
  const CurrentIcon = currentViewObj.icon;

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Top Banner Matching Frappe CRM */}
      <div className="flex items-center justify-between border-b border-border bg-card/60 px-3 sm:px-6 py-2 sm:py-2.5 backdrop-blur-xs shrink-0 gap-2 sm:gap-3 min-h-[42px] sm:min-h-[48px]">
        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
          <span className="font-medium text-foreground truncate">Sales Orders</span>
          <span className="text-muted-foreground/60">/</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1 sm:gap-1.5 font-medium text-foreground hover:text-primary transition-colors cursor-pointer text-xs sm:text-sm truncate">
                <CurrentIcon className="size-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">{currentViewObj.label}</span>
                <ChevronDown className="size-3 text-muted-foreground shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44 text-xs">
              <DropdownMenuLabel>Switch View</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {viewOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = activeView === opt.mode;
                return (
                  <DropdownMenuItem
                    key={opt.mode}
                    onClick={() => handleViewChange(opt.mode)}
                    className="flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="size-4 text-muted-foreground" />
                      <span>{opt.label}</span>
                    </div>
                    {isSelected && <Check className="size-3.5 text-primary" />}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            onClick={handleOpenCreate}
            className="h-7 text-xs font-medium px-2.5 sm:px-3 rounded-md bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-black cursor-pointer shadow-xs gap-1 sm:gap-1.5"
          >
            <Plus className="size-3.5" />
            <span>Create</span>
          </Button>
        </div>
      </div>

      {/* Secondary Filter Toolbar Matching Frappe CRM */}
      <div className="flex items-center justify-between border-b border-border bg-background px-3 sm:px-6 py-1.5 sm:py-2 gap-2 sm:gap-3 shrink-0">
        <div className="flex items-center gap-1.5 sm:gap-2 text-xs flex-1 min-w-0">
          {/* Search Input */}
          <form
            onSubmit={handleSearchSubmit}
            className="relative flex-1 min-w-[110px] max-w-[180px] sm:w-56"
          >
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Customer / ID..."
              className="h-7 pl-8 pr-2 text-xs bg-muted/40 border-border/60 rounded-md"
            />
          </form>

          {/* Status Quick Filter */}
          <Select value={statusFilter || "all"} onValueChange={handleStatusChange}>
            <SelectTrigger
              aria-label="Filter by status"
              className="h-7 text-xs px-2 sm:px-2.5 bg-muted/40 border-border/60 rounded-md cursor-pointer gap-1 w-auto min-w-[85px] sm:min-w-[120px]"
            >
              <span className="text-muted-foreground hidden sm:inline">Status:</span>
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                All Statuses
              </SelectItem>
              {SALES_ORDER_STATUSES.map((s) => (
                <SelectItem key={s} value={s} className="text-xs">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            className="h-7 w-7 p-0 sm:w-auto sm:px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div
        className={cn(
          "flex-1 min-h-0 flex flex-col",
          activeView === "kanban"
            ? "overflow-hidden p-4 sm:p-6 pb-2"
            : "overflow-y-auto p-4 sm:p-6",
        )}
      >
        {activeView === "kanban" ? (
          <SalesOrderKanban
            rows={orders}
            loading={isLoading}
            onEdit={handleEditOrder}
            onAddOrder={handleOpenCreate}
          />
        ) : activeView === "grid" ? (
          <SalesOrderGrid
            rows={orders}
            loading={isLoading}
            onEdit={handleEditOrder}
            onCreate={handleOpenCreate}
          />
        ) : (
          <SalesOrderTable
            rows={orders}
            loading={isLoading}
            onEdit={handleEditOrder}
            onCreate={handleOpenCreate}
          />
        )}
      </div>

      {/* Footer Pagination Matching Frappe CRM */}
      <div className="border-t border-border px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-y-2 text-xs text-muted-foreground bg-card/20 shrink-0">
        <div className="flex items-center gap-1 bg-muted/40 p-0.5 rounded-md border border-border/60">
          {[20, 50, 100].map((size) => (
            <button
              key={size}
              type="button"
              className={cn(
                "px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer",
                pageSize === size
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => setPageSize(size)}
            >
              {size}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <span>{totalCount === 0 ? "0 of 0" : `${firstRow} - ${lastRow} of ${totalCount}`}</span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-6 text-muted-foreground hover:text-foreground"
              disabled={page <= 1}
              onClick={() => handlePageChange(page - 1)}
            >
              <ChevronLeft className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-6 text-muted-foreground hover:text-foreground"
              disabled={page >= totalPages}
              onClick={() => handlePageChange(page + 1)}
            >
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Create / Edit Sales Order Modal */}
      <SalesOrderFormModal open={createOpen} onOpenChange={setCreateOpen} order={selectedOrder} />
    </div>
  );
}

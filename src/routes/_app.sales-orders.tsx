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
  Filter,
} from "lucide-react";

import { Page, PageHeader } from "@/components/page-header";
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
    <Page>
      <PageHeader
        title="Sales Orders"
        breadcrumbs={[
          { label: "Sales" },
          { label: "Sales Orders" },
        ]}
        actions={
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 px-3 gap-1.5 text-xs font-medium">
                  <CurrentIcon className="size-3.5 text-muted-foreground shrink-0" />
                  <span className="max-w-[100px] truncate">{currentViewObj.label}</span>
                  <ChevronDown className="size-3 text-muted-foreground shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48 text-xs">
                <DropdownMenuLabel>View</DropdownMenuLabel>
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

            <Button
              size="sm"
              onClick={handleOpenCreate}
              className="h-8 px-3 gap-1.5 text-xs font-semibold"
            >
              <Plus className="size-3.5" />
              <span>New Order</span>
            </Button>
          </>
        }
        filters={
          <div className="flex items-center gap-2 flex-1">
            <form onSubmit={handleSearchSubmit} className="relative min-w-[180px] max-w-[240px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Search orders..."
                className="h-8 pl-9 pr-3 text-xs bg-muted/40 border-input"
              />
            </form>

            <Select value={statusFilter || "all"} onValueChange={handleStatusChange}>
              <SelectTrigger className="h-8 text-xs px-3 bg-muted/40 border-input w-auto min-w-[140px]">
                <Filter className="size-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">
                  All Statuses
                </SelectItem>
                {SALES_ORDER_STATUSES.map((status) => (
                  <SelectItem key={status} value={status} className="text-xs">
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1 ml-auto">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void refetch()}
                disabled={isFetching}
                className="h-8 w-8 p-0"
                title="Refresh"
              >
                <RefreshCw className={cn("size-3.5", isFetching && "animate-spin")} />
              </Button>
            </div>
          </div>
        }
      />

      {/* Main Content Area */}
      <div
        className={cn(
          "flex-1 min-h-0",
          activeView === "kanban" ? "overflow-hidden p-4 sm:p-6" : "overflow-auto p-4 sm:p-6",
        )}
      >
        {activeView === "table" ? (
          <>
            <div className="rounded-xl border bg-card shadow-sm">
              <SalesOrderTable
                rows={orders}
                loading={isLoading}
                onEdit={handleEditOrder}
                onCreate={handleOpenCreate}
              />
            </div>
            {totalCount > 0 && (
              <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground px-2 mt-4">
                <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border">
                  {[20, 50, 100].map((size) => (
                    <button
                      key={size}
                      type="button"
                      className={cn(
                        "px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer",
                        pageSize === size
                          ? "bg-background text-foreground shadow-sm font-semibold"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                      onClick={() => setPageSize(size)}
                    >
                      {size}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-medium">
                    {totalCount === 0 ? "0 of 0" : `${firstRow} - ${lastRow} of ${totalCount}`}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground hover:text-foreground"
                      disabled={page <= 1}
                      onClick={() => handlePageChange(page - 1)}
                    >
                      <ChevronLeft className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground hover:text-foreground"
                      disabled={page >= totalPages}
                      onClick={() => handlePageChange(page + 1)}
                    >
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : activeView === "kanban" ? (
          <SalesOrderKanban
            rows={orders}
            loading={isLoading}
            onEdit={handleEditOrder}
            onAddOrder={handleOpenCreate}
          />
        ) : (
          <SalesOrderGrid
            rows={orders}
            loading={isLoading}
            onEdit={handleEditOrder}
            onCreate={handleOpenCreate}
          />
        )}
      </div>

      {/* Create / Edit Sales Order Modal */}
      <SalesOrderFormModal open={createOpen} onOpenChange={setCreateOpen} order={selectedOrder} />
    </Page>
  );
}

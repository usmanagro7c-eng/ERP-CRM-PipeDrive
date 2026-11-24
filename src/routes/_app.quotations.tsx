import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Columns3,
  LayoutGrid,
  LayoutList,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";

import { Page, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { QuotationFormModal } from "@/components/quotations/quotation-form-modal";
import { QuotationTable } from "@/components/quotations/quotation-table";
import { QuotationKanban } from "@/components/quotations/quotation-kanban";
import { QuotationGrid } from "@/components/quotations/quotation-grid";
import {
  SalesOrderFormModal,
  type SalesOrderInitialValues,
} from "@/components/sales-orders/sales-order-form-modal";
import {
  quotationCountOptions,
  quotationListOptions,
  type Quotation,
} from "@/hooks/use-quotations";
import * as api from "@/lib/api";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;
const KANBAN_PAGE_SIZE = 100;
const VIEW_STORAGE_KEY = "agrocrm.quotations.view";

export type ViewMode = "table" | "kanban" | "grid";

interface QuotationSearch {
  q?: string | undefined;
  page?: number | undefined;
  view?: ViewMode | undefined;
  status?: string | undefined;
}

const STATUS_FILTERS = ["Draft", "Open", "Replied", "Ordered", "Lost", "Cancelled"];

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

export const Route = createFileRoute("/_app/quotations")({
  head: () => ({ meta: [{ title: "Quotations · AgroCRM" }] }),
  validateSearch: (search: Record<string, unknown>): QuotationSearch => {
    const s: QuotationSearch = {};
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
    if (typeof search["status"] === "string") {
      s.status = search["status"];
    }
    return s;
  },
  component: QuotationsPage,
});

function QuotationsPage() {
  const navigate = Route.useNavigate();
  const search = Route.useSearch();
  const q = search.q ?? "";
  const page = search.page ?? 1;

  const [term, setTerm] = useState(q);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null);
  const [salesOrderModalOpen, setSalesOrderModalOpen] = useState(false);
  const [salesOrderInitialValues, setSalesOrderInitialValues] =
    useState<SalesOrderInitialValues | null>(null);
  const [localView, setLocalView] = useState<ViewMode>(search.view ?? "table");
  const [pageSize, setPageSize] = useState<number>(20);

  useEffect(() => {
    if (!search.view) {
      const saved = loadSavedView();
      if (saved !== "table") {
        setLocalView(saved);
        void navigate({ search: (prev) => ({ ...prev, view: saved }) });
      }
    }
  }, [search.view, navigate]);

  const activeView: ViewMode = search.view ?? localView;

  const filters: Array<[string, string, string]> = [];
  if (search.status && search.status !== "all") {
    filters.push(["status", "=", search.status]);
  }

  const listVariables = {
    search: q,
    filters,
    limit: activeView === "kanban" ? KANBAN_PAGE_SIZE : pageSize,
    start: activeView === "kanban" ? 0 : (page - 1) * pageSize,
    orderBy: "modified desc",
  };

  const {
    data: quotations = [],
    isLoading,
    isFetching,
    refetch,
  } = useQuery(quotationListOptions(listVariables));

  const { data: totalCount = 0 } = useQuery(quotationCountOptions(q, filters));

  function handleViewChange(mode: ViewMode) {
    setLocalView(mode);
    saveView(mode);
    const nextSearch: QuotationSearch = {};
    if (q) nextSearch.q = q;
    if (page > 1 && mode === "table") nextSearch.page = page;
    nextSearch.view = mode;
    void navigate({ search: nextSearch });
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nextSearch: QuotationSearch = {};
    if (term.trim()) nextSearch.q = term.trim();
    nextSearch.page = 1;
    if (activeView !== "table") nextSearch.view = activeView;
    if (search.status) nextSearch.status = search.status;
    void navigate({ search: nextSearch });
  }

  function handleStatusChange(statusVal: string) {
    const nextSearch: QuotationSearch = { ...search };
    nextSearch.status = statusVal === "all" ? undefined : statusVal;
    nextSearch.page = 1;
    void navigate({ search: nextSearch });
  }

  function handleOpenCreate() {
    setEditingQuotation(null);
    setModalOpen(true);
  }

  function handleEdit(quotation: Quotation) {
    setEditingQuotation(quotation);
    setModalOpen(true);
  }

  async function handleConvertToSalesOrder(quotation: Quotation) {
    let qItems = quotation.items;
    let customerName = quotation.party_name;

    if (!qItems || qItems.length === 0) {
      try {
        const fullQuotation = await api.getQuotation(quotation.name);
        qItems = fullQuotation.items;
        if (fullQuotation.party_name) {
          customerName = fullQuotation.party_name;
        }
      } catch (err) {
        console.warn("Could not fetch quotation items:", err);
      }
    }

    setSalesOrderInitialValues({
      customer: customerName,
      items: qItems?.map((item) => ({
        item_code: item.item_code,
        item_name: item.item_name || item.item_code,
        qty: item.qty,
        rate: item.rate,
        amount: item.amount ?? item.qty * item.rate,
        ...(item.discount_percentage !== undefined
          ? { discount_percentage: item.discount_percentage }
          : {}),
      })),
      quotation_ref: quotation.name,
    });
    setSalesOrderModalOpen(true);
  }

  const viewOptions = [
    { mode: "table" as const, label: "Table View", icon: LayoutList },
    { mode: "kanban" as const, label: "Kanban Pipeline", icon: Columns3 },
    { mode: "grid" as const, label: "Grid Cards", icon: LayoutGrid },
  ];

  const currentViewObj = viewOptions.find((v) => v.mode === activeView) ?? viewOptions[0]!;
  const CurrentIcon = currentViewObj.icon;

  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
  const firstRow = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastRow = Math.min(page * pageSize, totalCount);

  return (
    <Page>
      <PageHeader
        title="Quotations"
        badge={
          <span className="text-xs font-medium text-muted-foreground tabular-nums">{totalCount}</span>
        }
        actions={
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="hidden sm:flex items-center rounded-md border border-border/70 bg-muted/30 p-0.5">
              {viewOptions.map((opt) => {
                const Icon = opt.icon;
                const active = activeView === opt.mode;
                return (
                  <Button
                    key={opt.mode}
                    variant="ghost"
                    size="sm"
                    onClick={() => handleViewChange(opt.mode)}
                    className={cn(
                      "h-7 px-2.5 text-xs gap-1.5 rounded-sm",
                      active ? "bg-background shadow-xs text-foreground" : "text-muted-foreground hover:text-foreground",
                    )}
                    aria-pressed={active}
                  >
                    <Icon className="size-3.5" />
                    <span>{opt.mode === "kanban" ? "Kanban" : opt.mode === "table" ? "Table" : "Cards"}</span>
                  </Button>
                );
              })}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="sm:hidden h-9 w-9" aria-label="Change view">
                  <CurrentIcon className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 text-xs">
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
              className="h-9 sm:h-8 px-3 sm:px-3.5 gap-1.5 text-xs font-semibold"
              aria-label="Create new quotation"
            >
              <Plus className="size-3.5" />
              <span>New</span>
            </Button>
          </div>
        }
        filters={
          <div className="flex items-center gap-2 w-full">
            <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-0 sm:max-w-[260px]">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Search"
                aria-label="Search quotations"
                className="h-9 sm:h-8 pl-8 pr-3 text-sm sm:text-xs bg-background/70 border-border/70 w-full"
              />
            </form>

            <Select value={search.status ?? "all"} onValueChange={handleStatusChange}>
              <SelectTrigger aria-label="Filter by status" className="h-9 sm:h-8 text-xs px-2.5 bg-background/70 border-border/70 w-[116px] sm:w-[140px] shrink-0">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All statuses</SelectItem>
                {STATUS_FILTERS.map((status) => (
                  <SelectItem key={status} value={status} className="text-xs">
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => void refetch()}
              disabled={isFetching}
              className="h-9 w-9 sm:h-8 sm:w-8 shrink-0 text-muted-foreground"
              title="Refresh"
              aria-label="Refresh quotations"
            >
              <RefreshCw className={cn("size-4 sm:size-3.5", isFetching && "animate-spin")} />
            </Button>
          </div>
        }
      />

      {/* Main Content Area */}
      <div
        className={cn(
          "flex-1 min-h-0",
          activeView === "kanban" ? "overflow-hidden p-3 sm:p-6" : "overflow-auto p-3 sm:p-6",
        )}
      >
        {activeView === "table" ? (
          <>
            <div className="rounded-xl border bg-card shadow-sm">
              <QuotationTable
                rows={quotations}
                loading={isLoading}
                onEdit={handleEdit}
                onConvertToSalesOrder={handleConvertToSalesOrder}
                emptyAction={
                  <Button size="sm" onClick={handleOpenCreate}>
                    <Plus className="size-3.5" />
                    New Quotation
                  </Button>
                }
              />
            </div>
            {activeView === "table" && totalCount > 0 && (
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
                      onClick={() =>
                        void navigate({
                          search: (prev) => ({ ...prev, page: Math.max(1, page - 1) }),
                        })
                      }
                    >
                      <ChevronLeft className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground hover:text-foreground"
                      disabled={page >= pageCount}
                      onClick={() =>
                        void navigate({
                          search: (prev) => ({ ...prev, page: page + 1 }),
                        })
                      }
                    >
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : activeView === "kanban" ? (
          <QuotationKanban
            rows={quotations}
            loading={isLoading}
            onEdit={handleEdit}
            onAddQuotation={handleOpenCreate}
            onConvertToSalesOrder={handleConvertToSalesOrder}
          />
        ) : (
          <QuotationGrid
            rows={quotations}
            loading={isLoading}
            onEdit={handleEdit}
            onConvertToSalesOrder={handleConvertToSalesOrder}
          />
        )}
      </div>

      {/* Quotation Form Modal */}
      <QuotationFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        quotation={editingQuotation}
        onConvertToSalesOrder={handleConvertToSalesOrder}
      />

      {/* Sales Order Creation Modal from Quotation */}
      <SalesOrderFormModal
        open={salesOrderModalOpen}
        onOpenChange={setSalesOrderModalOpen}
        initialValues={salesOrderInitialValues}
      />
    </Page>
  );
}

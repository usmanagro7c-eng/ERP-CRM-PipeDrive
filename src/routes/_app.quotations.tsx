import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpDown,
  Check,
  ChevronDown,
  Columns3,
  Filter,
  LayoutGrid,
  LayoutList,
  List,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";

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
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
        discount_percentage: item.discount_percentage,
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

  return (
    <div className="flex h-full flex-col bg-background overflow-hidden">
      {/* Top Banner Matching Frappe CRM */}
      <div className="flex items-center justify-between border-b border-border bg-card/60 px-3 sm:px-6 py-2 sm:py-2.5 backdrop-blur-xs shrink-0 gap-2 min-h-[42px] sm:min-h-[48px]">
        {/* Breadcrumb: Quotations / ☰ List */}
        <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground shrink-0">
          <Link to="/quotations" className="hover:text-foreground transition-colors font-medium">
            Quotations
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
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            onClick={handleOpenCreate}
            className="h-7 text-xs font-medium px-2.5 sm:px-3 rounded-md bg-foreground text-background hover:bg-foreground/90 cursor-pointer shadow-xs gap-1 sm:gap-1.5 transition-colors"
          >
            <Plus className="size-3.5" />
            <span>Create</span>
          </Button>
        </div>
      </div>

      {/* Filter Bar Matching Frappe CRM */}
      <div className="flex items-center justify-between border-b border-border/80 bg-card/20 px-3 sm:px-6 py-1.5 sm:py-2 gap-2 shrink-0 overflow-x-auto">
        {/* Left Inputs */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Customer / ID Search Input */}
          <form onSubmit={handleSearchSubmit} className="relative w-32 sm:w-48 shrink-0">
            <Input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Customer / ID"
              className="h-7 text-xs bg-muted/30 border-border/60 placeholder:text-muted-foreground focus:bg-background"
            />
          </form>

          {/* Status Dropdown Filter */}
          <Select value={search.status ?? "all"} onValueChange={handleStatusChange}>
            <SelectTrigger
              aria-label="Filter quotations by status"
              className="h-7 text-xs w-24 sm:w-28 bg-muted/30 border-border/60 cursor-pointer text-muted-foreground shrink-0"
            >
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs cursor-pointer">
                Status: All
              </SelectItem>
              {STATUS_FILTERS.map((s) => (
                <SelectItem key={s} value={s} className="text-xs cursor-pointer">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* View Switcher Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 sm:px-2.5 gap-1 sm:gap-1.5 text-xs text-muted-foreground border-border/60 shrink-0"
                aria-label="{currentViewObj.label}"
              >
                <CurrentIcon className="size-3.5 text-muted-foreground" />
                <span className="hidden sm:inline">{currentViewObj.label}</span>
                <ChevronDown className="size-3 opacity-60" />
              </Button>
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
                      <Icon className="size-3.5 text-muted-foreground" />
                      <span>{opt.label}</span>
                    </div>
                    {isSelected && <Check className="size-3.5 text-primary" />}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Right Toolbar Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            className="size-7 text-muted-foreground hover:text-foreground cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
          <Button
            variant="outline"
            size="sm"
            title="Filter"
            aria-label="Filter"
            className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground border-border/60 cursor-pointer gap-1.5"
          >
            <Filter className="size-3.5" />
            <span className="hidden sm:inline">Filter</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            title="Sort"
            aria-label="Sort"
            className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground border-border/60 cursor-pointer gap-1.5"
          >
            <ArrowUpDown className="size-3.5" />
            <span className="hidden sm:inline">Sort</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            title="Columns"
            aria-label="Columns"
            className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground border-border/60 cursor-pointer gap-1.5"
          >
            <Columns3 className="size-3.5" />
            <span className="hidden sm:inline">Columns</span>
          </Button>
        </div>
      </div>

      {/* Main Canvas Body */}
      <div className="flex-1 flex flex-col min-h-0">
        <div
          className={cn(
            "flex-1 min-h-0 flex flex-col",
            activeView === "kanban"
              ? "overflow-hidden p-4 sm:p-6 pb-2"
              : "overflow-y-auto p-4 sm:p-6",
          )}
        >
          {activeView === "table" ? (
            <QuotationTable
              rows={quotations}
              loading={isLoading}
              onEdit={handleEdit}
              onConvertToSalesOrder={handleConvertToSalesOrder}
              emptyAction={
                <Button
                  size="sm"
                  onClick={handleOpenCreate}
                  className="mt-4 h-8 text-xs font-medium px-4 rounded-md bg-foreground text-background hover:bg-foreground/90 cursor-pointer shadow-xs gap-1.5"
                >
                  <Plus className="size-3.5" />
                  <span>Create Quotation</span>
                </Button>
              }
            />
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

        {/* Footer Pagination matching Frappe CRM */}
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
            {quotations.length} of {totalCount}
          </div>
        </div>
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
    </div>
  );
}

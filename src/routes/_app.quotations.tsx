import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Plus,
  RefreshCw,
  Search,
  FileText,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  Columns3,
  LayoutGrid,
  LayoutList,
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
import { QuotationFormModal } from "@/components/quotations/quotation-form-modal";
import { QuotationTable } from "@/components/quotations/quotation-table";
import { QuotationKanban } from "@/components/quotations/quotation-kanban";
import { QuotationGrid } from "@/components/quotations/quotation-grid";
import {
  quotationCountOptions,
  quotationListOptions,
  type Quotation,
} from "@/hooks/use-quotations";

const PAGE_SIZE = 20;
const KANBAN_PAGE_SIZE = 100;
const VIEW_STORAGE_KEY = "agrocrm.quotations.view";

export type ViewMode = "table" | "kanban" | "grid";

interface QuotationSearch {
  q?: string | undefined;
  page?: number | undefined;
  view?: ViewMode | undefined;
}

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
  const [localView, setLocalView] = useState<ViewMode>(search.view ?? "table");

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

  const listVariables = {
    search: q,
    filters: [] as Array<[string, string, string]>,
    limit: activeView === "kanban" ? KANBAN_PAGE_SIZE : PAGE_SIZE,
    start: activeView === "kanban" ? 0 : (page - 1) * PAGE_SIZE,
    orderBy: "modified desc",
  };

  const {
    data: quotations = [],
    isLoading,
    isFetching,
    refetch,
  } = useQuery(quotationListOptions(listVariables));

  const { data: totalCount = 0 } = useQuery(quotationCountOptions(q));

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

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
    void navigate({ search: nextSearch });
  }

  function handlePageChange(newPage: number) {
    const nextSearch: QuotationSearch = {};
    if (q) nextSearch.q = q;
    if (newPage > 1) nextSearch.page = newPage;
    if (activeView !== "table") nextSearch.view = activeView;
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

  const viewOptions = [
    { mode: "table" as const, label: "Table View", icon: LayoutList },
    { mode: "kanban" as const, label: "Kanban Pipeline", icon: Columns3 },
    { mode: "grid" as const, label: "Grid Cards", icon: LayoutGrid },
  ];

  const currentViewObj = viewOptions.find((v) => v.mode === activeView) ?? viewOptions[0]!;
  const CurrentIcon = currentViewObj.icon;

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6 max-w-7xl mx-auto w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Quotations</h1>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              {totalCount}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Create, track, and convert client price quotes into confirmed sales orders.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            className="size-9 shrink-0"
            title="Refresh list"
            aria-label="Refresh list"
          >
            <RefreshCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>

          {/* View Switcher Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-2 text-xs">
                <CurrentIcon className="size-4 text-muted-foreground" />
                <span>View: {currentViewObj.label}</span>
                <ChevronDown className="size-3.5 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 text-xs">
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

          <Button
            onClick={handleOpenCreate}
            size="sm"
            className="h-9 gap-1.5 text-xs font-semibold"
          >
            <Plus className="size-4" />
            <span>New Quotation</span>
          </Button>
        </div>
      </div>

      {/* Toolbar / Search */}
      <div className="flex items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search quotations by customer..."
            className="pl-9 h-9 text-xs bg-card"
            aria-label="Search quotations"
          />
        </form>
      </div>

      {/* View Content Area */}
      {activeView === "kanban" ? (
        <QuotationKanban
          rows={quotations}
          loading={isLoading}
          onEdit={handleEdit}
          onAddQuotation={handleOpenCreate}
        />
      ) : activeView === "grid" ? (
        <QuotationGrid
          rows={quotations}
          loading={isLoading}
          onEdit={handleEdit}
        />
      ) : (
        <QuotationTable
          rows={quotations}
          loading={isLoading}
          onEdit={handleEdit}
        />
      )}

      {/* Pagination Footer (Only for Table and Grid view) */}
      {activeView !== "kanban" && totalPages > 1 && (
        <div className="flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
          <div>
            Showing {(page - 1) * PAGE_SIZE + 1} to{" "}
            {Math.min(page * PAGE_SIZE, totalCount)} of {totalCount} quotations
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              disabled={page <= 1}
              onClick={() => handlePageChange(page - 1)}
              aria-label="Previous page"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="px-2 font-medium">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              disabled={page >= totalPages}
              onClick={() => handlePageChange(page + 1)}
              aria-label="Next page"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Quotation Form Modal */}
      <QuotationFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        quotation={editingQuotation}
      />
    </div>
  );
}

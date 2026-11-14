import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Columns3,
  LayoutGrid,
  LayoutList,
  Plus,
  RefreshCw,
  Search,
  TriangleAlert,
} from "lucide-react";

import { DealFormModal } from "@/components/deals/deal-form-modal";
import { QuotationFormModal } from "@/components/quotations/quotation-form-modal";
import { DealTable, type SortState } from "@/components/deals/deal-table";
import { DealKanban } from "@/components/deals/deal-kanban";
import { DealGrid } from "@/components/deals/deal-grid";
import { ColumnChooser } from "@/components/organizations/column-chooser";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/loading";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  dealCountOptions,
  dealListOptions,
  dealMetaOptions,
  dealStatusesOptions,
  errorMessage,
} from "@/hooks/use-deals";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { defaultListColumns, isDisplayField } from "@/lib/frappe-meta";
import type { QuotationItem } from "@/lib/api";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;
const KANBAN_PAGE_SIZE = 100;
const COLUMNS_STORAGE_KEY = "agrocrm.deals.columns";
const VIEW_STORAGE_KEY = "agrocrm.deals.view";
const GROUP_BY_STORAGE_KEY = "agrocrm.deals.groupBy";

export type ViewMode = "kanban" | "table" | "grid";

interface DealSearch {
  q?: string | undefined;
  page?: number | undefined;
  sort?: string | undefined;
  dir?: "asc" | "desc" | undefined;
  view?: ViewMode | undefined;
  groupBy?: string | undefined;
}

export const Route = createFileRoute("/_app/deals")({
  head: () => ({ meta: [{ title: "Deals · AgroCRM" }] }),
  validateSearch: (raw: Record<string, unknown>): DealSearch => {
    const search: DealSearch = {};
    if (typeof raw["q"] === "string" && raw["q"].trim()) search.q = raw["q"].trim();
    const page = Number(raw["page"]);
    if (Number.isInteger(page) && page > 1) search.page = page;
    if (typeof raw["sort"] === "string" && /^[a-z0-9_]+$/i.test(raw["sort"]))
      search.sort = raw["sort"];
    if (raw["dir"] === "asc" || raw["dir"] === "desc") search.dir = raw["dir"];
    if (raw["view"] === "table" || raw["view"] === "kanban" || raw["view"] === "grid")
      search.view = raw["view"];
    if (typeof raw["groupBy"] === "string" && /^[a-z0-9_]+$/i.test(raw["groupBy"]))
      search.groupBy = raw["groupBy"];
    return search;
  },
  component: DealsPage,
});

function loadSavedColumns(): string[] | null {
  try {
    const raw = window.localStorage.getItem(COLUMNS_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) && parsed.every((item) => typeof item === "string")
      ? parsed
      : null;
  } catch {
    return null;
  }
}

function saveColumns(columns: string[]) {
  try {
    window.localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify(columns));
  } catch {
    // storage unavailable
  }
}

function loadSavedView(): ViewMode {
  try {
    const raw = window.localStorage.getItem(VIEW_STORAGE_KEY);
    return raw === "table" || raw === "grid" ? raw : "kanban";
  } catch {
    return "kanban";
  }
}

function saveView(view: ViewMode) {
  try {
    window.localStorage.setItem(VIEW_STORAGE_KEY, view);
  } catch {
    // storage unavailable
  }
}

function loadSavedGroupBy(): string {
  try {
    return window.localStorage.getItem(GROUP_BY_STORAGE_KEY) || "status";
  } catch {
    return "status";
  }
}

function saveGroupBy(groupBy: string) {
  try {
    window.localStorage.setItem(GROUP_BY_STORAGE_KEY, groupBy);
  } catch {
    // storage unavailable
  }
}

function DealsPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const [createOpen, setCreateOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Record<string, unknown> | null>(null);
  const [modalInitialDoc, setModalInitialDoc] = useState<Record<string, unknown> | null>(null);

  const [quotationModalOpen, setQuotationModalOpen] = useState(false);
  const [quotationInitialValues, setQuotationInitialValues] = useState<{
    party_name?: string;
    crm_deal?: string;
    items?: QuotationItem[];
  } | null>(null);

  function handleCreateQuotation(deal: Record<string, unknown>) {
    const dealName = String(deal["name"] ?? "");
    const party = String(deal["organization_name"] ?? deal["organization"] ?? "");
    const rawProducts = Array.isArray(deal["products"])
      ? (deal["products"] as Array<Record<string, unknown>>)
      : Array.isArray(deal["items"])
        ? (deal["items"] as Array<Record<string, unknown>>)
        : [];
    const items: QuotationItem[] = rawProducts
      .map((p) => {
        const code = String(p["product_code"] || p["item_code"] || p["item"] || "");
        const name = String(p["product_name"] || p["item_name"] || p["product_code"] || code);
        const qty = Number(p["qty"]) || 1;
        const rate = Number(p["rate"] || p["price_list_rate"]) || 0;
        const amount = Number(p["amount"]) || qty * rate;
        return {
          item_code: code,
          item_name: name,
          qty,
          rate,
          amount,
        };
      })
      .filter((it) => it.item_code.trim().length > 0);

    setQuotationInitialValues({
      crm_deal: dealName,
      party_name: party,
      items: items.length > 0 ? items : undefined,
    });
    setQuotationModalOpen(true);
  }

  const [savedColumns, setSavedColumns] = useState<string[] | null>(null);
  const [searchText, setSearchText] = useState(search.q ?? "");
  const [viewMode, setLocalViewMode] = useState<ViewMode>(search.view ?? "kanban");
  const [groupByField, setLocalGroupByField] = useState<string>(search.groupBy ?? "status");

  useEffect(() => setSavedColumns(loadSavedColumns()), []);
  useEffect(() => setSearchText(search.q ?? ""), [search.q]);

  // Synchronize view mode with localStorage on initial mount
  useEffect(() => {
    if (!search.view) {
      const saved = loadSavedView();
      if (saved !== "kanban") {
        setLocalViewMode(saved);
        void navigate({ search: (prev) => ({ ...prev, view: saved }) });
      }
    } else {
      setLocalViewMode(search.view);
    }
  }, [search.view, navigate]);

  // Synchronize groupBy field
  useEffect(() => {
    if (!search.groupBy) {
      const saved = loadSavedGroupBy();
      setLocalGroupByField(saved);
    } else {
      setLocalGroupByField(search.groupBy);
    }
  }, [search.groupBy]);

  const activeView: ViewMode = search.view ?? viewMode;
  const activeGroupBy: string = search.groupBy ?? groupByField;

  const handleViewChange = (nextView: ViewMode) => {
    setLocalViewMode(nextView);
    saveView(nextView);
    void navigate({
      search: (prev) => ({ ...prev, view: nextView, page: undefined }),
    });
  };

  const handleGroupByChange = (nextGroupBy: string) => {
    setLocalGroupByField(nextGroupBy);
    saveGroupBy(nextGroupBy);
    void navigate({
      search: (prev) => ({ ...prev, groupBy: nextGroupBy }),
    });
  };

  const metaQuery = useQuery(dealMetaOptions());
  const meta = metaQuery.data;

  const statusesQuery = useQuery(dealStatusesOptions());
  const stages = useMemo(() => statusesQuery.data ?? [], [statusesQuery.data]);

  const columns = useMemo(() => {
    if (!meta) return [];
    const valid = new Set(
      (meta.fields ?? []).filter(isDisplayField).map((field) => field.fieldname),
    );
    const chosen = (savedColumns ?? []).filter((name) => valid.has(name));
    return chosen.length > 0 ? chosen : defaultListColumns(meta);
  }, [meta, savedColumns]);

  const sort: SortState | null = useMemo(() => {
    if (!meta || !search.sort) return null;
    const known = (meta.fields ?? []).some((field) => field.fieldname === search.sort);
    return known ? { field: search.sort, direction: search.dir ?? "asc" } : null;
  }, [meta, search.sort, search.dir]);

  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE);
  const [statusFilter, setStatusFilter] = useState<string>("");

  const filters: Array<[string, string, string]> = useMemo(() => {
    const list: Array<[string, string, string]> = [];
    if (statusFilter) {
      list.push(["status", "=", statusFilter]);
    }
    return list;
  }, [statusFilter]);

  const page = search.page ?? 1;
  const q = search.q ?? "";

  // Kanban and Grid views load more items to populate columns properly
  const fetchLimit = activeView === "table" ? pageSize : KANBAN_PAGE_SIZE;
  const fetchStart = activeView === "table" ? (page - 1) * pageSize : 0;

  const listQuery = useQuery({
    ...dealListOptions({
      search: q,
      filters,
      limit: fetchLimit,
      start: fetchStart,
      orderBy: sort ? `${sort.field} ${sort.direction}` : undefined,
    }),
    enabled: Boolean(meta),
  });

  const countQuery = useQuery({ ...dealCountOptions(q, filters), enabled: Boolean(meta) });

  const total = countQuery.data ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const firstRow = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastRow = Math.min(page * pageSize, total);

  const error = metaQuery.error ?? listQuery.error;
  const loading = metaQuery.isPending || (listQuery.isPending && Boolean(meta));

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    void navigate({
      search: (prev) => ({ ...prev, q: searchText.trim() || undefined, page: undefined }),
    });
  }

  // Search while typing; pressing Enter still works (submitSearch above).
  const debouncedSearchText = useDebouncedValue(searchText, 350);
  useEffect(() => {
    const next = debouncedSearchText.trim();
    if (next === (search.q ?? "")) return;
    void navigate({
      search: (prev) => ({ ...prev, q: next || undefined, page: undefined }),
    });
  }, [debouncedSearchText, search.q, navigate]);

  const handleEditDeal = (deal: Record<string, unknown>) => {
    setEditingDeal(deal);
    setModalInitialDoc(null);
    setCreateOpen(true);
  };

  const handleAddInStage = (stageName: string) => {
    setEditingDeal(null);
    setModalInitialDoc({ status: stageName });
    setCreateOpen(true);
  };

  const handleOpenCreateModal = () => {
    setEditingDeal(null);
    setModalInitialDoc(null);
    setCreateOpen(true);
  };

  const viewOptions = [
    { mode: "kanban" as const, label: "Kanban Pipeline", icon: Columns3 },
    { mode: "table" as const, label: "Table View", icon: LayoutList },
    { mode: "grid" as const, label: "Cards View", icon: LayoutGrid },
  ] as const;

  const currentViewObj = viewOptions.find((v) => v.mode === activeView) ?? viewOptions[0];
  const CurrentIcon = currentViewObj.icon;

  return (
    <div className="flex h-full flex-col bg-background overflow-hidden">
      {/* Top Banner Matching Frappe CRM */}
      <div className="flex items-center justify-between border-b border-border bg-card/60 px-3 sm:px-6 py-2 sm:py-2.5 backdrop-blur-xs shrink-0 gap-2 min-h-[42px] sm:min-h-[48px]">
        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
          <span className="font-medium text-foreground">Deals</span>
          <span className="text-muted-foreground/60">/</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1 font-medium text-foreground hover:text-primary transition-colors cursor-pointer text-xs sm:text-sm">
                <CurrentIcon className="size-3.5 text-muted-foreground shrink-0" />
                <span className="truncate max-w-[100px] sm:max-w-none">{currentViewObj.label}</span>
                <ChevronDown className="size-3 text-muted-foreground shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48 text-xs">
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
            onClick={handleOpenCreateModal}
            disabled={!meta}
            className="h-7 text-xs font-medium px-2.5 sm:px-3 rounded-md bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-black cursor-pointer shadow-xs gap-1 sm:gap-1.5"
          >
            <Plus className="size-3.5" />
            <span>Create</span>
          </Button>
        </div>
      </div>

      {/* Secondary Filter Toolbar Matching Frappe CRM */}
      <div className="flex items-center justify-between border-b border-border bg-background px-3 sm:px-6 py-1.5 sm:py-2 gap-2 shrink-0">
        <div className="flex items-center gap-1.5 sm:gap-2 text-xs min-w-0 flex-1">
          {/* Search Input */}
          <form
            onSubmit={submitSearch}
            className="relative flex-1 min-w-[110px] max-w-[180px] sm:max-w-[210px]"
          >
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search deals..."
              className="h-7 pl-8 pr-2 text-xs bg-muted/40 border-border/60 rounded-md w-full"
            />
          </form>

          {/* Status Quick Filter */}
          <Select
            value={statusFilter}
            onValueChange={(val) => setStatusFilter(val === "all" ? "" : val)}
          >
            <SelectTrigger
              aria-label="Filter deals by status"
              className="h-7 text-xs px-2 bg-muted/40 border-border/60 rounded-md cursor-pointer gap-1 w-auto min-w-[85px] sm:min-w-[110px] shrink-0"
            >
              <span className="hidden sm:inline text-muted-foreground">Status:</span>
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                All Statuses
              </SelectItem>
              {stages.map((s) => (
                <SelectItem key={s.name} value={s.name} className="text-xs">
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              void metaQuery.refetch();
              void listQuery.refetch();
              void countQuery.refetch();
            }}
            className="h-7 w-7 p-0 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className="size-3.5" />
          </Button>

          {/* Column chooser only in table view */}
          {activeView === "table" && meta && (
            <ColumnChooser
              meta={meta}
              selected={columns}
              onChange={(next) => {
                setSavedColumns(next);
                saveColumns(next);
              }}
            />
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div
        className={cn(
          "flex-1 min-h-0 flex flex-col",
          activeView === "kanban" ? "overflow-hidden p-4 sm:p-6 pb-2" : "overflow-auto p-4 sm:p-6",
        )}
      >
        {error ? (
          <Alert variant="destructive" className="mb-6">
            <TriangleAlert className="size-4" />
            <AlertTitle>Could not load deals</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span>{errorMessage(error)}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  void metaQuery.refetch();
                  void listQuery.refetch();
                  void countQuery.refetch();
                }}
                className="gap-1 text-xs"
              >
                <RefreshCw className="size-3" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        {/* View Switcher Output */}
        {meta ? (
          activeView === "kanban" ? (
            <DealKanban
              meta={meta}
              rows={listQuery.data ?? []}
              stages={stages}
              loading={loading}
              groupBy={activeGroupBy}
              onGroupByChange={handleGroupByChange}
              onRowClick={(name) => {
                void navigate({ to: "/deals/$dealId", params: { dealId: name } });
              }}
              onEdit={handleEditDeal}
              onCreateQuotation={handleCreateQuotation}
              onAddInStage={handleAddInStage}
            />
          ) : activeView === "grid" ? (
            <DealGrid
              meta={meta}
              rows={listQuery.data ?? []}
              stages={stages}
              loading={loading}
              onRowClick={(name) => {
                void navigate({ to: "/deals/$dealId", params: { dealId: name } });
              }}
              onEdit={handleEditDeal}
              emptyAction={
                <Button size="sm" onClick={handleOpenCreateModal} className="gap-1.5">
                  <Plus className="size-4" />
                  Create Deal
                </Button>
              }
            />
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border bg-card">
                <DealTable
                  meta={meta}
                  rows={listQuery.data ?? []}
                  columns={columns}
                  stages={stages}
                  sort={sort}
                  onSortChange={(nextSort) =>
                    void navigate({
                      search: (prev) => ({
                        ...prev,
                        sort: nextSort.field,
                        dir: nextSort.direction,
                      }),
                    })
                  }
                  onRowClick={(name) => {
                    void navigate({ to: "/deals/$dealId", params: { dealId: name } });
                  }}
                  onEdit={handleEditDeal}
                  onCreateQuotation={handleCreateQuotation}
                  loading={loading}
                  emptyAction={
                    <Button size="sm" onClick={handleOpenCreateModal} className="gap-1.5">
                      <Plus className="size-4" />
                      Create Deal
                    </Button>
                  }
                />
              </div>

              {/* Pagination for Table view matching Frappe CRM */}
              {total > 0 && (
                <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground px-2 pt-2">
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
                    <span>{total === 0 ? "0 of 0" : `${firstRow} - ${lastRow} of ${total}`}</span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Previous page"
                        className="size-6 text-muted-foreground hover:text-foreground"
                        disabled={page <= 1}
                        onClick={() =>
                          void navigate({
                            search: (prev) => ({ ...prev, page: Math.max(1, page - 1) }),
                          })
                        }
                      >
                        <ChevronLeft className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Next page"
                        className="size-6 text-muted-foreground hover:text-foreground"
                        disabled={page >= pageCount}
                        onClick={() =>
                          void navigate({
                            search: (prev) => ({ ...prev, page: page + 1 }),
                          })
                        }
                      >
                        <ChevronRight className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        ) : (
          <LoadingState
            title="Loading Deals..."
            description="Fetching sales deals and stage pipelines from Frappe CRM..."
          />
        )}
      </div>

      {/* Create / Edit Deal Modal */}
      {meta && (
        <DealFormModal
          open={createOpen}
          onOpenChange={setCreateOpen}
          meta={meta}
          deal={editingDeal}
          initialValues={modalInitialDoc}
        />
      )}

      {/* Convert Deal to Quotation Modal */}
      <QuotationFormModal
        open={quotationModalOpen}
        onOpenChange={setQuotationModalOpen}
        initialValues={quotationInitialValues}
      />
    </div>
  );
}

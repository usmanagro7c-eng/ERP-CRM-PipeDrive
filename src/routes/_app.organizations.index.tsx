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

import { OrgFormModal } from "@/components/organizations/org-form-modal";
import { ColumnChooser } from "@/components/organizations/column-chooser";
import { OrgTable, type SortState } from "@/components/organizations/org-table";
import { OrgKanban } from "@/components/organizations/org-kanban";
import { OrgGrid } from "@/components/organizations/org-grid";
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
  errorMessage,
  orgCountOptions,
  orgListOptions,
  orgMetaOptions,
} from "@/hooks/use-organizations";
import { defaultListColumns, isDisplayField } from "@/lib/frappe-meta";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;
const KANBAN_PAGE_SIZE = 100;
const COLUMNS_STORAGE_KEY = "agrocrm.organizations.columns";
const VIEW_STORAGE_KEY = "agrocrm.organizations.view";
const GROUP_BY_STORAGE_KEY = "agrocrm.organizations.groupBy";

export type ViewMode = "table" | "kanban" | "grid";

interface OrgSearch {
  q?: string | undefined;
  page?: number | undefined;
  sort?: string | undefined;
  dir?: "asc" | "desc" | undefined;
  view?: ViewMode | undefined;
  groupBy?: string | undefined;
}

export const Route = createFileRoute("/_app/organizations/")({
  head: () => ({ meta: [{ title: "Organizations · AgroCRM" }] }),
  validateSearch: (raw: Record<string, unknown>): OrgSearch => {
    const search: OrgSearch = {};
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
  component: OrganizationsPage,
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
    return raw === "kanban" || raw === "grid" ? raw : "table";
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

function loadSavedGroupBy(): string {
  try {
    return window.localStorage.getItem(GROUP_BY_STORAGE_KEY) || "industry";
  } catch {
    return "industry";
  }
}

function saveGroupBy(groupBy: string) {
  try {
    window.localStorage.setItem(GROUP_BY_STORAGE_KEY, groupBy);
  } catch {
    // storage unavailable
  }
}

function OrganizationsPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const [createOpen, setCreateOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Record<string, unknown> | null>(null);
  const [modalInitialDoc, setModalInitialDoc] = useState<Record<string, unknown> | null>(null);

  const [savedColumns, setSavedColumns] = useState<string[] | null>(null);
  const [searchText, setSearchText] = useState(search.q ?? "");
  const [viewMode, setLocalViewMode] = useState<ViewMode>(search.view ?? "table");
  const [groupByField, setLocalGroupByField] = useState<string>(search.groupBy ?? "industry");

  useEffect(() => setSavedColumns(loadSavedColumns()), []);
  useEffect(() => setSearchText(search.q ?? ""), [search.q]);

  // Synchronize view mode with localStorage on initial mount
  useEffect(() => {
    if (!search.view) {
      const saved = loadSavedView();
      if (saved !== "table") {
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

  const metaQuery = useQuery(orgMetaOptions());
  const meta = metaQuery.data;

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

  const page = search.page ?? 1;
  const q = search.q ?? "";

  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE);

  // Kanban and Grid views load more items to populate columns properly
  const fetchLimit = activeView === "table" ? pageSize : KANBAN_PAGE_SIZE;
  const fetchStart = activeView === "table" ? (page - 1) * pageSize : 0;

  const listQuery = useQuery({
    ...orgListOptions({
      search: q,
      filters: [],
      limit: fetchLimit,
      start: fetchStart,
      orderBy: sort ? `${sort.field} ${sort.direction}` : undefined,
    }),
    enabled: Boolean(meta),
  });

  const countQuery = useQuery({ ...orgCountOptions(q), enabled: Boolean(meta) });

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

  const handleEditOrg = (org: Record<string, unknown>) => {
    setEditingOrg(org);
    setModalInitialDoc(null);
    setCreateOpen(true);
  };

  const handleAddInColumn = (colField: string, colValue: string) => {
    setEditingOrg(null);
    setModalInitialDoc({ [colField]: colValue });
    setCreateOpen(true);
  };

  const handleOpenCreateModal = () => {
    setEditingOrg(null);
    setModalInitialDoc(null);
    setCreateOpen(true);
  };

  const viewOptions = [
    { mode: "table" as const, label: "Table View", icon: LayoutList },
    { mode: "kanban" as const, label: "Kanban Pipeline", icon: Columns3 },
    { mode: "grid" as const, label: "Cards View", icon: LayoutGrid },
  ] as const;

  const currentViewObj = viewOptions.find((v) => v.mode === activeView) ?? viewOptions[0];
  const CurrentIcon = currentViewObj.icon;

  return (
    <div className="flex h-full flex-col bg-background overflow-hidden">
      {/* Top Banner Matching Frappe CRM */}
      <div className="flex items-center justify-between border-b border-border bg-card/60 px-3 sm:px-6 py-2 sm:py-2.5 backdrop-blur-xs shrink-0 gap-2 sm:gap-3 min-h-[42px] sm:min-h-[48px]">
        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
          <span className="font-medium text-foreground truncate">Organizations</span>
          <span className="text-muted-foreground/60">/</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1 sm:gap-1.5 font-medium text-foreground hover:text-primary transition-colors cursor-pointer text-xs sm:text-sm truncate">
                <CurrentIcon className="size-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">{currentViewObj.label}</span>
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
      <div className="flex items-center justify-between border-b border-border bg-background px-3 sm:px-6 py-1.5 sm:py-2 gap-2 sm:gap-3 shrink-0">
        <div className="flex items-center gap-2 text-xs flex-1 min-w-0">
          {/* Search Input */}
          <form onSubmit={submitSearch} className="relative flex-1 min-w-[120px] max-w-[210px] sm:w-52">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search organizations..."
              className="h-7 pl-8 pr-2 text-xs bg-muted/40 border-border/60 rounded-md"
            />
          </form>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              void metaQuery.refetch();
              void listQuery.refetch();
              void countQuery.refetch();
            }}
            className="h-7 w-7 p-0 sm:w-auto sm:px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
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

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <TriangleAlert className="size-4" />
          <AlertTitle>Could not load organizations</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-3">
            <span>{errorMessage(error)}</span>
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={() => {
                void metaQuery.refetch();
                void listQuery.refetch();
              }}
            >
              <RefreshCw className="size-3.5" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* View Content (Table / Kanban / Grid) */}
      {meta && !error && (
        <>
          {activeView === "table" && (
            <OrgTable
              meta={meta}
              rows={listQuery.data ?? []}
              columns={columns}
              sort={sort}
              onSortChange={(next) =>
                void navigate({
                  search: (prev) => ({
                    ...prev,
                    sort: next.field,
                    dir: next.direction,
                    page: undefined,
                  }),
                })
              }
              onRowClick={(name) =>
                void navigate({ to: "/organizations/$orgId", params: { orgId: name } })
              }
              onEdit={handleEditOrg}
              loading={loading}
              emptyAction={
                <Button size="sm" onClick={handleOpenCreateModal} className="gap-2">
                  <Plus className="size-4" />
                  Add organization
                </Button>
              }
            />
          )}

          {activeView === "kanban" && (
            <OrgKanban
              meta={meta}
              rows={listQuery.data ?? []}
              onRowClick={(name) =>
                void navigate({ to: "/organizations/$orgId", params: { orgId: name } })
              }
              onEdit={handleEditOrg}
              onAddInColumn={handleAddInColumn}
              loading={loading}
              groupBy={activeGroupBy}
              onGroupByChange={handleGroupByChange}
            />
          )}

          {activeView === "grid" && (
            <OrgGrid
              meta={meta}
              rows={listQuery.data ?? []}
              onRowClick={(name) =>
                void navigate({ to: "/organizations/$orgId", params: { orgId: name } })
              }
              onEdit={handleEditOrg}
              loading={loading}
              emptyAction={
                <Button size="sm" onClick={handleOpenCreateModal} className="gap-2">
                  <Plus className="size-4" />
                  Add organization
                </Button>
              }
            />
          )}
        </>
      )}

      {!meta && !error && (
        <LoadingState
          title="Loading Organizations..."
          description="Fetching companies, territories, and industries from Frappe CRM..."
        />
      )}
      </div>

      {/* Footer Pagination matching Frappe CRM */}
      {meta && activeView === "table" && total > 0 && (
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
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setPageSize(size)}
              >
                {size}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <span>
              {total === 0 ? "0 of 0" : `${firstRow} - ${lastRow} of ${total}`}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
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

      {/* Create / Edit Modal */}
      {meta && (
        <OrgFormModal
          open={createOpen}
          onOpenChange={(open) => {
            setCreateOpen(open);
            if (!open) {
              setEditingOrg(null);
              setModalInitialDoc(null);
            }
          }}
          meta={meta}
          organization={editingOrg ?? modalInitialDoc}
        />
      )}
    </div>
  );
}

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

  // Kanban and Grid views load more items to populate columns properly
  const fetchLimit = activeView === "table" ? PAGE_SIZE : KANBAN_PAGE_SIZE;
  const fetchStart = activeView === "table" ? (page - 1) * PAGE_SIZE : 0;

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
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const firstRow = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastRow = Math.min(page * PAGE_SIZE, total);

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

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4 sm:space-y-5 px-3 sm:px-6 py-4 sm:py-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Organizations</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {countQuery.isSuccess
              ? `${total} ${total === 1 ? "organization" : "organizations"}`
              : "Loading…"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Search Input */}
          <form onSubmit={submitSearch} className="relative w-full sm:w-60 md:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Filter by name…"
              className="pl-9 h-9 text-xs"
              aria-label="Filter organizations by name"
            />
          </form>

        {/* View Switcher Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 text-xs font-medium cursor-pointer shadow-xs">
              {activeView === "table" && <LayoutList className="size-3.5 text-muted-foreground" />}
              {activeView === "kanban" && <Columns3 className="size-3.5 text-muted-foreground" />}
              {activeView === "grid" && <LayoutGrid className="size-3.5 text-muted-foreground" />}
              <span>View: {activeView === "table" ? "Table" : activeView === "kanban" ? "Kanban" : "Cards"}</span>
              <ChevronDown className="size-3 opacity-50 ml-0.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40 text-xs">
            <DropdownMenuLabel>View Mode</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => handleViewChange("table")}
              className="flex items-center justify-between cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <LayoutList className="size-3.5 text-muted-foreground" />
                <span>Table</span>
              </span>
              {activeView === "table" && <Check className="size-3.5 text-primary" />}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleViewChange("kanban")}
              className="flex items-center justify-between cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Columns3 className="size-3.5 text-muted-foreground" />
                <span>Kanban</span>
              </span>
              {activeView === "kanban" && <Check className="size-3.5 text-primary" />}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleViewChange("grid")}
              className="flex items-center justify-between cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <LayoutGrid className="size-3.5 text-muted-foreground" />
                <span>Cards</span>
              </span>
              {activeView === "grid" && <Check className="size-3.5 text-primary" />}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Column Chooser (visible only in table view) */}
        {meta && activeView === "table" && (
          <ColumnChooser
            meta={meta}
            selected={columns}
            onChange={(next) => {
              setSavedColumns(next);
              saveColumns(next);
            }}
          />
        )}

        {/* Add Organization Button */}
        <Button onClick={handleOpenCreateModal} disabled={!meta} className="gap-2 shadow-xs">
          <Plus className="size-4" />
          Organization
        </Button>
      </div>
    </div>

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

      {/* Pagination (Table View only) */}
      {meta && activeView === "table" && total > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {firstRow}–{lastRow} of {total}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() =>
                void navigate({
                  search: (prev) => ({ ...prev, page: page - 1 > 1 ? page - 1 : undefined }),
                })
              }
              className="gap-1"
            >
              <ChevronLeft className="size-4" />
              Prev
            </Button>
            <span>
              Page {page} / {pageCount}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pageCount}
              onClick={() => void navigate({ search: (prev) => ({ ...prev, page: page + 1 }) })}
              className="gap-1"
            >
              Next
              <ChevronRight className="size-4" />
            </Button>
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

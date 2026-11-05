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

import { ActivityFormModal } from "@/components/activities/activity-form-modal";
import { ActivityTable, type SortState } from "@/components/activities/activity-table";
import { ActivityKanban } from "@/components/activities/activity-kanban";
import { ActivityGrid } from "@/components/activities/activity-grid";
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
  activityCountOptions,
  activityListOptions,
  activityMetaOptions,
  errorMessage,
} from "@/hooks/use-activities";
import { defaultListColumns, isDisplayField } from "@/lib/frappe-meta";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;
const KANBAN_PAGE_SIZE = 100;
const COLUMNS_STORAGE_KEY = "agrocrm.activities.columns";
const VIEW_STORAGE_KEY = "agrocrm.activities.view";
const GROUP_BY_STORAGE_KEY = "agrocrm.activities.groupBy";

export type ViewMode = "kanban" | "table" | "grid";

interface ActivitySearch {
  q?: string | undefined;
  page?: number | undefined;
  sort?: string | undefined;
  dir?: "asc" | "desc" | undefined;
  view?: ViewMode | undefined;
  groupBy?: string | undefined;
}

export const Route = createFileRoute("/_app/activities")({
  head: () => ({ meta: [{ title: "Activities · AgroCRM" }] }),
  validateSearch: (raw: Record<string, unknown>): ActivitySearch => {
    const search: ActivitySearch = {};
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
  component: ActivitiesPage,
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

function ActivitiesPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const [createOpen, setCreateOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Record<string, unknown> | null>(null);
  const [modalInitialDoc, setModalInitialDoc] = useState<Record<string, unknown> | null>(null);

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

  const metaQuery = useQuery(activityMetaOptions());
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
    ...activityListOptions({
      search: q,
      filters: [],
      limit: fetchLimit,
      start: fetchStart,
      orderBy: sort ? `${sort.field} ${sort.direction}` : undefined,
    }),
    enabled: Boolean(meta),
  });

  const countQuery = useQuery({ ...activityCountOptions(q), enabled: Boolean(meta) });

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

  const handleEditActivity = (activity: Record<string, unknown>) => {
    setEditingActivity(activity);
    setModalInitialDoc(null);
    setCreateOpen(true);
  };

  const handleAddInStatus = (statusName: string) => {
    setEditingActivity(null);
    setModalInitialDoc({ status: statusName });
    setCreateOpen(true);
  };

  const handleOpenCreateModal = () => {
    setEditingActivity(null);
    setModalInitialDoc(null);
    setCreateOpen(true);
  };

  const viewOptions = [
    { mode: "kanban" as const, label: "Task Board", icon: Columns3 },
    { mode: "table" as const, label: "Table View", icon: LayoutList },
    { mode: "grid" as const, label: "Cards View", icon: LayoutGrid },
  ] as const;

  const currentViewObj = viewOptions.find((v) => v.mode === activeView) ?? viewOptions[0];
  const CurrentIcon = currentViewObj.icon;

  return (
    <div className="flex h-full flex-col">
      {/* Top action bar */}
      <div className="border-b bg-background px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Activities</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Tasks, calls, meetings, follow-ups, and sales deadlines.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Search Input */}
            <form onSubmit={submitSearch} className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search activities..."
                className="h-9 pl-9 text-xs"
              />
            </form>

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

            {/* Create Activity Button */}
            <Button
              size="sm"
              onClick={handleOpenCreateModal}
              disabled={!meta}
              className="h-9 gap-1.5 text-xs font-semibold"
            >
              <Plus className="size-4" />
              <span>Activity</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        {error ? (
          <Alert variant="destructive" className="mb-6">
            <TriangleAlert className="size-4" />
            <AlertTitle>Could not load activities</AlertTitle>
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
            <ActivityKanban
              meta={meta}
              rows={listQuery.data ?? []}
              loading={loading}
              groupBy={activeGroupBy}
              onGroupByChange={handleGroupByChange}
              onRowClick={(name) => {
                const act = (listQuery.data ?? []).find((a) => String(a["name"]) === name);
                if (act) handleEditActivity(act);
              }}
              onEdit={handleEditActivity}
              onAddInStatus={handleAddInStatus}
            />
          ) : activeView === "grid" ? (
            <ActivityGrid
              meta={meta}
              rows={listQuery.data ?? []}
              loading={loading}
              onRowClick={(name) => {
                const act = (listQuery.data ?? []).find((a) => String(a["name"]) === name);
                if (act) handleEditActivity(act);
              }}
              onEdit={handleEditActivity}
              emptyAction={
                <Button size="sm" onClick={handleOpenCreateModal} className="gap-1.5">
                  <Plus className="size-4" />
                  Create Activity
                </Button>
              }
            />
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border bg-card">
                <ActivityTable
                  meta={meta}
                  rows={listQuery.data ?? []}
                  columns={columns}
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
                    const act = (listQuery.data ?? []).find((a) => String(a["name"]) === name);
                    if (act) handleEditActivity(act);
                  }}
                  onEdit={handleEditActivity}
                  loading={loading}
                  emptyAction={
                    <Button size="sm" onClick={handleOpenCreateModal} className="gap-1.5">
                      <Plus className="size-4" />
                      Create Activity
                    </Button>
                  }
                />
              </div>

              {/* Pagination for Table view */}
              {total > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground px-2">
                  <div>
                    Showing <span className="font-medium text-foreground">{firstRow}</span> to{" "}
                    <span className="font-medium text-foreground">{lastRow}</span> of{" "}
                    <span className="font-medium text-foreground">{total}</span> activities
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-8"
                      disabled={page <= 1}
                      onClick={() =>
                        void navigate({
                          search: (prev) => ({ ...prev, page: Math.max(1, page - 1) }),
                        })
                      }
                    >
                      <ChevronLeft className="size-4" />
                    </Button>
                    <span className="px-2 text-xs font-medium">
                      Page {page} of {pageCount}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-8"
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
              )}
            </div>
          )
        ) : (
          <LoadingState
            title="Loading Activities..."
            description="Fetching scheduled tasks, calls, and follow-ups from Frappe CRM..."
          />
        )}
      </div>

      {/* Create / Edit Activity Modal */}
      {meta && (
        <ActivityFormModal
          open={createOpen}
          onOpenChange={setCreateOpen}
          meta={meta}
          activity={editingActivity}
          initialValues={modalInitialDoc}
        />
      )}
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Plus,
  RefreshCw,
  Search,
  TriangleAlert,
  X,
} from "lucide-react";

import { ActivityFormModal } from "@/components/activities/activity-form-modal";
import { ActivityTable, type SortState } from "@/components/activities/activity-table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  activityCountOptions,
  activityListOptions,
  activityMetaOptions,
  errorMessage,
} from "@/hooks/use-activities";
import { useCrmUsers } from "@/hooks/use-dashboard";
import { cn } from "@/lib/utils";

interface ActivitySearch {
  q?: string | undefined;
  page?: number | undefined;
  sort?: string | undefined;
  dir?: "asc" | "desc" | undefined;
  priority?: string | undefined;
  status?: string | undefined;
  assigned_to?: string | undefined;
}

export const Route = createFileRoute("/_app/activities")({
  head: () => ({ meta: [{ title: "Tasks · AgroCRM" }] }),
  validateSearch: (raw: Record<string, unknown>): ActivitySearch => {
    const search: ActivitySearch = {};
    if (typeof raw["q"] === "string" && raw["q"].trim()) search.q = raw["q"].trim();
    const page = Number(raw["page"]);
    if (Number.isInteger(page) && page > 1) search.page = page;
    if (typeof raw["sort"] === "string" && /^[a-z0-9_]+$/i.test(raw["sort"]))
      search.sort = raw["sort"];
    if (raw["dir"] === "asc" || raw["dir"] === "desc") search.dir = raw["dir"];
    if (typeof raw["priority"] === "string") search.priority = raw["priority"];
    if (typeof raw["status"] === "string") search.status = raw["status"];
    if (typeof raw["assigned_to"] === "string") search.assigned_to = raw["assigned_to"];
    return search;
  },
  component: ActivitiesPage,
});

const PRIORITIES = ["Low", "Medium", "High", "Urgent"];
const STATUSES = ["Backlog", "Todo", "In Progress", "Done", "Canceled"];

function ActivitiesPage() {
  const navigate = useNavigate({ from: Route.fullPath });
  const search = Route.useSearch();
  const { data: users = [] } = useCrmUsers();

  const [createOpen, setCreateOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Record<string, unknown> | null>(null);

  // Search input state
  const [searchTitle, setSearchTitle] = useState(search.q ?? "");
  const [pageSize, setPageSize] = useState<number>(20);

  useEffect(() => {
    setSearchTitle(search.q ?? "");
  }, [search.q]);

  const metaQuery = useQuery(activityMetaOptions());
  const meta = metaQuery.data;

  const sort: SortState | null = useMemo(() => {
    if (!search.sort) return { field: "modified", direction: "desc" };
    return { field: search.sort, direction: search.dir ?? "desc" };
  }, [search.sort, search.dir]);

  const page = search.page ?? 1;
  const q = search.q ?? "";
  const hasActiveFilters = Boolean(
    q ||
      (search.priority && search.priority !== "all") ||
      (search.status && search.status !== "all") ||
      (search.assigned_to && search.assigned_to !== "all"),
  );

  // Build filters matching CRM Backend
  const filters: Array<[string, string, string]> = useMemo(() => {
    const list: Array<[string, string, string]> = [];
    if (search.priority && search.priority !== "all") {
      list.push(["priority", "=", search.priority]);
    }
    if (search.status && search.status !== "all") {
      list.push(["status", "=", search.status]);
    }
    if (search.assigned_to && search.assigned_to !== "all") {
      list.push(["assigned_to", "=", search.assigned_to]);
    }
    return list;
  }, [search.priority, search.status, search.assigned_to]);

  const fetchLimit = pageSize;
  const fetchStart = (page - 1) * pageSize;

  const listQuery = useQuery({
    ...activityListOptions({
      search: q,
      filters,
      limit: fetchLimit,
      start: fetchStart,
      orderBy: sort ? `${sort.field} ${sort.direction}` : "modified desc",
    }),
    enabled: Boolean(meta),
  });

  const countQuery = useQuery({
    ...activityCountOptions(q, filters),
    enabled: Boolean(meta),
  });

  const total = countQuery.data ?? listQuery.data?.length ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  const error = metaQuery.error ?? listQuery.error;
  const loading = metaQuery.isPending || (listQuery.isPending && Boolean(meta));

  function handleFilterChange(key: "priority" | "status" | "assigned_to", value: string) {
    void navigate({
      search: (prev) => ({
        ...prev,
        [key]: value === "all" ? undefined : value,
        page: undefined,
      }),
    });
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    void navigate({
      search: (prev) => ({
        ...prev,
        q: searchTitle.trim() || undefined,
        page: undefined,
      }),
    });
  }

  const handleEdit = (activity: Record<string, unknown>) => {
    setEditingActivity(activity);
    setCreateOpen(true);
  };

  const handleOpenCreateModal = () => {
    setEditingActivity(null);
    setCreateOpen(true);
  };

  return (
    <div className="flex h-full flex-col bg-background overflow-hidden">
      <div className="shrink-0 border-b border-border/70 bg-card/40 px-3 py-3 sm:px-6 sm:py-4 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground">Tasks</h1>
              <span className="text-xs font-medium text-muted-foreground tabular-nums">{total}</span>
            </div>
            <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">Track work, priorities, and owners.</p>
          </div>
          <Button size="sm" onClick={handleOpenCreateModal} className="h-9 sm:h-8 px-3 sm:px-3.5 gap-1.5 text-xs font-semibold shrink-0">
            <Plus className="size-3.5" />
            <span>New</span>
          </Button>
        </div>

        <div className="mt-3 flex flex-col gap-2">
          <form onSubmit={handleSearchSubmit} className="w-full sm:max-w-[280px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTitle}
                onChange={(e) => setSearchTitle(e.target.value)}
                placeholder="Search tasks"
                aria-label="Search tasks by title"
                className="h-9 sm:h-8 pl-8 text-sm sm:text-xs bg-background/70 border-border/70"
              />
            </div>
          </form>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
            <Select value={search.priority ?? "all"} onValueChange={(val) => handleFilterChange("priority", val)}>
              <SelectTrigger aria-label="Filter by priority" className="h-9 sm:h-8 text-xs flex-1 sm:flex-none sm:w-[130px] bg-background/70 border-border/70">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All priorities</SelectItem>
                {PRIORITIES.map((p) => <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={search.assigned_to ?? "all"} onValueChange={(val) => handleFilterChange("assigned_to", val)}>
              <SelectTrigger aria-label="Filter by assigned to" className="h-9 sm:h-8 text-xs flex-1 sm:flex-none sm:w-[150px] bg-background/70 border-border/70">
                <SelectValue placeholder="Assigned" />
              </SelectTrigger>
              <SelectContent className="max-h-56">
                <SelectItem value="all" className="text-xs">All assignees</SelectItem>
                {users.map((u) => <SelectItem key={u.name} value={u.name} className="text-xs">{u.full_name || u.name}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={search.status ?? "all"} onValueChange={(val) => handleFilterChange("status", val)}>
              <SelectTrigger aria-label="Filter by status" className="h-9 sm:h-8 text-xs flex-1 sm:flex-none sm:w-[130px] bg-background/70 border-border/70">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All statuses</SelectItem>
                {STATUSES.map((s) => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1 ml-auto">
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    void navigate({
                      search: (prev) => ({ ...prev, q: undefined, priority: undefined, status: undefined, assigned_to: undefined, page: undefined }),
                    }).then(() => setSearchTitle(""))
                  }
                  className="h-9 sm:h-8 px-2.5 text-xs text-muted-foreground"
                  aria-label="Clear all task filters"
                >
                  <X className="size-3.5 sm:mr-1" />
                  <span className="hidden sm:inline">Clear</span>
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={() => void listQuery.refetch()} className="size-9 sm:size-8 text-muted-foreground" title="Refresh" aria-label="Refresh tasks">
                <RefreshCw className="size-4 sm:size-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Content */}
      <div className="flex-1 flex flex-col min-h-0">
        {error && (
          <div className="p-4">
            <Alert variant="destructive">
              <TriangleAlert className="size-4" />
              <AlertTitle>Error loading tasks</AlertTitle>
              <AlertDescription>{errorMessage(error)}</AlertDescription>
            </Alert>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          <ActivityTable
            rows={listQuery.data ?? []}
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
              const item = (listQuery.data ?? []).find((a) => String(a["name"]) === name);
              if (item) handleEdit(item);
            }}
            onEdit={handleEdit}
            loading={loading}
            emptyAction={
              <Button
                size="sm"
                variant="contrast"
                onClick={handleOpenCreateModal}
                className="mt-2 h-7 text-xs font-medium px-3 gap-1.5"
              >
                <Plus className="size-3.5" />
                <span>Create Task</span>
              </Button>
            }
          />
        </div>

        {/* Footer Pagination matching CRM Backend */}
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

          {/* Count e.g. "2 of 2" */}
          <div className="text-xs font-medium text-muted-foreground">
            {listQuery.data?.length ?? 0} of {total}
          </div>
        </div>
      </div>

      {/* Activity / Task Form Modal */}
      <ActivityFormModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        activity={editingActivity}
        onSuccess={() => void listQuery.refetch()}
      />
    </div>
  );
}

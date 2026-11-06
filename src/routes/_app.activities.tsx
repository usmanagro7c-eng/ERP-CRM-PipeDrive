import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpDown,
  Check,
  ChevronDown,
  Columns3,
  Filter,
  Folder,
  List,
  Plus,
  RefreshCw,
  Search,
  TriangleAlert,
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

  // Build filters matching Frappe CRM
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

  const total = countQuery.data ?? (listQuery.data?.length ?? 0);
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
    <div className="flex flex-col min-h-[calc(100vh-60px)] bg-background">
      {/* Top Banner Matching Frappe CRM */}
      <div className="flex items-center justify-between border-b border-border px-6 py-2.5 bg-card/60 backdrop-blur-xs">
        {/* Breadcrumb: Tasks / ☰ List */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link to="/activities" className="hover:text-foreground transition-colors font-medium">
            Tasks
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

        {/* Right Create Button: Solid Black "+ Create" */}
        <Button
          size="sm"
          onClick={handleOpenCreateModal}
          className="h-7 text-xs font-medium px-3 rounded-md bg-foreground text-background hover:bg-foreground/90 cursor-pointer shadow-xs gap-1.5 transition-colors"
        >
          <Plus className="size-3.5" />
          <span>Create</span>
        </Button>
      </div>

      {/* Filter & Action Toolbar Matching Frappe CRM */}
      <div className="border-b border-border/80 px-6 py-2 bg-card/20 flex flex-wrap items-center justify-between gap-3">
        {/* Left Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Title Search Input */}
          <form onSubmit={handleSearchSubmit} className="relative w-40 sm:w-48">
            <Input
              value={searchTitle}
              onChange={(e) => setSearchTitle(e.target.value)}
              placeholder="Title"
              className="h-7 text-xs bg-muted/30 border-border/60 placeholder:text-muted-foreground focus:bg-background"
            />
          </form>

          {/* Priority Dropdown */}
          <Select
            value={search.priority ?? "all"}
            onValueChange={(val) => handleFilterChange("priority", val)}
          >
            <SelectTrigger className="h-7 text-xs w-28 bg-muted/30 border-border/60 cursor-pointer text-muted-foreground">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs cursor-pointer">
                Priority: All
              </SelectItem>
              {PRIORITIES.map((p) => (
                <SelectItem key={p} value={p} className="text-xs cursor-pointer">
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Assigned To Dropdown */}
          <Select
            value={search.assigned_to ?? "all"}
            onValueChange={(val) => handleFilterChange("assigned_to", val)}
          >
            <SelectTrigger className="h-7 text-xs w-32 bg-muted/30 border-border/60 cursor-pointer text-muted-foreground">
              <SelectValue placeholder="Assigned To" />
            </SelectTrigger>
            <SelectContent className="max-h-56">
              <SelectItem value="all" className="text-xs cursor-pointer">
                Assigned: All
              </SelectItem>
              {users.map((u) => {
                const name = u.full_name || u.name;
                return (
                  <SelectItem key={u.name} value={u.name} className="text-xs cursor-pointer">
                    {name}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          {/* Status Dropdown */}
          <Select
            value={search.status ?? "all"}
            onValueChange={(val) => handleFilterChange("status", val)}
          >
            <SelectTrigger className="h-7 text-xs w-28 bg-muted/30 border-border/60 cursor-pointer text-muted-foreground">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs cursor-pointer">
                Status: All
              </SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s} className="text-xs cursor-pointer">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Right Toolbar Actions */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => void listQuery.refetch()}
            className="size-7 text-muted-foreground hover:text-foreground cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className="size-3.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground border-border/60 cursor-pointer gap-1.5"
          >
            <Folder className="size-3.5" />
            <span>Group</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground border-border/60 cursor-pointer gap-1.5"
          >
            <Filter className="size-3.5" />
            <span>Filter</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground border-border/60 cursor-pointer gap-1.5"
          >
            <ArrowUpDown className="size-3.5" />
            <span>Sort</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground border-border/60 cursor-pointer gap-1.5"
          >
            <Columns3 className="size-3.5" />
            <span>Columns</span>
          </Button>
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
                onClick={handleOpenCreateModal}
                className="mt-2 h-7 text-xs font-medium px-3 rounded-md bg-foreground text-background hover:bg-foreground/90 cursor-pointer shadow-xs gap-1.5"
              >
                <Plus className="size-3.5" />
                <span>Create Task</span>
              </Button>
            }
          />
        </div>

        {/* Footer Pagination matching Frappe CRM */}
        <div className="border-t border-border px-6 py-2.5 flex items-center justify-between text-xs text-muted-foreground bg-card/20 shrink-0">
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

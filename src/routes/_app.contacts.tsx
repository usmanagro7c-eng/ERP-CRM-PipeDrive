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

import { ContactFormModal } from "@/components/contacts/contact-form-modal";
import { ContactTable, type SortState } from "@/components/contacts/contact-table";
import { ContactKanban } from "@/components/contacts/contact-kanban";
import { ContactGrid } from "@/components/contacts/contact-grid";
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
  contactCountOptions,
  contactListOptions,
  contactMetaOptions,
  contactStatusesOptions,
  errorMessage,
} from "@/hooks/use-contacts";
import { defaultListColumns, isDisplayField } from "@/lib/frappe-meta";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;
const KANBAN_PAGE_SIZE = 100;
const COLUMNS_STORAGE_KEY = "agrocrm.contacts.columns";
const VIEW_STORAGE_KEY = "agrocrm.contacts.view";
const GROUP_BY_STORAGE_KEY = "agrocrm.contacts.groupBy";

export type ViewMode = "table" | "kanban" | "grid";

interface ContactSearch {
  q?: string | undefined;
  page?: number | undefined;
  sort?: string | undefined;
  dir?: "asc" | "desc" | undefined;
  view?: ViewMode | undefined;
  groupBy?: string | undefined;
}

export const Route = createFileRoute("/_app/contacts")({
  head: () => ({ meta: [{ title: "Contacts · AgroCRM" }] }),
  validateSearch: (raw: Record<string, unknown>): ContactSearch => {
    const search: ContactSearch = {};
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
  component: ContactsPage,
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

function ContactsPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const [createOpen, setCreateOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Record<string, unknown> | null>(null);
  const [modalInitialDoc, setModalInitialDoc] = useState<Record<string, unknown> | null>(null);

  const [savedColumns, setSavedColumns] = useState<string[] | null>(null);
  const [searchText, setSearchText] = useState(search.q ?? "");
  const [viewMode, setLocalViewMode] = useState<ViewMode>(search.view ?? "table");
  const [groupByField, setLocalGroupByField] = useState<string>(search.groupBy ?? "status");

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

  const metaQuery = useQuery(contactMetaOptions());
  const meta = metaQuery.data;

  const statusesQuery = useQuery(contactStatusesOptions());
  const statuses = useMemo(() => statusesQuery.data ?? [], [statusesQuery.data]);

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
    ...contactListOptions({
      search: q,
      filters: [],
      limit: fetchLimit,
      start: fetchStart,
      orderBy: sort ? `${sort.field} ${sort.direction}` : undefined,
    }),
    enabled: Boolean(meta),
  });

  const countQuery = useQuery({ ...contactCountOptions(q), enabled: Boolean(meta) });

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

  const handleEditContact = (contact: Record<string, unknown>) => {
    setEditingContact(contact);
    setModalInitialDoc(null);
    setCreateOpen(true);
  };

  const handleAddInStatus = (statusName: string) => {
    setEditingContact(null);
    setModalInitialDoc({ status: statusName });
    setCreateOpen(true);
  };

  const handleOpenCreateModal = () => {
    setEditingContact(null);
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
    <div className="flex h-full flex-col bg-background">
      {/* Top Banner Matching Frappe CRM */}
      <div className="border-b border-border bg-card/40 px-6 py-2.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium text-foreground">Contacts</span>
          <span className="text-muted-foreground/60">/</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 font-medium text-foreground hover:text-primary transition-colors cursor-pointer text-sm">
                <CurrentIcon className="size-3.5 text-muted-foreground" />
                <span>{currentViewObj.label}</span>
                <ChevronDown className="size-3 text-muted-foreground" />
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

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleOpenCreateModal}
            disabled={!meta}
            className="h-8 text-xs font-medium px-3.5 rounded-md bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-black cursor-pointer shadow-xs gap-1.5"
          >
            <Plus className="size-3.5" />
            <span>Create</span>
          </Button>
        </div>
      </div>

      {/* Secondary Filter Toolbar Matching Frappe CRM */}
      <div className="border-b border-border bg-background px-6 py-2 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Search Input */}
          <form onSubmit={submitSearch} className="relative w-52">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search contacts..."
              className="h-7 pl-8 pr-2 text-xs bg-muted/40 border-border/60 rounded-md"
            />
          </form>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              void metaQuery.refetch();
              void listQuery.refetch();
              void countQuery.refetch();
            }}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
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
            <AlertTitle>Could not load contacts</AlertTitle>
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
            <ContactKanban
              meta={meta}
              rows={listQuery.data ?? []}
              statuses={statuses}
              loading={loading}
              groupBy={activeGroupBy}
              onGroupByChange={handleGroupByChange}
              onRowClick={(name) => {
                void navigate({ to: "/contacts/$contactId", params: { contactId: name } });
              }}
              onEdit={handleEditContact}
              onAddInStatus={handleAddInStatus}
            />
          ) : activeView === "grid" ? (
            <ContactGrid
              meta={meta}
              rows={listQuery.data ?? []}
              statuses={statuses}
              loading={loading}
              onRowClick={(name) => {
                void navigate({ to: "/contacts/$contactId", params: { contactId: name } });
              }}
              onEdit={handleEditContact}
              emptyAction={
                <Button size="sm" onClick={handleOpenCreateModal} className="gap-1.5 cursor-pointer">
                  <Plus className="size-4" />
                  Create Contact
                </Button>
              }
            />
          ) : (
            <div className="space-y-4">
              <ContactTable
                meta={meta}
                rows={listQuery.data ?? []}
                columns={columns}
                statuses={statuses}
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
                  void navigate({ to: "/contacts/$contactId", params: { contactId: name } });
                }}
                onEdit={handleEditContact}
                loading={loading}
                emptyAction={
                  <Button size="sm" onClick={handleOpenCreateModal} className="gap-1.5 cursor-pointer">
                    <Plus className="size-4" />
                    Create Contact
                  </Button>
                }
              />

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
            </div>
          )
        ) : (
          <LoadingState
            title="Loading Contacts..."
            description="Fetching contacts directory and configuration from Frappe CRM..."
          />
        )}
      </div>

      {/* Create / Edit Contact Modal */}
      {meta && (
        <ContactFormModal
          open={createOpen}
          onOpenChange={setCreateOpen}
          meta={meta}
          contact={editingContact}
          initialValues={modalInitialDoc}
        />
      )}
    </div>
  );
}

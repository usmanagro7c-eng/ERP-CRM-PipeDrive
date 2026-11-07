import {
  ArrowDown,
  ArrowUp,
  ChevronsUpDown,
  CircleSlash,
  MoreVertical,
  Building2,
  User,
  Mail,
  Phone,
  CheckCircle,
  Briefcase,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoveToSubmenu } from "@/components/organizations/move-to-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ContactStatusBadge } from "@/components/contacts/contact-badge";
import { AvatarGradient } from "@/components/ui/avatar-gradient";
import {
  useSaveContact,
  useDeleteContact,
  useBulkDeleteContacts,
  useBulkMoveContactStatus,
  type FrappeDocTypeMeta,
} from "@/hooks/use-contacts";
import {
  fieldLabel,
  formatFieldValue,
  type FrappeDocField,
} from "@/lib/frappe-meta";
import { cn } from "@/lib/utils";

export interface SortState {
  field: string;
  direction: "asc" | "desc";
}

interface ContactTableProps {
  meta: FrappeDocTypeMeta;
  rows: Record<string, unknown>[];
  columns: string[];
  statuses: Array<{ name: string; label?: string }>;
  sort: SortState | null;
  onSortChange: (sort: SortState) => void;
  onRowClick?: (name: string) => void;
  onEdit?: (contact: Record<string, unknown>) => void;
  loading: boolean;
  emptyAction?: React.ReactNode;
}

function initialsOf(first: unknown, last: unknown): string {
  const f = String(first ?? "").trim();
  const l = String(last ?? "").trim();
  const combined = `${f} ${l}`.trim();
  if (!combined) return "—";
  const parts = combined.split(/\s+/).slice(0, 2);
  return parts.map((part) => part.charAt(0).toUpperCase()).join("");
}

function SortButton({
  field,
  label,
  sort,
  onSortChange,
}: {
  field: string;
  label: string;
  sort: SortState | null;
  onSortChange: (sort: SortState) => void;
}) {
  const active = sort?.field === field;
  return (
    <button
      type="button"
      onClick={() =>
        onSortChange({ field, direction: active && sort?.direction === "asc" ? "desc" : "asc" })
      }
      className={cn(
        "group inline-flex items-center gap-1 rounded px-1 py-0.5 text-xs font-medium uppercase tracking-wide transition-colors cursor-pointer",
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
      )}
      aria-label={`Sort by ${label}`}
    >
      {label}
      {active ? (
        sort?.direction === "asc" ? (
          <ArrowUp className="size-3" />
        ) : (
          <ArrowDown className="size-3" />
        )
      ) : (
        <ChevronsUpDown className="size-3 opacity-0 group-hover:opacity-60" />
      )}
    </button>
  );
}

export function ContactTable({
  meta,
  rows,
  columns,
  statuses,
  sort,
  onSortChange,
  onRowClick,
  onEdit,
  loading,
  emptyAction,
}: ContactTableProps) {
  const saveMutation = useSaveContact();
  const deleteMutation = useDeleteContact();
  const bulkDeleteMutation = useBulkDeleteContacts();
  const bulkMoveMutation = useBulkMoveContactStatus();

  const [selectedNames, setSelectedNames] = useState<string[]>([]);

  const fieldMap = useMemo(
    () => new Map((meta.fields ?? []).map((f) => [f.fieldname, f])),
    [meta],
  );

  const allNames = useMemo(
    () => rows.map((r) => String(r["name"] ?? "")).filter(Boolean),
    [rows],
  );

  const isAllSelected = allNames.length > 0 && selectedNames.length === allNames.length;
  const isPartiallySelected =
    selectedNames.length > 0 && selectedNames.length < allNames.length;

  function toggleSelectAll() {
    if (isAllSelected) {
      setSelectedNames([]);
    } else {
      setSelectedNames([...allNames]);
    }
  }

  function toggleRow(name: string) {
    setSelectedNames((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
    );
  }

  const statusOptions = useMemo(
    () =>
      statuses.map((s) => ({
        key: s.name,
        label: s.label || s.name,
        value: s.name,
      })),
    [statuses],
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Bulk actions bar */}
      {selectedNames.length > 0 && (
        <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-4 py-2 text-sm">
          <span className="font-medium">
            {selectedNames.length} of {rows.length} contact{selectedNames.length === 1 ? "" : "s"} selected
          </span>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs cursor-pointer">
                  Move to Status...
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-0 shadow-lg">
                <MoveToSubmenu
                  label="Select Status"
                  options={statusOptions}
                  onSelect={(status) => {
                    bulkMoveMutation.mutate({ names: selectedNames, status });
                    setSelectedNames([]);
                  }}
                />
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="destructive"
              size="sm"
              className="h-8 text-xs cursor-pointer"
              onClick={() => {
                if (
                  confirm(
                    `Are you sure you want to delete ${selectedNames.length} selected contact(s)?`,
                  )
                ) {
                  bulkDeleteMutation.mutate(selectedNames);
                  setSelectedNames([]);
                }
              }}
              disabled={bulkDeleteMutation.isPending}
            >
              <Trash2 className="size-3.5 mr-1" />
              Delete Selected
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-md border bg-card overflow-x-auto">
        <Table className="min-w-[700px]">
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="w-10 px-3">
                <Checkbox
                  checked={isAllSelected ? true : isPartiallySelected ? "indeterminate" : false}
                  onCheckedChange={toggleSelectAll}
                  aria-label="Select all contacts"
                />
              </TableHead>

              {/* Primary Contact Name */}
              <TableHead className="min-w-[220px]">
                <SortButton
                  field="first_name"
                  label="Contact Name"
                  sort={sort}
                  onSortChange={onSortChange}
                />
              </TableHead>

              <TableHead className="min-w-[120px]">
                <SortButton
                  field="status"
                  label="Status"
                  sort={sort}
                  onSortChange={onSortChange}
                />
              </TableHead>

              <TableHead className="min-w-[180px]">
                <SortButton
                  field="email_id"
                  label="Email"
                  sort={sort}
                  onSortChange={onSortChange}
                />
              </TableHead>

              <TableHead className="min-w-[140px]">
                <SortButton
                  field="mobile_no"
                  label="Phone / Mobile"
                  sort={sort}
                  onSortChange={onSortChange}
                />
              </TableHead>

              <TableHead className="min-w-[180px]">
                <SortButton
                  field="company_name"
                  label="Organization"
                  sort={sort}
                  onSortChange={onSortChange}
                />
              </TableHead>

              <TableHead className="min-w-[150px]">
                <SortButton
                  field="designation"
                  label="Designation"
                  sort={sort}
                  onSortChange={onSortChange}
                />
              </TableHead>

              {/* Dynamic extra columns */}
              {columns
                .filter(
                  (c) =>
                    ![
                      "first_name",
                      "last_name",
                      "full_name",
                      "status",
                      "email_id",
                      "mobile_no",
                      "phone",
                      "company_name",
                      "designation",
                    ].includes(c),
                )
                .map((colName) => {
                  const field = fieldMap.get(colName);
                  const label = field ? fieldLabel(field) : colName;
                  return (
                    <TableHead key={colName} className="min-w-[140px]">
                      <SortButton
                        field={colName}
                        label={label}
                        sort={sort}
                        onSortChange={onSortChange}
                      />
                    </TableHead>
                  );
                })}

              <TableHead className="w-12 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  <TableCell className="w-10 px-3">
                    <Skeleton className="h-4 w-4" />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-7 w-7 rounded-full" />
                      <div className="space-y-1">
                        <Skeleton className="h-3.5 w-28" />
                        <Skeleton className="h-2.5 w-16" />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-3.5 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-3.5 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-3.5 w-28" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-3.5 w-20" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-7 w-7 rounded ml-auto" />
                  </TableCell>
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + 8}
                  className="h-48 text-center text-muted-foreground"
                >
                  <div className="flex flex-col items-center justify-center gap-2">
                    <CircleSlash className="size-8 stroke-[1.5] text-muted-foreground/60" />
                    <p className="text-sm font-medium">No contacts found</p>
                    {emptyAction}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((contact) => {
                const name = String(contact["name"] ?? "");
                const firstName = String(contact["first_name"] ?? "");
                const lastName = String(contact["last_name"] ?? "");
                const fullName =
                  String(contact["full_name"] ?? "").trim() ||
                  `${firstName} ${lastName}`.trim() ||
                  name;
                const status = String(contact["status"] ?? "Passive");
                const email = String(contact["email_id"] ?? "");
                const phone =
                  String(contact["mobile_no"] ?? "").trim() ||
                  String(contact["phone"] ?? "").trim();
                const company = String(contact["company_name"] ?? "");
                const designation = String(contact["designation"] ?? "");
                const isSelected = selectedNames.includes(name);

                return (
                  <TableRow
                    key={name}
                    data-state={isSelected ? "selected" : undefined}
                    className="hover:bg-muted/40 transition-colors"
                  >
                    <TableCell className="w-10 px-3" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleRow(name)}
                        aria-label={`Select ${fullName}`}
                      />
                    </TableCell>

                    <TableCell
                      className="font-medium cursor-pointer"
                      onClick={() => (onRowClick ? onRowClick(name) : onEdit?.(contact))}
                    >
                      <div className="flex items-center gap-2.5">
                        <AvatarGradient name={fullName} size="sm" />
                        <div className="truncate">
                          <span className="text-sm font-medium text-foreground hover:underline">
                            {fullName}
                          </span>
                          {name && name !== fullName && (
                            <div className="text-[11px] text-muted-foreground truncate font-mono">
                              {name}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <ContactStatusBadge status={status} />
                    </TableCell>

                    <TableCell>
                      {email ? (
                        <a
                          href={`mailto:${email}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:underline max-w-[200px] truncate"
                        >
                          <Mail className="size-3 text-muted-foreground/70 shrink-0" />
                          <span className="truncate">{email}</span>
                        </a>
                      ) : (
                        <span className="text-muted-foreground/40 text-xs">—</span>
                      )}
                    </TableCell>

                    <TableCell>
                      {phone ? (
                        <a
                          href={`tel:${phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:underline"
                        >
                          <Phone className="size-3 text-muted-foreground/70 shrink-0" />
                          <span>{phone}</span>
                        </a>
                      ) : (
                        <span className="text-muted-foreground/40 text-xs">—</span>
                      )}
                    </TableCell>

                    <TableCell>
                      {company ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-foreground truncate max-w-[180px]">
                          <AvatarGradient name={company} size="xs" rounded="md" />
                          <span className="truncate">{company}</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40 text-xs">—</span>
                      )}
                    </TableCell>

                    <TableCell>
                      {designation ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground truncate max-w-[150px]">
                          <Briefcase className="size-3 text-muted-foreground/70 shrink-0" />
                          <span className="truncate">{designation}</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40 text-xs">—</span>
                      )}
                    </TableCell>

                    {/* Dynamic Columns */}
                    {columns
                      .filter(
                        (c) =>
                          ![
                            "first_name",
                            "last_name",
                            "full_name",
                            "status",
                            "email_id",
                            "mobile_no",
                            "phone",
                            "company_name",
                            "designation",
                          ].includes(c),
                      )
                      .map((colName) => {
                        const field = fieldMap.get(colName);
                        const raw = contact[colName];
                        const display = field ? formatFieldValue(field, raw) : String(raw ?? "—");
                        return (
                          <TableCell key={colName} className="text-xs text-muted-foreground">
                            {display || "—"}
                          </TableCell>
                        );
                      })}

                    {/* Row 3-dots Actions */}
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-muted-foreground hover:text-foreground cursor-pointer"
                          >
                            <MoreVertical className="size-4" />
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 text-xs">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => onEdit?.(contact)}
                            className="cursor-pointer"
                          >
                            Edit Contact
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />

                          <MoveToSubmenu
                            label="Move to Status"
                            currentValue={status}
                            options={statusOptions}
                            onSelect={(newStatus) => {
                              saveMutation.mutate({
                                name,
                                values: { status: newStatus },
                              });
                            }}
                          />

                          <DropdownMenuSeparator />

                          <DropdownMenuItem
                            onClick={() => {
                              if (confirm(`Delete contact "${fullName}"?`)) {
                                deleteMutation.mutate(name);
                              }
                            }}
                            className="text-destructive focus:text-destructive cursor-pointer"
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

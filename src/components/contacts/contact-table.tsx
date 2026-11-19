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
import { fieldLabel, formatFieldValue, type FrappeDocField } from "@/lib/frappe-meta";
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

function ContactCellValue({
  field,
  contact,
  onRowClick,
  onEdit,
}: {
  field: FrappeDocField;
  contact: Record<string, unknown>;
  onRowClick?: ((name: string) => void) | undefined;
  onEdit?: ((contact: Record<string, unknown>) => void) | undefined;
}) {
  const name = String(contact["name"] ?? "");
  const firstName = String(contact["first_name"] ?? "");
  const lastName = String(contact["last_name"] ?? "");
  const fullName =
    String(contact["full_name"] ?? "").trim() ||
    `${firstName} ${lastName}`.trim() ||
    name;

  if (field.fieldname === "first_name" || field.fieldname === "full_name") {
    return (
      <div
        className="flex items-center gap-2.5 font-medium cursor-pointer"
        onClick={() => (onRowClick ? onRowClick(name) : onEdit?.(contact))}
      >
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
    );
  }

  if (field.fieldname === "name") {
    return (
      <span
        className="font-mono text-xs font-semibold text-primary cursor-pointer hover:underline"
        onClick={() => (onRowClick ? onRowClick(name) : onEdit?.(contact))}
      >
        {name}
      </span>
    );
  }

  if (field.fieldname === "status") {
    const status = String(contact["status"] ?? "Passive");
    return <ContactStatusBadge status={status} />;
  }

  if (field.fieldname === "email_id" || field.fieldname === "email") {
    const email = String(contact[field.fieldname] ?? "");
    if (!email) return <span className="text-muted-foreground/40 text-xs">—</span>;
    return (
      <a
        href={`mailto:${email}`}
        onClick={(e) => e.stopPropagation()}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:underline max-w-[200px] truncate"
      >
        <Mail className="size-3 text-muted-foreground/70 shrink-0" />
        <span className="truncate">{email}</span>
      </a>
    );
  }

  if (field.fieldname === "mobile_no" || field.fieldname === "phone") {
    const phone =
      String(contact[field.fieldname] ?? "").trim() ||
      (field.fieldname === "mobile_no" ? String(contact["phone"] ?? "").trim() : "");
    if (!phone) return <span className="text-muted-foreground/40 text-xs">—</span>;
    return (
      <a
        href={`tel:${phone}`}
        onClick={(e) => e.stopPropagation()}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:underline"
      >
        <Phone className="size-3 text-muted-foreground/70 shrink-0" />
        <span>{phone}</span>
      </a>
    );
  }

  if (field.fieldname === "company_name" || field.fieldname === "organization") {
    const company = String(contact[field.fieldname] ?? "");
    if (!company) return <span className="text-muted-foreground/40 text-xs">—</span>;
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-foreground truncate max-w-[180px]">
        <AvatarGradient name={company} size="xs" rounded="md" />
        <span className="truncate">{company}</span>
      </span>
    );
  }

  if (field.fieldname === "designation" || field.fieldname === "job_title") {
    const designation = String(contact[field.fieldname] ?? "");
    if (!designation) return <span className="text-muted-foreground/40 text-xs">—</span>;
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground truncate max-w-[150px]">
        <Briefcase className="size-3 text-muted-foreground/70 shrink-0" />
        <span className="truncate">{designation}</span>
      </span>
    );
  }

  const raw = contact[field.fieldname];
  const display = formatFieldValue(field, raw);
  return <span className="text-xs text-muted-foreground">{display || "—"}</span>;
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

  const fieldMap = useMemo(() => new Map((meta.fields ?? []).map((f) => [f.fieldname, f])), [meta]);

  const activeFields = useMemo(() => {
    return columns.map((colName) => {
      return (
        fieldMap.get(colName) ?? {
          fieldname: colName,
          fieldtype: "Data",
          label: colName.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        }
      );
    });
  }, [columns, fieldMap]);

  const allNames = useMemo(() => rows.map((r) => String(r["name"] ?? "")).filter(Boolean), [rows]);

  const isAllSelected = allNames.length > 0 && selectedNames.length === allNames.length;
  const isPartiallySelected = selectedNames.length > 0 && selectedNames.length < allNames.length;

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
            {selectedNames.length} of {rows.length} contact{selectedNames.length === 1 ? "" : "s"}{" "}
            selected
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

              {activeFields.map((field) => {
                const isPrimary = field.fieldname === "first_name" || field.fieldname === "full_name";
                const label =
                  isPrimary && (!field.label || field.label === "First Name")
                    ? "Contact Name"
                    : fieldLabel(field);
                const minWidth =
                  isPrimary
                    ? "min-w-[220px]"
                    : field.fieldname === "status"
                      ? "min-w-[120px]"
                      : field.fieldname === "email_id" || field.fieldname === "email"
                        ? "min-w-[180px]"
                        : field.fieldname === "mobile_no" || field.fieldname === "phone"
                          ? "min-w-[140px]"
                          : field.fieldname === "company_name" || field.fieldname === "organization"
                            ? "min-w-[180px]"
                            : field.fieldname === "designation" || field.fieldname === "job_title"
                              ? "min-w-[150px]"
                              : "min-w-[130px]";

                return (
                  <TableHead key={field.fieldname} className={minWidth}>
                    <SortButton
                      field={field.fieldname}
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
                  {activeFields.map((field) => (
                    <TableCell key={field.fieldname}>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                  ))}
                  <TableCell className="text-right">
                    <Skeleton className="h-7 w-7 rounded ml-auto" />
                  </TableCell>
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={activeFields.length + 2}
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

                    {activeFields.map((field) => (
                      <TableCell key={field.fieldname}>
                        <ContactCellValue
                          field={field}
                          contact={contact}
                          onRowClick={onRowClick}
                          onEdit={onEdit}
                        />
                      </TableCell>
                    ))}

                    {/* Row 3-dots Actions */}
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-muted-foreground hover:text-foreground cursor-pointer"
                            aria-label="More actions"
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

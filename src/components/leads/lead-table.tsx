import {
  ArrowDown,
  ArrowUp,
  Briefcase,
  ChevronsUpDown,
  CircleSlash,
  MoreVertical,
  Building2,
  User,
  Mail,
  Phone,
  CheckCircle,
} from "lucide-react";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
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
import { LeadStatusBadge, LeadTemperatureBadge } from "@/components/leads/lead-stage-badge";
import { AvatarGradient } from "@/components/ui/avatar-gradient";
import { useSaveLead, useDeleteLead, type FrappeDocTypeMeta } from "@/hooks/use-leads";
import {
  fieldsByNames,
  fieldLabel,
  formatFieldValue,
  type FrappeDocField,
} from "@/lib/frappe-meta";
import { cn } from "@/lib/utils";

export interface SortState {
  field: string;
  direction: "asc" | "desc";
}

interface LeadTableProps {
  meta: FrappeDocTypeMeta;
  rows: Record<string, unknown>[];
  columns: string[];
  statuses: Array<{ name: string; label?: string }>;
  sort: SortState | null;
  onSortChange: (sort: SortState) => void;
  onRowClick?: (name: string) => void;
  onEdit?: (lead: Record<string, unknown>) => void;
  onConvert?: (lead: Record<string, unknown>) => void;
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
        <ChevronsUpDown className="size-3 opacity-40 group-hover:opacity-100" />
      )}
    </button>
  );
}

function LeadCellValue({ field, row }: { field: FrappeDocField; row: Record<string, unknown> }) {
  const value = row[field.fieldname];

  if (field.fieldname === "status") {
    return <LeadStatusBadge status={value as string} />;
  }

  if (field.fieldname === "lead_temperature") {
    return <LeadTemperatureBadge temp={value as string} />;
  }

  if (field.fieldname === "first_name" || field.fieldname === "lead_name") {
    const fullName =
      (row["lead_name"] as string) ||
      `${String(row["first_name"] ?? "")} ${String(row["last_name"] ?? "")}`.trim();
    return (
      <div className="flex items-center gap-2.5 font-medium text-foreground">
        <AvatarGradient name={fullName || "Lead"} size="sm" />
        <span className="truncate max-w-[180px] font-semibold">{fullName || "—"}</span>
      </div>
    );
  }

  if (field.fieldname === "organization") {
    if (!value) return <span className="text-muted-foreground">—</span>;
    return (
      <div className="flex items-center gap-1.5 font-medium text-foreground">
        <AvatarGradient name={String(value)} size="xs" rounded="md" />
        <span className="truncate max-w-[180px]">{String(value)}</span>
      </div>
    );
  }

  if (field.fieldname === "email") {
    if (!value) return <span className="text-muted-foreground">—</span>;
    return (
      <a
        href={`mailto:${String(value)}`}
        onClick={(e) => e.stopPropagation()}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary hover:underline"
      >
        <Mail className="size-3 shrink-0" />
        <span className="truncate max-w-[160px]">{String(value)}</span>
      </a>
    );
  }

  if (field.fieldname === "mobile_no" || field.fieldname === "phone") {
    if (!value) return <span className="text-muted-foreground">—</span>;
    return (
      <a
        href={`tel:${String(value)}`}
        onClick={(e) => e.stopPropagation()}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary hover:underline"
      >
        <Phone className="size-3 shrink-0" />
        <span>{String(value)}</span>
      </a>
    );
  }

  if (field.fieldname === "converted") {
    return value ? (
      <span className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
        <CheckCircle className="size-3.5" />
        Converted
      </span>
    ) : (
      <span className="text-muted-foreground text-xs">—</span>
    );
  }

  if (field.fieldname === "lead_owner") {
    if (!value) return <span className="text-muted-foreground">—</span>;
    return (
      <div className="flex items-center gap-1.5 text-xs">
        <AvatarGradient name={String(value)} size="xs" />
        <span className="truncate max-w-[140px] text-muted-foreground">{String(value)}</span>
      </div>
    );
  }

  return <span>{formatFieldValue(field, value)}</span>;
}

export function LeadTable({
  meta,
  rows,
  columns,
  statuses,
  sort,
  onSortChange,
  onRowClick,
  onEdit,
  onConvert,
  loading,
  emptyAction,
}: LeadTableProps) {
  const saveMutation = useSaveLead();
  const deleteMutation = useDeleteLead();

  const activeFields = useMemo(() => fieldsByNames(meta, columns), [meta, columns]);

  const statusOptions = useMemo(() => {
    return statuses.map((s) => ({
      key: s.name,
      label: s.label || s.name,
      value: s.name,
    }));
  }, [statuses]);

  if (loading && rows.length === 0) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 8 }).map((_, idx) => (
          <Skeleton key={idx} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!loading && rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
          <CircleSlash className="size-6 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-semibold">No leads found</h3>
          <p className="text-xs text-muted-foreground max-w-sm">
            No leads match your search criteria or none have been created yet.
          </p>
        </div>
        {emptyAction}
      </div>
    );
  }

  return (
    <div className="relative overflow-x-auto">
      <Table className="min-w-[850px]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[200px] min-w-[190px]">
              <SortButton field="name" label="Lead ID" sort={sort} onSortChange={onSortChange} />
            </TableHead>
            {activeFields.map((field) => (
              <TableHead key={field.fieldname}>
                <SortButton
                  field={field.fieldname}
                  label={fieldLabel(field)}
                  sort={sort}
                  onSortChange={onSortChange}
                />
              </TableHead>
            ))}
            <TableHead className="w-[60px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const name = String(row["name"] ?? "");
            const currentStatus = String(row["status"] ?? "");

            return (
              <TableRow
                key={name}
                onClick={() => onRowClick?.(name)}
                className="group cursor-pointer hover:bg-muted/50"
              >
                <TableCell className="font-mono text-xs font-semibold text-primary whitespace-nowrap min-w-[190px]">
                  {name}
                </TableCell>
                {activeFields.map((field) => (
                  <TableCell key={field.fieldname} className="text-sm">
                    <LeadCellValue field={field} row={row} />
                  </TableCell>
                ))}
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100"
                        aria-label="More actions"
                      >
                        <MoreVertical className="size-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      {onEdit && (
                        <DropdownMenuItem onClick={() => onEdit(row)}>Edit Lead</DropdownMenuItem>
                      )}
                      {onConvert && (
                        <DropdownMenuItem
                          onClick={() => onConvert(row)}
                          disabled={Boolean(row["converted"]) || currentStatus === "Converted"}
                        >
                          <Briefcase className="mr-2 size-4 text-primary" />
                          {Boolean(row["converted"]) || currentStatus === "Converted"
                            ? "Already Converted"
                            : "Convert to Deal"}
                        </DropdownMenuItem>
                      )}
                      <MoveToSubmenu
                        label="Move to Status"
                        currentValue={currentStatus}
                        options={statusOptions}
                        onSelect={(newStatus) => {
                          void saveMutation.mutateAsync({
                            name,
                            values: { status: newStatus },
                          });
                        }}
                      />
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to delete lead ${name}?`)) {
                            void deleteMutation.mutate(name);
                          }
                        }}
                      >
                        Delete Lead
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

import { ArrowDown, ArrowUp, ChevronsUpDown, CircleSlash, MoreVertical } from "lucide-react";
import { Link } from "@tanstack/react-router";
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
import {
  useSaveOrganization,
  useLinkOptions,
} from "@/hooks/use-organizations";
import {
  fieldsByNames,
  fieldLabel,
  formatFieldValue,
  selectOptions,
  type FrappeDocField,
  type FrappeDocTypeMeta,
} from "@/lib/frappe-meta";
import { cn } from "@/lib/utils";

export interface SortState {
  field: string;
  direction: "asc" | "desc";
}

interface OrgTableProps {
  meta: FrappeDocTypeMeta;
  rows: Record<string, unknown>[];
  columns: string[];
  sort: SortState | null;
  onSortChange: (sort: SortState) => void;
  onRowClick?: (name: string) => void;
  onEdit?: (org: Record<string, unknown>) => void;
  loading: boolean;
  emptyAction?: React.ReactNode;
}

function initialsOf(value: unknown): string {
  const text = String(value ?? "").trim();
  if (!text) return "—";
  const parts = text.split(/\s+/).slice(0, 2);
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

function CellValue({ field, value }: { field: FrappeDocField; value: unknown }) {
  if (field.fieldtype === "Attach Image" && typeof value === "string" && value) {
    return <img src={value} alt="" className="size-8 rounded-md border object-cover" />;
  }
  const text = formatFieldValue(field, value);
  return <span className={cn(text === "—" && "text-muted-foreground/60")}>{text}</span>;
}

export function OrgTable({
  meta,
  rows,
  columns,
  sort,
  onSortChange,
  onRowClick,
  onEdit,
  loading,
  emptyAction,
}: OrgTableProps) {
  const saveMutation = useSaveOrganization();
  const columnFields = fieldsByNames(meta, columns);
  const titleField = meta.title_field || columnFields[0]?.fieldname;
  const imageField = meta.image_field;

  // Options for Move to submenus
  const industryQuery = useLinkOptions("CRM Industry");
  const territoryQuery = useLinkOptions("CRM Territory");

  const industries = useMemo(() => {
    const fetched = (industryQuery.data ?? []).map((i) => i.name);
    const existing = new Set<string>();
    for (const r of rows) {
      if (typeof r["industry"] === "string" && r["industry"].trim()) {
        existing.add(r["industry"].trim());
      }
    }
    return Array.from(new Set([...fetched, ...existing]));
  }, [industryQuery.data, rows]);

  const territories = useMemo(() => {
    const fetched = (territoryQuery.data ?? []).map((t) => t.name);
    const existing = new Set<string>();
    for (const r of rows) {
      if (typeof r["territory"] === "string" && r["territory"].trim()) {
        existing.add(r["territory"].trim());
      }
    }
    return Array.from(new Set([...fetched, ...existing]));
  }, [territoryQuery.data, rows]);

  const employeeField = meta.fields?.find((f) => f.fieldname === "no_of_employees");
  const employeeOptions = employeeField ? selectOptions(employeeField) : [];

  const handleMoveOrg = async (orgName: string, fieldname: string, targetValue: string) => {
    try {
      await saveMutation.mutateAsync({
        name: orgName,
        values: {
          [fieldname]: targetValue,
        },
      });
    } catch {
      // toast shown by mutation
    }
  };

  return (
    <div className="overflow-x-auto rounded-xl border bg-card shadow-card">
      <Table className="min-w-[650px]">
        <TableHeader>
          <TableRow className="bg-secondary/60 hover:bg-secondary/60">
            {columnFields.map((field) => (
              <TableHead key={field.fieldname} className="whitespace-nowrap">
                <SortButton
                  field={field.fieldname}
                  label={fieldLabel(field)}
                  sort={sort}
                  onSortChange={onSortChange}
                />
              </TableHead>
            ))}
            <TableHead className="w-12 text-right pr-4">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading &&
            rows.length === 0 &&
            Array.from({ length: 6 }).map((_, index) => (
              <TableRow key={`skeleton-${index}`}>
                {columnFields.map((field) => (
                  <TableCell key={field.fieldname}>
                    <Skeleton className="h-4 w-3/4" />
                  </TableCell>
                ))}
                <TableCell className="w-12 text-right pr-4">
                  <Skeleton className="h-4 w-6 ml-auto" />
                </TableCell>
              </TableRow>
            ))}
          {!loading && rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={columnFields.length + 1} className="h-64">
                <div className="flex flex-col items-center gap-3 text-center">
                  <span className="flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
                    <CircleSlash className="size-6" />
                  </span>
                  <div>
                    <p className="font-medium">No organizations found</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Try a different search, or add your first organization.
                    </p>
                  </div>
                  {emptyAction}
                </div>
              </TableCell>
            </TableRow>
          )}
          {rows.map((row) => {
            const orgName = String(row["name"] ?? "");
            return (
              <TableRow
                key={orgName}
                className="cursor-pointer group"
                onClick={() => onRowClick?.(orgName)}
              >
                {columnFields.map((field, index) => (
                  <TableCell key={field.fieldname} className="max-w-64 truncate">
                    <span className="flex items-center gap-2">
                      {field.fieldname === titleField && !imageField && (
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                          {initialsOf(row[field.fieldname])}
                        </span>
                      )}
                      {field.fieldname === titleField &&
                      imageField &&
                      typeof row[imageField] === "string" &&
                      row[imageField] ? (
                        <img
                          src={String(row[imageField])}
                          alt=""
                          className="size-7 shrink-0 rounded-full border object-cover"
                        />
                      ) : null}
                      {field.fieldname === titleField ? (
                        <Link
                          to="/organizations/$orgId"
                          params={{ orgId: orgName }}
                          className="font-medium text-foreground hover:text-primary hover:underline"
                          onClick={(event) => event.stopPropagation()}
                        >
                          {formatFieldValue(field, row[field.fieldname])}
                        </Link>
                      ) : (
                        <CellValue field={field} value={row[field.fieldname]} />
                      )}
                    </span>
                    {index === -1 && null}
                  </TableCell>
                ))}

                {/* Actions 3-dots Menu */}
                <TableCell className="w-12 text-right pr-3" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 opacity-90 sm:opacity-50 sm:group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-accent"
                      >
                        <MoreVertical className="size-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44 text-xs">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem asChild>
                        <Link to="/organizations/$orgId" params={{ orgId: orgName }}>
                          View details
                        </Link>
                      </DropdownMenuItem>
                      {onEdit && (
                        <DropdownMenuItem onClick={() => onEdit(row)}>
                          Edit organization
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />

                      {/* Move to Industry with search & scroll */}
                      <MoveToSubmenu
                        label="Move to Industry"
                        currentValue={typeof row["industry"] === "string" ? row["industry"] : ""}
                        allowNone={true}
                        options={industries.map((ind) => ({ key: ind, label: ind, value: ind }))}
                        onSelect={(val) => void handleMoveOrg(orgName, "industry", val)}
                      />

                      {/* Move to Employees with search & scroll */}
                      {employeeOptions.length > 0 && (
                        <MoveToSubmenu
                          label="Move to Employees"
                          currentValue={typeof row["no_of_employees"] === "string" ? row["no_of_employees"] : ""}
                          options={employeeOptions.map((opt) => ({ key: opt, label: opt, value: opt }))}
                          onSelect={(val) => void handleMoveOrg(orgName, "no_of_employees", val)}
                        />
                      )}

                      {/* Move to Territory with search & scroll */}
                      {territories.length > 0 && (
                        <MoveToSubmenu
                          label="Move to Territory"
                          currentValue={typeof row["territory"] === "string" ? row["territory"] : ""}
                          allowNone={true}
                          options={territories.map((terr) => ({ key: terr, label: terr, value: terr }))}
                          onSelect={(val) => void handleMoveOrg(orgName, "territory", val)}
                        />
                      )}
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

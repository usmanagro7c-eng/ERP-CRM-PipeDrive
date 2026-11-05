import { ArrowDown, ArrowUp, ChevronsUpDown, CircleSlash, MoreVertical, Building2, User, Calendar, Loader2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";

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
import { StageBadge, formatCurrency } from "@/components/deals/deal-stage-badge";
import { DealLostModal } from "@/components/deals/deal-lost-modal";
import { useSaveDeal, useDeleteDeal, type FrappeDocTypeMeta } from "@/hooks/use-deals";
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

interface DealTableProps {
  meta: FrappeDocTypeMeta;
  rows: Record<string, unknown>[];
  columns: string[];
  stages: Array<{ name: string; label?: string }>;
  sort: SortState | null;
  onSortChange: (sort: SortState) => void;
  onRowClick?: (name: string) => void;
  onEdit?: (deal: Record<string, unknown>) => void;
  loading: boolean;
  emptyAction?: React.ReactNode;
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

function DealCellValue({
  field,
  row,
  movingTo,
}: {
  field: FrappeDocField;
  row: Record<string, unknown>;
  movingTo?: string | undefined;
}) {
  const value = row[field.fieldname];

  if (field.fieldname === "status") {
    if (movingTo) {
      return (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/25 text-xs font-semibold text-primary animate-pulse">
          <Loader2 className="size-3 animate-spin" />
          <span>Moving to {movingTo}...</span>
        </div>
      );
    }
    return <StageBadge stage={value as string} />;
  }

  if (field.fieldname === "deal_value") {
    const currency = (row["currency"] as string) || "PKR";
    return (
      <span className="font-semibold text-foreground">
        {formatCurrency(value, currency)}
      </span>
    );
  }

  if (field.fieldname === "probability") {
    if (value === null || value === undefined || value === "") return <span className="text-muted-foreground">—</span>;
    return (
      <div className="flex items-center gap-2">
        <div className="h-1.5 w-12 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary"
            style={{ width: `${Math.min(100, Math.max(0, Number(value)))}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground font-mono">{Number(value)}%</span>
      </div>
    );
  }

  if (field.fieldname === "organization") {
    const orgName = (row["organization_name"] as string) || (value as string);
    return (
      <div className="flex items-center gap-1.5 font-medium text-foreground">
        <Building2 className="size-3.5 text-muted-foreground shrink-0" />
        <span className="truncate max-w-[200px]">{orgName || "—"}</span>
      </div>
    );
  }

  if (field.fieldname === "deal_owner") {
    if (!value) return <span className="text-muted-foreground">—</span>;
    return (
      <div className="flex items-center gap-1.5 text-xs">
        <User className="size-3 text-muted-foreground shrink-0" />
        <span className="truncate">{String(value)}</span>
      </div>
    );
  }

  if (field.fieldname === "expected_closure_date") {
    if (!value) return <span className="text-muted-foreground">—</span>;
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Calendar className="size-3 shrink-0" />
        <span>{formatFieldValue(field, value)}</span>
      </div>
    );
  }

  return <span>{formatFieldValue(field, value)}</span>;
}

export function DealTable({
  meta,
  rows,
  columns,
  stages,
  sort,
  onSortChange,
  onRowClick,
  onEdit,
  loading,
  emptyAction,
}: DealTableProps) {
  const saveMutation = useSaveDeal();
  const deleteMutation = useDeleteDeal();

  const activeFields = useMemo(() => fieldsByNames(meta, columns), [meta, columns]);

  const stageOptions = useMemo(() => {
    return stages.map((s) => ({
      key: s.name,
      label: s.label || s.name,
      value: s.name,
    }));
  }, [stages]);

  const [lostModalState, setLostModalState] = useState<{
    open: boolean;
    dealName: string;
    dealTitle?: string;
    targetStatus: string;
  }>({ open: false, dealName: "", targetStatus: "Lost" });

  const [movingDeals, setMovingDeals] = useState<Record<string, string>>({});

  function isLostStage(stageKey: string): boolean {
    const stage = stages.find((s) => s.name === stageKey);
    return stageKey.toLowerCase().includes("lost") || stage?.label?.toLowerCase().includes("lost") || false;
  }

  async function handleMove(dealName: string, targetStage: string) {
    setMovingDeals((prev) => ({ ...prev, [dealName]: targetStage }));
    try {
      await saveMutation.mutateAsync({
        name: dealName,
        values: { status: targetStage },
      });
    } finally {
      setMovingDeals((prev) => {
        const next = { ...prev };
        delete next[dealName];
        return next;
      });
    }
  }

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
          <h3 className="text-base font-semibold">No deals found</h3>
          <p className="text-xs text-muted-foreground max-w-sm">
            No deals match your search criteria or none have been created yet.
          </p>
        </div>
        {emptyAction}
      </div>
    );
  }

  return (
    <div className="relative overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[140px]">
              <SortButton
                field="name"
                label="Deal ID"
                sort={sort}
                onSortChange={onSortChange}
              />
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
            const currentStage = String(row["status"] ?? "");
            const orgName = String(row["organization_name"] || row["organization"] || name);
            const isMoving = Boolean(movingDeals[name]);
            const movingTo = movingDeals[name];

            return (
              <TableRow
                key={name}
                onClick={() => onRowClick?.(name)}
                className={cn(
                  "group cursor-pointer hover:bg-muted/50 transition-colors",
                  isMoving && "opacity-60 pointer-events-none bg-primary/5",
                )}
              >
                <TableCell className="font-mono text-xs font-semibold text-primary">
                  {name}
                </TableCell>
                {activeFields.map((field) => (
                  <TableCell key={field.fieldname} className="text-sm">
                    <DealCellValue field={field} row={row} movingTo={movingTo} />
                  </TableCell>
                ))}
                <TableCell
                  className="text-right"
                  onClick={(e) => e.stopPropagation()}
                >
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 opacity-0 group-hover:opacity-100 focus:opacity-100"
                      >
                        <MoreVertical className="size-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      {onEdit && (
                        <DropdownMenuItem onClick={() => onEdit(row)}>
                          Edit Deal
                        </DropdownMenuItem>
                      )}
                      <MoveToSubmenu
                        label="Move to Stage"
                        currentValue={currentStage}
                        options={stageOptions}
                        onSelect={(newStage) => {
                          if (isLostStage(newStage)) {
                            setLostModalState({
                              open: true,
                              dealName: name,
                              dealTitle: orgName,
                              targetStatus: newStage,
                            });
                          } else {
                            void saveMutation.mutateAsync({
                              name,
                              values: { status: newStage },
                            });
                          }
                        }}
                      />
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => {
                          if (
                            window.confirm(
                              `Are you sure you want to delete deal ${name}?`,
                            )
                          ) {
                            void deleteMutation.mutate(name);
                          }
                        }}
                      >
                        Delete Deal
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <DealLostModal
        open={lostModalState.open}
        onOpenChange={(open) => setLostModalState((prev) => ({ ...prev, open }))}
        dealNames={lostModalState.dealName ? [lostModalState.dealName] : []}
        dealTitle={lostModalState.dealTitle}
        targetStatus={lostModalState.targetStatus}
      />
    </div>
  );
}

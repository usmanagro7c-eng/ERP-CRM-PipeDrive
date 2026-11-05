import { useMemo, useState } from "react";
import {
  Building2,
  Calendar,
  MoreVertical,
  User,
  CircleSlash,
  ArrowRight,
  TrendingUp,
  Loader2,
} from "lucide-react";
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
import { StageBadge, formatCurrency } from "@/components/deals/deal-stage-badge";
import { DealLostModal } from "@/components/deals/deal-lost-modal";
import { useSaveDeal, useDeleteDeal, type FrappeDocTypeMeta } from "@/hooks/use-deals";
import { cn } from "@/lib/utils";

interface DealGridProps {
  meta: FrappeDocTypeMeta;
  rows: Record<string, unknown>[];
  stages: Array<{ name: string; label?: string }>;
  onRowClick?: (name: string) => void;
  onEdit?: (deal: Record<string, unknown>) => void;
  loading: boolean;
  emptyAction?: React.ReactNode;
}

export function DealGrid({
  meta,
  rows,
  stages,
  onRowClick,
  onEdit,
  loading,
  emptyAction,
}: DealGridProps) {
  const saveMutation = useSaveDeal();
  const deleteMutation = useDeleteDeal();

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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 p-4">
        {Array.from({ length: 8 }).map((_, idx) => (
          <Skeleton key={idx} className="h-44 w-full rounded-xl" />
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
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 p-1">
      {rows.map((row) => {
        const name = String(row["name"] ?? "");
        const orgName =
          String(row["organization_name"] ?? "") ||
          String(row["organization"] ?? "Unnamed Deal");
        const stage = String(row["status"] ?? "");
        const dealValue = row["deal_value"];
        const currency = (row["currency"] as string) || "PKR";
        const closeDate = row["expected_closure_date"];
        const owner = row["deal_owner"];
        const probability = row["probability"];
        const nextStep = row["next_step"];
        const isMoving = Boolean(movingDeals[name]);
        const movingTo = movingDeals[name];

        return (
          <div
            key={name}
            onClick={() => onRowClick?.(name)}
            className={cn(
              "group relative overflow-hidden flex flex-col justify-between rounded-xl border bg-card p-4 shadow-xs transition-all hover:border-primary/50 hover:shadow-md cursor-pointer",
              isMoving && "pointer-events-none ring-2 ring-primary/40",
            )}
          >
            {isMoving && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-xl bg-background/85 backdrop-blur-xs p-3 text-center animate-in fade-in duration-200">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/25 text-xs font-semibold text-primary shadow-xs">
                  <Loader2 className="size-3.5 animate-spin text-primary" />
                  <span className="truncate max-w-[180px]">Moving to {movingTo}...</span>
                </div>
              </div>
            )}
            {/* Top row: Org & 3-dots */}
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 truncate">
                  <div className="flex items-center gap-1.5 text-foreground font-semibold text-sm truncate group-hover:text-primary transition-colors">
                    <Building2 className="size-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">{orgName}</span>
                  </div>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {name}
                  </span>
                </div>

                <div
                  className="shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground opacity-60 group-hover:opacity-100"
                      >
                        <MoreVertical className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 text-xs">
                      <DropdownMenuLabel>Deal Actions</DropdownMenuLabel>
                      {onEdit && (
                        <DropdownMenuItem onClick={() => onEdit(row)}>
                          Edit Deal
                        </DropdownMenuItem>
                      )}
                      <MoveToSubmenu
                        label="Move to Stage"
                        currentValue={stage}
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
                            void handleMove(name, newStage);
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
                </div>
              </div>

              {/* Stage Badge & Value */}
              <div className="mt-3 flex items-center justify-between gap-2">
                <StageBadge stage={stage} />
                <span className="font-bold text-sm font-mono text-foreground">
                  {formatCurrency(dealValue, currency)}
                </span>
              </div>

              {/* Probability bar if present */}
              {probability !== undefined && probability !== null && (
                <div className="mt-2.5 space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>Win probability</span>
                    <span className="font-mono">{Number(probability)}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{
                        width: `${Math.min(100, Math.max(0, Number(probability)))}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Next step if present */}
              {Boolean(nextStep) && (
                <div className="mt-2.5 rounded bg-muted/50 p-1.5 text-[11px] text-muted-foreground italic truncate">
                  <span className="font-medium not-italic text-foreground">Next: </span>
                  {String(nextStep)}
                </div>
              )}
            </div>

            {/* Footer row: Close date & Owner */}
            <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-2.5 text-xs text-muted-foreground">
              {Boolean(closeDate) ? (
                <div className="flex items-center gap-1.5">
                  <Calendar className="size-3.5 opacity-70" />
                  <span>{String(closeDate)}</span>
                </div>
              ) : (
                <span />
              )}

              {Boolean(owner) && (
                <div
                  className="flex items-center gap-1.5 font-medium"
                  title={`Owner: ${String(owner)}`}
                >
                  <User className="size-3.5 opacity-70" />
                  <span className="truncate max-w-[110px]">{String(owner)}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}

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

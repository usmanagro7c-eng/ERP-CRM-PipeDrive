import { useMemo } from "react";
import { Briefcase, Building2, Mail, MoreVertical, Phone, User, CircleSlash } from "lucide-react";
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
import { LeadStatusBadge, LeadTemperatureBadge } from "@/components/leads/lead-stage-badge";
import { useSaveLead, useDeleteLead, type FrappeDocTypeMeta } from "@/hooks/use-leads";

interface LeadGridProps {
  meta: FrappeDocTypeMeta;
  rows: Record<string, unknown>[];
  statuses: Array<{ name: string; label?: string }>;
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

export function LeadGrid({
  meta,
  rows,
  statuses,
  onRowClick,
  onEdit,
  onConvert,
  loading,
  emptyAction,
}: LeadGridProps) {
  const saveMutation = useSaveLead();
  const deleteMutation = useDeleteLead();

  const statusOptions = useMemo(() => {
    return statuses.map((s) => ({
      key: s.name,
      label: s.label || s.name,
      value: s.name,
    }));
  }, [statuses]);

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
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 p-1">
      {rows.map((row) => {
        const name = String(row["name"] ?? "");
        const fullName =
          String(row["lead_name"] ?? "") ||
          `${String(row["first_name"] ?? "")} ${String(row["last_name"] ?? "")}`.trim() ||
          "Unnamed Lead";
        const status = String(row["status"] ?? "");
        const org = row["organization"];
        const email = row["email"];
        const mobile = row["mobile_no"] || row["phone"];
        const owner = row["lead_owner"];
        const temp = row["lead_temperature"] as string | undefined;

        return (
          <div
            key={name}
            onClick={() => onRowClick?.(name)}
            className="group relative flex flex-col justify-between rounded-xl border bg-card p-4 shadow-xs transition-all hover:border-primary/50 hover:shadow-md cursor-pointer"
          >
            {/* Top row: Lead Name, Initials & 3-dots */}
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {initialsOf(row["first_name"], row["last_name"])}
                  </span>
                  <div className="flex-1 truncate">
                    <h4 className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                      {fullName}
                    </h4>
                    <span className="font-mono text-[11px] text-muted-foreground">{name}</span>
                  </div>
                </div>

                <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground opacity-90 sm:opacity-60 sm:group-hover:opacity-100"
                      >
                        <MoreVertical className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 text-xs">
                      <DropdownMenuLabel>Lead Actions</DropdownMenuLabel>
                      {onEdit && (
                        <DropdownMenuItem onClick={() => onEdit(row)}>Edit Lead</DropdownMenuItem>
                      )}
                      {onConvert && (
                        <DropdownMenuItem
                          onClick={() => onConvert(row)}
                          disabled={Boolean(row["converted"]) || status === "Converted"}
                        >
                          <Briefcase className="mr-2 size-3.5 text-primary" />
                          {Boolean(row["converted"]) || status === "Converted"
                            ? "Already Converted"
                            : "Convert to Deal"}
                        </DropdownMenuItem>
                      )}
                      <MoveToSubmenu
                        label="Move to Status"
                        currentValue={status}
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
                </div>
              </div>

              {/* Status Badge & Temperature */}
              <div className="mt-3 flex items-center justify-between gap-2">
                <LeadStatusBadge status={status} />
                {Boolean(temp) && <LeadTemperatureBadge temp={temp} />}
              </div>

              {/* Organization */}
              {Boolean(org) && (
                <div className="mt-2.5 flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                  <Building2 className="size-3.5 shrink-0" />
                  <span className="truncate">{String(org)}</span>
                </div>
              )}

              {/* Contact info */}
              <div className="mt-2.5 space-y-1 text-xs text-muted-foreground border-t border-border/40 pt-2">
                {Boolean(email) && (
                  <div className="flex items-center gap-1.5 truncate">
                    <Mail className="size-3.5 shrink-0 opacity-70" />
                    <span className="truncate">{String(email)}</span>
                  </div>
                )}
                {Boolean(mobile) && (
                  <div className="flex items-center gap-1.5 truncate">
                    <Phone className="size-3.5 shrink-0 opacity-70" />
                    <span className="truncate">{String(mobile)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Footer row: Owner */}
            <div className="mt-4 flex items-center justify-end border-t border-border/50 pt-2.5 text-xs text-muted-foreground">
              {Boolean(owner) && (
                <div
                  className="flex items-center gap-1.5 font-medium"
                  title={`Owner: ${String(owner)}`}
                >
                  <User className="size-3.5 opacity-70" />
                  <span className="truncate max-w-[120px]">{String(owner)}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  Building2,
  ExternalLink,
  Globe,
  MoreVertical,
  Plus,
  Users,
  Briefcase,
  DollarSign,
  MapPin,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
  useSaveOrganization,
  useLinkOptions,
} from "@/hooks/use-organizations";
import {
  selectOptions,
  type FrappeDocTypeMeta,
} from "@/lib/frappe-meta";

interface OrgGridProps {
  meta: FrappeDocTypeMeta;
  rows: Record<string, unknown>[];
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

export function OrgGrid({
  meta,
  rows,
  onRowClick,
  onEdit,
  loading,
  emptyAction,
}: OrgGridProps) {
  const saveMutation = useSaveOrganization();
  const titleField = meta.title_field || "organization_name";
  const imageField = meta.image_field;

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

  if (loading && rows.length === 0) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={`skel-card-${i}`} className="flex flex-col gap-3 rounded-xl border bg-card p-5 shadow-xs">
            <div className="flex items-center gap-3">
              <Skeleton className="size-11 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
            <Skeleton className="h-12 w-full" />
            <div className="flex gap-2 pt-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!loading && rows.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed bg-card p-8 text-center shadow-xs">
        <div className="flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground mb-3">
          <Building2 className="size-6" />
        </div>
        <p className="font-medium text-foreground">No organizations found</p>
        <p className="mt-1 text-sm text-muted-foreground mb-4">
          Try a different search, or add your first organization.
        </p>
        {emptyAction}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {rows.map((org) => {
        const orgName = String(org["name"] ?? "");
        const displayName = String(org[titleField] ?? orgName);
        const logoUrl = imageField && typeof org[imageField] === "string" ? String(org[imageField]) : null;
        const industryVal = typeof org["industry"] === "string" ? org["industry"] : null;
        const employeesVal = typeof org["no_of_employees"] === "string" ? org["no_of_employees"] : null;
        const revenueVal = typeof org["annual_revenue"] === "number" ? org["annual_revenue"] : null;
        const territoryVal = typeof org["territory"] === "string" ? org["territory"] : null;
        const website = typeof org["website"] === "string" ? org["website"] : null;
        const description = typeof org["company_description"] === "string" ? org["company_description"] : null;

        return (
          <div
            key={orgName}
            onClick={() => onRowClick?.(orgName)}
            className="group relative flex flex-col justify-between rounded-xl border bg-card p-5 shadow-xs transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md hover:border-primary/40 cursor-pointer"
          >
            {/* Card Header */}
            <div>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt=""
                      className="size-11 shrink-0 rounded-lg border object-cover shadow-2xs"
                    />
                  ) : (
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary shadow-2xs">
                      {initialsOf(displayName)}
                    </span>
                  )}
                  <div className="min-w-0">
                    <Link
                      to="/organizations/$orgId"
                      params={{ orgId: orgName }}
                      className="font-semibold text-foreground hover:text-primary hover:underline line-clamp-1 text-base"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {displayName}
                    </Link>
                    {website && (
                      <a
                        href={website.startsWith("http") ? website : `https://${website}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Globe className="size-3" />
                        <span className="truncate max-w-[140px]">{website.replace(/^https?:\/\//, "")}</span>
                        <ExternalLink className="size-2.5 opacity-60" />
                      </a>
                    )}
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="size-8 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <MoreVertical className="size-4" />
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
                      <DropdownMenuItem onClick={() => onEdit(org)}>
                        Edit organization
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />

                    {/* Move to Industry */}
                    <MoveToSubmenu
                      label="Move to Industry"
                      currentValue={industryVal}
                      allowNone={true}
                      options={industries.map((ind) => ({ key: ind, label: ind, value: ind }))}
                      onSelect={(val) => void handleMoveOrg(orgName, "industry", val)}
                    />

                    {/* Move to Employees */}
                    {employeeOptions.length > 0 && (
                      <MoveToSubmenu
                        label="Move to Employees"
                        currentValue={employeesVal}
                        options={employeeOptions.map((opt) => ({ key: opt, label: opt, value: opt }))}
                        onSelect={(val) => void handleMoveOrg(orgName, "no_of_employees", val)}
                      />
                    )}

                    {/* Move to Territory */}
                    {territories.length > 0 && (
                      <MoveToSubmenu
                        label="Move to Territory"
                        currentValue={territoryVal}
                        allowNone={true}
                        options={territories.map((terr) => ({ key: terr, label: terr, value: terr }))}
                        onSelect={(val) => void handleMoveOrg(orgName, "territory", val)}
                      />
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Description */}
              {description ? (
                <p className="text-xs text-muted-foreground line-clamp-2 mb-4 leading-relaxed">
                  {description}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground/60 italic mb-4">
                  No company description provided.
                </p>
              )}
            </div>

            {/* Badges & Footer */}
            <div className="space-y-3 pt-3 border-t">
              <div className="flex flex-wrap items-center gap-1.5">
                {industryVal && (
                  <Badge variant="outline" className="gap-1 px-2 py-0.5 text-xs font-normal bg-secondary/40">
                    <Briefcase className="size-3 text-muted-foreground" />
                    <span>{industryVal}</span>
                  </Badge>
                )}
                {employeesVal && (
                  <Badge variant="outline" className="gap-1 px-2 py-0.5 text-xs font-normal bg-secondary/40">
                    <Users className="size-3 text-muted-foreground" />
                    <span>{employeesVal}</span>
                  </Badge>
                )}
                {territoryVal && (
                  <Badge variant="outline" className="gap-1 px-2 py-0.5 text-xs font-normal bg-secondary/40">
                    <MapPin className="size-3 text-muted-foreground" />
                    <span>{territoryVal}</span>
                  </Badge>
                )}
              </div>

              {revenueVal != null && revenueVal > 0 && (
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-muted-foreground">Annual Revenue</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    PKR {revenueVal >= 1_000_000 ? `${(revenueVal / 1_000_000).toFixed(1)}M` : revenueVal.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

import { useMemo } from "react";
import { Building2, Mail, MoreVertical, Phone, User, CircleSlash, Briefcase } from "lucide-react";
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
import { ContactStatusBadge } from "@/components/contacts/contact-badge";
import { useSaveContact, useDeleteContact, type FrappeDocTypeMeta } from "@/hooks/use-contacts";

interface ContactGridProps {
  meta: FrappeDocTypeMeta;
  rows: Record<string, unknown>[];
  statuses: Array<{ name: string; label?: string }>;
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

export function ContactGrid({
  meta,
  rows,
  statuses,
  onRowClick,
  onEdit,
  loading,
  emptyAction,
}: ContactGridProps) {
  const saveMutation = useSaveContact();
  const deleteMutation = useDeleteContact();

  const statusOptions = useMemo(
    () =>
      statuses.map((s) => ({
        key: s.name,
        label: s.label || s.name,
        value: s.name,
      })),
    [statuses],
  );

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-44 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border rounded-lg bg-card text-center gap-2">
        <CircleSlash className="size-8 text-muted-foreground/60" />
        <p className="text-sm font-medium text-foreground">No contacts found</p>
        {emptyAction}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {rows.map((contact) => {
        const name = String(contact["name"] ?? "");
        const firstName = String(contact["first_name"] ?? "");
        const lastName = String(contact["last_name"] ?? "");
        const fullName =
          String(contact["full_name"] ?? "").trim() || `${firstName} ${lastName}`.trim() || name;
        const status = String(contact["status"] ?? "Passive");
        const email = String(contact["email_id"] ?? "");
        const phone =
          String(contact["mobile_no"] ?? "").trim() || String(contact["phone"] ?? "").trim();
        const company = String(contact["company_name"] ?? "");
        const designation = String(contact["designation"] ?? "");

        return (
          <div
            key={name}
            onClick={() => (onRowClick ? onRowClick(name) : onEdit?.(contact))}
            className="group relative rounded-lg border bg-card p-4 shadow-xs hover:shadow-md transition cursor-pointer flex flex-col justify-between gap-3"
          >
            {/* Header: Avatar, Name, 3-dots */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3 truncate">
                <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm shrink-0">
                  {initialsOf(firstName, lastName)}
                </div>
                <div className="truncate">
                  <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                    {fullName}
                  </h4>
                  {designation && (
                    <p className="text-xs text-muted-foreground truncate">{designation}</p>
                  )}
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground hover:text-foreground opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition cursor-pointer shrink-0"
                  >
                    <MoreVertical className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 text-xs">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => onEdit?.(contact)}>
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
                    className="text-destructive focus:text-destructive"
                  >
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Info details */}
            <div className="space-y-1.5 text-xs text-muted-foreground">
              {company && (
                <div className="flex items-center gap-2 truncate">
                  <Building2 className="size-3.5 text-muted-foreground/70 shrink-0" />
                  <span className="truncate text-foreground/90">{company}</span>
                </div>
              )}
              {email && (
                <div className="flex items-center gap-2 truncate">
                  <Mail className="size-3.5 text-muted-foreground/70 shrink-0" />
                  <a
                    href={`mailto:${email}`}
                    onClick={(e) => e.stopPropagation()}
                    className="truncate hover:text-foreground hover:underline"
                  >
                    {email}
                  </a>
                </div>
              )}
              {phone && (
                <div className="flex items-center gap-2 truncate">
                  <Phone className="size-3.5 text-muted-foreground/70 shrink-0" />
                  <a
                    href={`tel:${phone}`}
                    onClick={(e) => e.stopPropagation()}
                    className="truncate hover:text-foreground hover:underline"
                  >
                    {phone}
                  </a>
                </div>
              )}
            </div>

            {/* Footer with status badge */}
            <div className="pt-2 border-t flex items-center justify-between">
              <ContactStatusBadge status={status} />
              <span className="text-[10px] text-muted-foreground font-mono">{name}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

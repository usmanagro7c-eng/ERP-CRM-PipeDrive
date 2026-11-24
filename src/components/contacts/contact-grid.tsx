import { useMemo, useState } from "react";
import { Building2, Mail, MoreVertical, Phone, User, CircleSlash, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
import { resolveContactCompany } from "@/components/contacts/contact-table";
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
  const [deleteTarget, setDeleteTarget] = useState<{ name: string; title: string } | null>(null);

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
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-44 w-full rounded-xl" />
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
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
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
        const company = resolveContactCompany(contact);
        const designation = String(contact["designation"] ?? "");

        return (
          <div
            key={name}
            onClick={() => (onRowClick ? onRowClick(name) : onEdit?.(contact))}
            className="group relative rounded-xl border border-border/70 bg-card p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-[transform,box-shadow,border-color] duration-200 cursor-pointer flex flex-col justify-between gap-3 hover:-translate-y-0.5 hover:border-border hover:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.18)]"
          >
            {/* Header: Avatar, Name, 3-dots */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm shrink-0">
                  {initialsOf(firstName, lastName)}
                </div>
                <div className="min-w-0">
                  <h4 className="text-[13px] font-semibold leading-5 text-foreground group-hover:text-primary transition-colors truncate">
                    {fullName}
                  </h4>
                  {designation && (
                    <p className="text-[11px] text-muted-foreground truncate">{designation}</p>
                  )}
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 -mr-1 -mt-1 rounded-md text-muted-foreground/80 hover:text-foreground hover:bg-muted/60 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity shrink-0"
                    aria-label="More actions"
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
                    onClick={() => setDeleteTarget({ name, title: fullName })}
                    className="text-destructive focus:text-destructive"
                  >
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Info details */}
            <div className="space-y-1.5 text-[11px] text-muted-foreground">
              {company && (
                <div className="flex items-center gap-2 min-w-0">
                  <Building2 className="size-3.5 opacity-60 shrink-0" />
                  <span className="truncate text-foreground/85">{company}</span>
                </div>
              )}
              {email && (
                <div className="flex items-center gap-2 min-w-0">
                  <Mail className="size-3.5 opacity-60 shrink-0" />
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
                <div className="flex items-center gap-2 min-w-0">
                  <Phone className="size-3.5 opacity-60 shrink-0" />
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
            <div className="pt-2.5 border-t border-border/50 flex items-center justify-between gap-2">
              <ContactStatusBadge status={status} />
              <span className="text-[10px] text-muted-foreground/70 font-mono truncate">{name}</span>
            </div>
          </div>
        );
      })}

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !deleteMutation.isPending) setDeleteTarget(null);
        }}
        title={`Delete contact "${deleteTarget?.title || ""}"?`}
        description="This contact will be permanently removed. This action cannot be undone."
        pending={deleteMutation.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          const name = deleteTarget.name;
          deleteMutation.mutate(name, { onSettled: () => setDeleteTarget(null) });
        }}
      />
    </div>
  );
}

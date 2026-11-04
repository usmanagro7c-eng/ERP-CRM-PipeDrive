import { useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Pencil, Trash2, TriangleAlert } from "lucide-react";

import { OrgFormModal } from "@/components/organizations/org-form-modal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingState } from "@/components/ui/loading";
import {
  errorMessage,
  orgDetailOptions,
  orgMetaOptions,
  useDeleteOrganization,
} from "@/hooks/use-organizations";
import {
  fieldLabel,
  formatFieldValue,
  groupIntoSections,
  type FrappeDocField,
} from "@/lib/frappe-meta";

export const Route = createFileRoute("/_app/organizations/$orgId")({
  head: () => ({ meta: [{ title: "Organization · AgroCRM" }] }),
  component: OrganizationDetailPage,
});

function FieldValue({ field, value }: { field: FrappeDocField; value: unknown }) {
  const empty = value === null || value === undefined || value === "";
  if (empty) return <span className="text-muted-foreground/60">—</span>;
  if (field.fieldtype === "Attach Image" && typeof value === "string") {
    return (
      <img src={value} alt={fieldLabel(field)} className="size-16 rounded-lg border object-cover" />
    );
  }
  if (field.fieldtype === "Attach" && typeof value === "string") {
    return (
      <a href={value} target="_blank" rel="noreferrer" className="text-primary hover:underline">
        Open file
      </a>
    );
  }
  const text = formatFieldValue(field, value);
  if (field.fieldname === "website" && typeof value === "string") {
    const href = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer noopener"
        className="text-primary hover:underline"
      >
        {text}
      </a>
    );
  }
  return <span className="whitespace-pre-wrap break-words">{text}</span>;
}

function OrganizationDetailPage() {
  const { orgId } = Route.useParams();
  const navigate = useNavigate();
  const metaQuery = useQuery(orgMetaOptions());
  const orgQuery = useQuery(orgDetailOptions(orgId));
  const deleteMutation = useDeleteOrganization();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const meta = metaQuery.data;
  const org = orgQuery.data;
  const error = metaQuery.error ?? orgQuery.error;

  const titleField = meta?.title_field || "organization_name";
  const title = org ? String(org[titleField] ?? org["name"] ?? orgId) : orgId;
  const imageUrl = meta?.image_field && org ? org[meta.image_field] : undefined;
  const sections = meta ? groupIntoSections(meta.fields ?? []) : [];

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 px-4 py-6 md:px-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 gap-1 text-muted-foreground">
        <Link to="/organizations" search={{}}>
          <ArrowLeft className="size-4" />
          Organizations
        </Link>
      </Button>

      {error && (
        <Alert variant="destructive">
          <TriangleAlert className="size-4" />
          <AlertTitle>Could not load this organization</AlertTitle>
          <AlertDescription>{errorMessage(error)}</AlertDescription>
        </Alert>
      )}

      {!error && (!meta || !org) && (
        <LoadingState
          title="Loading Organization Details..."
          description={`Fetching record details for ${orgId} from Frappe CRM...`}
        />
      )}

      {meta && org && (
        <>
          <div className="flex flex-wrap items-center gap-4">
            {typeof imageUrl === "string" && imageUrl ? (
              <img src={imageUrl} alt="" className="size-14 rounded-xl border object-cover" />
            ) : (
              <span className="flex size-14 items-center justify-center rounded-xl bg-accent text-lg font-semibold text-accent-foreground">
                {title.slice(0, 2).toUpperCase()}
              </span>
            )}
            <div className="mr-auto min-w-0">
              <h1 className="truncate font-display text-2xl font-semibold tracking-tight">
                {title}
              </h1>
              <p className="text-sm text-muted-foreground">{String(org["name"])}</p>
            </div>
            <Button variant="outline" onClick={() => setEditOpen(true)} className="gap-2">
              <Pencil className="size-4" />
              Edit
            </Button>
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(true)}
              className="gap-2 text-destructive"
            >
              <Trash2 className="size-4" />
              Delete
            </Button>
          </div>

          <div className="space-y-6 rounded-xl border bg-card p-5 shadow-card">
            {sections.map((section, index) => (
              <section key={section.label ?? index} className="space-y-3">
                {section.label && (
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {section.label}
                  </h2>
                )}
                <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                  {section.fields.map((field) => (
                    <div key={field.fieldname} className="min-w-0">
                      <dt className="text-xs text-muted-foreground">{fieldLabel(field)}</dt>
                      <dd className="mt-0.5 text-sm">
                        <FieldValue field={field} value={org[field.fieldname]} />
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </div>

          <OrgFormModal open={editOpen} onOpenChange={setEditOpen} meta={meta} organization={org} />

          <AlertDialog
            open={deleteOpen}
            onOpenChange={(next) => !deleteMutation.isPending && setDeleteOpen(next)}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this organization?</AlertDialogTitle>
                <AlertDialogDescription>
                  “{title}” will be permanently removed from Frappe CRM. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  disabled={deleteMutation.isPending}
                  onClick={(event) => {
                    event.preventDefault();
                    deleteMutation.mutate(orgId, {
                      onSuccess: () => void navigate({ to: "/organizations", search: {} }),
                    });
                  }}
                >
                  {deleteMutation.isPending && <Loader2 className="size-4 animate-spin" />}
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  );
}

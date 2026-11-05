import { useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  FileText,
  Loader2,
  MessageSquare,
  Paperclip,
  Pencil,
  PhoneCall,
  StickyNote,
  Trash2,
  TriangleAlert,
} from "lucide-react";

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
import { RecordCommentsThread } from "@/components/record-view/record-comments-thread";
import { RecordAttachmentsTab } from "@/components/record-view/record-attachments-tab";
import { RecordTasksTab } from "@/components/record-view/record-tasks-tab";
import { RecordNotesTab } from "@/components/record-view/record-notes-tab";
import { RecordActivityFeed } from "@/components/record-view/record-activity-feed";
import * as api from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/organizations/$orgId")({
  head: () => ({ meta: [{ title: "Organization · AgroCRM" }] }),
  component: OrganizationDetailPage,
});

type TabKey = "overview" | "comments" | "tasks" | "notes" | "attachments" | "activity";

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
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  const meta = metaQuery.data;
  const org = orgQuery.data;
  const error = metaQuery.error ?? orgQuery.error;

  const titleField = meta?.title_field || "organization_name";
  const title = org ? String(org[titleField] ?? org["name"] ?? orgId) : orgId;
  const imageUrl = meta?.image_field && org ? org[meta.image_field] : undefined;
  const sections = meta ? groupIntoSections(meta.fields ?? []) : [];

  const tabs: Array<{ key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { key: "overview", label: "Overview & Fields", icon: FileText },
    { key: "comments", label: "Comments", icon: MessageSquare },
    { key: "tasks", label: "Tasks", icon: CheckCircle2 },
    { key: "notes", label: "Notes", icon: StickyNote },
    { key: "attachments", label: "Attachments", icon: Paperclip },
    { key: "activity", label: "Activity", icon: Activity },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 px-4 py-6 md:px-6">
      {/* Top Breadcrumb */}
      <Button asChild variant="ghost" size="sm" className="-ml-2 gap-1 text-muted-foreground">
        <Link to="/organizations" search={{}}>
          <ArrowLeft className="size-4" />
          Organizations
        </Link>
      </Button>

      {error && (
        <Alert variant="destructive">
          <TriangleAlert className="size-4" />
          <AlertTitle>Could not load organization</AlertTitle>
          <AlertDescription>{errorMessage(error)}</AlertDescription>
        </Alert>
      )}

      {(metaQuery.isLoading || orgQuery.isLoading) && (
        <LoadingState
          title="Loading organization..."
          description="Fetching organization record and attributes."
        />
      )}

      {meta && org && (
        <>
          {/* Header Card */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-4 rounded-xl border bg-card shadow-2xs">
            <div className="flex items-center gap-3 min-w-0">
              {typeof imageUrl === "string" && imageUrl ? (
                <img src={imageUrl} alt="" className="size-12 sm:size-14 rounded-xl border object-cover shrink-0" />
              ) : (
                <span className="flex size-12 sm:size-14 items-center justify-center rounded-xl bg-accent text-lg font-bold text-accent-foreground shrink-0">
                  {title.slice(0, 2).toUpperCase()}
                </span>
              )}
              <div className="min-w-0">
                <h1 className="truncate font-display text-xl sm:text-2xl font-bold tracking-tight">
                  {title}
                </h1>
                <p className="text-xs text-muted-foreground font-mono">{String(org["name"])}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditOpen(true)} className="gap-1.5 h-8 text-xs">
                <Pencil className="size-3.5" />
                <span>Edit</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setDeleteOpen(true)}
                className="gap-1.5 h-8 text-xs text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="size-3.5" />
                <span>Delete</span>
              </Button>
            </div>
          </div>

          {/* Horizontal Tabs */}
          <div className="flex items-center gap-1 border-b overflow-x-auto scrollbar-none bg-card/30">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-medium border-b-2 -mb-px transition-colors cursor-pointer shrink-0",
                    isActive
                      ? "border-primary text-foreground font-semibold"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="size-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="pt-2">
            {activeTab === "overview" && (
              <div className="space-y-6 rounded-xl border bg-card p-5 shadow-2xs">
                {sections.map((section, index) => (
                  <section key={section.label ?? index} className="space-y-3">
                    {section.label && (
                      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground border-b pb-1">
                        {section.label}
                      </h2>
                    )}
                    <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                      {section.fields.map((field) => (
                        <div key={field.fieldname} className="min-w-0 text-xs">
                          <dt className="text-muted-foreground font-medium">{fieldLabel(field)}</dt>
                          <dd className="mt-0.5 text-foreground">
                            <FieldValue field={field} value={org[field.fieldname]} />
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                ))}
              </div>
            )}

            {activeTab === "comments" && (
              <RecordCommentsThread
                referenceDoctype={api.ORG_DOCTYPE}
                referenceName={orgId}
              />
            )}

            {activeTab === "tasks" && (
              <RecordTasksTab
                referenceDoctype={api.ORG_DOCTYPE}
                referenceName={orgId}
              />
            )}

            {activeTab === "notes" && (
              <RecordNotesTab
                referenceDoctype={api.ORG_DOCTYPE}
                referenceName={orgId}
              />
            )}

            {activeTab === "attachments" && (
              <RecordAttachmentsTab
                referenceDoctype={api.ORG_DOCTYPE}
                referenceName={orgId}
              />
            )}

            {activeTab === "activity" && (
              <RecordActivityFeed
                referenceDoctype={api.ORG_DOCTYPE}
                referenceName={orgId}
                creation={String(org["creation"] || "")}
              />
            )}
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

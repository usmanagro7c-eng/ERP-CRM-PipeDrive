import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { FieldInput } from "@/components/organizations/field-input";
import { FormSectionNav } from "@/components/ui/form-section-nav";
import {
  fieldLabel,
  fromInputValue,
  groupIntoSectionPages,
  isEditableField,
  toInputValue,
  type FrappeDocField,
  type FrappeDocTypeMeta,
} from "@/lib/frappe-meta";
import { ORG_DOCTYPE } from "@/lib/frappe-proxy";
import { useSaveOrganization, uploadOrgFile, errorMessage } from "@/hooks/use-organizations";

interface OrgFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meta: FrappeDocTypeMeta;
  /** Existing doc when editing; null when creating. */
  organization?: Record<string, unknown> | null;
}

function buildInitialValues(fields: FrappeDocField[], doc?: Record<string, unknown> | null) {
  const values: Record<string, unknown> = {};
  for (const field of fields) {
    values[field.fieldname] = toInputValue(field, doc ? doc[field.fieldname] : field.default);
  }
  return values;
}

function cnFieldSpan(field: FrappeDocField): string {
  const wide = [
    "Small Text",
    "Text",
    "Long Text",
    "Text Editor",
    "Code",
    "Attach",
    "Attach Image",
  ].includes(field.fieldtype);
  return wide ? "sm:col-span-2 space-y-1.5" : "space-y-1.5";
}

export function OrgFormModal({
  open,
  onOpenChange,
  meta,
  organization,
}: OrgFormModalProps) {
  const isEdit = Boolean(organization);
  const docName = organization ? String(organization["name"]) : undefined;
  const saveMutation = useSaveOrganization();

  const pages = useMemo(() => groupIntoSectionPages(meta.fields ?? []), [meta]);
  const fields = useMemo(() => pages.flatMap((p) => p.fields), [pages]);
  const [activePageIndex, setActivePageIndex] = useState(0);

  const [values, setValues] = useState(() => buildInitialValues(fields, organization));
  const [pendingFiles, setPendingFiles] = useState<Record<string, File>>({});

  // Re-seed the form when the modal opens for a different doc
  const [seedKey, setSeedKey] = useState<string | null>(
    organization ? String(organization["name"]) : null,
  );
  const wantedKey = organization ? String(organization["name"]) : "__create__";
  if (open && seedKey !== wantedKey) {
    setSeedKey(wantedKey);
    setValues(buildInitialValues(fields, organization));
    setPendingFiles({});
    setActivePageIndex(0);
  } else if (!open && seedKey !== null) {
    setSeedKey(null);
    setActivePageIndex(0);
  }

  function setValue(fieldname: string, value: unknown) {
    setValues((previous) => ({ ...previous, [fieldname]: value }));
  }

  function isFieldRequired(field: FrappeDocField): boolean {
    return Boolean(field.reqd || field.fieldname === "organization_name");
  }

  async function handleSubmit() {
    const missing = fields
      .filter((field) => isFieldRequired(field) && isEditableField(field))
      .filter((field) => {
        const value = values[field.fieldname];
        return (
          value === "" ||
          value === null ||
          value === undefined ||
          (typeof value === "string" && !value.trim())
        );
      });

    if (missing.length > 0) {
      const firstMissing = missing[0];
      if (firstMissing) {
        const targetIdx = pages.findIndex((p) =>
          p.fields.some((f) => f.fieldname === firstMissing.fieldname),
        );
        if (targetIdx !== -1 && targetIdx !== activePageIndex) {
          setActivePageIndex(targetIdx);
        }
      }
      const missingLabels = missing.map((f) => fieldLabel(f)).join(", ");
      toast.error(`Please fill required fields: ${missingLabels}`);
      return;
    }

    const payload: Record<string, unknown> = {};
    for (const field of fields) {
      if (!isEditableField(field)) continue;
      payload[field.fieldname] = fromInputValue(field, values[field.fieldname]);
    }

    // For updates with new pending files, upload first
    if (isEdit && docName) {
      for (const [fieldname, file] of Object.entries(pendingFiles)) {
        try {
          const fileUrl = await uploadOrgFile(docName, fieldname, file);
          payload[fieldname] = fileUrl;
        } catch (error) {
          toast.error(`Could not upload ${fieldname}: ${errorMessage(error)}`);
          return;
        }
      }
    }

    try {
      const savedDoc = await saveMutation.mutateAsync({
        name: docName,
        values: payload,
      });

      // For creates with pending files, upload now that we have a docname
      if (!isEdit && savedDoc && typeof savedDoc === "object" && "name" in savedDoc) {
        const newName = String((savedDoc as Record<string, unknown>)["name"]);
        for (const [fieldname, file] of Object.entries(pendingFiles)) {
          try {
            await uploadOrgFile(newName, fieldname, file);
          } catch (error) {
            toast.error(`Attached ${fieldname} failed to upload: ${errorMessage(error)}`);
          }
        }
      }

      onOpenChange(false);
    } catch {
      // toast shown by hook
    }
  }

  const title = isEdit
    ? `Edit · ${String(organization?.["organization_name"] ?? docName)}`
    : `New ${ORG_DOCTYPE.replace("CRM ", "")}`;
  const subtitle = isEdit
    ? "Update company information, contacts, and industry classification."
    : "Fill in the details across section pages to create an organization.";

  const activePage = pages[activePageIndex] ?? pages[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-3">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{subtitle}</DialogDescription>
        </DialogHeader>

        {/* Section Navigation Tabs */}
        <FormSectionNav
          pages={pages}
          activePageIndex={activePageIndex}
          onSelectPage={setActivePageIndex}
          values={values}
          isFieldRequired={isFieldRequired}
        />

        {/* Active Page Content */}
        <ScrollArea className="flex-1 px-6 py-4">
          <form
            id="org-form"
            onSubmit={(e) => {
              e.preventDefault();
              void handleSubmit();
            }}
            className="space-y-4 pb-4"
          >
            {activePage && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {activePage.label}
                  </h4>
                  {pages.length > 1 && (
                    <span className="text-[11px] font-medium text-muted-foreground">
                      Step {activePageIndex + 1} of {pages.length}
                    </span>
                  )}
                </div>
                <Separator />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {activePage.fields.map((field) => {
                    const editable = isEditableField(field);
                    const id = `org-field-${field.fieldname}`;
                    const isRequired = isFieldRequired(field);

                    return (
                      <div
                        key={field.fieldname}
                        className={cnFieldSpan(field)}
                      >
                        <Label
                          htmlFor={id}
                          className="text-xs font-medium text-foreground flex items-center justify-between"
                        >
                          <span className="flex items-center">
                            {fieldLabel(field)}
                            {isRequired && (
                              <span className="ml-1 text-destructive font-bold" title="Mandatory field">
                                *
                              </span>
                            )}
                          </span>
                          {isRequired && (
                            <span className="text-[10px] text-destructive/80 uppercase font-mono tracking-wider">
                              Required
                            </span>
                          )}
                        </Label>
                        <FieldInput
                          id={id}
                          field={field}
                          value={values[field.fieldname]}
                          onValueChange={(val) => setValue(field.fieldname, val)}
                          disabled={!editable || saveMutation.isPending}
                          docName={docName}
                          pendingFile={pendingFiles[field.fieldname]}
                          onPendingFileChange={(file) =>
                            setPendingFiles((prev) => {
                              const copy = { ...prev };
                              if (file) copy[field.fieldname] = file;
                              else delete copy[field.fieldname];
                              return copy;
                            })
                          }
                        />
                        {field.description && (
                          <p className="text-[11px] text-muted-foreground">{field.description}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </form>
        </ScrollArea>

        <DialogFooter className="border-t p-4 sm:p-5 flex flex-row items-center justify-between sm:justify-between bg-muted/20">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={saveMutation.isPending}
          >
            Cancel
          </Button>

          <div className="flex items-center gap-2">
            {pages.length > 1 && activePageIndex > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() => setActivePageIndex((prev) => Math.max(0, prev - 1))}
                disabled={saveMutation.isPending}
              >
                <ChevronLeft className="size-3.5" />
                Previous
              </Button>
            )}

            {pages.length > 1 && activePageIndex < pages.length - 1 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() => setActivePageIndex((prev) => Math.min(pages.length - 1, prev + 1))}
                disabled={saveMutation.isPending}
              >
                Next
                <ChevronRight className="size-3.5" />
              </Button>
            )}

            <Button
              type="submit"
              form="org-form"
              size="sm"
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending && (
                <Loader2 className="mr-2 size-3.5 animate-spin" />
              )}
              {isEdit ? "Save Changes" : `Create ${ORG_DOCTYPE.replace("CRM ", "")}`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

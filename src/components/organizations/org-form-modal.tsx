import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { FieldInput } from "@/components/organizations/field-input";
import { ORG_DOCTYPE } from "@/lib/api";
import {
  fieldLabel,
  fromInputValue,
  groupIntoSections,
  isEditableField,
  isDisplayField,
  toInputValue,
  type FrappeDocField,
  type FrappeDocTypeMeta,
} from "@/lib/frappe-meta";
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
    const raw = doc ? doc[field.fieldname] : field.default;
    values[field.fieldname] = toInputValue(field, raw);
  }
  return values;
}

export function OrgFormModal({ open, onOpenChange, meta, organization }: OrgFormModalProps) {
  const isEdit = Boolean(organization);
  const docName = organization ? String(organization["name"]) : undefined;
  const saveMutation = useSaveOrganization();

  const fields = useMemo(() => (meta.fields ?? []).filter(isDisplayField), [meta]);
  const sections = useMemo(() => groupIntoSections(fields), [fields]);
  const [values, setValues] = useState(() => buildInitialValues(fields, organization));
  const [pendingFiles, setPendingFiles] = useState<Record<string, File>>({});

  // Re-seed the form when the modal opens for a different doc.
  const [seedKey, setSeedKey] = useState<string | null>(
    organization ? String(organization["name"]) : null,
  );
  const wantedKey = organization ? String(organization["name"]) : "__create__";
  if (open && seedKey !== wantedKey) {
    setSeedKey(wantedKey);
    setValues(buildInitialValues(fields, organization));
    setPendingFiles({});
  } else if (!open && seedKey !== null) {
    // Closed: forget the seed so the next open starts from fresh values.
    setSeedKey(null);
  }

  function setValue(fieldname: string, value: unknown) {
    setValues((previous) => ({ ...previous, [fieldname]: value }));
  }

  async function handleSubmit() {
    const missing = fields
      .filter((field) => field.reqd && isEditableField(field))
      .filter((field) => {
        const value = values[field.fieldname];
        return value === "" || value === null || value === undefined;
      })
      .map((field) => fieldLabel(field));
    if (missing.length > 0) {
      toast.error(`Please fill the required fields: ${missing.join(", ")}`);
      return;
    }

    // Convert values back to Frappe storage format.
    const payload: Record<string, unknown> = {};
    for (const field of fields) {
      if (!isEditableField(field)) continue;
      payload[field.fieldname] = fromInputValue(field, values[field.fieldname]);
    }

    // For updates with new pending files, upload first so the file URL is saved.
    if (isEdit && docName) {
      for (const [fieldname, file] of Object.entries(pendingFiles)) {
        try {
          payload[fieldname] = await uploadOrgFile(docName, fieldname, file);
        } catch (error) {
          toast.error(
            `${fieldLabel(fields.find((f) => f.fieldname === fieldname)!)}: ${errorMessage(error)}`,
          );
          return;
        }
      }
    }

    try {
      const saved = await saveMutation.mutateAsync({ name: docName, values: payload });
      const newName = !isEdit ? String(saved["name"] ?? "") : docName;
      // Create flow: upload pending files after the doc exists, then patch.
      if (!isEdit && newName && Object.keys(pendingFiles).length > 0) {
        const patch: Record<string, unknown> = {};
        for (const [fieldname, file] of Object.entries(pendingFiles)) {
          try {
            patch[fieldname] = await uploadOrgFile(newName, fieldname, file);
          } catch (error) {
            toast.error(
              `${fieldLabel(fields.find((f) => f.fieldname === fieldname)!)}: ${errorMessage(error)}`,
            );
          }
        }
        if (Object.keys(patch).length > 0) {
          await saveMutation.mutateAsync({ name: newName, values: patch });
        }
      }
      onOpenChange(false);
    } catch {
      // Error toast already shown by the mutation.
    }
  }

  const pending = saveMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent className="max-h-[90vh] gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="px-6 pb-2 pt-5 text-left">
          <DialogTitle className="font-display text-xl">
            {isEdit ? "Edit Organization" : "New Organization"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the fields and save your changes."
              : "Fields follow your Frappe CRM configuration."}
          </DialogDescription>
        </DialogHeader>
        <Separator />
        <ScrollArea className="max-h-[60vh] flex-1">
          <form
            className="space-y-6 px-6 py-4"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSubmit();
            }}
          >
            {sections.map((section, sectionIndex) => (
              <section key={section.label ?? sectionIndex} className="space-y-4">
                {section.label && (
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {section.label}
                  </h3>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  {section.fields.map((field) => {
                    const editable = isEditableField(field);
                    const id = `org-field-${field.fieldname}`;
                    return (
                      <div key={field.fieldname} className={cnFieldSpan(field)}>
                        <Label htmlFor={id} className="text-sm">
                          {fieldLabel(field)}
                          {field.reqd ? <span className="ml-1 text-destructive">*</span> : null}
                        </Label>
                        <FieldInput
                          field={field}
                          id={id}
                          value={values[field.fieldname]}
                          onValueChange={(value) => setValue(field.fieldname, value)}
                          disabled={!editable || pending}
                          docName={isEdit ? docName : undefined}
                          pendingFile={pendingFiles[field.fieldname] ?? null}
                          onPendingFileChange={(file) =>
                            setPendingFiles((previous) => {
                              const next = { ...previous };
                              if (file) next[field.fieldname] = file;
                              else delete next[field.fieldname];
                              return next;
                            })
                          }
                        />
                        {field.description && (
                          <p className="text-xs text-muted-foreground">{field.description}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
            <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
          </form>
        </ScrollArea>
        <Separator />
        <DialogFooter className="gap-2 px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={pending}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            {isEdit ? "Save changes" : `Create ${ORG_DOCTYPE.replace("CRM ", "")}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
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

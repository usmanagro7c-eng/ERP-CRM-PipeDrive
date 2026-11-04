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
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { FieldInput } from "@/components/organizations/field-input";
import {
  fieldLabel,
  fromInputValue,
  groupIntoSections,
  isDisplayField,
  isEditableField,
  toInputValue,
  type FrappeDocField,
  type FrappeDocTypeMeta,
} from "@/lib/frappe-meta";
import { useSaveContact, errorMessage } from "@/hooks/use-contacts";
import { uploadAttachment, CONTACT_DOCTYPE } from "@/lib/api";

interface ContactFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meta: FrappeDocTypeMeta;
  /** Existing doc when editing; null when creating. */
  contact?: Record<string, unknown> | null;
  /** Optional initial field values */
  initialValues?: Record<string, unknown> | null;
}

function buildInitialValues(
  fields: FrappeDocField[],
  doc?: Record<string, unknown> | null,
  presets?: Record<string, unknown> | null,
) {
  const values: Record<string, unknown> = {};
  for (const field of fields) {
    const raw = doc
      ? doc[field.fieldname]
      : presets?.[field.fieldname] !== undefined
        ? presets[field.fieldname]
        : field.fieldname === "status"
          ? "Open"
          : field.default;
    values[field.fieldname] = toInputValue(field, raw);
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

export function ContactFormModal({
  open,
  onOpenChange,
  meta,
  contact,
  initialValues,
}: ContactFormModalProps) {
  const isEdit = Boolean(contact);
  const docName = contact ? String(contact["name"]) : undefined;
  const saveMutation = useSaveContact();

  const fields = useMemo(() => (meta.fields ?? []).filter(isDisplayField), [meta]);
  const sections = useMemo(() => groupIntoSections(fields), [fields]);
  const [values, setValues] = useState(() =>
    buildInitialValues(fields, contact, initialValues),
  );
  const [pendingFiles, setPendingFiles] = useState<Record<string, File>>({});

  // Re-seed the form when the modal opens for a different doc or preset
  const [seedKey, setSeedKey] = useState<string | null>(
    contact ? String(contact["name"]) : null,
  );
  const wantedKey = contact
    ? String(contact["name"])
    : `__create_${initialValues?.["status"] ?? ""}`;
  if (open && seedKey !== wantedKey) {
    setSeedKey(wantedKey);
    setValues(buildInitialValues(fields, contact, initialValues));
    setPendingFiles({});
  } else if (!open && seedKey !== null) {
    setSeedKey(null);
  }

  function setValue(fieldname: string, value: unknown) {
    setValues((previous) => ({ ...previous, [fieldname]: value }));
  }

  async function handleSubmit() {
    const missing = fields
      .filter((field) => (field.reqd || field.fieldname === "first_name") && isEditableField(field))
      .filter((field) => {
        const value = values[field.fieldname];
        return (
          value === "" ||
          value === null ||
          value === undefined ||
          (typeof value === "string" && !value.trim())
        );
      })
      .map((field) => fieldLabel(field));

    if (missing.length > 0) {
      toast.error(`Please fill the required fields: ${missing.join(", ")}`);
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
          const fileUrl = await uploadAttachment({
            doctype: CONTACT_DOCTYPE,
            docname: docName,
            fieldname,
            file,
          });
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
            await uploadAttachment({
              doctype: CONTACT_DOCTYPE,
              docname: newName,
              fieldname,
              file,
            });
          } catch (error) {
            toast.error(`Attached ${fieldname} failed to upload: ${errorMessage(error)}`);
          }
        }
      }

      onOpenChange(false);
    } catch {
      // toast shown by mutation
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>
            {isEdit
              ? `Edit ${String(contact?.["full_name"] || contact?.["first_name"] || docName)}`
              : "New Contact"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update contact information. Changes save immediately to Frappe CRM."
              : "Add a new contact to your CRM. First name is required."}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 py-4 max-h-[calc(90vh-140px)]">
          <div className="space-y-6">
            {sections.map((section, sectionIndex) => {
              const visibleFields = section.fields.filter(
                (f) => isDisplayField(f) && isEditableField(f),
              );
              if (visibleFields.length === 0) return null;

              return (
                <div key={section.label ?? `sec-${sectionIndex}`} className="space-y-3">
                  {section.label && (
                    <>
                      {sectionIndex > 0 && <Separator className="my-2" />}
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {section.label}
                      </h4>
                    </>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {section.fields.map((field) => {
                      const editable = isEditableField(field);
                      const id = `contact-field-${field.fieldname}`;
                      const isRequired =
                        Boolean(field.reqd) || field.fieldname === "first_name";

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
                                <span
                                  className="ml-1 text-destructive font-bold"
                                  title="Mandatory field"
                                >
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
                            field={field}
                            value={values[field.fieldname]}
                            onValueChange={(val: unknown) => setValue(field.fieldname, val)}
                            disabled={!editable || saveMutation.isPending}
                            id={id}
                            docName={docName}
                            pendingFile={pendingFiles[field.fieldname] ?? null}
                            onPendingFileChange={(file: File | null) =>
                              setPendingFiles((prev) => {
                                const next = { ...prev };
                                if (file) next[field.fieldname] = file;
                                else delete next[field.fieldname];
                                return next;
                              })
                            }
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <DialogFooter className="px-6 py-3 border-t bg-muted/20 flex flex-row items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saveMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Saving...
              </>
            ) : isEdit ? (
              "Save Changes"
            ) : (
              "Create Contact"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

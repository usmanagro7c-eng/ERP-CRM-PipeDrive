import { useMemo, useState } from "react";
import { Briefcase, Loader2 } from "lucide-react";
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
import { useSaveLead, uploadLeadFile, errorMessage } from "@/hooks/use-leads";

interface LeadFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meta: FrappeDocTypeMeta;
  /** Existing doc when editing; null when creating. */
  lead?: Record<string, unknown> | null;
  /** Optional initial field values (e.g. preset status when adding from a Kanban column) */
  initialValues?: Record<string, unknown> | null;
  /** Optional callback to convert lead to deal */
  onConvert?: (lead: Record<string, unknown>) => void;
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
          ? "New"
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

export function LeadFormModal({
  open,
  onOpenChange,
  meta,
  lead,
  initialValues,
  onConvert,
}: LeadFormModalProps) {
  const isEdit = Boolean(lead);
  const docName = lead ? String(lead["name"]) : undefined;
  const saveMutation = useSaveLead();

  const fields = useMemo(() => (meta.fields ?? []).filter(isDisplayField), [meta]);
  const sections = useMemo(() => groupIntoSections(fields), [fields]);
  const [values, setValues] = useState(() =>
    buildInitialValues(fields, lead, initialValues),
  );
  const [pendingFiles, setPendingFiles] = useState<Record<string, File>>({});

  // Re-seed the form when the modal opens for a different doc or preset
  const [seedKey, setSeedKey] = useState<string | null>(
    lead ? String(lead["name"]) : null,
  );
  const wantedKey = lead
    ? String(lead["name"])
    : `__create_${initialValues?.["status"] ?? ""}`;
  if (open && seedKey !== wantedKey) {
    setSeedKey(wantedKey);
    setValues(buildInitialValues(fields, lead, initialValues));
    setPendingFiles({});
  } else if (!open && seedKey !== null) {
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
          const fileUrl = await uploadLeadFile(docName, fieldname, file);
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
            await uploadLeadFile(newName, fieldname, file);
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
    ? `Edit Lead ${String(lead?.["name"] ?? "")}`
    : "New Lead";
  const description = isEdit
    ? "Update lead information, status, contact details, and organization."
    : "Create a new lead to begin the prospecting and qualification process.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl p-0 gap-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-140px)] px-6">
          <form
            id="lead-form"
            onSubmit={(e) => {
              e.preventDefault();
              void handleSubmit();
            }}
            className="space-y-6 pb-6"
          >
            {sections.map((section, idx) => (
              <div key={section.label ?? idx} className="space-y-4">
                {section.label && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {section.label}
                    </h4>
                    <Separator className="mt-2" />
                  </div>
                )}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {section.fields.map((field) => {
                    const editable = isEditableField(field);
                    const id = `lead-field-${field.fieldname}`;

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
                            {Boolean(field.reqd) && (
                              <span className="ml-1 text-destructive font-bold" title="Mandatory field">
                                *
                              </span>
                            )}
                          </span>
                          {Boolean(field.reqd) && (
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
            ))}
          </form>
        </ScrollArea>

        <DialogFooter className="border-t p-4 sm:p-6 flex flex-row items-center justify-between sm:justify-between">
          <div>
            {isEdit && onConvert && (
              <Button
                type="button"
                variant="secondary"
                className="gap-1.5"
                disabled={saveMutation.isPending || Boolean(lead?.["converted"]) || lead?.["status"] === "Converted"}
                onClick={() => {
                  onOpenChange(false);
                  onConvert(lead!);
                }}
              >
                <Briefcase className="size-4 text-primary" />
                {Boolean(lead?.["converted"]) || lead?.["status"] === "Converted" ? "Converted" : "Convert to Deal"}
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saveMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="lead-form"
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending && (
                <Loader2 className="mr-2 size-4 animate-spin" />
              )}
              {isEdit ? "Save Changes" : "Create Lead"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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
import { useSaveDeal, uploadDealFile, errorMessage } from "@/hooks/use-deals";

interface DealFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meta: FrappeDocTypeMeta;
  /** Existing doc when editing; null when creating. */
  deal?: Record<string, unknown> | null;
  /** Optional initial field values (e.g. preset status when adding from a Kanban column) */
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
        : field.default;
    values[field.fieldname] = toInputValue(field, raw);
  }
  return values;
}

export function DealFormModal({
  open,
  onOpenChange,
  meta,
  deal,
  initialValues,
}: DealFormModalProps) {
  const isEdit = Boolean(deal);
  const docName = deal ? String(deal["name"]) : undefined;
  const saveMutation = useSaveDeal();

  const fields = useMemo(() => (meta.fields ?? []).filter(isDisplayField), [meta]);
  const sections = useMemo(() => groupIntoSections(fields), [fields]);
  const [values, setValues] = useState(() =>
    buildInitialValues(fields, deal, initialValues),
  );
  const [pendingFiles, setPendingFiles] = useState<Record<string, File>>({});

  // Re-seed the form when the modal opens for a different doc or preset
  const [seedKey, setSeedKey] = useState<string | null>(
    deal ? String(deal["name"]) : null,
  );
  const wantedKey = deal
    ? String(deal["name"])
    : `__create_${initialValues?.["status"] ?? ""}`;
  if (open && seedKey !== wantedKey) {
    setSeedKey(wantedKey);
    setValues(buildInitialValues(fields, deal, initialValues));
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
        return value === "" || value === null || value === undefined;
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
          const fileUrl = await uploadDealFile(docName, fieldname, file);
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
            await uploadDealFile(newName, fieldname, file);
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
    ? `Edit Deal ${String(deal?.["name"] ?? "")}`
    : "New Deal";
  const description = isEdit
    ? "Update deal details, stage, value, or closure timeline."
    : "Create a new sales deal and assign it to an organization.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl p-0 gap-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-140px)] px-6">
          <form
            id="deal-form"
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
                    const isWide =
                      field.fieldtype === "Small Text" ||
                      field.fieldtype === "Text" ||
                      field.fieldtype === "Long Text" ||
                      field.fieldtype === "Text Editor";

                    return (
                      <div
                        key={field.fieldname}
                        className={isWide ? "sm:col-span-2" : undefined}
                      >
                        <FieldInput
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
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </form>
        </ScrollArea>

        <DialogFooter className="border-t p-4 sm:p-6">
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
            form="deal-form"
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending && (
              <Loader2 className="mr-2 size-4 animate-spin" />
            )}
            {isEdit ? "Save Changes" : "Create Deal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

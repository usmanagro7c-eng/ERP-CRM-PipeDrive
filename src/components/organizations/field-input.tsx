import { useEffect, useMemo, useState } from "react";
import { ChevronsUpDown, ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useLinkOptions, uploadOrgFile, errorMessage } from "@/hooks/use-organizations";
import {
  fieldLabel,
  inputKindFor,
  selectOptions,
  toInputValue,
  type FrappeDocField,
} from "@/lib/frappe-meta";
import { cn } from "@/lib/utils";

interface FieldInputProps {
  field: FrappeDocField;
  value: unknown;
  onValueChange: (value: unknown) => void;
  disabled?: boolean | undefined;
  /** Present when editing an existing doc — enables immediate file upload. */
  docName?: string | undefined;
  /** For create flows without a doc yet: hold the file until the doc exists. */
  pendingFile?: File | null | undefined;
  onPendingFileChange?: ((file: File | null) => void) | undefined;
  className?: string | undefined;
  id?: string | undefined;
}

export function FieldInput({
  field,
  value,
  onValueChange,
  disabled,
  docName,
  pendingFile,
  onPendingFileChange,
  className,
  id,
}: FieldInputProps) {
  const kind = inputKindFor(field);
  const label = fieldLabel(field);
  const common = { id, disabled, className: className };

  switch (kind) {
    case "check":
      return (
        <div className={cn("flex items-center gap-2", className)}>
          <Switch
            id={id}
            checked={Boolean(value)}
            onCheckedChange={(checked) => onValueChange(checked ? 1 : 0)}
            disabled={disabled}
          />
          <span className="text-sm text-muted-foreground">{value ? "Yes" : "No"}</span>
        </div>
      );
    case "number":
      return (
        <Input
          {...common}
          type="number"
          step={field.fieldtype === "Int" ? 1 : "any"}
          value={value == null ? "" : String(value)}
          onChange={(event) => onValueChange(event.target.value)}
          placeholder={label}
        />
      );
    case "select": {
      const options = selectOptions(field);
      return (
        <Select
          value={value != null && value !== "" ? String(value) : ""}
          onValueChange={(next) => onValueChange(next)}
          disabled={disabled}
        >
          <SelectTrigger id={id} className={cn("w-full", className)}>
            <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    case "link":
      return (
        <LinkField
          {...common}
          doctype={field.options ?? ""}
          value={value ? String(value) : ""}
          onValueChange={(next) => onValueChange(next)}
          label={label}
        />
      );
    case "date":
      return (
        <Input
          {...common}
          type="date"
          value={toInputValue(field, value) as string}
          onChange={(event) => onValueChange(event.target.value)}
        />
      );
    case "datetime":
      return (
        <Input
          {...common}
          type="datetime-local"
          value={toInputValue(field, value) as string}
          onChange={(event) => onValueChange(event.target.value)}
        />
      );
    case "time":
      return (
        <Input
          {...common}
          type="time"
          value={toInputValue(field, value) as string}
          onChange={(event) => onValueChange(event.target.value)}
        />
      );
    case "textarea":
      return (
        <Textarea
          {...common}
          rows={3}
          value={value == null ? "" : String(value)}
          onChange={(event) => onValueChange(event.target.value)}
          placeholder={label}
        />
      );
    case "attach":
      return (
        <AttachField
          field={field}
          value={value}
          onValueChange={onValueChange}
          docName={docName}
          pendingFile={pendingFile}
          onPendingFileChange={onPendingFileChange}
          disabled={disabled}
          id={id}
        />
      );
    case "text":
      return (
        <Input
          {...common}
          type="text"
          value={value == null ? "" : String(value)}
          onChange={(event) => onValueChange(event.target.value)}
          placeholder={label}
        />
      );
    default:
      return (
        <Input
          {...common}
          value={value == null ? "" : String(value)}
          onChange={(event) => onValueChange(event.target.value)}
          placeholder={label}
        />
      );
  }
}

function LinkField({
  doctype,
  value,
  onValueChange,
  disabled,
  label,
  id,
  className,
}: {
  doctype: string;
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean | undefined;
  label: string;
  id?: string | undefined;
  className?: string | undefined;
}) {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useLinkOptions(doctype);
  const options = (data ?? []).map((option) => option.name);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            !value && "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate">{value || `Select ${label.toLowerCase()}…`}</span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search…" />
          <CommandList>
            <CommandEmpty>{isLoading ? "Loading options…" : "No matches found"}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option}
                  value={option}
                  onSelect={() => {
                    onValueChange(option);
                    setOpen(false);
                  }}
                >
                  {option}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function AttachField({
  field,
  value,
  onValueChange,
  docName,
  pendingFile,
  onPendingFileChange,
  disabled,
  id,
}: {
  field: FrappeDocField;
  value: unknown;
  onValueChange: (value: unknown) => void;
  docName?: string | undefined;
  pendingFile?: File | null | undefined;
  onPendingFileChange?: ((file: File | null) => void) | undefined;
  disabled?: boolean | undefined;
  id?: string | undefined;
}) {
  const [uploading, setUploading] = useState(false);
  const url = typeof value === "string" ? value : "";
  const previewUrl = useMemo(
    () => (pendingFile ? URL.createObjectURL(pendingFile) : ""),
    [pendingFile],
  );
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);
  const isImage = field.fieldtype === "Attach Image";

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (docName) {
      setUploading(true);
      try {
        const fileUrl = await uploadOrgFile(docName, field.fieldname, file);
        onValueChange(fileUrl);
        toast.success("File uploaded");
      } catch (error) {
        toast.error(errorMessage(error));
      } finally {
        setUploading(false);
      }
    } else {
      onPendingFileChange?.(file);
    }
  }

  return (
    <div className="space-y-2">
      {(url || pendingFile) && isImage && (
        <img
          src={url || previewUrl}
          alt={fieldLabel(field)}
          className="h-20 w-20 rounded-lg border object-cover"
        />
      )}
      {!url && pendingFile && !isImage && (
        <span className="text-sm text-muted-foreground">{pendingFile.name} (uploads on save)</span>
      )}
      <div className="flex items-center gap-2">
        <Label
          htmlFor={id}
          className={cn(
            "flex w-fit cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
            disabled && "pointer-events-none opacity-50",
          )}
        >
          {uploading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ImagePlus className="size-4 text-muted-foreground" />
          )}
          {uploading ? "Uploading…" : url ? "Replace file" : "Choose file"}
        </Label>
        <input
          id={id}
          type="file"
          className="sr-only"
          accept={isImage ? "image/*" : undefined}
          disabled={disabled || uploading}
          onChange={(event) => {
            void handleFile(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
        {url && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground"
            aria-label="Clear attachment"
            disabled={disabled}
            onClick={() => onValueChange("")}
          >
            <X className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

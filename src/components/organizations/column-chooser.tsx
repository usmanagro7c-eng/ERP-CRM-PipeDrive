import { Check, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  fieldLabel,
  isDisplayField,
  type FrappeDocField,
  type FrappeDocTypeMeta,
} from "@/lib/frappe-meta";

interface ColumnChooserProps {
  meta: FrappeDocTypeMeta;
  selected: string[];
  onChange: (columns: string[]) => void;
}

export function ColumnChooser({ meta, selected, onChange }: ColumnChooserProps) {
  const fields = (meta.fields ?? []).filter(isDisplayField);

  function toggle(fieldname: string) {
    if (selected.includes(fieldname)) {
      // Keep at least one visible column.
      if (selected.length === 1) return;
      onChange(selected.filter((name) => name !== fieldname));
    } else {
      const next = fields
        .filter((field) => selected.includes(field.fieldname) || field.fieldname === fieldname)
        .map((field) => field.fieldname);
      onChange(next);
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <SlidersHorizontal className="size-4" />
          Columns
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-0">
        <div className="border-b px-3 py-2 text-xs font-medium text-muted-foreground">
          Show columns
        </div>
        <div className="max-h-72 overflow-y-auto p-1">
          {fields.map((field: FrappeDocField) => {
            const checked = selected.includes(field.fieldname);
            return (
              <label
                key={field.fieldname}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
              >
                <Checkbox checked={checked} onCheckedChange={() => toggle(field.fieldname)} />
                <span className="flex-1">{fieldLabel(field)}</span>
                {checked && <Check className="size-3.5 text-primary" />}
              </label>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

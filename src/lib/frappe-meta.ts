/**
 * Helpers for working with Frappe DocType metadata. Nothing here is
 * Organization-specific except the default column preference — every function
 * operates on whatever DocType metadata is passed in, so the same machinery
 * can drive Leads, Deals and Contacts later.
 */

export interface FrappeDocField {
  fieldname: string;
  fieldtype: string;
  label?: string | null;
  reqd?: number;
  read_only?: number;
  hidden?: number;
  options?: string | null;
  description?: string | null;
  default?: string | null;
  in_list_view?: number;
  in_standard_filter?: number;
}

export interface FrappeDocTypeMeta {
  name: string;
  fields?: FrappeDocField[];
  title_field?: string | null;
  image_field?: string | null;
}

export type InputKind =
  | "text"
  | "number"
  | "check"
  | "select"
  | "link"
  | "date"
  | "datetime"
  | "time"
  | "textarea"
  | "attach";

const LAYOUT_FIELDTYPES = new Set([
  "Section Break",
  "Column Break",
  "Tab Break",
  "Tab Break",
  "HTML",
  "Button",
  "Heading",
  "Fold",
]);

const INPUT_KINDS: Record<string, InputKind> = {
  Data: "text",
  Int: "number",
  Float: "number",
  Currency: "number",
  Percent: "number",
  Check: "check",
  Select: "select",
  Link: "link",
  Date: "date",
  Datetime: "datetime",
  Time: "time",
  "Small Text": "textarea",
  Text: "textarea",
  "Long Text": "textarea",
  "Text Editor": "textarea",
  Code: "textarea",
  Attach: "attach",
  "Attach Image": "attach",
};

export function inputKindFor(field: Pick<FrappeDocField, "fieldtype">): InputKind | null {
  return INPUT_KINDS[field.fieldtype] ?? null;
}

/** Fields that can be rendered as an input or a value (layout-only and unsupported types excluded). */
export function isDataField(field: Pick<FrappeDocField, "fieldtype">): boolean {
  return !LAYOUT_FIELDTYPES.has(field.fieldtype) && inputKindFor(field) !== null;
}

/** Fields a user may edit (respects read_only/hidden from the metadata). */
export function isEditableField(field: FrappeDocField): boolean {
  return isDataField(field) && !field.read_only && !field.hidden;
}

/** Fields to show somewhere (data fields that are not hidden; read-only ones still display). */
export function isDisplayField(field: FrappeDocField): boolean {
  return isDataField(field) && !field.hidden;
}

export function fieldLabel(field: Pick<FrappeDocField, "fieldname" | "label">): string {
  if (field.label) return field.label;
  const humanized = field.fieldname.replace(/_/g, " ").trim();
  return humanized.charAt(0).toUpperCase() + humanized.slice(1);
}

export function selectOptions(field: Pick<FrappeDocField, "options">): string[] {
  return (field.options ?? "")
    .split("\n")
    .map((option) => option.trim())
    .filter(Boolean);
}

export interface FieldSection {
  label?: string | undefined;
  fields: FrappeDocField[];
}

/**
 * Walk the raw field list and group fields into sections using Section Breaks.
 * Column Breaks are layout-only on two-column forms and are flattened.
 */
export function groupIntoSections(fields: FrappeDocField[], includeHidden = false): FieldSection[] {
  const sections: FieldSection[] = [];
  let current: FieldSection = { label: undefined, fields: [] };
  for (const field of fields) {
    if (field.fieldtype === "Section Break") {
      if (current.fields.length > 0) sections.push(current);
      current = { label: field.label ?? undefined, fields: [] };
      continue;
    }
    if (!isDataField(field)) continue;
    if (!includeHidden && field.hidden) continue;
    current.fields.push(field);
  }
  if (current.fields.length > 0) sections.push(current);
  return sections;
}

/** Sensible default list columns, preferring the classic Organization columns when present. */
export function defaultListColumns(meta: FrappeDocTypeMeta, max = 7): string[] {
  const display = (meta.fields ?? []).filter(isDisplayField);
  const byName = new Map(display.map((field) => [field.fieldname, field]));
  const preferred = [
    "organization_name",
    "website",
    "industry",
    "territory",
    "no_of_employees",
    "annual_revenue",
  ];
  const picked: string[] = [];
  for (const name of preferred) {
    if (byName.has(name)) picked.push(name);
  }
  const rest = display
    .filter((field) => !picked.includes(field.fieldname))
    .sort((a, b) => (b.in_list_view ?? 0) - (a.in_list_view ?? 0));
  for (const field of rest) {
    if (picked.length >= max) break;
    picked.push(field.fieldname);
  }
  return picked;
}

export function fieldsByNames(meta: FrappeDocTypeMeta, names: string[]): FrappeDocField[] {
  const byName = new Map((meta.fields ?? []).map((field) => [field.fieldname, field]));
  return names.map((name) => byName.get(name)).filter((f): f is FrappeDocField => Boolean(f));
}

/** Frappe stores Check as 0/1; everything else stays a string/number. */
export function toInputValue(field: FrappeDocField, value: unknown): string | number {
  const kind = inputKindFor(field);
  if (kind === "check") return value ? 1 : 0;
  if (kind === "datetime") {
    // Frappe: "YYYY-MM-DD HH:mm:ss" -> datetime-local: "YYYY-MM-DDTHH:mm"
    const text = value == null ? "" : String(value);
    return text ? text.replace(" ", "T").slice(0, 16) : "";
  }
  if (kind === "number") {
    return value == null || value === "" ? "" : (value as number);
  }
  return value == null ? "" : String(value);
}

export function fromInputValue(field: FrappeDocField, value: unknown): unknown {
  const kind = inputKindFor(field);
  if (kind === "check") return value ? 1 : 0;
  if (kind === "datetime") {
    const text = value == null ? "" : String(value);
    return text ? `${text.replace("T", " ")}:00` : "";
  }
  if (kind === "number") {
    if (value === "" || value == null) return "";
    const num = Number(value);
    return Number.isNaN(num) ? "" : num;
  }
  return value ?? "";
}

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const numberFormatter = new Intl.NumberFormat("en-US");

/** Human-readable value for tables and detail views. */
export function formatFieldValue(field: FrappeDocField, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  switch (inputKindFor(field)) {
    case "check":
      return value ? "Yes" : "No";
    case "date": {
      const date = new Date(`${String(value)}T00:00:00`);
      return Number.isNaN(date.getTime()) ? String(value) : dateFormatter.format(date);
    }
    case "number":
    case null: {
      if (field.fieldtype === "Int" && typeof value === "number")
        return numberFormatter.format(value);
      return String(value);
    }
    default: {
      if (field.fieldtype === "Int" && typeof value === "number")
        return numberFormatter.format(value);
      return String(value);
    }
  }
}

/**
 * Pure helpers that decide what the Frappe proxy is allowed to forward.
 * Kept free of runtime/env access so it can be unit tested.
 *
 * Rules:
 *  - Only CRM Organization, CRM Deal, CRM Lead, CRM Task, Contact, Note, etc. can be read/written on CRM site (dev03).
 *  - Quotation, Sales Order, Item, Customer, and related ERPNext DocTypes route to ERPNext site (dev06).
 *  - Other DocTypes can only be read as a list of `name`s, and only when they are
 *    the target of a Link field on CRM Organization (resolved from its metadata).
 *  - Path traversal ("..") and encoded slashes are rejected.
 */

export const ORG_DOCTYPE = "CRM Organization";
export const DEAL_DOCTYPE = "CRM Deal";
export const LEAD_DOCTYPE = "CRM Lead";
export const TASK_DOCTYPE = "CRM Task";
export const CONTACT_DOCTYPE = "Contact";
export const QUOTATION_DOCTYPE = "Quotation";
export const SALES_ORDER_DOCTYPE = "Sales Order";
export const ITEM_DOCTYPE = "Item";
export const NOTE_DOCTYPE = "Note";
export const CALL_LOG_DOCTYPE = "CRM Call Log";
export const FILE_DOCTYPE = "File";
export const COMMENT_DOCTYPE = "Comment";
export const COMMUNICATION_DOCTYPE = "Communication";
export const CRM_PRODUCTS_DOCTYPE = "CRM Products";

export const MAIN_DOCTYPES = new Set([
  ORG_DOCTYPE,
  DEAL_DOCTYPE,
  LEAD_DOCTYPE,
  TASK_DOCTYPE,
  CONTACT_DOCTYPE,
  QUOTATION_DOCTYPE,
  SALES_ORDER_DOCTYPE,
  ITEM_DOCTYPE,
  NOTE_DOCTYPE,
  CALL_LOG_DOCTYPE,
  FILE_DOCTYPE,
  COMMENT_DOCTYPE,
  COMMUNICATION_DOCTYPE,
  CRM_PRODUCTS_DOCTYPE,
]);

/** DocTypes and transactions that live on the ERPNext instance (dev06) */
export const ERPNEXT_DOCTYPES = new Set([
  QUOTATION_DOCTYPE,
  SALES_ORDER_DOCTYPE,
  ITEM_DOCTYPE,
  "Customer",
  "Item Group",
  "UOM",
  "Price List",
  "Company",
  "Sales Taxes and Charges Template",
  "Quotation Item",
  "Sales Order Item",
  "Payment Terms Template",
  "Tax Category",
]);

export const DEFAULT_LINK_TARGETS = new Set([
  "Currency",
  "CRM Territory",
  "CRM Industry",
  "Address",
  "Country",
  "User",
  "Contact",
  "CRM Organization",
  "CRM Deal",
  "CRM Deal Status",
  "CRM Lead",
  "CRM Lead Status",
  "CRM Lead Source",
  "CRM Task",
  "Salutation",
  "Gender",
  "CRM Service Level Agreement",
  "CRM Communication Status",
  "CRM Lost Reason",
  "Quotation",
  "Sales Order",
  "Item",
  "Item Group",
  "UOM",
  "Price List",
  "Company",
  "Customer",
  "Sales Taxes and Charges Template",
  "Quotation Item",
  "Sales Order Item",
  "Tax Category",
  "Payment Terms Template",
  "Note",
  "CRM Note",
  "CRM Call Log",
  "File",
  "Comment",
  "Communication",
  "CRM Products",
]);

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_LINK_ROWS = 1000;

export type ProxyKind =
  | "org-read" // GET api/resource/CRM Organization|CRM Deal|CRM Lead|CRM Task|Contact|Quotation|Sales Order|Item[/<name>]
  | "org-write" // POST/PUT/DELETE api/resource/CRM Organization|CRM Deal|CRM Lead|CRM Task|Contact|Quotation|Sales Order|Item[/<name>]
  | "link-read" // GET api/resource/<LinkedDocType>
  | "meta" // GET api/method/frappe.desk.form.load.getdoctype
  | "count" // GET api/method/frappe.client.get_count
  | "upload"; // POST api/method/upload_file or api/method/uploadfile

export interface Classification {
  kind: ProxyKind;
  /** Target DocType for "link-read". */
  doctype?: string;
}

/** True when the (already URL-decoded) path contains anything that could escape the allowlist. */
export function hasUnsafeSegments(path: string): boolean {
  if (path.includes("\\") || path.includes("\0")) return true;
  return path.split("/").some((segment) => segment === ".." || segment === ".");
}

const MAIN_RESOURCE = /^api\/resource\/(CRM Organization|CRM Deal|CRM Lead|CRM Task|Contact|Quotation|Sales Order|Item|Note|CRM Note|CRM Call Log|File|Comment|Communication|CRM Products)(?:\/([^/]+))?$/;
const ANY_RESOURCE_LIST = /^api\/resource\/([^/]+)$/;

/**
 * Decide what kind of request this is, or null if it must be blocked.
 * `searchParams` is used for the metadata/count endpoints, which must target the allowed DocTypes.
 */
export function classifyRequest(
  method: string,
  path: string,
  searchParams: URLSearchParams,
): Classification | null {
  if (!path || hasUnsafeSegments(path)) return null;

  if (method === "GET") {
    if (MAIN_RESOURCE.test(path)) return { kind: "org-read" };
    if (path === "api/method/frappe.desk.form.load.getdoctype") {
      const dt = searchParams.get("doctype") ?? "";
      return MAIN_DOCTYPES.has(dt) ? { kind: "meta" } : null;
    }
    if (path === "api/method/frappe.client.get_count") {
      const dt = searchParams.get("doctype") ?? "";
      return MAIN_DOCTYPES.has(dt) ? { kind: "count" } : null;
    }
    const list = ANY_RESOURCE_LIST.exec(path);
    if (list?.[1]) return { kind: "link-read", doctype: list[1] };
    return null;
  }

  if (method === "POST") {
    if (path === "api/method/upload_file" || path === "api/method/uploadfile") return { kind: "upload" };
    if (
      path === "api/method/frappe.client.set_value" ||
      path === "api/method/frappe.client.cancel" ||
      path === "api/method/erpnext.selling.doctype.quotation.quotation.declare_order_lost" ||
      path === "api/method/frappe.desk.form.utils.add_comment" ||
      path === "api/method/frappe.core.doctype.communication.email.make" ||
      path === "api/method/crm.api.dashboard.get_dashboard" ||
      path === "api/method/crm.api.session.get_users" ||
      path === "api/method/crm.api.activities.get_activities"
    ) {
      return { kind: "org-write" };
    }
    if (/^api\/resource\/(CRM Organization|CRM Deal|CRM Lead|CRM Task|Contact|Quotation|Sales Order|Item|Note|CRM Note|CRM Call Log|File|Comment|Communication|CRM Products)$/.test(path)) return { kind: "org-write" };
    return null;
  }

  if (method === "PUT" || method === "DELETE") {
    const match = MAIN_RESOURCE.exec(path);
    return match?.[2] ? { kind: "org-write" } : null;
  }

  return null;
}

/** Check if a request belongs to ERPNext (dev06) instead of Frappe CRM (dev03) */
export function isErpNextRequest(
  path: string,
  searchParams?: URLSearchParams,
  bodyDocType?: string,
): boolean {
  if (!path) return false;

  // 1. Specific erpnext methods
  if (path.startsWith("api/method/erpnext.")) return true;

  // 2. Resource endpoints: api/resource/<DocType> or api/resource/<DocType>/<Name>
  const match = /^api\/resource\/([^/]+)/.exec(path);
  if (match?.[1]) {
    const dt = decodeURIComponent(match[1]);
    if (ERPNEXT_DOCTYPES.has(dt)) return true;
  }

  // 3. Methods using ?doctype= query param (e.g. frappe.client.get_count, frappe.desk.form.load.getdoctype)
  if (searchParams) {
    const dt = searchParams.get("doctype");
    if (dt && ERPNEXT_DOCTYPES.has(dt)) return true;
  }

  // 4. Methods using doctype in JSON body (e.g. frappe.client.set_value, frappe.client.cancel)
  if (bodyDocType && ERPNEXT_DOCTYPES.has(bodyDocType)) {
    return true;
  }

  return false;
}

/** Collect the DocTypes that Link fields of the given metadata point to. */
export function linkTargetsFromMeta(meta: unknown): Set<string> {
  const targets = new Set<string>();
  const fields = (meta as { fields?: unknown } | null)?.fields;
  if (!Array.isArray(fields)) return targets;
  for (const field of fields) {
    const f = field as { fieldtype?: unknown; options?: unknown };
    if (f.fieldtype === "Link" && typeof f.options === "string" && f.options) {
      targets.add(f.options);
    }
  }
  return targets;
}

/** Link lookups only ever return names, capped in size; the caller's own query is ignored. */
export function buildLinkQuery(incoming: URLSearchParams): string {
  const requested = Number(incoming.get("limit_page_length"));
  const limit =
    Number.isFinite(requested) && requested > 0
      ? Math.min(requested, MAX_LINK_ROWS)
      : MAX_LINK_ROWS;
  const query = new URLSearchParams();
  query.set("fields", JSON.stringify(["name"]));
  query.set("limit_page_length", String(limit));
  query.set("order_by", "name asc");
  return query.toString();
}

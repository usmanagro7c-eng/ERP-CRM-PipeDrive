/**
 * Pure helpers that decide what the Frappe proxy is allowed to forward.
 * Kept free of runtime/env access so it can be unit tested.
 *
 * Rules:
 *  - Only CRM Organization, CRM Deal, CRM Lead, CRM Task, Contact, Note, etc. can be read/written on CRM site (dev03).
 *  - Quotation, Sales Order, Item, Customer, and related ERPNext DocTypes route to ERPNext site (dev06).
 *  - Other DocTypes can only be read as a list of `name`s, and only when they are
 *    the target of a Link field on CRM Organization (resolved from its metadata).
 *  - File / Comment / Communication lists may only be read when the request is
 *    scoped to one allowed parent document (reference filter required).
 *  - "User" and friends are never readable as a link target.
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
export const CUSTOMER_DOCTYPE = "Customer";

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
  CUSTOMER_DOCTYPE,
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
  "CRM Products",
]);

/**
 * DocTypes that must never be readable through the proxy, not even when a
 * DocType's metadata lists them as a Link target.
 *
 * The UI does not need them: user pickers use `crm.api.session.get_users`
 * (an allow-listed method), never `api/resource/User`.
 */
export const BLOCKED_LINK_TARGETS = new Set([
  "User",
  "User Type",
  "Role",
  "Role Profile",
  "DocType",
  "Report",
  "Print Format",
  "Server Script",
  "Client Script",
  "Custom DocPerm",
  "Access Log",
  "Personalization",
  "Webhook",
  "Scheduled Job Type",
]);

/**
 * DocTypes a user may comment on / email from / attach to through the generic
 * methods, and that a File / Comment / Communication list may be scoped to.
 */
export const RECORD_DOCTYPES = new Set([
  LEAD_DOCTYPE,
  DEAL_DOCTYPE,
  TASK_DOCTYPE,
  ORG_DOCTYPE,
  CONTACT_DOCTYPE,
  QUOTATION_DOCTYPE,
  SALES_ORDER_DOCTYPE,
]);

/** Alias of RECORD_DOCTYPES. */
export const ALLOWED_REFERENCE_DOCTYPES = RECORD_DOCTYPES;

/**
 * DocTypes whose list reads are only allowed when the request is scoped to a
 * single parent document, plus the filter fields used for that scoping.
 */
export const REFERENCE_FILTERED_DOCTYPES = new Map<
  string,
  { doctypeField: string; nameField: string }
>([
  [FILE_DOCTYPE, { doctypeField: "attached_to_doctype", nameField: "attached_to_name" }],
  [COMMENT_DOCTYPE, { doctypeField: "reference_doctype", nameField: "reference_name" }],
  [COMMUNICATION_DOCTYPE, { doctypeField: "reference_doctype", nameField: "reference_name" }],
]);

/**
 * DocTypes a file may be attached to (uploads): the CRM records, the sales
 * documents and the two ERPNext masters. Nothing else is a valid parent for
 * an attachment (File, Comment, Communication, ... are not).
 */
export const UPLOAD_DOCTYPES = new Set([...RECORD_DOCTYPES, ITEM_DOCTYPE, CUSTOMER_DOCTYPE]);

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_LINK_ROWS = 1000;
/** Hard cap for any single list read of a main resource. */
export const MAX_MAIN_ROWS = 200;
/** Hard cap for File / Comment / Communication list reads. */
export const MAX_REFERENCE_ROWS = 100;
/** Maximum length of a Frappe document name. */
export const MAX_DOC_NAME_LENGTH = 140;

/**
 * Upload allow-list: file extension -> acceptable content types.
 * Anything not listed here is rejected before the request is forwarded.
 */
export const UPLOAD_TYPE_ALLOWLIST: Record<string, string[]> = {
  png: ["image/png"],
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  gif: ["image/gif"],
  webp: ["image/webp"],
  bmp: ["image/bmp"],
  pdf: ["application/pdf", "application/octet-stream"],
  docx: [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/zip",
    "application/octet-stream",
  ],
  xlsx: [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/zip",
    "application/octet-stream",
  ],
  csv: [
    "text/csv",
    "application/csv",
    "text/plain",
    "application/vnd.ms-excel",
    "application/octet-stream",
  ],
  txt: ["text/plain", "text/csv", "application/octet-stream"],
};

export type ProxyKind =
  | "org-read" // GET api/resource/CRM Organization|CRM Deal|CRM Lead|CRM Task|Contact|Quotation|Sales Order|Item[/<name>]
  | "scoped-read" // GET api/resource/File|Comment|Communication (needs a reference filter)
  | "org-write" // POST/PUT/DELETE api/resource/CRM Organization|CRM Deal|CRM Lead|CRM Task|Contact|Quotation|Sales Order|Item[/<name>]
  | "link-read" // GET api/resource/<LinkedDocType>
  | "meta" // GET api/method/frappe.desk.form.load.getdoctype
  | "count" // GET api/method/frappe.client.get_count
  | "upload"; // POST api/method/upload_file or api/method/uploadfile

export interface Classification {
  kind: ProxyKind;
  /** Target DocType for "link-read" and "scoped-read". */
  doctype?: string;
}

/** True when the (already URL-decoded) path contains anything that could escape the allowlist. */
export function hasUnsafeSegments(path: string): boolean {
  if (path.includes("\\") || path.includes("\0")) return true;
  return path.split("/").some((segment) => segment === ".." || segment === ".");
}

const MAIN_RESOURCE =
  /^api\/resource\/(CRM Organization|CRM Deal|CRM Lead|CRM Task|Contact|Quotation|Sales Order|Item|Note|CRM Note|CRM Call Log|File|Comment|Communication|CRM Products|CRM Lead Status|CRM Deal Status)(?:\/([^/]+))?$/;
const ANY_RESOURCE_LIST = /^api\/resource\/([^/]+)$/;
const RESOURCE_DOCTYPE = /^api\/resource\/([^/]+)(?:\/[^/]*)?$/;

/** Extract the DocType from an `api/resource/<DocType>[/<name>]` path. */
export function doctypeFromResourcePath(path: string): string | undefined {
  const match = RESOURCE_DOCTYPE.exec(path);
  return match?.[1] ? decodeURIComponent(match[1]) : undefined;
}

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
    if (MAIN_RESOURCE.test(path)) {
      const doctype = doctypeFromResourcePath(path);
      if (doctype && REFERENCE_FILTERED_DOCTYPES.has(doctype)) {
        // File / Comment / Communication: list reads need a reference filter,
        // single document reads are never allowed.
        return path === `api/resource/${doctype}` ? { kind: "scoped-read", doctype } : null;
      }
      return { kind: "org-read" };
    }
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
    if (path === "api/method/upload_file" || path === "api/method/uploadfile")
      return { kind: "upload" };
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
    if (
      /^api\/resource\/(CRM Organization|CRM Deal|CRM Lead|CRM Task|Contact|Quotation|Sales Order|Item|Note|CRM Note|CRM Call Log|File|Comment|Communication|CRM Products|CRM Lead Status|CRM Deal Status)$/.test(
        path,
      )
    )
      return { kind: "org-write" };
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

// ---------------------------------------------------------------------------
// Reference scoped reads (File / Comment / Communication)
// ---------------------------------------------------------------------------

export type FilterEntry = [string, string, string];

/**
 * Parse the `filters` query parameter of a Frappe list request.
 * Supports the JSON array-of-arrays form and the JSON object form.
 */
export function parseFilters(searchParams: URLSearchParams): FilterEntry[] {
  const raw = searchParams.get("filters");
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  const entries: FilterEntry[] = [];
  if (Array.isArray(parsed)) {
    for (const item of parsed) {
      if (!Array.isArray(item) || item.length < 3) continue;
      const [field, op, value] = item as unknown[];
      if (typeof field === "string" && typeof op === "string" && typeof value === "string") {
        entries.push([field, op, value]);
      }
    }
    return entries;
  }
  if (parsed && typeof parsed === "object") {
    for (const [field, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === "string") entries.push([field, "=", value]);
    }
  }
  return entries;
}

export interface ReferenceScope {
  doctype: string;
  name: string;
}

/**
 * Extract the parent document a File/Comment/Communication list read is
 * scoped to. Returns null when the request is not scoped to an allowed parent.
 */
export function referenceScopeFor(
  doctype: string,
  searchParams: URLSearchParams,
): ReferenceScope | null {
  const spec = REFERENCE_FILTERED_DOCTYPES.get(doctype);
  if (!spec) return null;
  let refDoctype: string | undefined;
  let refName: string | undefined;
  for (const [field, op, value] of parseFilters(searchParams)) {
    if (op !== "=") continue;
    if (field === spec.doctypeField) refDoctype = value;
    if (field === spec.nameField) refName = value;
  }
  if (!refDoctype || !refName) return null;
  if (!RECORD_DOCTYPES.has(refDoctype)) return null;
  if (!isPlausibleDocName(refName)) return null;
  return { doctype: refDoctype, name: refName };
}

/**
 * Rebuild a list query with a hard cap on the page size.
 * `limit_page_length=0` means "unlimited" in Frappe, so it is replaced too.
 * The legacy `limit` parameter is folded into `limit_page_length`.
 */
export function capPageLength(searchParams: URLSearchParams, max: number): string {
  const query = new URLSearchParams(searchParams);
  const legacy = Number(query.get("limit"));
  query.delete("limit");
  const requested = Number(query.get("limit_page_length"));
  const candidates = [requested, legacy].filter((n) => Number.isFinite(n) && n > 0);
  const limit = candidates.length > 0 ? Math.min(max, ...candidates) : max;
  query.set("limit_page_length", String(limit));
  return query.toString();
}

// ---------------------------------------------------------------------------
// Document names and upload payloads
// ---------------------------------------------------------------------------

/**
 * A document name must be a short, single-segment string: no slashes, no
 * control characters, no traversal, and at most 140 characters.
 */
export function isPlausibleDocName(name: unknown): boolean {
  if (typeof name !== "string") return false;
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > MAX_DOC_NAME_LENGTH) return false;
  if (trimmed.includes("/") || trimmed.includes("\\")) return false;
  if (trimmed.includes("..")) return false;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(trimmed)) return false;
  return /[A-Za-z0-9]/.test(trimmed);
}

/** Lower-case extension of a file name ("" when there is none). */
export function fileExtension(fileName: string): string {
  const base = fileName.split(/[\\/]/).pop() ?? "";
  const dot = base.lastIndexOf(".");
  if (dot <= 0 || dot === base.length - 1) return "";
  return base.slice(dot + 1).toLowerCase();
}

/**
 * True when the file extension is on the upload allow-list and the reported
 * content type is compatible with it.
 */
export function isAllowedUploadType(fileName: string, contentType?: string | null): boolean {
  const extension = fileExtension(fileName);
  const allowed = UPLOAD_TYPE_ALLOWLIST[extension];
  if (!allowed) return false;
  const type = (contentType ?? "").split(";")[0]?.trim().toLowerCase() ?? "";
  if (!type) return true;
  return allowed.includes(type);
}

// ---------------------------------------------------------------------------
// Uploads
// ---------------------------------------------------------------------------

export interface UploadInfo {
  doctype: string;
  docname: string;
  /** True when the file must be uploaded to ERPNext (dev06). */
  isErpNext: boolean;
}

export type UploadResult =
  { ok: true; info: UploadInfo } | { ok: false; status: number; reason: string };

/**
 * Validate a multipart upload form.
 *
 * The DocType decides the target site (ERPNext for Quotation, Sales Order,
 * Item and Customer), the docname must look like a document name and the file
 * must be on the type allow-list.
 */
export function validateUploadForm(form: FormData): UploadResult {
  const doctype = String(form.get("doctype") ?? "").trim();
  if (!UPLOAD_DOCTYPES.has(doctype)) {
    return {
      ok: false,
      status: 403,
      reason: "Uploads are only allowed for CRM and Sales DocTypes",
    };
  }

  const docname = String(form.get("docname") ?? "").trim();
  if (!isPlausibleDocName(docname)) {
    return { ok: false, status: 400, reason: "Upload needs a valid docname" };
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return { ok: false, status: 400, reason: "Upload needs a file" };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, status: 413, reason: "File too large (max 10 MB)" };
  }
  if (!isAllowedUploadType(file.name, file.type)) {
    return {
      ok: false,
      status: 403,
      reason: "File type not allowed (images, pdf, docx, xlsx, csv, txt)",
    };
  }

  return { ok: true, info: { doctype, docname, isErpNext: ERPNEXT_DOCTYPES.has(doctype) } };
}

// ---------------------------------------------------------------------------
// Method body validation
// ---------------------------------------------------------------------------

export type MethodBodyResult =
  { ok: true; body: Record<string, unknown> } | { ok: false; reason: string };

const MAX_COMMENT_LENGTH = 10_000;
const MAX_EMAIL_SUBJECT_LENGTH = 250;
const MAX_EMAIL_BODY_LENGTH = 50_000;
const MAX_RECIPIENTS_LENGTH = 1_000;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * The RPC methods whose JSON body is validated (and rewritten) before the
 * request is forwarded. Single source of truth for the proxy route and for
 * `validateMethodBody`, so the two can never drift apart.
 */
export const VALIDATED_METHODS = new Set([
  "api/method/frappe.client.set_value",
  "api/method/frappe.client.cancel",
  "api/method/frappe.desk.form.utils.add_comment",
  "api/method/frappe.core.doctype.communication.email.make",
]);

/**
 * Validate (and sanitize) the JSON body of the allow-listed RPC methods.
 *
 * Only the fields the UI actually needs are forwarded; anything else the
 * caller sends is dropped, so a request can never reach a Frappe method with
 * extra, unvetted arguments.
 */
export function validateMethodBody(path: string, body: unknown): MethodBodyResult {
  if (!isPlainObject(body)) {
    return { ok: false, reason: "Request body must be a JSON object" };
  }

  switch (path) {
    case "api/method/frappe.client.set_value": {
      // The app only uses this to change a Quotation's status.
      const doctype = body["doctype"];
      const name = body["name"];
      const fieldname = body["fieldname"];
      const value = body["value"];
      if (doctype !== QUOTATION_DOCTYPE || fieldname !== "status") {
        return {
          ok: false,
          reason: "set_value is only allowed for the status of a Quotation",
        };
      }
      if (!isPlausibleDocName(name)) {
        return { ok: false, reason: "set_value: invalid document name" };
      }
      if (typeof value !== "string" || !value.trim() || value.length > 140) {
        return { ok: false, reason: "set_value: invalid value" };
      }
      return {
        ok: true,
        body: {
          doctype,
          name: (name as string).trim(),
          fieldname: "status",
          value,
        },
      };
    }

    case "api/method/frappe.client.cancel": {
      const doctype = body["doctype"];
      const name = body["name"];
      if (doctype !== QUOTATION_DOCTYPE && doctype !== SALES_ORDER_DOCTYPE) {
        return {
          ok: false,
          reason: "cancel is only allowed for Quotation and Sales Order",
        };
      }
      if (!isPlausibleDocName(name)) {
        return { ok: false, reason: "cancel: invalid document name" };
      }
      return { ok: true, body: { doctype, name: (name as string).trim() } };
    }

    case "api/method/frappe.desk.form.utils.add_comment": {
      const referenceDoctype = body["reference_doctype"];
      const referenceName = body["reference_name"];
      const content = body["content"];
      if (typeof referenceDoctype !== "string" || !RECORD_DOCTYPES.has(referenceDoctype)) {
        return {
          ok: false,
          reason: "Comments are only allowed on CRM and sales records",
        };
      }
      if (!isPlausibleDocName(referenceName)) {
        return { ok: false, reason: "add_comment: invalid reference name" };
      }
      if (typeof content !== "string" || !content.trim() || content.length > MAX_COMMENT_LENGTH) {
        return { ok: false, reason: "add_comment: invalid content" };
      }
      // comment_by / comment_email are dropped on purpose: the author of a
      // comment must never be taken from the request body (spoofing). They are
      // re-injected server-side from the signed-in session in the proxy route.
      return {
        ok: true,
        body: {
          reference_doctype: referenceDoctype,
          reference_name: (referenceName as string).trim(),
          content,
        },
      };
    }

    case "api/method/frappe.core.doctype.communication.email.make": {
      const doctype = body["doctype"];
      const name = body["name"];
      const recipients = body["recipients"];
      const subject = body["subject"];
      const content = body["content"];
      if (typeof doctype !== "string" || !RECORD_DOCTYPES.has(doctype)) {
        return {
          ok: false,
          reason: "Emails can only be sent from a CRM or sales record",
        };
      }
      if (!isPlausibleDocName(name)) {
        return { ok: false, reason: "email.make: invalid document name" };
      }
      if (
        typeof recipients !== "string" ||
        !recipients.trim() ||
        recipients.length > MAX_RECIPIENTS_LENGTH
      ) {
        return { ok: false, reason: "email.make: invalid recipients" };
      }
      if (
        typeof subject !== "string" ||
        !subject.trim() ||
        subject.length > MAX_EMAIL_SUBJECT_LENGTH
      ) {
        return { ok: false, reason: "email.make: invalid subject" };
      }
      if (
        typeof content !== "string" ||
        !content.trim() ||
        content.length > MAX_EMAIL_BODY_LENGTH
      ) {
        return { ok: false, reason: "email.make: invalid content" };
      }
      return {
        ok: true,
        body: {
          doctype,
          name: (name as string).trim(),
          recipients: recipients.trim(),
          subject,
          content,
          send_email: 1,
          now: 1,
        },
      };
    }

    default:
      return { ok: false, reason: `No body policy for ${path}` };
  }
}

/**
 * True when a write body carries a `doctype` that contradicts the DocType in
 * the URL (a classic confused-deputy attempt).
 */
export function bodyContradictsDocType(urlDocType: string, body: unknown): boolean {
  if (!isPlainObject(body)) return false;
  const doctype = body["doctype"];
  if (doctype === undefined || doctype === null) return false;
  if (typeof doctype !== "string") return true;
  return doctype !== urlDocType;
}

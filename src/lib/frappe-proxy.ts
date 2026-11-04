/**
 * Pure helpers that decide what the Frappe proxy is allowed to forward.
 * Kept free of runtime/env access so it can be unit tested.
 *
 * Rules:
 *  - Only the CRM Organization DocType can be read/written.
 *  - Other DocTypes can only be read as a list of `name`s, and only when they are
 *    the target of a Link field on CRM Organization (resolved from its metadata).
 *  - Path traversal ("..") and encoded slashes are rejected.
 */

export const ORG_DOCTYPE = "CRM Organization";
export const DEAL_DOCTYPE = "CRM Deal";
export const MAIN_DOCTYPES = new Set([ORG_DOCTYPE, DEAL_DOCTYPE]);
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_LINK_ROWS = 1000;

export type ProxyKind =
  | "org-read" // GET api/resource/CRM Organization|CRM Deal[/<name>]
  | "org-write" // POST/PUT/DELETE api/resource/CRM Organization|CRM Deal[/<name>]
  | "link-read" // GET api/resource/<LinkedDocType>
  | "meta" // GET api/method/frappe.desk.form.load.getdoctype
  | "count" // GET api/method/frappe.client.get_count
  | "upload"; // POST api/method/uploadfile

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

const MAIN_RESOURCE = /^api\/resource\/(CRM Organization|CRM Deal)(?:\/([^/]+))?$/;
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
    if (path === "api/method/uploadfile") return { kind: "upload" };
    if (/^api\/resource\/(CRM Organization|CRM Deal)$/.test(path)) return { kind: "org-write" };
    return null;
  }

  if (method === "PUT" || method === "DELETE") {
    const match = MAIN_RESOURCE.exec(path);
    return match?.[2] ? { kind: "org-write" } : null;
  }

  return null;
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

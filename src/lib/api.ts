/**
 * Thin API layer between the UI and the Frappe backend. Every call goes
 * through the same-origin, authenticated proxy route (/api/frappe/*), which injects
 * the Frappe credentials server-side — no key or secret ever reaches the
 * browser. Point PROXY_BASE elsewhere to swap backends.
 */

export const PROXY_BASE = "/api/frappe";
export const ORG_DOCTYPE = "CRM Organization";
export const DEAL_DOCTYPE = "CRM Deal";
export const DEAL_STATUS_DOCTYPE = "CRM Deal Status";

export class FrappeApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "FrappeApiError";
  }
}

/** Pull the human-readable message out of a Frappe error payload. */
export function extractFrappeErrorMessage(payload: unknown): string | undefined {
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    if (typeof record["_server_messages"] === "string" && record["_server_messages"]) {
      try {
        const messages = JSON.parse(record["_server_messages"]);
        if (Array.isArray(messages) && messages.length > 0) {
          const texts = messages.map((message) => {
            try {
              const parsed = typeof message === "string" ? JSON.parse(message) : message;
              const text = (parsed as { message?: unknown })?.message;
              return text == null ? String(message) : String(text);
            } catch {
              return String(message);
            }
          });
          return texts.join("; ");
        }
      } catch {
        // fall through to other shapes
      }
    }
    if (typeof record["message"] === "string" && record["message"]) return record["message"];
    if (typeof record["exc_type"] === "string" && record["exc_type"]) return record["exc_type"];
    if (typeof record["exc"] === "string" && record["exc"]) return record["exc"].split("\n")[0];
  }
  if (typeof payload === "string" && payload) {
    if (/<html|<!doctype/i.test(payload)) {
      const titleMatch = payload.match(/<title>([^<]*)<\/title>/i);
      const title = titleMatch?.[1]?.trim() || "Internal Server Error";
      return `Frappe server returned ${title} (500). Please check your Frappe CRM server.`;
    }
    return payload.slice(0, 300);
  }
  return undefined;
}

async function proxyRequest(
  path: string,
  init: { method?: string; body?: unknown; formData?: FormData } = {},
): Promise<unknown> {
  const method = init.method ?? "GET";
  const headers: Record<string, string> = {};
  let body: BodyInit | null = null;
  if (init.formData) {
    body = init.formData;
  } else if (init.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(init.body);
  }

  let response: Response;
  try {
    response = await fetch(`${PROXY_BASE}/${path}`, { method, headers, body });
  } catch {
    throw new FrappeApiError(0, "Network error: could not reach the app backend.");
  }

  const text = await response.text();
  let payload: unknown = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  if (!response.ok) {
    const proxyMessage =
      payload && typeof payload === "object"
        ? (payload as Record<string, unknown>)["_proxy_error"]
        : undefined;
    throw new FrappeApiError(
      response.status,
      (proxyMessage as string | undefined) ??
        extractFrappeErrorMessage(payload) ??
        `Request failed (${response.status})`,
    );
  }
  return payload;
}

function message(payload: unknown): unknown {
  if (payload && typeof payload === "object" && "message" in payload) {
    return (payload as Record<string, unknown>)["message"];
  }
  return payload;
}

function unwrapResourceData<T>(payload: unknown): T {
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

export interface ListParams {
  search?: string | undefined;
  searchField?: string | undefined;
  filters?: Array<[string, string, string]> | undefined;
  limit: number;
  start: number;
  orderBy?: string | undefined;
}

function buildListQuery(params: ListParams, defaultSearchField = "organization_name"): string {
  const query = new URLSearchParams();
  query.set("fields", JSON.stringify(["*"]));
  query.set("limit_page_length", String(params.limit));
  query.set("limit_start", String(params.start));
  query.set("order_by", params.orderBy ?? "modified desc");
  const filters = [...(params.filters ?? [])];
  if (params.search) {
    filters.push([params.searchField ?? defaultSearchField, "like", `%${params.search}%`]);
  }
  if (filters.length > 0) {
    query.set("filters", JSON.stringify(filters));
  }
  return query.toString();
}

export async function listOrganizations(params: ListParams): Promise<Record<string, unknown>[]> {
  const payload = await proxyRequest(`api/resource/${ORG_DOCTYPE}?${buildListQuery(params)}`);
  const data = unwrapResourceData<unknown>(payload);
  return Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
}

export async function countOrganizations(
  search = "",
  filters: Array<[string, string, string]> = [],
): Promise<number> {
  const query = new URLSearchParams({ doctype: ORG_DOCTYPE });
  const all = [...filters];
  if (search) all.push(["organization_name", "like", `%${search}%`]);
  if (all.length > 0) query.set("filters", JSON.stringify(all));
  const payload = await proxyRequest(`api/method/frappe.client.get_count?${query.toString()}`);
  const value = message(payload);
  return typeof value === "number" ? value : Number(value) || 0;
}

export async function getDocTypeMeta(doctype: string = ORG_DOCTYPE): Promise<FrappeMetaResponse> {
  const payload = await proxyRequest(
    `api/method/frappe.desk.form.load.getdoctype?doctype=${encodeURIComponent(doctype)}`,
  );
  const meta = payload as { docs?: unknown[]; message?: { docs?: unknown[] } } | undefined;
  const doc = meta?.docs?.[0] ?? meta?.message?.docs?.[0];
  if (!doc || typeof doc !== "object") {
    throw new FrappeApiError(500, `Could not load metadata for ${doctype}.`);
  }
  return doc as FrappeMetaResponse;
}

export async function getOrganization(name: string): Promise<Record<string, unknown>> {
  const payload = await proxyRequest(`api/resource/${ORG_DOCTYPE}/${encodeURIComponent(name)}`);
  const data = unwrapResourceData<unknown>(payload);
  if (!data || typeof data !== "object") {
    throw new FrappeApiError(500, "Unexpected response for organization detail.");
  }
  return data as Record<string, unknown>;
}

export async function createOrganization(
  values: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const payload = await proxyRequest(`api/resource/${ORG_DOCTYPE}`, {
    method: "POST",
    body: values,
  });
  const data = unwrapResourceData<unknown>(payload);
  return (data ?? {}) as Record<string, unknown>;
}

export async function updateOrganization(
  name: string,
  values: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const payload = await proxyRequest(`api/resource/${ORG_DOCTYPE}/${encodeURIComponent(name)}`, {
    method: "PUT",
    body: values,
  });
  const data = unwrapResourceData<unknown>(payload);
  return (data ?? {}) as Record<string, unknown>;
}

export async function deleteOrganization(name: string): Promise<void> {
  await proxyRequest(`api/resource/${ORG_DOCTYPE}/${encodeURIComponent(name)}`, {
    method: "DELETE",
  });
}

export interface DealStatus {
  name: string;
  deal_status?: string;
  type?: string;
  probability?: number;
  color?: string;
  position?: number;
}

export async function getDealStatuses(): Promise<DealStatus[]> {
  const query = new URLSearchParams({
    fields: JSON.stringify(["name", "deal_status", "type", "probability", "color", "position"]),
    limit_page_length: "0",
    order_by: "position asc",
  });
  const payload = await proxyRequest(`api/resource/${DEAL_STATUS_DOCTYPE}?${query}`);
  const data = unwrapResourceData<unknown>(payload);
  return Array.isArray(data) ? (data as DealStatus[]) : [];
}

export async function listDeals(params: ListParams): Promise<Record<string, unknown>[]> {
  const query = buildListQuery(params, "organization_name");
  const payload = await proxyRequest(`api/resource/${DEAL_DOCTYPE}?${query}`);
  const data = unwrapResourceData<unknown>(payload);
  return Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
}

export async function countDeals(
  search = "",
  filters: Array<[string, string, string]> = [],
): Promise<number> {
  const query = new URLSearchParams({ doctype: DEAL_DOCTYPE });
  const all = [...filters];
  if (search) all.push(["organization_name", "like", `%${search}%`]);
  if (all.length > 0) query.set("filters", JSON.stringify(all));
  const payload = await proxyRequest(`api/method/frappe.client.get_count?${query.toString()}`);
  const value = message(payload);
  return typeof value === "number" ? value : Number(value) || 0;
}

export async function getDeal(name: string): Promise<Record<string, unknown>> {
  const payload = await proxyRequest(`api/resource/${DEAL_DOCTYPE}/${encodeURIComponent(name)}`);
  const data = unwrapResourceData<unknown>(payload);
  if (!data || typeof data !== "object") {
    throw new FrappeApiError(500, "Unexpected response for deal detail.");
  }
  return data as Record<string, unknown>;
}

export async function createDeal(
  values: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const payload = await proxyRequest(`api/resource/${DEAL_DOCTYPE}`, {
    method: "POST",
    body: values,
  });
  const data = unwrapResourceData<unknown>(payload);
  return (data ?? {}) as Record<string, unknown>;
}

export async function updateDeal(
  name: string,
  values: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const payload = await proxyRequest(`api/resource/${DEAL_DOCTYPE}/${encodeURIComponent(name)}`, {
    method: "PUT",
    body: values,
  });
  const data = unwrapResourceData<unknown>(payload);
  return (data ?? {}) as Record<string, unknown>;
}

export async function deleteDeal(name: string): Promise<void> {
  await proxyRequest(`api/resource/${DEAL_DOCTYPE}/${encodeURIComponent(name)}`, {
    method: "DELETE",
  });
}

export async function getLinkOptions(doctype: string): Promise<{ name: string }[]> {
  const query = new URLSearchParams({
    fields: JSON.stringify(["name"]),
    limit_page_length: "0",
  });
  const payload = await proxyRequest(`api/resource/${encodeURIComponent(doctype)}?${query}`);
  const data = unwrapResourceData<unknown>(payload);
  return Array.isArray(data) ? (data as { name: string }[]) : [];
}

export async function uploadAttachment(args: {
  doctype: string;
  docname: string;
  fieldname: string;
  file: File;
}): Promise<string> {
  const formData = new FormData();
  formData.set("doctype", args.doctype);
  formData.set("docname", args.docname);
  formData.set("fieldname", args.fieldname);
  formData.set("is_private", "0");
  formData.set("file", args.file, args.file.name);
  const payload = await proxyRequest("api/method/uploadfile", {
    method: "POST",
    formData,
  });
  const value = message(payload) as { file_url?: string } | undefined;
  const fileUrl = value?.file_url;
  if (!fileUrl) throw new FrappeApiError(500, "Upload succeeded but no file URL was returned.");
  return fileUrl;
}

// Local type import to avoid a circular-looking import in editors.
type FrappeMetaResponse = import("./frappe-meta").FrappeDocTypeMeta;

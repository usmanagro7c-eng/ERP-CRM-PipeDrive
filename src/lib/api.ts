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
export const LEAD_DOCTYPE = "CRM Lead";
export const LEAD_STATUS_DOCTYPE = "CRM Lead Status";
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

export async function deleteDealStatus(name: string): Promise<void> {
  await proxyRequest(`api/resource/${DEAL_STATUS_DOCTYPE}/${encodeURIComponent(name)}`, {
    method: "DELETE",
  });
}

export async function createDealStatus(values: { deal_status: string; type?: string; color?: string; position?: number }): Promise<void> {
  await proxyRequest(`api/resource/${DEAL_STATUS_DOCTYPE}`, {
    method: "POST",
    body: {
      deal_status: values.deal_status,
      type: values.type || "Open",
      color: values.color || "gray",
      position: values.position ?? 99,
    },
  });
}

/**
 * Create a CRM Territory in the Frappe backend. The doctype is
 * `autoname: field:territory_name` so the record is named after the value.
 * Only the System Manager / Sales Manager / Sales User roles are permitted
 * to create territories by the backend's own permissions.
 */
export async function createTerritory(territoryName: string): Promise<void> {
  const name = territoryName.trim();
  if (!name) throw new Error("Territory name is required.");
  await proxyRequest(`api/resource/CRM%20Territory`, {
    method: "POST",
    body: { territory_name: name },
  });
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

export interface LeadStatus {
  name: string;
  lead_status?: string;
  type?: string;
  color?: string;
  position?: number;
}

export async function getLeadStatuses(): Promise<LeadStatus[]> {
  const query = new URLSearchParams({
    fields: JSON.stringify(["name", "lead_status", "type", "color", "position"]),
    limit_page_length: "0",
    order_by: "position asc",
  });
  const payload = await proxyRequest(`api/resource/${LEAD_STATUS_DOCTYPE}?${query}`);
  const data = unwrapResourceData<unknown>(payload);
  return Array.isArray(data) ? (data as LeadStatus[]) : [];
}

export async function deleteLeadStatus(name: string): Promise<void> {
  await proxyRequest(`api/resource/${LEAD_STATUS_DOCTYPE}/${encodeURIComponent(name)}`, {
    method: "DELETE",
  });
}

export async function createLeadStatus(values: { lead_status: string; type?: string; color?: string; position?: number }): Promise<void> {
  await proxyRequest(`api/resource/${LEAD_STATUS_DOCTYPE}`, {
    method: "POST",
    body: {
      lead_status: values.lead_status,
      type: values.type || "Open",
      color: values.color || "gray",
      position: values.position ?? 99,
    },
  });
}

export async function listLeads(params: ListParams): Promise<Record<string, unknown>[]> {
  const query = buildListQuery(params, "first_name");
  const payload = await proxyRequest(`api/resource/${LEAD_DOCTYPE}?${query}`);
  const data = unwrapResourceData<unknown>(payload);
  return Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
}

export async function countLeads(
  search = "",
  filters: Array<[string, string, string]> = [],
): Promise<number> {
  const query = new URLSearchParams({ doctype: LEAD_DOCTYPE });
  const all = [...filters];
  if (search) all.push(["first_name", "like", `%${search}%`]);
  if (all.length > 0) query.set("filters", JSON.stringify(all));
  const payload = await proxyRequest(`api/method/frappe.client.get_count?${query.toString()}`);
  const value = message(payload);
  return typeof value === "number" ? value : Number(value) || 0;
}

export async function getLead(name: string): Promise<Record<string, unknown>> {
  const payload = await proxyRequest(`api/resource/${LEAD_DOCTYPE}/${encodeURIComponent(name)}`);
  const data = unwrapResourceData<unknown>(payload);
  if (!data || typeof data !== "object") {
    throw new FrappeApiError(500, "Unexpected response for lead detail.");
  }
  return data as Record<string, unknown>;
}

export async function createLead(
  values: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const payload = await proxyRequest(`api/resource/${LEAD_DOCTYPE}`, {
    method: "POST",
    body: values,
  });
  const data = unwrapResourceData<unknown>(payload);
  return (data ?? {}) as Record<string, unknown>;
}

export async function updateLead(
  name: string,
  values: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const payload = await proxyRequest(`api/resource/${LEAD_DOCTYPE}/${encodeURIComponent(name)}`, {
    method: "PUT",
    body: values,
  });
  const data = unwrapResourceData<unknown>(payload);
  return (data ?? {}) as Record<string, unknown>;
}

export async function deleteLead(name: string): Promise<void> {
  await proxyRequest(`api/resource/${LEAD_DOCTYPE}/${encodeURIComponent(name)}`, {
    method: "DELETE",
  });
}

export interface ConvertLeadToDealParams {
  leadName: string;
  dealValues: Record<string, unknown>;
}

export async function ensureOrganization(orgName: string): Promise<string> {
  const trimmed = orgName.trim();
  if (!trimmed) return "";
  try {
    const matches = await listOrganizations({
      search: trimmed,
      searchField: "organization_name",
      limit: 1,
      start: 0,
    });
    const existing = matches.find(
      (o) =>
        String(o["organization_name"] ?? "")
          .trim()
          .toLowerCase() === trimmed.toLowerCase(),
    );
    if (existing) {
      return String(existing["name"] ?? trimmed);
    }
  } catch {
    // fall through to create
  }
  try {
    const created = await createOrganization({ organization_name: trimmed });
    return String(created["name"] ?? trimmed);
  } catch {
    return trimmed;
  }
}

export async function convertLeadToDeal(
  params: ConvertLeadToDealParams,
): Promise<{ deal: Record<string, unknown>; lead: Record<string, unknown> }> {
  const dealValues = { ...params.dealValues };
  const rawOrg = dealValues["organization"];
  if (typeof rawOrg === "string" && rawOrg.trim()) {
    try {
      dealValues["organization"] = await ensureOrganization(rawOrg.trim());
    } catch {
      // Proceed with original string if auto-creation encounters issue
    }
  }

  // 1. Create the deal linked to the lead
  const deal = await createDeal({
    ...dealValues,
    lead: params.leadName,
  });

  // 1b. Copy attachments from the lead to the new deal (best effort)
  try {
    const leadAttachments = await listAttachments(LEAD_DOCTYPE, params.leadName);
    await Promise.all(
      leadAttachments.map((att) =>
        updateAttachment(att.name, DEAL_DOCTYPE, String(deal["name"] ?? "")).catch(() => {}),
      ),
    );
  } catch {
    // ignore; conversion still succeeds
  }

  // 2. Mark the lead as converted
  let updatedLead: Record<string, unknown> = {};
  try {
    updatedLead = await updateLead(params.leadName, {
      status: "Converted",
      converted: 1,
    });
  } catch (err) {
    console.warn("Could not set lead status to Converted, setting converted flag:", err);
    try {
      updatedLead = await updateLead(params.leadName, {
        converted: 1,
      });
    } catch {
      // ignore secondary error if status is locked
    }
  }

  return { deal, lead: updatedLead };
}

export async function listTasks(params: ListParams): Promise<Record<string, unknown>[]> {
  const query = buildListQuery(params, "title");
  const payload = await proxyRequest(`api/resource/${TASK_DOCTYPE}?${query}`);
  const data = unwrapResourceData<unknown>(payload);
  return Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
}

export async function countTasks(
  search = "",
  filters: Array<[string, string, string]> = [],
): Promise<number> {
  const query = new URLSearchParams({ doctype: TASK_DOCTYPE });
  const all = [...filters];
  if (search) all.push(["title", "like", `%${search}%`]);
  if (all.length > 0) query.set("filters", JSON.stringify(all));
  const payload = await proxyRequest(`api/method/frappe.client.get_count?${query.toString()}`);
  const value = message(payload);
  return typeof value === "number" ? value : Number(value) || 0;
}

export async function getTask(name: string): Promise<Record<string, unknown>> {
  const payload = await proxyRequest(`api/resource/${TASK_DOCTYPE}/${encodeURIComponent(name)}`);
  const data = unwrapResourceData<unknown>(payload);
  if (!data || typeof data !== "object") {
    throw new FrappeApiError(500, "Unexpected response for task detail.");
  }
  return data as Record<string, unknown>;
}

export async function createTask(
  values: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const payload = await proxyRequest(`api/resource/${TASK_DOCTYPE}`, {
    method: "POST",
    body: values,
  });
  const data = unwrapResourceData<unknown>(payload);
  return (data ?? {}) as Record<string, unknown>;
}

export async function updateTask(
  name: string,
  values: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const payload = await proxyRequest(`api/resource/${TASK_DOCTYPE}/${encodeURIComponent(name)}`, {
    method: "PUT",
    body: values,
  });
  const data = unwrapResourceData<unknown>(payload);
  return (data ?? {}) as Record<string, unknown>;
}

export async function deleteTask(name: string): Promise<void> {
  await proxyRequest(`api/resource/${TASK_DOCTYPE}/${encodeURIComponent(name)}`, {
    method: "DELETE",
  });
}

export interface ContactStatus {
  name: string;
  label: string;
}

export const CONTACT_STATUSES: ContactStatus[] = [
  { name: "Open", label: "Open" },
  { name: "Passive", label: "Passive" },
  { name: "Replied", label: "Replied" },
];

export async function getContactStatuses(): Promise<ContactStatus[]> {
  try {
    const meta = await getDocTypeMeta(CONTACT_DOCTYPE);
    const field = meta.fields?.find((f) => f.fieldname === "status");
    if (field && typeof field.options === "string" && field.options.trim()) {
      return field.options
        .split("\n")
        .map((opt) => opt.trim())
        .filter(Boolean)
        .map((opt) => ({ name: opt, label: opt }));
    }
  } catch {
    // fallback
  }
  return CONTACT_STATUSES;
}

export async function listContacts(params: ListParams): Promise<Record<string, unknown>[]> {
  const query = buildListQuery(params, "first_name");
  const payload = await proxyRequest(`api/resource/${CONTACT_DOCTYPE}?${query}`);
  const data = unwrapResourceData<unknown>(payload);
  return Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
}

export async function countContacts(
  search = "",
  filters: Array<[string, string, string]> = [],
): Promise<number> {
  const query = new URLSearchParams({ doctype: CONTACT_DOCTYPE });
  const all = [...filters];
  if (search) all.push(["first_name", "like", `%${search}%`]);
  if (all.length > 0) query.set("filters", JSON.stringify(all));
  const payload = await proxyRequest(`api/method/frappe.client.get_count?${query.toString()}`);
  const value = message(payload);
  return typeof value === "number" ? value : Number(value) || 0;
}

export async function getContact(name: string): Promise<Record<string, unknown>> {
  const payload = await proxyRequest(`api/resource/${CONTACT_DOCTYPE}/${encodeURIComponent(name)}`);
  const data = unwrapResourceData<unknown>(payload);
  if (!data || typeof data !== "object") {
    throw new FrappeApiError(500, "Unexpected response for contact detail.");
  }
  return data as Record<string, unknown>;
}

function normalizeContactPayload(values: Record<string, unknown>): Record<string, unknown> {
  const payload: Record<string, unknown> = { ...values };

  const email = typeof payload["email_id"] === "string" ? payload["email_id"].trim() : "";
  if (
    email &&
    (!Array.isArray(payload["email_ids"]) || (payload["email_ids"] as unknown[]).length === 0)
  ) {
    payload["email_ids"] = [{ email_id: email, is_primary: 1 }];
  }

  const phone =
    (typeof payload["mobile_no"] === "string" && payload["mobile_no"].trim()) ||
    (typeof payload["phone"] === "string" && payload["phone"].trim()) ||
    "";
  if (
    phone &&
    (!Array.isArray(payload["phone_nos"]) || (payload["phone_nos"] as unknown[]).length === 0)
  ) {
    payload["phone_nos"] = [{ phone, is_primary_mobile_no: 1 }];
  }

  const company = typeof payload["company_name"] === "string" ? payload["company_name"].trim() : "";
  if (
    company &&
    (!Array.isArray(payload["links"]) || (payload["links"] as unknown[]).length === 0)
  ) {
    payload["links"] = [{ link_doctype: ORG_DOCTYPE, link_name: company }];
  }

  return payload;
}

export async function createContact(
  values: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const payload = await proxyRequest(`api/resource/${CONTACT_DOCTYPE}`, {
    method: "POST",
    body: normalizeContactPayload(values),
  });
  const data = unwrapResourceData<unknown>(payload);
  return (data ?? {}) as Record<string, unknown>;
}

export async function updateContact(
  name: string,
  values: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const payload = await proxyRequest(
    `api/resource/${CONTACT_DOCTYPE}/${encodeURIComponent(name)}`,
    {
      method: "PUT",
      body: normalizeContactPayload(values),
    },
  );
  const data = unwrapResourceData<unknown>(payload);
  return (data ?? {}) as Record<string, unknown>;
}

export async function deleteContact(name: string): Promise<void> {
  await proxyRequest(`api/resource/${CONTACT_DOCTYPE}/${encodeURIComponent(name)}`, {
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
  fieldname?: string;
  file: File;
}): Promise<string> {
  const formData = new FormData();
  formData.set("doctype", args.doctype);
  formData.set("docname", args.docname);
  if (args.fieldname) {
    formData.set("fieldname", args.fieldname);
  }
  formData.set("is_private", "0");
  formData.set("file", args.file, args.file.name);
  const payload = await proxyRequest("api/method/upload_file", {
    method: "POST",
    formData,
  });
  const value = message(payload) as { file_url?: string } | undefined;
  const fileUrl = value?.file_url;
  if (!fileUrl) throw new FrappeApiError(500, "Upload succeeded but no file URL was returned.");
  return fileUrl;
}

export interface Item {
  name: string;
  item_code?: string;
  item_name?: string;
  item_group?: string;
  stock_uom?: string;
  standard_rate?: number;
  image?: string;
  [key: string]: unknown;
}

export interface QuotationItem {
  name?: string;
  item_code: string;
  item_name?: string;
  description?: string;
  qty: number;
  rate: number;
  amount?: number;
  discount_percentage?: number;
  discount_amount?: number;
  uom?: string;
  stock_uom?: string;
  [key: string]: unknown;
}

export interface Quotation {
  name: string;
  party_name: string;
  customer_name?: string;
  quotation_to: string;
  transaction_date: string;
  valid_till?: string;
  order_type?: string;
  company: string;
  currency: string;
  selling_price_list: string;
  status: string;
  docstatus: number;
  grand_total: number;
  net_total?: number;
  total_qty?: number;
  crm_deal?: string;
  items?: QuotationItem[];
  creation?: string;
  modified?: string;
  [key: string]: unknown;
}

export interface SalesOrderItem {
  name?: string;
  item_code: string;
  item_name?: string;
  qty: number;
  rate: number;
  amount?: number;
  delivery_date?: string;
  prevdoc_docname?: string;
  [key: string]: unknown;
}

export interface SalesOrder {
  name: string;
  customer: string;
  customer_name?: string;
  company: string;
  transaction_date: string;
  delivery_date?: string;
  order_type?: string;
  currency: string;
  selling_price_list: string;
  status: string;
  docstatus: number;
  grand_total: number;
  net_total?: number;
  total_qty?: number;
  items?: SalesOrderItem[];
  creation?: string;
  modified?: string;
  [key: string]: unknown;
}

export async function listItems(search?: string): Promise<Item[]> {
  const query = new URLSearchParams();
  query.set(
    "fields",
    JSON.stringify(["name", "item_name", "item_group", "stock_uom", "standard_rate", "image"]),
  );
  query.set("limit_page_length", "50");
  query.set("order_by", "name asc");
  if (search) {
    query.set("filters", JSON.stringify([["item_name", "like", `%${search}%`]]));
  }
  const payload = await proxyRequest(`api/resource/${ITEM_DOCTYPE}?${query.toString()}`);
  const data = unwrapResourceData<unknown>(payload);
  return Array.isArray(data) ? (data as Item[]) : [];
}

export async function listQuotations(params: ListParams): Promise<Quotation[]> {
  const query = buildListQuery(params, "party_name");
  const payload = await proxyRequest(`api/resource/${QUOTATION_DOCTYPE}?${query}`);
  const data = unwrapResourceData<unknown>(payload);
  return Array.isArray(data) ? (data as Quotation[]) : [];
}

export async function countQuotations(
  search = "",
  filters: Array<[string, string, string]> = [],
): Promise<number> {
  const query = new URLSearchParams({ doctype: QUOTATION_DOCTYPE });
  const all = [...filters];
  if (search) all.push(["party_name", "like", `%${search}%`]);
  if (all.length > 0) query.set("filters", JSON.stringify(all));
  const payload = await proxyRequest(`api/method/frappe.client.get_count?${query.toString()}`);
  const value = message(payload);
  return typeof value === "number" ? value : Number(value) || 0;
}

export async function getQuotation(name: string): Promise<Quotation> {
  const payload = await proxyRequest(
    `api/resource/${QUOTATION_DOCTYPE}/${encodeURIComponent(name)}`,
  );
  const data = unwrapResourceData<unknown>(payload);
  if (!data || typeof data !== "object") {
    throw new FrappeApiError(500, "Unexpected response for quotation detail.");
  }
  return data as Quotation;
}

export async function syncDealProductsFromQuotation(
  dealName: string,
  items: Array<Record<string, unknown>>,
): Promise<void> {
  if (!dealName || !Array.isArray(items) || items.length === 0) return;
  try {
    const total = items.reduce(
      (sum, it) => sum + (Number(it["amount"]) || Number(it["qty"] || 1) * Number(it["rate"] || 0)),
      0,
    );
    const products = items.map((it) => ({
      product_code: String(it["item_code"] || it["product_code"] || ""),
      product_name: String(it["item_name"] || it["product_name"] || it["item_code"] || ""),
      qty: Number(it["qty"]) || 1,
      rate: Number(it["rate"]) || 0,
      amount: Number(it["amount"]) || Number(it["qty"] || 1) * Number(it["rate"] || 0),
      net_amount: Number(it["amount"]) || Number(it["qty"] || 1) * Number(it["rate"] || 0),
    }));
    await updateDeal(dealName, {
      deal_value: total,
      products,
    });
  } catch (err) {
    console.warn("Could not sync deal products:", err);
  }
}

let defaultCompanyCache: { company: string; currency: string } | null = null;

export async function getDefaultCompany(): Promise<{ company: string; currency: string }> {
  if (defaultCompanyCache) return defaultCompanyCache;
  try {
    const payload = await proxyRequest(
      'api/resource/Company?fields=["name","default_currency"]&limit_page_length=1',
    );
    const data = unwrapResourceData<Array<{ name: string; default_currency?: string }>>(payload);
    if (Array.isArray(data) && data[0]?.name) {
      defaultCompanyCache = {
        company: data[0].name,
        currency: data[0].default_currency || "PKR",
      };
      return defaultCompanyCache;
    }
  } catch {
    // fallback
  }
  return { company: "AGROVISIONS", currency: "PKR" };
}

export async function createQuotation(values: Record<string, unknown>): Promise<Quotation> {
  const { company, currency } = await getDefaultCompany();
  const payload = await proxyRequest(`api/resource/${QUOTATION_DOCTYPE}`, {
    method: "POST",
    body: {
      quotation_to: "Customer",
      company: values["company"] || company,
      order_type: "Sales",
      currency: values["currency"] || currency,
      selling_price_list: "Standard Selling",
      conversion_rate: 1.0,
      plc_conversion_rate: 1.0,
      transaction_date: new Date().toISOString().split("T")[0],
      ...values,
    },
  });
  const data = unwrapResourceData<unknown>(payload);
  const quotation = (data ?? {}) as Quotation;

  if (values["crm_deal"] && Array.isArray(values["items"]) && values["items"].length > 0) {
    await syncDealProductsFromQuotation(
      String(values["crm_deal"]),
      values["items"] as Array<Record<string, unknown>>,
    );
  }

  return quotation;
}

export async function updateQuotation(
  name: string,
  values: Record<string, unknown>,
): Promise<Quotation> {
  try {
    const payload = await proxyRequest(
      `api/resource/${QUOTATION_DOCTYPE}/${encodeURIComponent(name)}`,
      {
        method: "PUT",
        body: values,
      },
    );
    const data = unwrapResourceData<unknown>(payload);
    const quotation = (data ?? {}) as Quotation;

    if (values["crm_deal"] && Array.isArray(values["items"]) && values["items"].length > 0) {
      await syncDealProductsFromQuotation(
        String(values["crm_deal"]),
        values["items"] as Array<Record<string, unknown>>,
      );
    }

    return quotation;
  } catch (err) {
    // If standard PUT fails (e.g. status change on submitted quotation), use frappe.client.set_value
    if (typeof values["status"] === "string") {
      try {
        await proxyRequest("api/method/frappe.client.set_value", {
          method: "POST",
          body: {
            doctype: QUOTATION_DOCTYPE,
            name,
            fieldname: "status",
            value: values["status"],
          },
        });
        return await getQuotation(name);
      } catch {
        // rethrow original
      }
    }
    throw err;
  }
}

export async function submitQuotation(name: string): Promise<Quotation> {
  const payload = await proxyRequest(
    `api/resource/${QUOTATION_DOCTYPE}/${encodeURIComponent(name)}`,
    {
      method: "PUT",
      body: { docstatus: 1 },
    },
  );
  const data = unwrapResourceData<unknown>(payload);
  return (data ?? {}) as Quotation;
}

export async function cancelQuotation(name: string): Promise<Quotation> {
  const payload = await proxyRequest("api/method/frappe.client.cancel", {
    method: "POST",
    body: { doctype: QUOTATION_DOCTYPE, name },
  });
  const data = unwrapResourceData<unknown>(payload);
  return (data ?? {}) as Quotation;
}

export async function deleteQuotation(name: string): Promise<void> {
  await proxyRequest(`api/resource/${QUOTATION_DOCTYPE}/${encodeURIComponent(name)}`, {
    method: "DELETE",
  });
}

export async function listSalesOrders(params: ListParams): Promise<SalesOrder[]> {
  const query = buildListQuery(params, "customer");
  const payload = await proxyRequest(`api/resource/${SALES_ORDER_DOCTYPE}?${query}`);
  const data = unwrapResourceData<unknown>(payload);
  return Array.isArray(data) ? (data as SalesOrder[]) : [];
}

export async function countSalesOrders(
  search = "",
  filters: Array<[string, string, string]> = [],
): Promise<number> {
  const query = new URLSearchParams({ doctype: SALES_ORDER_DOCTYPE });
  const all = [...filters];
  if (search) all.push(["customer", "like", `%${search}%`]);
  if (all.length > 0) query.set("filters", JSON.stringify(all));
  const payload = await proxyRequest(`api/method/frappe.client.get_count?${query.toString()}`);
  const value = message(payload);
  return typeof value === "number" ? value : Number(value) || 0;
}

export async function getSalesOrder(name: string): Promise<SalesOrder> {
  const payload = await proxyRequest(
    `api/resource/${SALES_ORDER_DOCTYPE}/${encodeURIComponent(name)}`,
  );
  const data = unwrapResourceData<unknown>(payload);
  if (!data || typeof data !== "object") {
    throw new FrappeApiError(500, "Unexpected response for sales order detail.");
  }
  return data as SalesOrder;
}

export async function createSalesOrder(values: Record<string, unknown>): Promise<SalesOrder> {
  const { company, currency } = await getDefaultCompany();
  const today = new Date().toISOString().split("T")[0];
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
  const payload = await proxyRequest(`api/resource/${SALES_ORDER_DOCTYPE}`, {
    method: "POST",
    body: {
      company: values["company"] || company,
      order_type: "Sales",
      currency: values["currency"] || currency,
      selling_price_list: "Standard Selling",
      transaction_date: today,
      delivery_date: nextWeek,
      ...values,
    },
  });
  const data = unwrapResourceData<unknown>(payload);
  return (data ?? {}) as SalesOrder;
}

export async function submitSalesOrder(name: string): Promise<SalesOrder> {
  const payload = await proxyRequest(
    `api/resource/${SALES_ORDER_DOCTYPE}/${encodeURIComponent(name)}`,
    {
      method: "PUT",
      body: { docstatus: 1 },
    },
  );
  const data = unwrapResourceData<unknown>(payload);
  return (data ?? {}) as SalesOrder;
}

export async function createSalesOrderFromQuotation(
  quotation: Quotation,
  deliveryDate?: string,
): Promise<SalesOrder> {
  const fullQuotation =
    quotation.items && quotation.items.length > 0 ? quotation : await getQuotation(quotation.name);

  const { company, currency } = await getDefaultCompany();
  const today = new Date().toISOString().split("T")[0];
  const delDate = deliveryDate || new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];

  const items = (fullQuotation.items ?? []).map((item) => ({
    item_code: item.item_code,
    item_name: item.item_name,
    qty: item.qty,
    rate: item.rate,
    amount: item.amount || item.qty * item.rate,
    delivery_date: delDate,
    prevdoc_docname: fullQuotation.name,
    prevdoc_doctype: "Quotation",
  }));

  const payload = await createSalesOrder({
    customer: fullQuotation.party_name,
    company: fullQuotation.company || company,
    transaction_date: today,
    delivery_date: delDate,
    order_type: "Sales",
    currency: fullQuotation.currency || currency,
    selling_price_list: fullQuotation.selling_price_list || "Standard Selling",
    items,
  });

  return payload;
}

// ---------------------------------------------------------------------------
// Comments API
// ---------------------------------------------------------------------------
export interface CrmComment {
  name: string;
  comment_by?: string;
  comment_email?: string;
  content: string;
  creation: string;
  reference_doctype?: string;
  reference_name?: string;
}

export async function listComments(
  referenceDoctype: string,
  referenceName: string,
): Promise<CrmComment[]> {
  try {
    const filters = JSON.stringify([
      ["reference_doctype", "=", referenceDoctype],
      ["reference_name", "=", referenceName],
      ["comment_type", "=", "Comment"],
    ]);
    const fields = JSON.stringify(["name", "comment_by", "comment_email", "content", "creation"]);
    const query = new URLSearchParams({
      filters,
      fields,
      order_by: "creation desc",
      limit: "50",
    });
    const payload = await proxyRequest(`api/resource/${COMMENT_DOCTYPE}?${query.toString()}`);
    const data = unwrapResourceData<unknown>(payload);
    return Array.isArray(data) ? (data as CrmComment[]) : [];
  } catch {
    return [];
  }
}

export async function addComment(args: {
  referenceDoctype: string;
  referenceName: string;
  content: string;
  commentBy?: string;
  commentEmail?: string;
}): Promise<CrmComment> {
  const payload = await proxyRequest("api/method/frappe.desk.form.utils.add_comment", {
    method: "POST",
    body: {
      reference_doctype: args.referenceDoctype,
      reference_name: args.referenceName,
      content: args.content,
      ...(args.commentBy ? { comment_by: args.commentBy } : {}),
      ...(args.commentEmail ? { comment_email: args.commentEmail } : {}),
    },
  });
  const data = (message(payload) ?? {}) as CrmComment;
  return data;
}

export async function deleteComment(name: string): Promise<void> {
  await proxyRequest(`api/resource/${COMMENT_DOCTYPE}/${encodeURIComponent(name)}`, {
    method: "DELETE",
  });
}

// ---------------------------------------------------------------------------
// Attachments API
// ---------------------------------------------------------------------------
export interface CrmAttachment {
  name: string;
  file_name: string;
  file_url: string;
  file_size?: number;
  creation?: string;
  attached_to_doctype?: string;
  attached_to_name?: string;
}

export async function listAttachments(
  attachedToDocType: string,
  attachedToName: string,
): Promise<CrmAttachment[]> {
  try {
    const filters = JSON.stringify([
      ["attached_to_doctype", "=", attachedToDocType],
      ["attached_to_name", "=", attachedToName],
    ]);
    const fields = JSON.stringify(["name", "file_name", "file_url", "file_size", "creation"]);
    const query = new URLSearchParams({
      filters,
      fields,
      order_by: "creation desc",
      limit: "50",
    });
    const payload = await proxyRequest(`api/resource/${FILE_DOCTYPE}?${query.toString()}`);
    const data = unwrapResourceData<unknown>(payload);
    return Array.isArray(data) ? (data as CrmAttachment[]) : [];
  } catch {
    return [];
  }
}

/** Normalize a Frappe file URL into an app-origin proxied path. */
export function proxiedFileUrl(fileUrl: string | null | undefined): string {
  if (!fileUrl) return "";
  try {
    if (/^https?:\/\//i.test(fileUrl)) {
      const u = new URL(fileUrl);
      return u.pathname + u.search;
    }
  } catch {
    // fall through
  }
  return fileUrl;
}

export async function deleteAttachment(name: string): Promise<void> {
  await proxyRequest(`api/resource/${FILE_DOCTYPE}/${encodeURIComponent(name)}`, {
    method: "DELETE",
  });
}

export async function updateAttachment(
  name: string,
  attachedToDocType: string,
  attachedToName: string,
): Promise<void> {
  await proxyRequest(`api/resource/${FILE_DOCTYPE}/${encodeURIComponent(name)}`, {
    method: "PUT",
    body: { attached_to_doctype: attachedToDocType, attached_to_name: attachedToName },
  });
}

// ---------------------------------------------------------------------------
// CRM Task API
// ---------------------------------------------------------------------------
export interface CrmTask {
  name: string;
  title: string;
  status: "Open" | "In Progress" | "Completed" | "Cancelled" | string;
  priority: "Low" | "Medium" | "High" | "Urgent" | string;
  due_date?: string | undefined;
  assigned_to?: string | undefined;
  reference_doctype?: string | undefined;
  reference_docname?: string | undefined;
  description?: string | undefined;
  creation?: string | undefined;
  modified?: string | undefined;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// CRM Note API
// ---------------------------------------------------------------------------
export interface CrmNote {
  name: string;
  title: string;
  content?: string;
  reference_doctype?: string;
  reference_docname?: string;
  is_pinned?: number | boolean;
  owner?: string;
  creation?: string;
  modified?: string;
}

export async function listNotes(
  params: {
    search?: string | undefined;
    reference_doctype?: string | undefined;
    reference_docname?: string | undefined;
  } = {},
): Promise<CrmNote[]> {
  try {
    const filters: Array<[string, string, string]> = [];
    if (params.search) {
      filters.push(["title", "like", `%${params.search}%`]);
    }
    if (params.reference_doctype && params.reference_docname) {
      filters.push(["reference_doctype", "=", params.reference_doctype]);
      filters.push(["reference_docname", "=", params.reference_docname]);
    }
    const query = new URLSearchParams({
      fields: JSON.stringify([
        "name",
        "title",
        "content",
        "reference_doctype",
        "reference_docname",
        "owner",
        "creation",
        "modified",
      ]),
      order_by: "modified desc",
      limit_page_length: "50",
    });
    if (filters.length > 0) query.set("filters", JSON.stringify(filters));

    const payload = await proxyRequest(`api/resource/${NOTE_DOCTYPE}?${query.toString()}`);
    const data = unwrapResourceData<unknown>(payload);
    return Array.isArray(data) ? (data as CrmNote[]) : [];
  } catch {
    return [];
  }
}

export async function createNote(values: Record<string, unknown>): Promise<CrmNote> {
  const payload = await proxyRequest(`api/resource/${NOTE_DOCTYPE}`, {
    method: "POST",
    body: values,
  });
  const data = unwrapResourceData<unknown>(payload);
  return (data ?? {}) as CrmNote;
}

export async function updateNote(name: string, values: Record<string, unknown>): Promise<CrmNote> {
  const payload = await proxyRequest(`api/resource/${NOTE_DOCTYPE}/${encodeURIComponent(name)}`, {
    method: "PUT",
    body: values,
  });
  const data = unwrapResourceData<unknown>(payload);
  return (data ?? {}) as CrmNote;
}

export async function deleteNote(name: string): Promise<void> {
  await proxyRequest(`api/resource/${NOTE_DOCTYPE}/${encodeURIComponent(name)}`, {
    method: "DELETE",
  });
}

// ---------------------------------------------------------------------------
// CRM Call Log API
// ---------------------------------------------------------------------------
export interface CrmCallLog {
  name: string;
  type?: "Incoming" | "Outgoing" | string | undefined;
  status?: "Initiated" | "Ringing" | "In Progress" | "Completed" | "Failed" | "Busy" | "No Answer" | "Queued" | "Canceled" | string | undefined;
  duration?: number | undefined;
  from?: string | undefined;
  to?: string | undefined;
  caller?: string | undefined;
  receiver?: string | undefined;
  note?: string | undefined;
  summary?: string | undefined;
  reference_doctype?: string | undefined;
  reference_docname?: string | undefined;
  creation?: string | undefined;
}

export async function listCallLogs(
  params: {
    search?: string | undefined;
    reference_doctype?: string | undefined;
    reference_docname?: string | undefined;
  } = {},
): Promise<CrmCallLog[]> {
  try {
    const filters: Array<[string, string, string]> = [];
    if (params.reference_doctype && params.reference_docname) {
      filters.push(["reference_doctype", "=", params.reference_doctype]);
      filters.push(["reference_docname", "=", params.reference_docname]);
    }
    const query = new URLSearchParams({
      fields: JSON.stringify([
        "name",
        "type",
        "status",
        "duration",
        "from",
        "to",
        "note",
        "reference_doctype",
        "reference_docname",
        "creation",
      ]),
      order_by: "creation desc",
      limit_page_length: "50",
    });
    if (filters.length > 0) query.set("filters", JSON.stringify(filters));

    const payload = await proxyRequest(`api/resource/${CALL_LOG_DOCTYPE}?${query.toString()}`);
    const data = unwrapResourceData<unknown>(payload);
    if (!Array.isArray(data)) return [];
    return data.map((r) => {
      const rec = r as Record<string, unknown>;
      return {
        ...rec,
        summary: String(rec["note"] || rec["summary"] || ""),
      } as unknown as CrmCallLog;
    });
  } catch {
    return [];
  }
}

export async function createCallLog(values: Partial<CrmCallLog>): Promise<CrmCallLog> {
  const to = (values.to || "").trim();
  // `from` is a Phone field (mandatory). Fall back to the called number when the
  // caller did not supply one, so creation does not fail validation.
  let from = (values.from || "").trim();
  if (!from && to) from = to;
  if (!to) {
    throw new Error("A To Number is required to log a call.");
  }
  // `caller`/`receiver` are the User links for identity.
  let caller = values.caller || "";
  if (!caller) {
    try {
      const { fetchSession } = await import("./auth-client");
      const session = await fetchSession();
      caller = session?.user ?? session?.name ?? "";
    } catch {
      caller = "";
    }
  }
  const payload = await proxyRequest(`api/resource/${CALL_LOG_DOCTYPE}`, {
    method: "POST",
    body: {
      type: values.type || "Outgoing",
      status: values.status || "Completed",
      duration: values.duration ?? 0,
      to,
      from,
      caller: caller || undefined,
      receiver: values.receiver || undefined,
      // `note` is a Link to "FCRM Note" on the backend, not free text, so the
      // summary is no longer sent as `note` (it would fail link validation).
      reference_doctype: values.reference_doctype || null,
      reference_docname: values.reference_docname || null,
    },
  });
  const data = unwrapResourceData<unknown>(payload);
  return (data ?? {}) as CrmCallLog;
}

export async function updateCallLog(
  name: string,
  values: Partial<CrmCallLog>,
): Promise<CrmCallLog> {
  const payload = await proxyRequest(
    `api/resource/${CALL_LOG_DOCTYPE}/${encodeURIComponent(name)}`,
    {
      method: "PUT",
      body: {
        ...(values.type ? { type: values.type } : {}),
        ...(values.status ? { status: values.status } : {}),
        ...(values.duration !== undefined ? { duration: values.duration } : {}),
        ...(values.to !== undefined ? { to: values.to } : {}),
        ...(values.from !== undefined ? { from: values.from } : {}),
        // `note` is a Link to "FCRM Note", not free text; summary is not persisted.
        ...(values.reference_doctype !== undefined
          ? { reference_doctype: values.reference_doctype }
          : {}),
        ...(values.reference_docname !== undefined
          ? { reference_docname: values.reference_docname }
          : {}),
      },
    },
  );
  const data = unwrapResourceData<unknown>(payload);
  return (data ?? {}) as CrmCallLog;
}

export async function deleteCallLog(name: string): Promise<void> {
  await proxyRequest(`api/resource/${CALL_LOG_DOCTYPE}/${encodeURIComponent(name)}`, {
    method: "DELETE",
  });
}

// ---------------------------------------------------------------------------
// Email / Communication API
// ---------------------------------------------------------------------------
export interface RecordEmail {
  name: string;
  subject: string;
  content: string;
  sender: string;
  sender_full_name?: string;
  recipients: string;
  communication_date: string;
  sent_or_received: "Sent" | "Received";
  delivery_status?: string;
  creation: string;
}

export async function getRecordEmails(
  referenceDoctype: string,
  referenceName: string,
): Promise<RecordEmail[]> {
  const query = new URLSearchParams();
  query.set(
    "filters",
    JSON.stringify([
      ["reference_doctype", "=", referenceDoctype],
      ["reference_name", "=", referenceName],
      ["communication_medium", "=", "Email"],
    ]),
  );
  query.set(
    "fields",
    JSON.stringify([
      "name",
      "subject",
      "content",
      "sender",
      "sender_full_name",
      "recipients",
      "communication_date",
      "sent_or_received",
      "delivery_status",
      "creation",
    ]),
  );
  query.set("order_by", "creation desc");
  query.set("limit_page_length", "100");

  const payload = await proxyRequest(`api/resource/${COMMUNICATION_DOCTYPE}?${query.toString()}`);
  const data = unwrapResourceData<unknown>(payload);
  return Array.isArray(data) ? (data as RecordEmail[]) : [];
}

export async function sendEmail(args: {
  recipients: string;
  subject: string;
  content: string;
  doctype?: string;
  docname?: string;
  now?: boolean;
}): Promise<void> {
  try {
    await proxyRequest("api/method/frappe.core.doctype.communication.email.make", {
      method: "POST",
      body: {
        recipients: args.recipients,
        subject: args.subject,
        content: args.content,
        doctype: args.doctype,
        name: args.docname,
        send_email: 1,
        now: 1,
      },
    });
  } catch (err) {
    // If outgoing email is not configured on Frappe bench, fallback to creating Communication entry
    try {
      await proxyRequest(`api/resource/${COMMUNICATION_DOCTYPE}`, {
        method: "POST",
        body: {
          communication_type: "Communication",
          communication_medium: "Email",
          recipients: args.recipients,
          subject: args.subject,
          content: args.content,
          reference_doctype: args.doctype,
          reference_name: args.docname,
          sent_or_received: "Sent",
        },
      });
    } catch {
      throw err;
    }
  }
}

export async function deleteEmail(name: string): Promise<void> {
  await proxyRequest(`api/resource/${COMMUNICATION_DOCTYPE}/${encodeURIComponent(name)}`, {
    method: "DELETE",
  });
}

export interface DashboardFilter {
  from_date: string;
  to_date: string;
  user?: string | null;
}

export interface DashboardWidgetLayout {
  x: number;
  y: number;
  w: number;
  h: number;
  i: string;
}

export interface DashboardNumberChartData {
  title: string;
  tooltip?: string;
  value: number;
  delta?: number;
  deltaSuffix?: string;
  prefix?: string;
  suffix?: string;
  negativeIsBetter?: boolean;
}

export interface DashboardAxisChartData {
  title: string;
  subtitle?: string;
  xAxis?: {
    title?: string;
    key: string;
    type?: string;
    timeGrain?: string;
  };
  yAxis?: {
    title?: string;
  };
  y2Axis?: {
    title?: string;
  };
  swapXY?: boolean;
  series?: Array<{
    name: string;
    type?: string;
    showDataPoints?: boolean;
    axis?: string;
    echartOptions?: Record<string, unknown>;
  }>;
  data: Array<Record<string, unknown>>;
}

export interface DashboardDonutChartData {
  title: string;
  subtitle?: string;
  categoryColumn: string;
  valueColumn: string;
  data: Array<Record<string, unknown>>;
}

export interface DashboardWidget {
  name: string;
  type: "number_chart" | "axis_chart" | "donut_chart" | "spacer";
  tooltip?: string;
  layout: DashboardWidgetLayout;
  data?: DashboardNumberChartData | DashboardAxisChartData | DashboardDonutChartData | null;
}

export interface CrmUser {
  name: string;
  email: string;
  full_name: string;
  first_name?: string;
  last_name?: string | null;
  user_image?: string | null;
  role?: string;
  roles?: string[];
  session_user?: boolean;
}

export async function getCrmDashboard(filter: DashboardFilter): Promise<DashboardWidget[]> {
  const payload = await proxyRequest("api/method/crm.api.dashboard.get_dashboard", {
    method: "POST",
    body: {
      from_date: filter.from_date,
      to_date: filter.to_date,
      user: filter.user ?? null,
    },
  });
  const res = message(payload);
  return Array.isArray(res) ? (res as DashboardWidget[]) : [];
}

export async function getCrmUsers(): Promise<CrmUser[]> {
  try {
    const payload = await proxyRequest("api/method/crm.api.session.get_users", {
      method: "POST",
      body: { include_all: 1 },
    });
    const res = message(payload);
    if (Array.isArray(res) && Array.isArray(res[0])) {
      return res[0] as CrmUser[];
    }
  } catch {
    // handled
  }
  return [];
}

export interface CrmActivityEvent {
  activity_type: string;
  creation: string;
  owner: string;
  data: unknown;
  is_lead?: boolean;
  other_versions?: Array<Record<string, unknown>>;
}

export async function getRecordActivities(
  doctype: string,
  name: string,
): Promise<CrmActivityEvent[]> {
  try {
    const payload = await proxyRequest("api/method/crm.api.activities.get_activities", {
      method: "POST",
      body: { doctype, name },
    });
    const res = message(payload);
    if (Array.isArray(res) && Array.isArray(res[0])) {
      return res[0] as CrmActivityEvent[];
    }
  } catch {
    // handled
  }
  return [];
}

// Local type import to avoid a circular-looking import in editors.
type FrappeMetaResponse = import("./frappe-meta").FrappeDocTypeMeta;

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
    const existing = await getOrganization(trimmed);
    return String(existing["name"] ?? trimmed);
  } catch {
    try {
      const created = await createOrganization({ organization_name: trimmed });
      return String(created["name"] ?? trimmed);
    } catch {
      return trimmed;
    }
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
  if (email && (!Array.isArray(payload["email_ids"]) || (payload["email_ids"] as unknown[]).length === 0)) {
    payload["email_ids"] = [{ email_id: email, is_primary: 1 }];
  }

  const phone =
    (typeof payload["mobile_no"] === "string" && payload["mobile_no"].trim()) ||
    (typeof payload["phone"] === "string" && payload["phone"].trim()) ||
    "";
  if (phone && (!Array.isArray(payload["phone_nos"]) || (payload["phone_nos"] as unknown[]).length === 0)) {
    payload["phone_nos"] = [{ phone, is_primary_mobile_no: 1 }];
  }

  const company = typeof payload["company_name"] === "string" ? payload["company_name"].trim() : "";
  if (company && (!Array.isArray(payload["links"]) || (payload["links"] as unknown[]).length === 0)) {
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
  const payload = await proxyRequest(`api/resource/${CONTACT_DOCTYPE}/${encodeURIComponent(name)}`, {
    method: "PUT",
    body: normalizeContactPayload(values),
  });
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

export async function createQuotation(
  values: Record<string, unknown>,
): Promise<Quotation> {
  const payload = await proxyRequest(`api/resource/${QUOTATION_DOCTYPE}`, {
    method: "POST",
    body: {
      quotation_to: "Customer",
      company: "Usman",
      order_type: "Sales",
      currency: "PKR",
      selling_price_list: "Standard Selling",
      conversion_rate: 1.0,
      plc_conversion_rate: 1.0,
      transaction_date: new Date().toISOString().split("T")[0],
      ...values,
    },
  });
  const data = unwrapResourceData<unknown>(payload);
  return (data ?? {}) as Quotation;
}

export async function updateQuotation(
  name: string,
  values: Record<string, unknown>,
): Promise<Quotation> {
  const payload = await proxyRequest(
    `api/resource/${QUOTATION_DOCTYPE}/${encodeURIComponent(name)}`,
    {
      method: "PUT",
      body: values,
    },
  );
  const data = unwrapResourceData<unknown>(payload);
  return (data ?? {}) as Quotation;
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

export async function deleteQuotation(name: string): Promise<void> {
  await proxyRequest(
    `api/resource/${QUOTATION_DOCTYPE}/${encodeURIComponent(name)}`,
    {
      method: "DELETE",
    },
  );
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

export async function createSalesOrder(
  values: Record<string, unknown>,
): Promise<SalesOrder> {
  const today = new Date().toISOString().split("T")[0];
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
  const payload = await proxyRequest(`api/resource/${SALES_ORDER_DOCTYPE}`, {
    method: "POST",
    body: {
      company: "Usman",
      order_type: "Sales",
      currency: "PKR",
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
    quotation.items && quotation.items.length > 0
      ? quotation
      : await getQuotation(quotation.name);

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
  }));

  const payload = await createSalesOrder({
    customer: fullQuotation.party_name,
    company: fullQuotation.company || "Usman",
    transaction_date: today,
    delivery_date: delDate,
    order_type: "Sales",
    currency: fullQuotation.currency || "PKR",
    selling_price_list: fullQuotation.selling_price_list || "Standard Selling",
    items,
  });

  return payload;
}

// Local type import to avoid a circular-looking import in editors.
type FrappeMetaResponse = import("./frappe-meta").FrappeDocTypeMeta;

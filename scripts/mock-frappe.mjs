// Mock Frappe/ERPNext server for local UI testing. No real servers are contacted.
import http from "node:http";
import { URL } from "node:url";

const PORT = Number(process.env.MOCK_PORT || 8099);
const HOST = process.env.MOCK_HOST || "127.0.0.1";

const now = () => new Date().toISOString().replace("T", " ").slice(0, 19);
const daysAgo = (n) => {
  const d = new Date(Date.now() - n * 86400000);
  return d.toISOString().slice(0, 10);
};

const ORGS = 40,
  LEADS = 60,
  DEALS = 50;
const orgs = [],
  leads = [],
  deals = [],
  contacts = [],
  tasks = [],
  notes = [],
  calls = [],
  quotations = [],
  salesOrders = [],
  items = [],
  comments = [],
  files = [],
  communications = [];

const orgName = (i) =>
  i % 5 === 0
    ? `شرکت نمونه ${i}`
    : i % 7 === 0
      ? `شركة تجريبية ${i}`
      : `Organization ${String(i).padStart(2, "0")}${i === 1 ? " Very Long Organization Name That Stresses Layout" : ""}`.trim();

for (let i = 1; i <= ORGS; i++)
  orgs.push({
    name: `ORG-${String(i).padStart(3, "0")}`,
    organization_name: orgName(i),
    status: i % 3 === 0 ? "Active" : "Inactive",
    territory: i % 2 === 0 ? "North" : "South",
    industry: i % 4 === 0 ? "Tech" : "Manufacturing",
    website: i % 2 === 0 ? "https://example.com" : "",
    mobile_no: `+92 300 ${String(i).padStart(7, "0")}`,
    email_id: `org${i}@example.com`,
    creation: now(),
    modified: now(),
  });

const firstNames = ["Ahmed", "Sara", "John", "Fatima", "Ali", "Zara", "Hassan", "Noor"];
const lastNames = ["Khan", "Ali", "Smith", "Ahmed", "Malik", "Hussain", "Sheikh"];
for (let i = 1; i <= LEADS; i++) {
  const fn = firstNames[i % firstNames.length],
    ln = lastNames[i % lastNames.length];
  leads.push({
    name: `LEAD-${String(i).padStart(3, "0")}`,
    first_name: fn,
    last_name: ln,
    // "First Last" — the field the CRM lead list searches on.
    lead_name: `${fn} ${ln}`,
    email_id: `lead${i}@example.com`,
    mobile_no: `+92 321 ${String(i).padStart(7, "0")}`,
    organization_name: orgs[i % orgs.length].organization_name,
    source: i % 3 === 0 ? "Website" : "Referral",
    status: i % 5 === 0 ? "Converted" : i % 4 === 0 ? "Lost" : "Open",
    converted: i % 5 === 0 ? 1 : 0,
    creation: now(),
    modified: now(),
  });
}

const dealStatuses = [
  {
    name: "Open",
    deal_status: "Open",
    type: "Open",
    probability: 10,
    color: "#3b82f6",
    position: 1,
  },
  {
    name: "Qualified",
    deal_status: "Qualified",
    type: "Open",
    probability: 40,
    color: "#8b5cf6",
    position: 2,
  },
  {
    name: "Proposal",
    deal_status: "Proposal",
    type: "Open",
    probability: 60,
    color: "#f59e0b",
    position: 3,
  },
  { name: "Won", deal_status: "Won", type: "Won", probability: 100, color: "#10b981", position: 4 },
  {
    name: "Lost",
    deal_status: "Lost",
    type: "Lost",
    probability: 0,
    color: "#ef4444",
    position: 5,
  },
];
const leadStatuses = [
  { name: "Open", lead_status: "Open", type: "Open", color: "#3b82f6", position: 1 },
  { name: "Contacted", lead_status: "Contacted", type: "Open", color: "#8b5cf6", position: 2 },
  { name: "Qualified", lead_status: "Qualified", type: "Open", color: "#f59e0b", position: 3 },
  { name: "Lost", lead_status: "Lost", type: "Lost", color: "#ef4444", position: 4 },
  { name: "Converted", lead_status: "Converted", type: "Converted", color: "#10b981", position: 5 },
];

for (let i = 1; i <= DEALS; i++) {
  const st = dealStatuses[i % dealStatuses.length];
  deals.push({
    name: `DEAL-${String(i).padStart(3, "0")}`,
    deal_title:
      i === 1
        ? "Very Long Deal Title That Should Not Break The Card Layout Container"
        : `Deal ${i}`,
    // Frappe stores a link as the target document's name, and in Frappe CRM
    // the organisation document name *is* its organization_name.
    organization: orgs[i % orgs.length].organization_name,
    organization_name: orgs[i % orgs.length].organization_name,
    deal_value: Math.round(((i * 12345.67) % 1000000) * 100) / 100,
    currency: "PKR",
    status: st.name,
    probability: st.probability,
    owner: "admin@example.com",
    expected_close_date: daysAgo(i % 2 === 0 ? -i * 3 : i * 2),
    creation: now(),
    modified: now(),
  });
}

for (let i = 1; i <= 30; i++)
  contacts.push({
    name: `CONT-${String(i).padStart(3, "0")}`,
    first_name: firstNames[i % firstNames.length],
    last_name: lastNames[i % lastNames.length],
    email_id: `contact${i}@example.com`,
    mobile_no: `+92 333 ${String(i).padStart(7, "0")}`,
    company_name: orgs[i % orgs.length].organization_name,
    status: i % 3 === 0 ? "Replied" : "Open",
    creation: now(),
    modified: now(),
  });

for (let i = 1; i <= 25; i++)
  tasks.push({
    name: `TASK-${String(i).padStart(3, "0")}`,
    title: `Task ${i}${i === 2 ? " with a very long title that stresses layout" : ""}`,
    status: i % 4 === 0 ? "Completed" : "Open",
    priority: i % 3 === 0 ? "High" : "Medium",
    due_date: daysAgo(i % 2 === 0 ? -i : i),
    assigned_to: "admin@example.com",
    reference_doctype: "CRM Deal",
    reference_docname: deals[i % deals.length].name,
    description: "Sample task",
    creation: now(),
    modified: now(),
  });

for (let i = 1; i <= 20; i++)
  notes.push({
    name: `NOTE-${String(i).padStart(3, "0")}`,
    title: `Note ${i}`,
    content: `Content for note ${i}. Some long text to test wrapping and layout stability in cards and detail views.`,
    reference_doctype: "CRM Deal",
    reference_docname: deals[i % deals.length].name,
    is_pinned: i % 5 === 0 ? 1 : 0,
    owner: "admin@example.com",
    creation: now(),
    modified: now(),
  });

for (let i = 1; i <= 15; i++)
  calls.push({
    name: `CALL-${String(i).padStart(3, "0")}`,
    type: i % 2 === 0 ? "Inbound" : "Outbound",
    status: "Connected",
    duration: i * 30,
    from: "+92 300 0000000",
    to: "+92 321 1111111",
    note: `Call note ${i}`,
    reference_doctype: "CRM Deal",
    reference_docname: deals[i % deals.length].name,
    creation: now(),
  });

for (let i = 1; i <= 10; i++)
  items.push({
    name: `ITEM-${String(i).padStart(3, "0")}`,
    item_code: `ITEM-${i}`,
    item_name: `Item ${i}${i === 1 ? " with a very long item name for layout stress" : ""}`,
    item_group: "Products",
    stock_uom: "Nos",
    standard_rate: i * 100 + 0.5,
  });

for (let i = 1; i <= 12; i++)
  quotations.push({
    name: `QUO-${String(i).padStart(3, "0")}`,
    party_name: orgs[i % orgs.length].organization_name,
    customer_name: orgs[i % orgs.length].organization_name,
    quotation_to: "Customer",
    transaction_date: daysAgo(i),
    valid_till: daysAgo(-14),
    order_type: "Sales",
    company: "AGROVISIONS",
    currency: "PKR",
    selling_price_list: "Standard Selling",
    status: i % 3 === 0 ? "Open" : "Draft",
    docstatus: 0,
    grand_total: i * 5000 + 99.99,
    net_total: i * 4500,
    total_qty: i,
    crm_deal: deals[i % deals.length].name,
    items: [
      {
        item_code: items[0].item_code,
        item_name: items[0].item_name,
        qty: i,
        rate: items[0].standard_rate,
        amount: i * items[0].standard_rate,
      },
    ],
    creation: now(),
    modified: now(),
  });

files.push({
  name: "FILE-001",
  file_name: "sample.png",
  file_url: "/files/sample.png",
  file_size: 1234,
  attached_to_doctype: "CRM Lead",
  attached_to_name: leads[0].name,
  creation: now(),
});
files.push({
  name: "FILE-002",
  file_name: "sample2.png",
  file_url: "/files/sample2.png",
  file_size: 5678,
  attached_to_doctype: "CRM Deal",
  attached_to_name: deals[0].name,
  creation: now(),
});

for (let i = 1; i <= 8; i++)
  salesOrders.push({
    name: `SO-${String(i).padStart(3, "0")}`,
    customer: orgs[i % orgs.length].organization_name,
    customer_name: orgs[i % orgs.length].organization_name,
    company: "AGROVISIONS",
    transaction_date: daysAgo(i),
    delivery_date: daysAgo(-7),
    order_type: "Sales",
    currency: "PKR",
    selling_price_list: "Standard Selling",
    status: "Draft",
    docstatus: 0,
    grand_total: i * 7000 + 50,
    net_total: i * 6500,
    total_qty: i,
    items: [
      {
        item_code: items[0].item_code,
        item_name: items[0].item_name,
        qty: i,
        rate: items[0].standard_rate,
        amount: i * items[0].standard_rate,
        delivery_date: daysAgo(-7),
      },
    ],
    creation: now(),
    modified: now(),
  });

function send(res, status, body, headers = {}) {
  const data = typeof body === "string" ? body : JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    ...headers,
  });
  res.end(data);
}
function notFound(res) {
  send(res, 404, { message: "Not found" });
}
function parseBody(req) {
  return new Promise((resolve) => {
    let chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) return resolve(null);
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve(raw);
      }
    });
  });
}
function matchDoctype(pathname) {
  const prefix = "/api/resource/";
  if (!pathname.startsWith(prefix)) return null;
  const rest = decodeURIComponent(pathname.slice(prefix.length));
  const idx = rest.indexOf("/");
  if (idx === -1) return { doctype: rest, name: null };
  return { doctype: rest.slice(0, idx), name: rest.slice(idx + 1) };
}
const linkTargets = {
  "CRM Territory": ["North", "South", "East", "West"],
  "CRM Industry": ["Tech", "Manufacturing", "Finance", "Retail", "Healthcare"],
  "CRM Lead Source": ["Website", "Referral", "Cold Call", "Event"],
  Currency: ["PKR", "USD", "EUR"],
  Country: ["Pakistan", "United Arab Emirates", "United Kingdom"],
  Salutation: ["Mr", "Ms", "Dr"],
  Gender: ["Male", "Female", "Other"],
};
const linkStores = Object.fromEntries(
  Object.entries(linkTargets).map(([doctype, names]) => [doctype, names.map((name) => ({ name }))]),
);

function storeFor(doctype) {
  const map = {
    "CRM Organization": orgs,
    "CRM Lead": leads,
    "CRM Deal": deals,
    "CRM Deal Status": dealStatuses,
    "CRM Lead Status": leadStatuses,
    Contact: contacts,
    "CRM Task": tasks,
    Note: notes,
    "CRM Call Log": calls,
    Quotation: quotations,
    "Sales Order": salesOrders,
    Item: items,
    Comment: comments,
    File: files,
    Communication: communications,
    Company: [{ name: "AGROVISIONS", default_currency: "PKR" }],
  };
  return map[doctype] || linkStores[doctype] || null;
}
function filterRows(rows, filters) {
  if (!filters || !filters.length) return rows;
  return rows.filter((r) =>
    filters.every((f) => {
      const [field, op, val] = f;
      const v = r[field];
      if (op === "=") return String(v) === String(val);
      if (op === "like") {
        const pattern = String(val).replace(/%/g, "");
        return String(v ?? "")
          .toLowerCase()
          .includes(pattern.toLowerCase());
      }
      if (op === "in") return (Array.isArray(val) ? val : [val]).includes(v);
      return true;
    }),
  );
}

async function handleResource(req, res, url) {
  const m = matchDoctype(url.pathname);
  if (!m) return notFound(res);
  const store = storeFor(m.doctype);
  if (!store) return notFound(res);
  if (req.method === "GET") {
    if (m.name) {
      const row = store.find((r) => r.name === m.name);
      if (!row) return notFound(res);
      return send(res, 200, { data: row });
    }
    const limit = Number(
      url.searchParams.get("limit_page_length") || url.searchParams.get("limit") || 20,
    );
    const start = Number(url.searchParams.get("limit_start") || 0);
    const orderBy = url.searchParams.get("order_by") || "modified desc";
    let filters = [];
    const f = url.searchParams.get("filters");
    if (f) {
      try {
        filters = JSON.parse(f);
      } catch {}
    }
    let rows = filterRows([...store], filters);
    const [sortField, sortDir] = orderBy.split(/\s+/);
    rows.sort((a, b) => {
      const av = a[sortField],
        bv = b[sortField];
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    const page = rows.slice(start, start + (limit > 0 ? limit : rows.length));
    return send(res, 200, { data: page });
  }
  if (req.method === "POST") {
    const body = await parseBody(req);
    const obj = body && typeof body === "object" ? body : {};
    const name = obj.name || `${m.doctype.split(" ")[0].toUpperCase().slice(0, 3)}-${Date.now()}`;
    const row = { name, creation: now(), modified: now(), ...obj };
    store.push(row);
    return send(res, 200, { data: row });
  }
  if (req.method === "PUT") {
    const body = await parseBody(req);
    const idx = store.findIndex((r) => r.name === m.name);
    if (idx === -1) return notFound(res);
    const obj = body && typeof body === "object" ? body : {};
    store[idx] = { ...store[idx], ...obj, modified: now() };
    if (obj.docstatus === 1) store[idx].status = store[idx].status || "Submitted";
    return send(res, 200, { data: store[idx] });
  }
  if (req.method === "DELETE") {
    const idx = store.findIndex((r) => r.name === m.name);
    if (idx === -1) return notFound(res);
    store.splice(idx, 1);
    return send(res, 200, { message: "ok" });
  }
  return notFound(res);
}

async function handleMethod(req, res, url) {
  const method = decodeURIComponent(url.pathname.replace("/api/method/", ""));
  if (method === "login") {
    const body = await parseBody(req);
    const usr = body?.usr || "admin@example.com";
    const pwd = body?.pwd || "admin";
    if (!usr || !pwd) return send(res, 401, { message: "Invalid" });
    res.writeHead(200, {
      "Content-Type": "application/json",
      "Set-Cookie": "sid=mocksid; Path=/; HttpOnly",
    });
    return res.end(JSON.stringify({ full_name: "Admin User" }));
  }
  if (method === "frappe.auth.get_logged_user")
    return send(res, 200, { message: "admin@example.com" });
  if (method === "frappe.client.get_count") {
    const doctype = url.searchParams.get("doctype");
    const store = storeFor(doctype);
    let rows = store ? [...store] : [];
    const f = url.searchParams.get("filters");
    if (f) {
      try {
        rows = filterRows(rows, JSON.parse(f));
      } catch {}
    }
    return send(res, 200, { message: rows.length });
  }
  if (method === "frappe.desk.form.load.getdoctype") {
    const doctype = url.searchParams.get("doctype");
    const fields = [{ fieldname: "name", fieldtype: "Data", label: "Name" }];
    if (doctype === "Contact")
      fields.push({
        fieldname: "status",
        fieldtype: "Select",
        label: "Status",
        options: "Open\nPassive\nReplied",
      });
    return send(res, 200, {
      docs: [
        { name: doctype, fields, title_field: doctype === "CRM Lead" ? "first_name" : "name" },
      ],
    });
  }
  if (method === "frappe.desk.form.utils.add_comment") {
    const body = await parseBody(req);
    const c = {
      name: `CM-${Date.now()}`,
      comment_by: body?.comment_by || "Admin",
      comment_email: body?.comment_email || "admin@example.com",
      content: body?.content || "",
      creation: now(),
      reference_doctype: body?.reference_doctype,
      reference_name: body?.reference_name,
    };
    comments.push(c);
    return send(res, 200, { message: c });
  }
  if (method === "frappe.client.set_value") {
    const body = await parseBody(req);
    const store = storeFor(body?.doctype);
    if (store) {
      const idx = store.findIndex((r) => r.name === body?.name);
      if (idx !== -1) {
        store[idx][body.fieldname] = body.value;
        store[idx].modified = now();
      }
    }
    return send(res, 200, { message: "ok" });
  }
  if (method === "frappe.client.cancel") {
    const body = await parseBody(req);
    const store = storeFor(body?.doctype);
    if (store) {
      const idx = store.findIndex((r) => r.name === body?.name);
      if (idx !== -1) {
        store[idx].docstatus = 2;
        store[idx].status = "Cancelled";
      }
    }
    const row = store ? store.find((r) => r.name === body?.name) : {};
    return send(res, 200, { data: row || {} });
  }
  if (method === "upload_file") {
    await parseBody(req);
    return send(res, 200, { message: { file_url: "/files/mock-upload.png" } });
  }
  if (method === "crm.api.dashboard.get_dashboard") {
    await parseBody(req);
    const widgets = [
      {
        name: "w1",
        type: "number_chart",
        tooltip: "Leads",
        layout: { x: 0, y: 0, w: 3, h: 2, i: "w1" },
        data: { title: "Leads", value: leads.length },
      },
      {
        name: "w2",
        type: "number_chart",
        tooltip: "Deals",
        layout: { x: 3, y: 0, w: 3, h: 2, i: "w2" },
        data: { title: "Deals", value: deals.length },
      },
      {
        name: "w3",
        type: "number_chart",
        tooltip: "Orgs",
        layout: { x: 6, y: 0, w: 3, h: 2, i: "w3" },
        data: { title: "Organizations", value: orgs.length },
      },
    ];
    return send(res, 200, { message: widgets });
  }
  if (method === "crm.api.session.get_users")
    return send(res, 200, {
      message: [
        [
          {
            name: "admin@example.com",
            email: "admin@example.com",
            full_name: "Admin User",
            role: "Administrator",
          },
        ],
      ],
    });
  if (method === "crm.api.activities.get_activities") {
    await parseBody(req);
    return send(res, 200, { message: [[]] });
  }
  if (method === "frappe.core.doctype.communication.email.make") {
    const body = await parseBody(req);
    const c = {
      name: `COMM-${Date.now()}`,
      subject: body?.subject,
      content: body?.content,
      sender: "admin@example.com",
      recipients: body?.recipients,
      communication_date: now(),
      sent_or_received: "Sent",
      creation: now(),
    };
    communications.push(c);
    return send(res, 200, { message: "ok" });
  }
  return send(res, 200, { message: null });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${HOST}:${PORT}`);
  if (url.pathname.startsWith("/api/resource/")) {
    handleResource(req, res, url).catch((e) => {
      console.error(e);
      send(res, 500, { message: String(e) });
    });
    return;
  }
  if (url.pathname.startsWith("/api/method/")) {
    handleMethod(req, res, url).catch((e) => {
      console.error(e);
      send(res, 500, { message: String(e) });
    });
    return;
  }
  if (url.pathname === "/") return send(res, 200, { status: "mock-frappe ok" });
  if (url.pathname.startsWith("/files/") || url.pathname.startsWith("/private/files/")) {
    res.writeHead(200, { "Content-Type": "image/png", "Cache-Control": "public, max-age=3600" });
    return res.end(
      Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        "base64",
      ),
    );
  }
  notFound(res);
});

server.listen(PORT, HOST, () => {
  console.log(`Mock Frappe server listening on http://${HOST}:${PORT}`);
});

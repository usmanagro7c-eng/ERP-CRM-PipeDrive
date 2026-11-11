import { describe, expect, it } from "vitest";

import {
  BLOCKED_LINK_TARGETS,
  DEFAULT_LINK_TARGETS,
  ERPNEXT_DOCTYPES,
  MAIN_DOCTYPES,
  MAX_MAIN_ROWS,
  MAX_REFERENCE_ROWS,
  UPLOAD_DOCTYPES,
  bodyContradictsDocType,
  buildLinkQuery,
  capPageLength,
  classifyRequest,
  doctypeFromResourcePath,
  fileExtension,
  hasUnsafeSegments,
  isAllowedUploadType,
  isErpNextRequest,
  isPlausibleDocName,
  linkTargetsFromMeta,
  parseFilters,
  referenceScopeFor,
  validateMethodBody,
  validateUploadForm,
} from "@/lib/frappe-proxy";

const none = new URLSearchParams();
const orgParams = new URLSearchParams({ doctype: "CRM Organization" });

describe("classifyRequest", () => {
  it("allows organization and deal list, detail and writes", () => {
    expect(classifyRequest("GET", "api/resource/CRM Organization", none)?.kind).toBe("org-read");
    expect(classifyRequest("GET", "api/resource/CRM Organization/Acme", none)?.kind).toBe(
      "org-read",
    );
    expect(classifyRequest("POST", "api/resource/CRM Organization", none)?.kind).toBe("org-write");
    expect(classifyRequest("PUT", "api/resource/CRM Organization/Acme", none)?.kind).toBe(
      "org-write",
    );
    expect(classifyRequest("DELETE", "api/resource/CRM Organization/Acme", none)?.kind).toBe(
      "org-write",
    );
    // CRM Deal
    expect(classifyRequest("GET", "api/resource/CRM Deal", none)?.kind).toBe("org-read");
    expect(classifyRequest("GET", "api/resource/CRM Deal/CRM-DEAL-001", none)?.kind).toBe(
      "org-read",
    );
    expect(classifyRequest("POST", "api/resource/CRM Deal", none)?.kind).toBe("org-write");
    expect(classifyRequest("PUT", "api/resource/CRM Deal/CRM-DEAL-001", none)?.kind).toBe(
      "org-write",
    );
    expect(classifyRequest("DELETE", "api/resource/CRM Deal/CRM-DEAL-001", none)?.kind).toBe(
      "org-write",
    );
    // CRM Lead
    expect(classifyRequest("GET", "api/resource/CRM Lead", none)?.kind).toBe("org-read");
    expect(classifyRequest("GET", "api/resource/CRM Lead/CRM-LEAD-001", none)?.kind).toBe(
      "org-read",
    );
    expect(classifyRequest("POST", "api/resource/CRM Lead", none)?.kind).toBe("org-write");
    expect(classifyRequest("PUT", "api/resource/CRM Lead/CRM-LEAD-001", none)?.kind).toBe(
      "org-write",
    );
    expect(classifyRequest("DELETE", "api/resource/CRM Lead/CRM-LEAD-001", none)?.kind).toBe(
      "org-write",
    );
    // CRM Task
    expect(classifyRequest("GET", "api/resource/CRM Task", none)?.kind).toBe("org-read");
    expect(classifyRequest("GET", "api/resource/CRM Task/1", none)?.kind).toBe("org-read");
    expect(classifyRequest("POST", "api/resource/CRM Task", none)?.kind).toBe("org-write");
    expect(classifyRequest("PUT", "api/resource/CRM Task/1", none)?.kind).toBe("org-write");
    expect(classifyRequest("DELETE", "api/resource/CRM Task/1", none)?.kind).toBe("org-write");
    // Contact
    expect(classifyRequest("GET", "api/resource/Contact", none)?.kind).toBe("org-read");
    expect(classifyRequest("GET", "api/resource/Contact/Usman", none)?.kind).toBe("org-read");
    expect(classifyRequest("POST", "api/resource/Contact", none)?.kind).toBe("org-write");
    expect(classifyRequest("PUT", "api/resource/Contact/Usman", none)?.kind).toBe("org-write");
    expect(classifyRequest("DELETE", "api/resource/Contact/Usman", none)?.kind).toBe("org-write");
    // Quotation
    expect(classifyRequest("GET", "api/resource/Quotation", none)?.kind).toBe("org-read");
    expect(classifyRequest("GET", "api/resource/Quotation/SAL-QTN-2026-00001", none)?.kind).toBe(
      "org-read",
    );
    expect(classifyRequest("POST", "api/resource/Quotation", none)?.kind).toBe("org-write");
    expect(classifyRequest("PUT", "api/resource/Quotation/SAL-QTN-2026-00001", none)?.kind).toBe(
      "org-write",
    );
    expect(classifyRequest("DELETE", "api/resource/Quotation/SAL-QTN-2026-00001", none)?.kind).toBe(
      "org-write",
    );
    // Sales Order
    expect(classifyRequest("GET", "api/resource/Sales Order", none)?.kind).toBe("org-read");
    expect(classifyRequest("GET", "api/resource/Sales Order/SAL-ORD-2026-00001", none)?.kind).toBe(
      "org-read",
    );
    expect(classifyRequest("POST", "api/resource/Sales Order", none)?.kind).toBe("org-write");
    expect(classifyRequest("PUT", "api/resource/Sales Order/SAL-ORD-2026-00001", none)?.kind).toBe(
      "org-write",
    );
    expect(
      classifyRequest("DELETE", "api/resource/Sales Order/SAL-ORD-2026-00001", none)?.kind,
    ).toBe("org-write");
    // Item
    expect(classifyRequest("GET", "api/resource/Item", none)?.kind).toBe("org-read");
    expect(classifyRequest("GET", "api/resource/Item/SKU001", none)?.kind).toBe("org-read");
    expect(classifyRequest("POST", "api/resource/Item", none)?.kind).toBe("org-write");
  });

  it("only allows metadata and count for the allowed CRM doctypes", () => {
    expect(
      classifyRequest("GET", "api/method/frappe.desk.form.load.getdoctype", orgParams)?.kind,
    ).toBe("meta");
    expect(classifyRequest("GET", "api/method/frappe.client.get_count", orgParams)?.kind).toBe(
      "count",
    );
    const dealParams = new URLSearchParams({ doctype: "CRM Deal" });
    expect(
      classifyRequest("GET", "api/method/frappe.desk.form.load.getdoctype", dealParams)?.kind,
    ).toBe("meta");
    expect(classifyRequest("GET", "api/method/frappe.client.get_count", dealParams)?.kind).toBe(
      "count",
    );
    const leadParams = new URLSearchParams({ doctype: "CRM Lead" });
    expect(
      classifyRequest("GET", "api/method/frappe.desk.form.load.getdoctype", leadParams)?.kind,
    ).toBe("meta");
    expect(classifyRequest("GET", "api/method/frappe.client.get_count", leadParams)?.kind).toBe(
      "count",
    );
    const taskParams = new URLSearchParams({ doctype: "CRM Task" });
    expect(
      classifyRequest("GET", "api/method/frappe.desk.form.load.getdoctype", taskParams)?.kind,
    ).toBe("meta");
    expect(classifyRequest("GET", "api/method/frappe.client.get_count", taskParams)?.kind).toBe(
      "count",
    );
    const contactParams = new URLSearchParams({ doctype: "Contact" });
    expect(
      classifyRequest("GET", "api/method/frappe.desk.form.load.getdoctype", contactParams)?.kind,
    ).toBe("meta");
    expect(classifyRequest("GET", "api/method/frappe.client.get_count", contactParams)?.kind).toBe(
      "count",
    );
    const quotationParams = new URLSearchParams({ doctype: "Quotation" });
    expect(
      classifyRequest("GET", "api/method/frappe.desk.form.load.getdoctype", quotationParams)?.kind,
    ).toBe("meta");
    expect(
      classifyRequest("GET", "api/method/frappe.client.get_count", quotationParams)?.kind,
    ).toBe("count");
    const salesOrderParams = new URLSearchParams({ doctype: "Sales Order" });
    expect(
      classifyRequest("GET", "api/method/frappe.desk.form.load.getdoctype", salesOrderParams)?.kind,
    ).toBe("meta");
    expect(
      classifyRequest("GET", "api/method/frappe.client.get_count", salesOrderParams)?.kind,
    ).toBe("count");
    const itemParams = new URLSearchParams({ doctype: "Item" });
    expect(
      classifyRequest("GET", "api/method/frappe.desk.form.load.getdoctype", itemParams)?.kind,
    ).toBe("meta");
    expect(classifyRequest("GET", "api/method/frappe.client.get_count", itemParams)?.kind).toBe(
      "count",
    );
    const user = new URLSearchParams({ doctype: "User" });
    expect(classifyRequest("GET", "api/method/frappe.desk.form.load.getdoctype", user)).toBeNull();
    expect(classifyRequest("GET", "api/method/frappe.client.get_count", user)).toBeNull();
  });

  it("treats other doctype lists as link lookups (checked later against metadata)", () => {
    expect(classifyRequest("GET", "api/resource/CRM Industry", none)).toEqual({
      kind: "link-read",
      doctype: "CRM Industry",
    });
  });

  it("blocks reading single documents of other doctypes and writing to them", () => {
    expect(classifyRequest("GET", "api/resource/User/admin@example.com", none)).toBeNull();
    expect(classifyRequest("POST", "api/resource/User", none)).toBeNull();
    expect(classifyRequest("PUT", "api/resource/Customer/Acme", none)).toBeNull();
    expect(classifyRequest("DELETE", "api/resource/Customer/Acme", none)).toBeNull();
    expect(classifyRequest("PUT", "api/resource/CRM Organization", none)).toBeNull();
  });

  it("blocks arbitrary methods and unknown verbs", () => {
    expect(classifyRequest("GET", "api/method/frappe.client.get_list", orgParams)).toBeNull();
    expect(classifyRequest("POST", "api/method/frappe.client.insert", none)).toBeNull();
    expect(classifyRequest("PATCH", "api/resource/CRM Organization/Acme", none)).toBeNull();
  });

  it("allows uploads and whitelisted methods (further validated by the proxy)", () => {
    expect(classifyRequest("POST", "api/method/upload_file", none)?.kind).toBe("upload");
    expect(classifyRequest("POST", "api/method/uploadfile", none)?.kind).toBe("upload");
    expect(
      classifyRequest("POST", "api/method/frappe.desk.form.utils.add_comment", none)?.kind,
    ).toBe("org-write");
    expect(classifyRequest("POST", "api/method/crm.api.dashboard.get_dashboard", none)?.kind).toBe(
      "org-write",
    );
    expect(classifyRequest("POST", "api/method/crm.api.session.get_users", none)?.kind).toBe(
      "org-write",
    );
    expect(
      classifyRequest("POST", "api/method/crm.api.activities.get_activities", none)?.kind,
    ).toBe("org-write");
  });

  it("rejects path traversal", () => {
    expect(
      classifyRequest("GET", "api/resource/../method/frappe.client.get_list", none),
    ).toBeNull();
    expect(classifyRequest("GET", "api/resource/CRM Organization/../../User", none)).toBeNull();
    expect(hasUnsafeSegments("api/resource/CRM Organization/..")).toBe(true);
    expect(hasUnsafeSegments("api\\resource")).toBe(true);
    expect(hasUnsafeSegments("api/resource/CRM Organization/Acme")).toBe(false);
  });
});

describe("link targets", () => {
  it("collects Link doctypes from metadata", () => {
    const targets = linkTargetsFromMeta({
      fields: [
        { fieldtype: "Data", fieldname: "organization_name" },
        { fieldtype: "Link", fieldname: "industry", options: "CRM Industry" },
        { fieldtype: "Link", fieldname: "territory", options: "CRM Territory" },
        { fieldtype: "Select", fieldname: "x", options: "A\nB" },
      ],
    });
    expect([...targets].sort()).toEqual(["CRM Industry", "CRM Territory"]);
    expect(linkTargetsFromMeta(null).size).toBe(0);
  });

  it("forces name-only, capped queries", () => {
    const query = new URLSearchParams(
      buildLinkQuery(new URLSearchParams({ fields: '["*"]', limit_page_length: "999999" })),
    );
    expect(query.get("fields")).toBe('["name"]');
    expect(query.get("limit_page_length")).toBe("1000");
    expect(query.get("filters")).toBeNull();
  });
});

describe("isErpNextRequest", () => {
  it("routes Quotation, Sales Order, Item and Customer to ERPNext", () => {
    expect(isErpNextRequest("api/resource/Quotation")).toBe(true);
    expect(isErpNextRequest("api/resource/Quotation/SAL-QTN-2026-00001")).toBe(true);
    expect(isErpNextRequest("api/resource/Sales Order")).toBe(true);
    expect(isErpNextRequest("api/resource/Item")).toBe(true);
    expect(isErpNextRequest("api/resource/Customer")).toBe(true);
    expect(isErpNextRequest("api/resource/Company")).toBe(true);
  });

  it("routes CRM entities to Frappe CRM (not ERPNext)", () => {
    expect(isErpNextRequest("api/resource/CRM Deal")).toBe(false);
    expect(isErpNextRequest("api/resource/CRM Lead")).toBe(false);
    expect(isErpNextRequest("api/resource/CRM Organization")).toBe(false);
    expect(isErpNextRequest("api/resource/CRM Task")).toBe(false);
    expect(isErpNextRequest("api/resource/Contact")).toBe(false);
    expect(isErpNextRequest("api/resource/Note")).toBe(false);
  });

  it("handles get_count and getdoctype query parameters", () => {
    expect(
      isErpNextRequest(
        "api/method/frappe.client.get_count",
        new URLSearchParams({ doctype: "Quotation" }),
      ),
    ).toBe(true);
    expect(
      isErpNextRequest(
        "api/method/frappe.client.get_count",
        new URLSearchParams({ doctype: "CRM Deal" }),
      ),
    ).toBe(false);
  });

  it("handles doctype in JSON body for methods like frappe.client.set_value", () => {
    expect(isErpNextRequest("api/method/frappe.client.set_value", undefined, "Quotation")).toBe(
      true,
    );
    expect(isErpNextRequest("api/method/frappe.client.set_value", undefined, "CRM Deal")).toBe(
      false,
    );
  });

  it("routes erpnext.* method calls to ERPNext", () => {
    expect(
      isErpNextRequest("api/method/erpnext.selling.doctype.quotation.quotation.declare_order_lost"),
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Task 3: scoped reads (File / Comment / Communication)
// ---------------------------------------------------------------------------

describe("scoped reads", () => {
  it("treats File, Comment and Communication lists as scoped reads", () => {
    expect(classifyRequest("GET", "api/resource/File", none)).toEqual({
      kind: "scoped-read",
      doctype: "File",
    });
    expect(classifyRequest("GET", "api/resource/Comment", none)).toEqual({
      kind: "scoped-read",
      doctype: "Comment",
    });
    expect(classifyRequest("GET", "api/resource/Communication", none)).toEqual({
      kind: "scoped-read",
      doctype: "Communication",
    });
  });

  it("blocks single document reads of File, Comment and Communication", () => {
    expect(classifyRequest("GET", "api/resource/File/FILE-0001", none)).toBeNull();
    expect(classifyRequest("GET", "api/resource/Comment/COM-0001", none)).toBeNull();
    expect(classifyRequest("GET", "api/resource/Communication/COMM-0001", none)).toBeNull();
  });

  it("still allows deleting an attachment, a comment and an email", () => {
    expect(classifyRequest("DELETE", "api/resource/File/FILE-0001", none)?.kind).toBe("org-write");
    expect(classifyRequest("DELETE", "api/resource/Comment/COM-0001", none)?.kind).toBe(
      "org-write",
    );
    expect(classifyRequest("DELETE", "api/resource/Communication/COMM-0001", none)?.kind).toBe(
      "org-write",
    );
  });

  it("parses the filters of a list request", () => {
    const params = new URLSearchParams({
      filters: JSON.stringify([
        ["reference_doctype", "=", "CRM Deal"],
        ["reference_name", "=", "CRM-DEAL-001"],
      ]),
    });
    expect(parseFilters(params)).toEqual([
      ["reference_doctype", "=", "CRM Deal"],
      ["reference_name", "=", "CRM-DEAL-001"],
    ]);
    expect(parseFilters(new URLSearchParams({ filters: "not json" }))).toEqual([]);
  });

  it("allows a list read that is scoped to an allowed parent document", () => {
    const params = new URLSearchParams({
      filters: JSON.stringify([
        ["attached_to_doctype", "=", "CRM Lead"],
        ["attached_to_name", "=", "CRM-LEAD-001"],
      ]),
    });
    expect(referenceScopeFor("File", params)).toEqual({
      doctype: "CRM Lead",
      name: "CRM-LEAD-001",
    });
  });

  it("rejects an unfiltered list read", () => {
    expect(referenceScopeFor("File", none)).toBeNull();
    expect(referenceScopeFor("Comment", none)).toBeNull();
    expect(referenceScopeFor("Communication", none)).toBeNull();
  });

  it("rejects a list read that is only filtered by name", () => {
    const params = new URLSearchParams({
      filters: JSON.stringify([["attached_to_name", "=", "CRM-LEAD-001"]]),
    });
    expect(referenceScopeFor("File", params)).toBeNull();
  });

  it("rejects a list read of a parent document that is not allowed", () => {
    const params = new URLSearchParams({
      filters: JSON.stringify([
        ["attached_to_doctype", "=", "User"],
        ["attached_to_name", "=", "admin@example.com"],
      ]),
    });
    expect(referenceScopeFor("File", params)).toBeNull();
  });

  it("rejects a list read with a nonsensical document name", () => {
    const params = new URLSearchParams({
      filters: JSON.stringify([
        ["attached_to_doctype", "=", "CRM Lead"],
        ["attached_to_name", "=", "../../etc/passwd"],
      ]),
    });
    expect(referenceScopeFor("File", params)).toBeNull();
  });

  it("caps the page size of a list read", () => {
    const capped = new URLSearchParams(
      capPageLength(new URLSearchParams({ limit_page_length: "9999" }), MAX_REFERENCE_ROWS),
    );
    expect(capped.get("limit_page_length")).toBe(String(MAX_REFERENCE_ROWS));

    const unlimited = new URLSearchParams(
      capPageLength(new URLSearchParams({ limit_page_length: "0" }), MAX_REFERENCE_ROWS),
    );
    expect(unlimited.get("limit_page_length")).toBe(String(MAX_REFERENCE_ROWS));

    const legacy = new URLSearchParams(
      capPageLength(new URLSearchParams({ limit: "50" }), MAX_REFERENCE_ROWS),
    );
    expect(legacy.get("limit")).toBeNull();
    expect(legacy.get("limit_page_length")).toBe("50");

    const legacyTooBig = new URLSearchParams(
      capPageLength(new URLSearchParams({ limit: "5000" }), MAX_REFERENCE_ROWS),
    );
    expect(legacyTooBig.get("limit_page_length")).toBe(String(MAX_REFERENCE_ROWS));

    const main = new URLSearchParams(
      capPageLength(new URLSearchParams({ limit_page_length: "5000" }), MAX_MAIN_ROWS),
    );
    expect(main.get("limit_page_length")).toBe(String(MAX_MAIN_ROWS));
  });

  it("keeps the other query parameters of a list read", () => {
    const query = new URLSearchParams(
      capPageLength(
        new URLSearchParams({
          fields: '["name"]',
          order_by: "creation desc",
          filters: "[]",
        }),
        MAX_REFERENCE_ROWS,
      ),
    );
    expect(query.get("fields")).toBe('["name"]');
    expect(query.get("order_by")).toBe("creation desc");
    expect(query.get("filters")).toBe("[]");
  });
});

// ---------------------------------------------------------------------------
// Task 3: link targets
// ---------------------------------------------------------------------------

describe("link targets", () => {
  it("never exposes User (or other sensitive doctypes) as a link target", () => {
    expect(DEFAULT_LINK_TARGETS.has("User")).toBe(false);
    expect(BLOCKED_LINK_TARGETS.has("User")).toBe(true);
    expect(BLOCKED_LINK_TARGETS.has("Role")).toBe(true);
    expect(BLOCKED_LINK_TARGETS.has("DocType")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Task 1: method body validation
// ---------------------------------------------------------------------------

describe("validateMethodBody", () => {
  it("accepts and sanitizes frappe.client.set_value", () => {
    const result = validateMethodBody("api/method/frappe.client.set_value", {
      doctype: "Quotation",
      name: "SAL-QTN-2026-00001",
      fieldname: "status",
      value: "Open",
      flags: { sneaky: true },
    });
    expect(result).toEqual({
      ok: true,
      body: {
        doctype: "Quotation",
        name: "SAL-QTN-2026-00001",
        fieldname: "status",
        value: "Open",
      },
    });
  });

  it("rejects set_value for a doctype that is not allowed", () => {
    const result = validateMethodBody("api/method/frappe.client.set_value", {
      doctype: "User",
      name: "admin@example.com",
      fieldname: "role_profile_name",
      value: "x",
    });
    expect(result.ok).toBe(false);
  });

  it("rejects set_value without a usable name, fieldname or value", () => {
    expect(
      validateMethodBody("api/method/frappe.client.set_value", {
        doctype: "CRM Deal",
        name: "a/b",
        fieldname: "status",
        value: "x",
      }).ok,
    ).toBe(false);
    expect(
      validateMethodBody("api/method/frappe.client.set_value", {
        doctype: "CRM Deal",
        name: "CRM-DEAL-001",
        fieldname: "",
        value: "x",
      }).ok,
    ).toBe(false);
    expect(
      validateMethodBody("api/method/frappe.client.set_value", {
        doctype: "CRM Deal",
        name: "CRM-DEAL-001",
        fieldname: "status",
        value: { nested: true },
      }).ok,
    ).toBe(false);
  });

  it("accepts frappe.client.cancel for an allowed doctype", () => {
    const result = validateMethodBody("api/method/frappe.client.cancel", {
      doctype: "Quotation",
      name: "SAL-QTN-2026-00001",
    });
    expect(result).toEqual({
      ok: true,
      body: { doctype: "Quotation", name: "SAL-QTN-2026-00001" },
    });
  });

  it("rejects frappe.client.cancel for a doctype that is not allowed", () => {
    expect(
      validateMethodBody("api/method/frappe.client.cancel", {
        doctype: "User",
        name: "admin@example.com",
      }).ok,
    ).toBe(false);
  });

  it("accepts add_comment and drops the claimed author", () => {
    const result = validateMethodBody("api/method/frappe.desk.form.utils.add_comment", {
      reference_doctype: "CRM Deal",
      reference_name: "CRM-DEAL-001",
      content: "hello",
      comment_by: "Administrator",
      comment_email: "admin@example.com",
    });
    expect(result).toEqual({
      ok: true,
      body: {
        reference_doctype: "CRM Deal",
        reference_name: "CRM-DEAL-001",
        content: "hello",
      },
    });
  });

  it("rejects add_comment for a parent document that is not allowed", () => {
    expect(
      validateMethodBody("api/method/frappe.desk.form.utils.add_comment", {
        reference_doctype: "User",
        reference_name: "admin@example.com",
        content: "hello",
      }).ok,
    ).toBe(false);
    expect(
      validateMethodBody("api/method/frappe.desk.form.utils.add_comment", {
        reference_doctype: "CRM Deal",
        reference_name: "CRM-DEAL-001",
        content: "",
      }).ok,
    ).toBe(false);
  });

  it("accepts communication.email.make and forces the delivery flags", () => {
    const result = validateMethodBody("api/method/frappe.core.doctype.communication.email.make", {
      doctype: "CRM Lead",
      name: "CRM-LEAD-001",
      recipients: "a@example.com",
      subject: "Hi",
      content: "There",
      sender_email: "attacker@example.com",
    });
    expect(result).toEqual({
      ok: true,
      body: {
        doctype: "CRM Lead",
        name: "CRM-LEAD-001",
        recipients: "a@example.com",
        subject: "Hi",
        content: "There",
        send_email: 1,
        now: 1,
      },
    });
  });

  it("rejects communication.email.make with a missing recipient or subject", () => {
    expect(
      validateMethodBody("api/method/frappe.core.doctype.communication.email.make", {
        doctype: "CRM Lead",
        name: "CRM-LEAD-001",
        recipients: "",
        subject: "Hi",
        content: "There",
      }).ok,
    ).toBe(false);
    expect(
      validateMethodBody("api/method/frappe.core.doctype.communication.email.make", {
        doctype: "CRM Lead",
        name: "CRM-LEAD-001",
        recipients: "a@example.com",
        subject: "",
        content: "There",
      }).ok,
    ).toBe(false);
  });

  it("rejects a body that is not an object and unknown methods", () => {
    expect(validateMethodBody("api/method/frappe.client.set_value", "nope").ok).toBe(false);
    expect(validateMethodBody("api/method/frappe.client.get_list", {}).ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Task 3: body doctype must match the doctype in the url
// ---------------------------------------------------------------------------

describe("bodyContradictsDocType", () => {
  it("allows a body without a doctype", () => {
    expect(bodyContradictsDocType("CRM Deal", { status: "Open" })).toBe(false);
    expect(bodyContradictsDocType("CRM Deal", undefined)).toBe(false);
  });

  it("allows a body with the same doctype", () => {
    expect(bodyContradictsDocType("CRM Deal", { doctype: "CRM Deal" })).toBe(false);
  });

  it("rejects a body with a different doctype", () => {
    expect(bodyContradictsDocType("CRM Deal", { doctype: "CRM Organization" })).toBe(true);
    expect(bodyContradictsDocType("CRM Deal", { doctype: 42 })).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Task 4: uploads
// ---------------------------------------------------------------------------

describe("uploads", () => {
  it("knows the doctypes a file may be attached to", () => {
    expect(UPLOAD_DOCTYPES.has("Quotation")).toBe(true);
    expect(UPLOAD_DOCTYPES.has("Sales Order")).toBe(true);
    expect(UPLOAD_DOCTYPES.has("Item")).toBe(true);
    expect(UPLOAD_DOCTYPES.has("Customer")).toBe(true);
    expect(UPLOAD_DOCTYPES.has("CRM Deal")).toBe(true);
    expect(UPLOAD_DOCTYPES.has("User")).toBe(false);
  });

  it("routes the ERPNext doctypes to ERPNext", () => {
    for (const doctype of ["Quotation", "Sales Order", "Item", "Customer"]) {
      expect(ERPNEXT_DOCTYPES.has(doctype)).toBe(true);
    }
    for (const doctype of ["CRM Deal", "CRM Lead", "CRM Organization", "Contact", "CRM Task"]) {
      expect(ERPNEXT_DOCTYPES.has(doctype)).toBe(false);
    }
  });

  it("accepts the allowed file types", () => {
    expect(isAllowedUploadType("photo.png", "image/png")).toBe(true);
    expect(isAllowedUploadType("photo.JPG", "image/jpeg")).toBe(true);
    expect(isAllowedUploadType("doc.pdf", "application/pdf")).toBe(true);
    expect(
      isAllowedUploadType(
        "doc.docx",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ),
    ).toBe(true);
    expect(
      isAllowedUploadType(
        "sheet.xlsx",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ),
    ).toBe(true);
    expect(isAllowedUploadType("rows.csv", "text/csv")).toBe(true);
    expect(isAllowedUploadType("notes.txt", "text/plain")).toBe(true);
  });

  it("rejects file types that are not on the allow-list", () => {
    expect(isAllowedUploadType("virus.exe", "application/octet-stream")).toBe(false);
    expect(isAllowedUploadType("page.html", "text/html")).toBe(false);
    expect(isAllowedUploadType("script.svg", "image/svg+xml")).toBe(false);
    expect(isAllowedUploadType("noextension", "application/pdf")).toBe(false);
    expect(isAllowedUploadType("doc.pdf", "application/x-msdownload")).toBe(false);
  });

  it("reads the extension of a file name", () => {
    expect(fileExtension("a/b/report.PDF")).toBe("pdf");
    expect(fileExtension("archive.tar.gz")).toBe("gz");
    expect(fileExtension("noext")).toBe("");
  });

  it("accepts a plausible document name and rejects the rest", () => {
    expect(isPlausibleDocName("SAL-QTN-2026-00001")).toBe(true);
    expect(isPlausibleDocName("CRM-DEAL-001")).toBe(true);
    expect(isPlausibleDocName("Acme Inc.")).toBe(true);
    expect(isPlausibleDocName("a/b")).toBe(false);
    expect(isPlausibleDocName("a\\b")).toBe(false);
    expect(isPlausibleDocName("../etc/passwd")).toBe(false);
    expect(isPlausibleDocName("")).toBe(false);
    expect(isPlausibleDocName("x".repeat(141))).toBe(false);
    expect(isPlausibleDocName("x".repeat(140))).toBe(true);
    expect(isPlausibleDocName(undefined)).toBe(false);
  });

  it("accepts an upload for a CRM document", () => {
    const form = new FormData();
    form.set("doctype", "CRM Deal");
    form.set("docname", "CRM-DEAL-001");
    form.set("file", new File(["hello"], "note.txt", { type: "text/plain" }));
    const result = validateUploadForm(form);
    expect(result).toEqual({
      ok: true,
      info: { doctype: "CRM Deal", docname: "CRM-DEAL-001", isErpNext: false },
    });
  });

  it("routes an upload for a sales document to ERPNext", () => {
    for (const doctype of ["Quotation", "Sales Order", "Item", "Customer"]) {
      const form = new FormData();
      form.set("doctype", doctype);
      form.set("docname", "DOC-0001");
      form.set("file", new File(["hello"], "note.txt", { type: "text/plain" }));
      const result = validateUploadForm(form);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.info.isErpNext).toBe(true);
    }
  });

  it("rejects an upload for a doctype that is not allowed", () => {
    const form = new FormData();
    form.set("doctype", "User");
    form.set("docname", "admin@example.com");
    form.set("file", new File(["hello"], "note.txt", { type: "text/plain" }));
    const result = validateUploadForm(form);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(403);
  });

  it("rejects an upload with an invalid docname", () => {
    const form = new FormData();
    form.set("doctype", "Quotation");
    form.set("docname", "../../etc/passwd");
    form.set("file", new File(["hello"], "note.txt", { type: "text/plain" }));
    const result = validateUploadForm(form);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(400);
  });

  it("rejects an upload with a file type that is not allowed", () => {
    const form = new FormData();
    form.set("doctype", "CRM Deal");
    form.set("docname", "CRM-DEAL-001");
    form.set("file", new File(["MZ"], "payload.exe", { type: "application/octet-stream" }));
    const result = validateUploadForm(form);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(403);
  });

  it("rejects an upload without a file", () => {
    const form = new FormData();
    form.set("doctype", "CRM Deal");
    form.set("docname", "CRM-DEAL-001");
    const result = validateUploadForm(form);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

describe("doctypeFromResourcePath", () => {
  it("reads the doctype of a resource path", () => {
    expect(doctypeFromResourcePath("api/resource/CRM Deal")).toBe("CRM Deal");
    expect(doctypeFromResourcePath("api/resource/CRM Deal/CRM-DEAL-001")).toBe("CRM Deal");
    expect(doctypeFromResourcePath("api/method/upload_file")).toBeUndefined();
  });
});

describe("main doctypes", () => {
  it("still contains every doctype the UI writes", () => {
    for (const doctype of [
      "CRM Organization",
      "CRM Deal",
      "CRM Lead",
      "CRM Task",
      "Contact",
      "Quotation",
      "Sales Order",
      "Item",
      "Note",
      "CRM Call Log",
    ]) {
      expect(MAIN_DOCTYPES.has(doctype)).toBe(true);
    }
  });
});

import { describe, expect, it } from "vitest";

import {
  buildLinkQuery,
  classifyRequest,
  hasUnsafeSegments,
  linkTargetsFromMeta,
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

  it("allows uploads (further validated by the proxy)", () => {
    expect(classifyRequest("POST", "api/method/uploadfile", none)?.kind).toBe("upload");
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

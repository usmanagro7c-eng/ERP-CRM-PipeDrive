import { describe, it, expect } from "vitest";
import {
  PROFESSIONAL_EMAIL_TEMPLATES,
  formatBodyHtml,
  wrapInProfessionalEmailHtml,
} from "@/lib/email-formatter";

describe("email-formatter", () => {
  it("provides 5 professional templates with subjects and bodies", () => {
    expect(PROFESSIONAL_EMAIL_TEMPLATES.length).toBe(5);
    for (const tpl of PROFESSIONAL_EMAIL_TEMPLATES) {
      expect(tpl.id).toBeDefined();
      expect(tpl.label).toBeDefined();
      expect(tpl.subject("DEAL-001")).toContain("DEAL-001");
      expect(tpl.body("Ali Khan", "DEAL-001", "Usman")).toContain("Ali Khan");
    }
  });

  it("converts plain text lines and bullets into clean HTML", () => {
    const raw = "Dear Client,\n\nHere are items:\n• Item 1\n• Item 2\n\nBest regards.";
    const html = formatBodyHtml(raw);
    expect(html).toContain("<p");
    expect(html).toContain("<ul");
    expect(html).toContain("<li");
    expect(html).toContain("Item 1");
    expect(html).toContain("Item 2");
  });

  it("wraps content into a corporate HTML container with header and confidentiality notice", () => {
    const wrapped = wrapInProfessionalEmailHtml({
      subject: "Test Proposal",
      body: "Hello world",
      senderName: "Commercial Team",
      referenceDoctype: "CRM Deal",
      referenceName: "CRM-DEAL-2026-00001",
    });

    expect(wrapped).toContain("<!DOCTYPE html>");
    expect(wrapped).toContain("Test Proposal");
    expect(wrapped).toContain("Ref: CRM-DEAL-2026-00001");
    expect(wrapped).toContain("Commercial Team");
    expect(wrapped).toContain("Notice of Confidentiality");
    expect(wrapped).toContain("AgroCRM");
  });
});

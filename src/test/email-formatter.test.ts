import { describe, it, expect } from "vitest";
import {
  PROFESSIONAL_EMAIL_TEMPLATES,
  formatBodyHtml,
  wrapInProfessionalEmailHtml,
} from "@/lib/email-formatter";
import {
  formatStageChangeHtml,
  formatEntityChangeHtml,
} from "@/lib/change-notifications";

describe("email-formatter", () => {
  it("provides 6 professional templates with subjects and bodies", () => {
    expect(PROFESSIONAL_EMAIL_TEMPLATES.length).toBe(6);
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

  it("formats stage change emails with executive styling, transition pills and guidance", () => {
    const htmlWon = formatStageChangeHtml({
      dealId: "CRM-DEAL-2026-00007",
      dealTitle: "Boom Boom Agro Corp",
      fromStage: "Negotiation",
      toStage: "Won",
      organization: "Boom Boom Agro Corp",
      dealValue: 160000,
      modifiedBy: "Usman Aziz",
    });

    expect(htmlWon).toContain("Deal Stage Transition Notice");
    expect(htmlWon).toContain("Dear Commercial Stakeholder");
    expect(htmlWon).toContain("Previous Stage: Negotiation");
    expect(htmlWon).toContain("Current Stage: Won");
    expect(htmlWon).toContain("#059669"); // Emerald color for won
    expect(htmlWon).toContain("PKR 160,000");
    expect(htmlWon).toContain("Confidentiality & Compliance Notice");
    expect(htmlWon).toContain("AgroCRM Commercial Pipeline & Sales Governance");

    const htmlLost = formatStageChangeHtml({
      dealId: "CRM-DEAL-2026-00008",
      dealTitle: "Fertilizer Tender",
      toStage: "Lost",
      dealValue: 50000,
    });
    expect(htmlLost).toContain("#dc2626"); // Red color for lost
    expect(htmlLost).toContain("Deal marked as closed lost");
  });

  it("formats entity change emails with executive advisory template", () => {
    const htmlEntity = formatEntityChangeHtml({
      doctype: "CRM Lead",
      docname: "LEAD-2026-00012",
      action: "Status Changed",
      title: "Chaudhry Farm Supplies",
      details: {
        "Previous Status": "Open",
        "Updated Status": "Opportunity",
        "Mobile": "+92 300 1234567",
      },
      modifiedBy: "Sales Manager",
    });

    expect(htmlEntity).toContain("CRM Lead Status Changed Advisory");
    expect(htmlEntity).toContain("Dear Commercial Stakeholder");
    expect(htmlEntity).toContain("LEAD-2026-00012");
    expect(htmlEntity).toContain("Chaudhry Farm Supplies");
    expect(htmlEntity).toContain("Previous Status");
    expect(htmlEntity).toContain("Updated Status");
    expect(htmlEntity).toContain("AgroCRM Enterprise Governance");
  });
});

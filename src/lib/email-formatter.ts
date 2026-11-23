/**
 * Professional corporate email styling, templates, and formatting utilities.
 * Ensures all emails dispatched from the CRM have executive-level presentation,
 * proper typography, responsive layouts, and formal business wording.
 */

export interface EmailTemplate {
  id: string;
  label: string;
  description: string;
  subject: (recordName?: string) => string;
  body: (clientName?: string, recordName?: string, senderName?: string) => string;
}

export const PROFESSIONAL_EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: "quotation_followup",
    label: "Quotation & Proposal Follow-up",
    description: "Follow up on a shared quotation or commercial proposal",
    subject: (recordName) =>
      recordName
        ? `Regarding Commercial Proposal & Quotation — ${recordName}`
        : "Regarding Commercial Proposal & Quotation",
    body: (clientName, recordName, senderName) =>
      `Dear ${clientName || "Valued Client"},

I hope this email finds you well.

Following up on our recent communication, I would like to check if you have had an opportunity to review the commercial quotation and proposal${recordName ? ` for ${recordName}` : ""} we shared.

We remain fully committed to delivering competitive pricing, highest product standards, and dedicated operational support for your business needs.

If you have any questions, require adjustments to the specifications, or wish to discuss flexible delivery and payment terms, please let us know. We would be pleased to schedule a brief call at your convenience.

Thank you for your consideration, and we look forward to your valuable feedback.

Best regards,
${senderName || "Sales & Commercial Team"}
AgroCRM`,
  },
  {
    id: "meeting_recap",
    label: "Meeting Summary & Action Items",
    description: "Recap key points and next deliverables after a call or meeting",
    subject: (recordName) =>
      recordName
        ? `Meeting Summary & Agreed Action Items — ${recordName}`
        : "Meeting Summary & Agreed Action Items",
    body: (clientName, recordName, senderName) =>
      `Dear ${clientName || "Team"},

Thank you for taking the time to meet with us today${recordName ? ` regarding ${recordName}` : ""}. We appreciate the productive discussion.

Below is a brief summary of the key discussion points and agreed next steps:

• Objectives & Requirements: Reviewed your operational scope and targets.
• Commercial Deliverables: Our team is finalizing the required documentation and logistics schedule.
• Next Steps & Timeline: We will share the updated review and follow up with you on the agreed date.

Please let us know if anything needs clarification or if any additional details should be incorporated.

Sincerely,
${senderName || "Account Management"}
AgroCRM`,
  },
  {
    id: "status_update",
    label: "Order & Milestone Status Update",
    description: "Provide formal progress update on an active deal or order",
    subject: (recordName) =>
      recordName
        ? `Operational Progress & Status Update — ${recordName}`
        : "Operational Progress & Status Update",
    body: (clientName, recordName, senderName) =>
      `Dear ${clientName || "Client"},

We are pleased to provide you with an operational update regarding your ongoing engagement${recordName ? ` (${recordName})` : ""}.

Everything is proceeding smoothly in accordance with our mutually agreed schedule. Our fulfillment and supply chain teams are actively coordinating to ensure that all quality checks and delivery milestones are fulfilled without delay.

You will receive another update as soon as dispatch confirmation is ready.

Thank you for your continued trust and partnership.

Warm regards,
${senderName || "Client Relations Team"}
AgroCRM`,
  },
  {
    id: "corporate_intro",
    label: "Corporate Introduction & Solutions",
    description: "Formal introduction to our agricultural products and services",
    subject: (recordName) =>
      recordName
        ? `Introduction: Agribusiness Solutions & Supply Partnership — ${recordName}`
        : "Introduction: Modern Agribusiness Solutions & Supply Partnership — AgroCRM",
    body: (clientName, _recordName, senderName) =>
      `Dear ${clientName || "Sir / Madam"},

I hope this message finds you in good health and high spirits.

I am reaching out from AgroCRM to formally introduce our comprehensive range of agricultural inputs, farm management supplies, and distribution services designed to maximize productivity and operational efficiency.

We partner with leading agricultural enterprises, cooperatives, and distributors across the country to deliver:
• Premium quality, certified agricultural products
• Direct, reliable farmgate and warehouse distribution
• Competitive wholesale pricing and flexible commercial terms

We would welcome the opportunity to connect for a brief 10-minute introductory conversation to learn more about your current supply needs and explore how we can support your growth.

Thank you for your time and consideration.

Best regards,
${senderName || "Business Development Team"}
AgroCRM`,
  },
  {
    id: "payment_reconciliation",
    label: "Payment & Account Reconciliation",
    description: "Polite, professional follow-up on outstanding invoices or balances",
    subject: (recordName) =>
      recordName
        ? `Statement & Invoice Follow-up — ${recordName}`
        : "Statement & Invoice Follow-up",
    body: (clientName, recordName, senderName) =>
      `Dear ${clientName || "Finance & Accounts Team"},

I hope you are having a pleasant week.

This is a gentle follow-up regarding the outstanding balance${recordName ? ` associated with ${recordName}` : ""}. 

Kindly review your records and let us know if the payment has been scheduled, or share the remittance advice at your earliest convenience so that we may update our ledger accordingly.

If you have already processed this transaction, please accept our thanks and disregard this notice.

Thank you for your prompt assistance and cooperation.

Sincerely,
${senderName || "Finance & Accounts Department"}
AgroCRM`,
  },
  {
    id: "stage_progression",
    label: "Deal Stage & Milestone Progression",
    description: "Executive progress notification on deal milestone advancement",
    subject: (recordName) =>
      recordName
        ? `Milestone Update: Commercial Stage Progression — ${recordName}`
        : "Milestone Update: Commercial Stage Progression",
    body: (clientName, recordName, senderName) =>
      `Dear ${clientName || "Valued Stakeholder"},

We are pleased to share an operational update regarding our commercial engagement${recordName ? ` for ${recordName}` : ""}.

Following our latest collaboration and technical milestones, this engagement has officially advanced to the next pipeline stage.

Key Progression Milestones:
• Scope & Commercial Review: Requirements have been validated by our sales engineering team.
• Operational Deliverables: All requisite documentation and stage criteria have been fulfilled.
• Next Immediate Steps: Our fulfillment team is coordinating the subsequent workflow actions to ensure seamless delivery.

Please let us know if you require any supplementary documentation or wish to coordinate a milestone review.

Sincerely,
${senderName || "Commercial Sales & Operations"}
AgroCRM`,
  },
];

export interface FormatEmailOptions {
  subject: string;
  body: string;
  senderName?: string | undefined;
  senderEmail?: string | undefined;
  recipientEmail?: string | undefined;
  referenceDoctype?: string | undefined;
  referenceName?: string | undefined;
  companyName?: string | undefined;
}

/**
 * Escapes HTML characters safely.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Converts plain text into clean, accessible HTML paragraphs and bullet lists.
 */
export function formatBodyHtml(text: string): string {
  if (!text) return "";
  // If text is already rich HTML, return it sanitized
  if (/<(p|div|table|h1|h2|h3|ul|ol|br)[^>]*>/i.test(text)) {
    return text;
  }

  const lines = text.split("\n");
  const paragraphs: string[] = [];
  let currentList: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (currentList.length > 0) {
        paragraphs.push(
          `<ul style="margin: 0 0 16px 0; padding-left: 20px; color: #334155;">${currentList.join("")}</ul>`,
        );
        currentList = [];
      }
      continue;
    }

    if (trimmed.startsWith("•") || trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      const itemContent = trimmed.replace(/^[•\-*]\s*/, "");
      currentList.push(
        `<li style="margin-bottom: 6px; font-size: 13.5px; line-height: 1.6;">${escapeHtml(itemContent)}</li>`,
      );
    } else {
      if (currentList.length > 0) {
        paragraphs.push(
          `<ul style="margin: 0 0 16px 0; padding-left: 20px; color: #334155;">${currentList.join("")}</ul>`,
        );
        currentList = [];
      }
      paragraphs.push(
        `<p style="margin: 0 0 14px 0; font-size: 13.5px; line-height: 1.65; color: #334155;">${escapeHtml(trimmed)}</p>`,
      );
    }
  }

  if (currentList.length > 0) {
    paragraphs.push(
      `<ul style="margin: 0 0 16px 0; padding-left: 20px; color: #334155;">${currentList.join("")}</ul>`,
    );
  }

  return paragraphs.join("");
}

/**
 * Wraps any email content into an executive, responsive corporate HTML template.
 */
export function wrapInProfessionalEmailHtml(options: FormatEmailOptions): string {
  const {
    subject,
    body,
    senderName = "AgroCRM Team",
    referenceDoctype,
    referenceName,
    companyName = "AgroCRM",
  } = options;

  const contentHtml = formatBodyHtml(body);
  const now = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const refBadge =
    referenceDoctype && referenceName
      ? `<span style="background-color: rgba(255,255,255,0.15); color: #f8fafc; font-size: 11px; font-weight: 500; padding: 3px 8px; border-radius: 4px; display: inline-block;">Ref: ${escapeHtml(referenceName)}</span>`
      : "";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 6px rgba(0,0,0,0.04);">
    
    <!-- Corporate Header -->
    <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 22px 28px; color: #ffffff;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td>
            <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 1.2px; color: #94a3b8; font-weight: 700; margin-bottom: 4px;">
              ${escapeHtml(companyName)} · Business Communication
            </div>
            <h1 style="margin: 0; font-size: 18px; font-weight: 700; color: #ffffff; line-height: 1.3;">
              ${escapeHtml(subject)}
            </h1>
          </td>
          <td style="text-align: right; vertical-align: top; white-space: nowrap;">
            ${refBadge}
            <div style="font-size: 11px; color: #94a3b8; margin-top: 6px;">${now}</div>
          </td>
        </tr>
      </table>
    </div>

    <!-- Email Body -->
    <div style="padding: 28px 28px 20px 28px; font-size: 13.5px; line-height: 1.65; color: #334155;">
      ${contentHtml}
    </div>

    <!-- Signature / Sign-off Block -->
    <div style="padding: 16px 28px 24px 28px; border-top: 1px solid #f1f5f9;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td>
            <div style="font-weight: 700; font-size: 13px; color: #0f172a;">${escapeHtml(senderName)}</div>
            <div style="font-size: 11.5px; color: #64748b; margin-top: 2px;">${escapeHtml(companyName)} Enterprise Sales &amp; Operations</div>
          </td>
        </tr>
      </table>
    </div>

    <!-- Confidentiality & Compliance Footer -->
    <div style="background-color: #f8fafc; padding: 14px 28px; border-top: 1px solid #e2e8f0; font-size: 10.5px; line-height: 1.5; color: #94a3b8;">
      <div style="font-weight: 600; color: #64748b; margin-bottom: 2px;">Notice of Confidentiality</div>
      The information contained in this communication is confidential and intended solely for the use of the intended recipient. If you have received this transmission in error, please immediately inform the sender and delete this message from your system.
    </div>

  </div>
</body>
</html>
`.trim();
}

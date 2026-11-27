import * as api from "@/lib/api";
import { getNotificationSettings, type NotificationEvents } from "./notification-settings";

function getAppBaseUrl(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "https://pipedrive-crm.usman-agro7c.workers.dev";
}

export interface StageChangeAlertArgs {
  dealId: string;
  dealTitle: string;
  fromStage?: string;
  toStage: string;
  organization?: string;
  dealValue?: number | string;
  currency?: string;
  modifiedBy?: string;
}

export interface EntityChangeAlertArgs {
  doctype: string;
  docname: string;
  action: string;
  title?: string;
  eventCategory?: keyof NotificationEvents;
  summary?: string;
  linkPath?: string;
  details?: Record<string, unknown>;
  modifiedBy?: string;
}

function getRecordUrl(doctype: string, docname: string, customPath?: string): string {
  const baseUrl = getAppBaseUrl();
  if (customPath) {
    return `${baseUrl}${customPath.startsWith("/") ? "" : "/"}${customPath}`;
  }
  switch (doctype) {
    case api.DEAL_DOCTYPE:
      return `${baseUrl}/deals/${encodeURIComponent(docname)}`;
    case api.LEAD_DOCTYPE:
      return `${baseUrl}/leads/${encodeURIComponent(docname)}`;
    case api.QUOTATION_DOCTYPE:
      return `${baseUrl}/quotations/${encodeURIComponent(docname)}`;
    case api.SALES_ORDER_DOCTYPE:
      return `${baseUrl}/sales-orders?q=${encodeURIComponent(docname)}`;
    case api.ORG_DOCTYPE:
      return `${baseUrl}/organizations/${encodeURIComponent(docname)}`;
    case api.CONTACT_DOCTYPE:
      return `${baseUrl}/contacts/${encodeURIComponent(docname)}`;
    default:
      return baseUrl;
  }
}

export function formatStageChangeHtml(args: StageChangeAlertArgs): string {
  const dealUrl = getRecordUrl(api.DEAL_DOCTYPE, args.dealId);
  const now = new Date().toLocaleString("en-PK", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const currency = args.currency || "PKR";
  const valStr = args.dealValue ? Number(args.dealValue).toLocaleString() : "0";

  const stageLower = (args.toStage || "").trim().toLowerCase();
  let toStageBg = "#0284c7";
  let toStageColor = "#ffffff";
  let guidanceText = "Assigned sales representatives and regional supervisors should coordinate follow-up deliverables and milestone schedules.";

  if (stageLower.includes("won")) {
    toStageBg = "#059669";
    toStageColor = "#ffffff";
    guidanceText = "Deal successfully won. Account managers are authorized to proceed with sales order generation, quotation execution, and contract delivery.";
  } else if (stageLower.includes("lost")) {
    toStageBg = "#dc2626";
    toStageColor = "#ffffff";
    guidanceText = "Deal marked as closed lost. Please review loss categorization, document feedback, and archive notes for quarterly commercial audits.";
  } else if (stageLower.includes("negotiation") || stageLower.includes("proposal") || stageLower.includes("quote")) {
    toStageBg = "#0284c7";
    toStageColor = "#ffffff";
    guidanceText = "Engagement in active negotiation/proposal review. Please verify that commercial pricing, credit terms, and quotation validity windows are up to date.";
  }

  const fromStageHtml = args.fromStage
    ? `<span style="background-color: #f1f5f9; color: #475569; padding: 5px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid #e2e8f0;">Previous Stage: ${args.fromStage}</span>
       <span style="margin: 0 12px; font-size: 16px; color: #94a3b8; font-weight: bold;">➔</span>`
    : "";

  const orgRow = args.organization
    ? `<tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 9px 12px; color: #64748b; font-weight: 600; width: 150px;">Associated Account:</td><td style="padding: 9px 12px; color: #0f172a; font-weight: 600;">${args.organization}</td></tr>`
    : "";

  const modifierRow = args.modifiedBy
    ? `<tr style="background-color: #f8fafc; border-bottom: 1px solid #f1f5f9;"><td style="padding: 9px 12px; color: #64748b; font-weight: 600;">Updated By:</td><td style="padding: 9px 12px; color: #0f172a;">${args.modifiedBy}</td></tr>`
    : "";

  return `
<div style="background-color: #f8fafc; padding: 24px 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; min-height: 100%;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 640px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    <!-- Corporate Navy Gradient Header -->
    <tr>
      <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 28px 32px; border-bottom: 3px solid #0284c7;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td valign="top">
              <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #38bdf8; margin-bottom: 6px;">AgroCRM · Enterprise Pipeline Intelligence</div>
              <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #ffffff; line-height: 1.3;">Deal Stage Transition Notice</h1>
            </td>
            <td align="right" valign="top" style="width: 140px;">
              <span style="display: inline-block; background-color: rgba(255, 255, 255, 0.12); color: #cbd5e1; font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 9999px; letter-spacing: 0.5px;">Ref: ${args.dealId}</span>
              <div style="color: #94a3b8; font-size: 11px; margin-top: 6px;">${now}</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Body Content -->
    <tr>
      <td style="padding: 28px 32px;">
        <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #1e293b; font-weight: 600;">Dear Commercial Stakeholder,</p>
        <p style="margin: 0 0 20px; font-size: 13.5px; line-height: 1.65; color: #334155;">
          This official communication advises that the commercial deal referenced below has reached a new pipeline milestone within the sales management hierarchy. Details of the stage transition and commercial values are outlined below.
        </p>

        <!-- Stage Progression Visual Pill -->
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 24px; text-align: center;">
          <div style="display: inline-flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 8px;">
            ${fromStageHtml}
            <span style="background-color: ${toStageBg}; color: ${toStageColor}; padding: 6px 14px; border-radius: 6px; font-size: 12.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; display: inline-block;">
              Current Stage: ${args.toStage}
            </span>
          </div>
        </div>

        <!-- Deal Attributes Table -->
        <div style="margin-bottom: 24px;">
          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 8px;">Commercial Deal Attributes</div>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px; border: 1px solid #f1f5f9; border-radius: 6px; overflow: hidden;">
            <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 9px 12px; color: #64748b; font-weight: 600; width: 150px;">Deal Reference:</td>
              <td style="padding: 9px 12px; color: #0f172a; font-weight: 700;">${args.dealTitle} <span style="font-weight: 500; color: #64748b;">(${args.dealId})</span></td>
            </tr>
            ${orgRow}
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 9px 12px; color: #64748b; font-weight: 600;">Deal Valuation:</td>
              <td style="padding: 9px 12px; color: #0f172a; font-weight: 700; font-size: 14px;">${currency} ${valStr}</td>
            </tr>
            ${modifierRow}
            <tr>
              <td style="padding: 9px 12px; color: #64748b; font-weight: 600;">Recorded Timestamp:</td>
              <td style="padding: 9px 12px; color: #0f172a;">${now}</td>
            </tr>
          </table>
        </div>

        <!-- Operational Guidance Callout -->
        <div style="background-color: #eff6ff; border-left: 4px solid #0284c7; padding: 12px 16px; border-radius: 0 6px 6px 0; margin-bottom: 24px; font-size: 12.5px; color: #1e40af; line-height: 1.55;">
          <strong>Operational Guidance:</strong> ${guidanceText}
        </div>

        <!-- Action Button -->
        <div style="text-align: center; margin: 28px 0 20px;">
          <a href="${dealUrl}" style="background-color: #0f172a; color: #ffffff; padding: 11px 24px; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: 600; display: inline-block; letter-spacing: 0.3px;">
            Open Deal in AgroCRM ➔
          </a>
        </div>

        <!-- Formal Sign-off -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 24px; padding-top: 18px; border-top: 1px solid #e2e8f0;">
          <tr>
            <td>
              <div style="font-size: 13px; color: #475569; margin-bottom: 3px;">Sincerely,</div>
              <div style="font-size: 13.5px; font-weight: 700; color: #0f172a;">AgroCRM Commercial Pipeline & Sales Governance</div>
              <div style="font-size: 12px; color: #64748b;">Enterprise Sales & Distribution Operations</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Footer & Disclaimer -->
    <tr>
      <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 32px; font-size: 11px; color: #94a3b8; line-height: 1.55;">
        <strong style="color: #64748b;">Confidentiality & Compliance Notice:</strong> This automated notification is transmitted exclusively for authorized recipients within the sales hierarchy of AgroCRM. If you have received this communication in error, please disregard and notify the system administrator.
      </td>
    </tr>
  </table>
</div>
`.trim();
}

export function formatEntityChangeHtml(args: EntityChangeAlertArgs): string {
  const recordUrl = getRecordUrl(args.doctype, args.docname, args.linkPath);
  const now = new Date().toLocaleString("en-PK", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const extraRows = args.details
    ? Object.entries(args.details)
        .filter(([, v]) => v !== undefined && v !== null && v !== "")
        .map(
          ([k, v]) =>
            `<tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 8px 12px; color: #64748b; font-weight: 600; width: 150px;">${k}:</td><td style="padding: 8px 12px; color: #0f172a;">${String(v)}</td></tr>`,
        )
        .join("")
    : "";

  const titleRow = args.title
    ? `<tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 8px 12px; color: #64748b; font-weight: 600;">Title / Name:</td><td style="padding: 8px 12px; color: #0f172a; font-weight: 600;">${args.title}</td></tr>`
    : "";

  const summaryBanner = args.summary
    ? `<div style="background-color: #f8fafc; border-left: 3px solid #0284c7; padding: 10px 14px; margin-bottom: 20px; font-size: 12.5px; color: #334155; line-height: 1.5;"><strong>Summary of Event:</strong> ${args.summary}</div>`
    : "";

  const modifierRow = args.modifiedBy
    ? `<tr style="background-color: #f8fafc; border-bottom: 1px solid #f1f5f9;"><td style="padding: 8px 12px; color: #64748b; font-weight: 600;">Recorded By:</td><td style="padding: 8px 12px; color: #0f172a;">${args.modifiedBy}</td></tr>`
    : "";

  return `
<div style="background-color: #f8fafc; padding: 24px 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; min-height: 100%;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 640px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    <!-- Header -->
    <tr>
      <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 28px 32px; border-bottom: 3px solid #0284c7;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td valign="top">
              <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #38bdf8; margin-bottom: 6px;">AgroCRM · Enterprise Notification</div>
              <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #ffffff; line-height: 1.3;">${args.doctype} ${args.action} Advisory</h1>
            </td>
            <td align="right" valign="top" style="width: 140px;">
              <span style="display: inline-block; background-color: rgba(255, 255, 255, 0.12); color: #cbd5e1; font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 9999px; letter-spacing: 0.5px;">Ref: ${args.docname}</span>
              <div style="color: #94a3b8; font-size: 11px; margin-top: 6px;">${now}</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Body -->
    <tr>
      <td style="padding: 28px 32px;">
        <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #1e293b; font-weight: 600;">Dear Commercial Stakeholder,</p>
        <p style="margin: 0 0 20px; font-size: 13.5px; line-height: 1.65; color: #334155;">
          This formal notification confirms an administrative or operational event recorded for <strong>${args.doctype}</strong> (${args.docname}) within the AgroCRM enterprise environment. Complete transaction attributes are detailed below.
        </p>

        ${summaryBanner}

        <!-- Details Table -->
        <div style="margin-bottom: 24px;">
          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 8px;">Record Attributes</div>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px; border: 1px solid #f1f5f9; border-radius: 6px; overflow: hidden;">
            <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 8px 12px; color: #64748b; font-weight: 600; width: 150px;">Record Entity:</td>
              <td style="padding: 8px 12px; color: #0f172a; font-weight: 600;">${args.doctype}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 8px 12px; color: #64748b; font-weight: 600;">Record Identifier:</td>
              <td style="padding: 8px 12px; color: #0f172a; font-weight: 700;">${args.docname}</td>
            </tr>
            ${titleRow}
            <tr style="background-color: #f8fafc; border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 8px 12px; color: #64748b; font-weight: 600;">Action Category:</td>
              <td style="padding: 8px 12px; color: #0f172a;"><span style="background-color: #e2e8f0; color: #334155; padding: 3px 8px; border-radius: 4px; font-weight: 600; font-size: 12px;">${args.action}</span></td>
            </tr>
            ${extraRows}
            ${modifierRow}
            <tr>
              <td style="padding: 8px 12px; color: #64748b; font-weight: 600;">Timestamp:</td>
              <td style="padding: 8px 12px; color: #0f172a;">${now}</td>
            </tr>
          </table>
        </div>

        <!-- Button -->
        <div style="text-align: center; margin: 28px 0 20px;">
          <a href="${recordUrl}" style="background-color: #0f172a; color: #ffffff; padding: 11px 24px; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: 600; display: inline-block; letter-spacing: 0.3px;">
            Open ${args.doctype} in AgroCRM ➔
          </a>
        </div>

        <!-- Formal Sign-off -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 24px; padding-top: 18px; border-top: 1px solid #e2e8f0;">
          <tr>
            <td>
              <div style="font-size: 13px; color: #475569; margin-bottom: 3px;">Sincerely,</div>
              <div style="font-size: 13.5px; font-weight: 700; color: #0f172a;">AgroCRM Enterprise Governance</div>
              <div style="font-size: 12px; color: #64748b;">Enterprise Sales & Distribution Operations</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 32px; font-size: 11px; color: #94a3b8; line-height: 1.55;">
        <strong style="color: #64748b;">Confidentiality & Compliance Notice:</strong> This automated notification is transmitted exclusively for authorized recipients within the sales hierarchy of AgroCRM. If you have received this communication in error, please disregard and notify the system administrator.
      </td>
    </tr>
  </table>
</div>
`.trim();
}

let cachedCrmDocName: string | undefined;

async function getCrmCarrierDoc(): Promise<{ doctype: string; docname: string } | undefined> {
  if (cachedCrmDocName) {
    return { doctype: api.DEAL_DOCTYPE, docname: cachedCrmDocName };
  }
  try {
    const deals = await api.listDeals({ limit: 1, search: "", filters: [], start: 0 });
    const firstDeal = deals[0];
    if (typeof firstDeal?.["name"] === "string" && firstDeal["name"]) {
      cachedCrmDocName = firstDeal["name"];
      return { doctype: api.DEAL_DOCTYPE, docname: firstDeal["name"] };
    }
  } catch {
    // fallback
  }
  return undefined;
}

/**
 * Dispatch automated email alert for a Deal stage change.
 *
 * NOTE: Browser-side email dispatch is now a NO-OP.
 * Email notifications are handled server-side by Frappe doc_events
 * (custom_crm_sync.api.notify.on_change) based on CRM Sales Hierarchy.
 * Signatures are preserved to avoid breaking existing UI hooks.
 */
export async function notifyStageChange(_args: StageChangeAlertArgs): Promise<void> {
  // Server-side hook now owns dispatch. No-op on client.
}

/**
 * Dispatch automated email alert for any entity change.
 *
 * NOTE: Browser-side email dispatch is now a NO-OP.
 * Email notifications are handled server-side by Frappe doc_events
 * (custom_crm_sync.api.notify.on_change) based on CRM Sales Hierarchy.
 * Signatures are preserved to avoid breaking existing UI hooks.
 */
export async function notifyEntityChange(_args: EntityChangeAlertArgs): Promise<void> {
  // Server-side hook now owns dispatch. No-op on client.
}

/**
 * Dispatch an immediate test email via the server endpoint.
 */
export async function sendTestNotification(_recipients?: string[]): Promise<{
  success: boolean;
  recipients: string[];
  count: number;
}> {
  return await api.sendTestNotification();
}

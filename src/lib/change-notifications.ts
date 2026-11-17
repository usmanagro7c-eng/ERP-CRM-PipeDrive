import * as api from "@/lib/api";
import {
  getNotificationSettings,
  type NotificationEvents,
} from "./notification-settings";

const APP_BASE_URL = "https://pipedrive-crm.usman-agro7c.workers.dev";

export interface StageChangeAlertArgs {
  dealId: string;
  dealTitle: string;
  fromStage?: string;
  toStage: string;
  organization?: string;
  dealValue?: number | string;
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
  if (customPath) {
    return `${APP_BASE_URL}${customPath.startsWith("/") ? "" : "/"}${customPath}`;
  }
  switch (doctype) {
    case api.DEAL_DOCTYPE:
      return `${APP_BASE_URL}/deals/${encodeURIComponent(docname)}`;
    case api.LEAD_DOCTYPE:
      return `${APP_BASE_URL}/leads/${encodeURIComponent(docname)}`;
    case api.QUOTATION_DOCTYPE:
      return `${APP_BASE_URL}/quotations/${encodeURIComponent(docname)}`;
    case api.SALES_ORDER_DOCTYPE:
      return `${APP_BASE_URL}/orders/${encodeURIComponent(docname)}`;
    case api.ORG_DOCTYPE:
      return `${APP_BASE_URL}/organizations/${encodeURIComponent(docname)}`;
    case api.CONTACT_DOCTYPE:
      return `${APP_BASE_URL}/contacts/${encodeURIComponent(docname)}`;
    default:
      return APP_BASE_URL;
  }
}

function formatStageChangeHtml(args: StageChangeAlertArgs): string {
  const dealUrl = getRecordUrl(api.DEAL_DOCTYPE, args.dealId);
  const now = new Date().toLocaleString("en-PK", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const valStr = args.dealValue ? Number(args.dealValue).toLocaleString() : "0";

  return `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
  <div style="background: linear-gradient(135deg, #1e293b, #0f172a); padding: 22px 24px; color: #ffffff;">
    <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; margin-bottom: 4px; font-weight: 600;">AgroCRM · Deal Stage Alert</div>
    <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #ffffff;">Deal Stage Changed</h1>
  </div>

  <div style="padding: 24px;">
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 20px; text-align: center;">
      ${
        args.fromStage
          ? `<span style="background-color: #e2e8f0; color: #475569; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600;">${args.fromStage}</span>
             <span style="margin: 0 10px; font-size: 15px; color: #94a3b8;">➔</span>`
          : ""
      }
      <span style="background-color: #10b981; color: #ffffff; padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 600;">New Stage: ${args.toStage}</span>
    </div>

    <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px;">
      <tr><td style="padding: 8px 0; color: #64748b; font-weight: 600; width: 140px;">Deal:</td><td style="color: #0f172a; font-weight: bold;">${args.dealTitle} (${args.dealId})</td></tr>
      ${args.organization ? `<tr><td style="padding: 8px 0; color: #64748b; font-weight: 600;">Organization:</td><td style="color: #0f172a;">${args.organization}</td></tr>` : ""}
      <tr><td style="padding: 8px 0; color: #64748b; font-weight: 600;">Deal Value:</td><td style="color: #0f172a; font-weight: bold;">PKR ${valStr}</td></tr>
      ${args.modifiedBy ? `<tr><td style="padding: 8px 0; color: #64748b; font-weight: 600;">Modified By:</td><td style="color: #0f172a;">${args.modifiedBy}</td></tr>` : ""}
      <tr><td style="padding: 8px 0; color: #64748b; font-weight: 600;">Date & Time:</td><td style="color: #0f172a;">${now}</td></tr>
    </table>

    <div style="text-align: center; margin-top: 24px;">
      <a href="${dealUrl}" style="background-color: #0f172a; color: #ffffff; padding: 10px 22px; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: 600; display: inline-block;">View Deal in AgroCRM</a>
    </div>
  </div>
</div>
`.trim();
}

function formatEntityChangeHtml(args: EntityChangeAlertArgs): string {
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
            `<tr><td style="padding: 6px 0; color: #64748b; font-weight: 600; width: 140px;">${k}:</td><td style="color: #0f172a;">${String(v)}</td></tr>`,
        )
        .join("")
    : "";

  return `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
  <div style="background: linear-gradient(135deg, #1e293b, #0f172a); padding: 22px 24px; color: #ffffff;">
    <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; margin-bottom: 4px; font-weight: 600;">AgroCRM · System Notification</div>
    <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #ffffff;">${args.doctype} ${args.action}</h1>
  </div>

  <div style="padding: 24px;">
    <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px;">
      <tr><td style="padding: 6px 0; color: #64748b; font-weight: 600; width: 140px;">Record Type:</td><td style="color: #0f172a; font-weight: 600;">${args.doctype}</td></tr>
      <tr><td style="padding: 6px 0; color: #64748b; font-weight: 600;">Record ID:</td><td style="color: #0f172a; font-weight: bold;">${args.docname}</td></tr>
      ${args.title ? `<tr><td style="padding: 6px 0; color: #64748b; font-weight: 600;">Title / Name:</td><td style="color: #0f172a;">${args.title}</td></tr>` : ""}
      <tr><td style="padding: 6px 0; color: #64748b; font-weight: 600;">Action:</td><td style="color: #0f172a;"><span style="background-color: #f1f5f9; padding: 2px 8px; border-radius: 4px; font-weight: 600;">${args.action}</span></td></tr>
      ${args.summary ? `<tr><td style="padding: 6px 0; color: #64748b; font-weight: 600;">Summary:</td><td style="color: #0f172a;">${args.summary}</td></tr>` : ""}
      ${extraRows}
      ${args.modifiedBy ? `<tr><td style="padding: 6px 0; color: #64748b; font-weight: 600;">Modified By:</td><td style="color: #0f172a;">${args.modifiedBy}</td></tr>` : ""}
      <tr><td style="padding: 6px 0; color: #64748b; font-weight: 600;">Date & Time:</td><td style="color: #0f172a;">${now}</td></tr>
    </table>

    <div style="text-align: center; margin-top: 24px;">
      <a href="${recordUrl}" style="background-color: #0f172a; color: #ffffff; padding: 10px 22px; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: 600; display: inline-block;">Open in AgroCRM</a>
    </div>
  </div>
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
    if (deals.length > 0 && deals[0].name) {
      cachedCrmDocName = deals[0].name;
      return { doctype: api.DEAL_DOCTYPE, docname: deals[0].name };
    }
  } catch {
    // fallback
  }
  return undefined;
}

/**
 * Dispatch automated email alert for a Deal stage change.
 */
export async function notifyStageChange(args: StageChangeAlertArgs): Promise<void> {
  const settings = getNotificationSettings();
  if (!settings.enabled || !settings.events.dealStageChange) {
    return;
  }

  const validRecipients = settings.recipients.filter((r) => r.includes("@"));
  if (validRecipients.length === 0) return;

  const recipientsStr = validRecipients.join(", ");
  const subject = `🎯 [Stage Alert] Deal "${args.dealTitle || args.dealId}" moved to "${args.toStage}"`;
  const content = formatStageChangeHtml(args);

  try {
    await api.sendEmail({
      recipients: recipientsStr,
      subject,
      content,
      doctype: api.DEAL_DOCTYPE,
      docname: args.dealId,
      now: true,
    });
  } catch (err) {
    console.warn("Could not dispatch stage change notification email:", err);
  }
}

/**
 * Dispatch automated email alert for any entity change.
 */
export async function notifyEntityChange(args: EntityChangeAlertArgs): Promise<void> {
  const settings = getNotificationSettings();
  if (!settings.enabled) return;

  // Check event category toggle if specified
  if (args.eventCategory && !settings.events[args.eventCategory]) {
    return;
  }

  const validRecipients = settings.recipients.filter((r) => r.includes("@"));
  if (validRecipients.length === 0) return;

  const recipientsStr = validRecipients.join(", ");
  const subject = `[AgroCRM Alert] ${args.doctype} "${args.docname}" was ${args.action}`;
  const content = formatEntityChangeHtml(args);

  let carrierDoctype = args.doctype;
  let carrierDocname = args.docname;

  // ERPNext DocTypes (Quotation, Sales Order) route to dev06 where email.make is unavailable.
  // Use Frappe CRM (dev03) carrier to ensure reliable email delivery.
  if (carrierDoctype === api.QUOTATION_DOCTYPE || carrierDoctype === api.SALES_ORDER_DOCTYPE) {
    const carrier = await getCrmCarrierDoc();
    if (carrier) {
      carrierDoctype = carrier.doctype;
      carrierDocname = carrier.docname;
    }
  }

  try {
    await api.sendEmail({
      recipients: recipientsStr,
      subject,
      content,
      doctype: carrierDoctype,
      docname: carrierDocname,
      now: true,
    });
  } catch (err) {
    console.warn(`Could not dispatch ${args.doctype} notification email:`, err);
  }
}

/**
 * Dispatch an immediate test email to verify recipient delivery.
 */
export async function sendTestNotification(recipients: string[]): Promise<void> {
  const valid = recipients.filter((r) => r.includes("@"));
  if (valid.length === 0) {
    throw new Error("No valid recipient emails configured.");
  }

  const carrier = await getCrmCarrierDoc();

  const subject = "✅ [AgroCRM] Test Notification Email";
  const now = new Date().toLocaleString("en-PK", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const content = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #10b981; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
  <div style="background-color: #10b981; padding: 20px 24px; color: #ffffff;">
    <h1 style="margin: 0; font-size: 18px; font-weight: 700;">AgroCRM Notification Setup Verified</h1>
  </div>
  <div style="padding: 24px;">
    <p style="font-size: 14px; color: #334155; margin-top: 0;">This test confirms that your AgroCRM email notifications are working and properly configured.</p>
    <p style="font-size: 12px; color: #64748b;">Recipients configured: <strong>${valid.join(", ")}</strong></p>
    <p style="font-size: 12px; color: #64748b;">Timestamp: ${now}</p>
    <div style="margin-top: 20px;">
      <a href="${APP_BASE_URL}" style="background-color: #0f172a; color: #ffffff; padding: 8px 18px; border-radius: 6px; text-decoration: none; font-size: 12px; font-weight: 600; display: inline-block;">Go to AgroCRM Dashboard</a>
    </div>
  </div>
</div>
`.trim();

  await api.sendEmail({
    recipients: valid.join(", "),
    subject,
    content,
    doctype: carrier?.doctype || api.DEAL_DOCTYPE,
    docname: carrier?.docname,
    now: true,
  });
}

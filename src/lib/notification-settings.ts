export interface NotificationEvents {
  dealStageChange: boolean;
  dealUpdates: boolean;
  quotations: boolean;
  salesOrders: boolean;
  leads: boolean;
  otherRecords: boolean;
}

export interface NotificationSettings {
  enabled: boolean;
  recipients: string[];
  events: NotificationEvents;
}

export const NOTIFICATION_STORAGE_KEY = "agrocrm.notification_settings";

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: true,
  recipients: ["usman.agro7c@gmail.com"],
  events: {
    dealStageChange: true,
    dealUpdates: true,
    quotations: true,
    salesOrders: true,
    leads: true,
    otherRecords: true,
  },
};

export function getNotificationSettings(): NotificationSettings {
  if (typeof window === "undefined") {
    return DEFAULT_NOTIFICATION_SETTINGS;
  }
  try {
    const raw = window.localStorage.getItem(NOTIFICATION_STORAGE_KEY);
    if (!raw) return DEFAULT_NOTIFICATION_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<NotificationSettings>;
    return {
      enabled: parsed.enabled ?? DEFAULT_NOTIFICATION_SETTINGS.enabled,
      recipients: Array.isArray(parsed.recipients) && parsed.recipients.length > 0
        ? parsed.recipients.filter((r): r is string => typeof r === "string" && r.includes("@"))
        : DEFAULT_NOTIFICATION_SETTINGS.recipients,
      events: {
        dealStageChange: parsed.events?.dealStageChange ?? DEFAULT_NOTIFICATION_SETTINGS.events.dealStageChange,
        dealUpdates: parsed.events?.dealUpdates ?? DEFAULT_NOTIFICATION_SETTINGS.events.dealUpdates,
        quotations: parsed.events?.quotations ?? DEFAULT_NOTIFICATION_SETTINGS.events.quotations,
        salesOrders: parsed.events?.salesOrders ?? DEFAULT_NOTIFICATION_SETTINGS.events.salesOrders,
        leads: parsed.events?.leads ?? DEFAULT_NOTIFICATION_SETTINGS.events.leads,
        otherRecords: parsed.events?.otherRecords ?? DEFAULT_NOTIFICATION_SETTINGS.events.otherRecords,
      },
    };
  } catch {
    return DEFAULT_NOTIFICATION_SETTINGS;
  }
}

export function saveNotificationSettings(settings: NotificationSettings): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    console.warn("Could not save notification settings to localStorage:", err);
  }
}

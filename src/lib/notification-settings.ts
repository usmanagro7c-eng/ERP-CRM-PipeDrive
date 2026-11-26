export interface NotificationEvents {
  dealStageChange: boolean;
  dealUpdates: boolean;
  quotations: boolean;
  salesOrders: boolean;
  leads: boolean;
  tasks?: boolean;
  otherRecords: boolean;
}

export type NotificationDeliveryMode = "instant" | "scheduled" | "interval";

export interface UserNotificationEvents {
  dealStageChange: boolean;
  dealUpdates: boolean;
  quotations: boolean;
  salesOrders: boolean;
  leads: boolean;
  tasks: boolean;
  otherRecords: boolean;
}

export interface UserNotificationSettings {
  userId: string;
  enabled: boolean;
  email: string;
  alternateEmail?: string | undefined;
  notifyOwnActions: boolean;
  deliveryMode: NotificationDeliveryMode;
  scheduledTime?: string | undefined;
  intervalMinutes?: number | undefined;
  events: UserNotificationEvents;
}

/**
 * Shape of each row in the Frappe CRM `user_settings` child table
 * inside the `CRM Notification Settings` Single DocType.
 */
export interface FrappeUserNotificationRow {
  name?: string;
  user: string;
  enabled: number | boolean;
  email?: string;
  alternate_email?: string;
  delivery_mode?: "instant" | "scheduled" | "interval";
  scheduled_time?: string;
  interval_minutes?: number;
  deal_stage_change?: number | boolean;
  deal_updates?: number | boolean;
  quotations?: number | boolean;
  sales_orders?: number | boolean;
  leads?: number | boolean;
  tasks?: number | boolean;
  other_records?: number | boolean;
  notify_own_actions?: number | boolean;
}

export interface NotificationSettings {
  enabled: boolean;
  recipients: string[];
  events: NotificationEvents;
}

export const NOTIFICATION_STORAGE_KEY = "agrocrm.notification_settings";

export const DEFAULT_NOTIFICATION_EVENTS: UserNotificationEvents = {
  dealStageChange: true,
  dealUpdates: true,
  quotations: true,
  salesOrders: true,
  leads: true,
  tasks: true,
  otherRecords: true,
};

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

export function getUserNotificationStorageKey(userId: string): string {
  const cleanId = (userId || "default").trim().toLowerCase();
  return `agrocrm.notification_settings:${cleanId}`;
}

export function createDefaultUserNotificationSettings(
  userId: string,
  defaultEmail?: string,
): UserNotificationSettings {
  const email = defaultEmail || userId || "user@example.com";
  return {
    userId: userId || email,
    enabled: true,
    email,
    alternateEmail: "",
    notifyOwnActions: false,
    deliveryMode: "instant",
    scheduledTime: "09:00",
    intervalMinutes: 60,
    events: { ...DEFAULT_NOTIFICATION_EVENTS },
  };
}

/**
 * Convert a Frappe child table row into frontend `UserNotificationSettings`.
 */
export function fromFrappeUserRow(
  row: Partial<FrappeUserNotificationRow>,
  userId: string,
  defaultEmail?: string,
): UserNotificationSettings {
  const defaults = createDefaultUserNotificationSettings(userId, defaultEmail);
  return {
    userId: row.user || userId,
    enabled: row.enabled !== undefined ? Boolean(Number(row.enabled)) : defaults.enabled,
    email: row.email || defaultEmail || row.user || defaults.email,
    alternateEmail: row.alternate_email || "",
    notifyOwnActions: Boolean(Number(row.notify_own_actions || 0)),
    deliveryMode: (row.delivery_mode as NotificationDeliveryMode) || defaults.deliveryMode,
    scheduledTime: row.scheduled_time || defaults.scheduledTime,
    intervalMinutes: row.interval_minutes ? Number(row.interval_minutes) : defaults.intervalMinutes,
    events: {
      dealStageChange:
        row.deal_stage_change !== undefined
          ? Boolean(Number(row.deal_stage_change))
          : defaults.events.dealStageChange,
      dealUpdates:
        row.deal_updates !== undefined
          ? Boolean(Number(row.deal_updates))
          : defaults.events.dealUpdates,
      quotations:
        row.quotations !== undefined
          ? Boolean(Number(row.quotations))
          : defaults.events.quotations,
      salesOrders:
        row.sales_orders !== undefined
          ? Boolean(Number(row.sales_orders))
          : defaults.events.salesOrders,
      leads:
        row.leads !== undefined ? Boolean(Number(row.leads)) : defaults.events.leads,
      tasks:
        row.tasks !== undefined ? Boolean(Number(row.tasks)) : defaults.events.tasks,
      otherRecords:
        row.other_records !== undefined
          ? Boolean(Number(row.other_records))
          : defaults.events.otherRecords,
    },
  };
}

/**
 * Convert frontend `UserNotificationSettings` into a Frappe child table row.
 */
export function toFrappeUserRow(
  settings: UserNotificationSettings,
  existingRowName?: string,
): FrappeUserNotificationRow {
  const row: FrappeUserNotificationRow = {
    user: settings.userId,
    enabled: settings.enabled ? 1 : 0,
    email: settings.email,
    alternate_email: settings.alternateEmail || "",
    delivery_mode: settings.deliveryMode,
    scheduled_time: settings.scheduledTime || "09:00",
    interval_minutes: Number(settings.intervalMinutes) || 60,
    deal_stage_change: settings.events.dealStageChange ? 1 : 0,
    deal_updates: settings.events.dealUpdates ? 1 : 0,
    quotations: settings.events.quotations ? 1 : 0,
    sales_orders: settings.events.salesOrders ? 1 : 0,
    leads: settings.events.leads ? 1 : 0,
    tasks: settings.events.tasks ? 1 : 0,
    other_records: settings.events.otherRecords ? 1 : 0,
    notify_own_actions: settings.notifyOwnActions ? 1 : 0,
  };
  if (existingRowName) {
    row.name = existingRowName;
  }
  return row;
}

/**
 * Synchronous local cache reader for a specific user.
 */
export function getLocalUserNotificationSettings(
  userId: string,
  defaultEmail?: string,
): UserNotificationSettings {
  if (typeof window === "undefined") {
    return createDefaultUserNotificationSettings(userId, defaultEmail);
  }
  try {
    const raw = window.localStorage.getItem(getUserNotificationStorageKey(userId));
    if (!raw) return createDefaultUserNotificationSettings(userId, defaultEmail);
    const parsed = JSON.parse(raw);
    const defaults = createDefaultUserNotificationSettings(userId, defaultEmail);
    return {
      userId,
      enabled: parsed.enabled ?? defaults.enabled,
      email: parsed.email || defaults.email,
      alternateEmail: parsed.alternateEmail || "",
      notifyOwnActions: Boolean(parsed.notifyOwnActions),
      deliveryMode: parsed.deliveryMode || defaults.deliveryMode,
      scheduledTime: parsed.scheduledTime || defaults.scheduledTime,
      intervalMinutes: parsed.intervalMinutes ? Number(parsed.intervalMinutes) : defaults.intervalMinutes,
      events: {
        dealStageChange: parsed.events?.dealStageChange ?? defaults.events.dealStageChange,
        dealUpdates: parsed.events?.dealUpdates ?? defaults.events.dealUpdates,
        quotations: parsed.events?.quotations ?? defaults.events.quotations,
        salesOrders: parsed.events?.salesOrders ?? defaults.events.salesOrders,
        leads: parsed.events?.leads ?? defaults.events.leads,
        tasks: parsed.events?.tasks ?? defaults.events.tasks,
        otherRecords: parsed.events?.otherRecords ?? defaults.events.otherRecords,
      },
    };
  } catch {
    return createDefaultUserNotificationSettings(userId, defaultEmail);
  }
}

/**
 * Synchronous local cache writer for a specific user.
 */
export function saveLocalUserNotificationSettings(settings: UserNotificationSettings): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      getUserNotificationStorageKey(settings.userId),
      JSON.stringify(settings),
    );
    // Dispatch reactive update event
    window.dispatchEvent(
      new CustomEvent("agrocrm:notification-settings-changed", {
        detail: { userId: settings.userId, settings },
      }),
    );
  } catch (err) {
    console.warn("Could not save user notification settings to localStorage:", err);
  }
}

/**
 * Backward-compatible helper for legacy callers.
 */
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

/**
 * Backward-compatible helper for legacy callers.
 */
export function saveNotificationSettings(settings: NotificationSettings): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    console.warn("Could not save notification settings to localStorage:", err);
  }
}

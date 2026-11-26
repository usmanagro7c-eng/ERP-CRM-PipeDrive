import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fromFrappeUserRow,
  toFrappeUserRow,
  createDefaultUserNotificationSettings,
  getUserNotificationStorageKey,
  getLocalUserNotificationSettings,
  saveLocalUserNotificationSettings,
  normalizeDeliveryMode,
  normalizeScheduledTime,
  type FrappeUserNotificationRow,
  type UserNotificationSettings,
} from "@/lib/notification-settings";
import * as api from "@/lib/api";

describe("User Notification Settings & Frappe Child Table Mapping", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  describe("fromFrappeUserRow", () => {
    it("converts a Frappe child table row into frontend UserNotificationSettings", () => {
      const frappeRow: FrappeUserNotificationRow = {
        name: "row-001",
        user: "ali@agrovisions.pk",
        enabled: 1,
        email: "ali@agrovisions.pk",
        alternate_email: "ali.personal@gmail.com",
        delivery_mode: "scheduled",
        scheduled_time: "18:00",
        interval_minutes: 120,
        deal_stage_change: 1,
        deal_updates: 0,
        quotations: 1,
        sales_orders: 0,
        leads: 1,
        tasks: 0,
        other_records: 1,
        notify_own_actions: 1,
      };

      const result = fromFrappeUserRow(frappeRow, "ali@agrovisions.pk");

      expect(result.userId).toBe("ali@agrovisions.pk");
      expect(result.enabled).toBe(true);
      expect(result.email).toBe("ali@agrovisions.pk");
      expect(result.alternateEmail).toBe("ali.personal@gmail.com");
      expect(result.deliveryMode).toBe("scheduled");
      expect(result.scheduledTime).toBe("18:00");
      expect(result.intervalMinutes).toBe(120);
      expect(result.events.dealStageChange).toBe(true);
      expect(result.events.dealUpdates).toBe(false);
      expect(result.events.quotations).toBe(true);
      expect(result.events.salesOrders).toBe(false);
      expect(result.events.leads).toBe(true);
      expect(result.events.tasks).toBe(false);
      expect(result.events.otherRecords).toBe(true);
      expect(result.notifyOwnActions).toBe(true);
    });

    it("normalizes Frappe Desk select values (Instant, Daily Scheduled, Periodic Interval) to lowercase frontend modes", () => {
      expect(fromFrappeUserRow({ delivery_mode: "Instant" }, "u1@example.com").deliveryMode).toBe("instant");
      expect(fromFrappeUserRow({ delivery_mode: "Daily Scheduled" }, "u1@example.com").deliveryMode).toBe("scheduled");
      expect(fromFrappeUserRow({ delivery_mode: "Periodic Interval" }, "u1@example.com").deliveryMode).toBe("interval");
      expect(fromFrappeUserRow({ delivery_mode: "scheduled" }, "u1@example.com").deliveryMode).toBe("scheduled");
      expect(fromFrappeUserRow({ delivery_mode: "instant" }, "u1@example.com").deliveryMode).toBe("instant");
      expect(fromFrappeUserRow({ delivery_mode: "interval" }, "u1@example.com").deliveryMode).toBe("interval");
    });
  });

  describe("normalizeDeliveryMode & normalizeScheduledTime", () => {
    it("normalizes diverse mode representations correctly", () => {
      expect(normalizeDeliveryMode("Instant")).toBe("instant");
      expect(normalizeDeliveryMode("instant")).toBe("instant");
      expect(normalizeDeliveryMode("Daily Scheduled")).toBe("scheduled");
      expect(normalizeDeliveryMode("scheduled")).toBe("scheduled");
      expect(normalizeDeliveryMode("Periodic Interval")).toBe("interval");
      expect(normalizeDeliveryMode("interval")).toBe("interval");
      expect(normalizeDeliveryMode("")).toBe("instant");
      expect(normalizeDeliveryMode(undefined)).toBe("instant");
      expect(normalizeDeliveryMode(null)).toBe("instant");
    });

    it("normalizes scheduled time strings cleanly to HH:MM", () => {
      expect(normalizeScheduledTime("8:30:")).toBe("08:30");
      expect(normalizeScheduledTime("08:30:00")).toBe("08:30");
      expect(normalizeScheduledTime("9:00")).toBe("09:00");
      expect(normalizeScheduledTime("18:15:30")).toBe("18:15");
      expect(normalizeScheduledTime("")).toBe("09:00");
    });
  });

  describe("toFrappeUserRow", () => {
    it("converts frontend UserNotificationSettings into a Frappe child table row format", () => {
      const settings: UserNotificationSettings = {
        userId: "usman.agro7c@gmail.com",
        enabled: true,
        email: "usman.agro7c@gmail.com",
        alternateEmail: "backup@agrovisions.pk",
        notifyOwnActions: false,
        deliveryMode: "interval",
        scheduledTime: "09:00",
        intervalMinutes: 60,
        events: {
          dealStageChange: true,
          dealUpdates: true,
          quotations: false,
          salesOrders: true,
          leads: true,
          tasks: false,
          otherRecords: true,
        },
      };

      const row = toFrappeUserRow(settings, "existing-doc-id-123");

      expect(row.name).toBe("existing-doc-id-123");
      expect(row.user).toBe("usman.agro7c@gmail.com");
      expect(row.enabled).toBe(1);
      expect(row.email).toBe("usman.agro7c@gmail.com");
      expect(row.alternate_email).toBe("backup@agrovisions.pk");
      expect(row.delivery_mode).toBe("interval");
      expect(row.interval_minutes).toBe(60);
      expect(row.deal_stage_change).toBe(1);
      expect(row.deal_updates).toBe(1);
      expect(row.quotations).toBe(0);
      expect(row.sales_orders).toBe(1);
      expect(row.leads).toBe(1);
      expect(row.tasks).toBe(0);
      expect(row.notify_own_actions).toBe(0);
    });
  });

  describe("Multi-User Storage Isolation", () => {
    it("generates unique user-scoped storage keys", () => {
      expect(getUserNotificationStorageKey("UserA@example.com")).toBe(
        "agrocrm.notification_settings:usera@example.com",
      );
      expect(getUserNotificationStorageKey("UserB@example.com")).toBe(
        "agrocrm.notification_settings:userb@example.com",
      );
    });

    it("keeps settings completely isolated between User A and User B", () => {
      const userASettings = createDefaultUserNotificationSettings("user_a@example.com");
      userASettings.enabled = false;
      userASettings.deliveryMode = "scheduled";
      userASettings.events.quotations = false;

      const userBSettings = createDefaultUserNotificationSettings("user_b@example.com");
      userBSettings.enabled = true;
      userBSettings.deliveryMode = "interval";
      userBSettings.events.quotations = true;

      saveLocalUserNotificationSettings(userASettings);
      saveLocalUserNotificationSettings(userBSettings);

      const loadedA = getLocalUserNotificationSettings("user_a@example.com");
      const loadedB = getLocalUserNotificationSettings("user_b@example.com");

      expect(loadedA.enabled).toBe(false);
      expect(loadedA.deliveryMode).toBe("scheduled");
      expect(loadedA.events.quotations).toBe(false);

      expect(loadedB.enabled).toBe(true);
      expect(loadedB.deliveryMode).toBe("interval");
      expect(loadedB.events.quotations).toBe(true);
    });

    it("handles corrupted localStorage gracefully by falling back to defaults", () => {
      window.localStorage.setItem(
        getUserNotificationStorageKey("corrupt@example.com"),
        "invalid-json{}}",
      );
      const loaded = getLocalUserNotificationSettings("corrupt@example.com");
      expect(loaded.userId).toBe("corrupt@example.com");
      expect(loaded.enabled).toBe(true);
      expect(loaded.deliveryMode).toBe("instant");
    });
  });

  describe("Child Table Row Merging Simulation", () => {
    it("updating a single user row in the child table preserves other users rows", () => {
      const existingTable: FrappeUserNotificationRow[] = [
        {
          name: "row-1",
          user: "ahmed@example.com",
          enabled: 1,
          deal_stage_change: 1,
        },
        {
          name: "row-2",
          user: "fatima@example.com",
          enabled: 1,
          deal_stage_change: 1,
        },
      ];

      // Update Fatima's settings
      const fatimaUpdated = createDefaultUserNotificationSettings("fatima@example.com");
      fatimaUpdated.enabled = false;
      fatimaUpdated.events.dealStageChange = false;

      const targetIndex = existingTable.findIndex(
        (r) => r.user.toLowerCase() === fatimaUpdated.userId.toLowerCase(),
      );
      const existingName = targetIndex >= 0 ? existingTable[targetIndex]?.name : undefined;
      const updatedRow = toFrappeUserRow(fatimaUpdated, existingName);

      const mergedTable = [...existingTable];
      if (targetIndex >= 0) {
        mergedTable[targetIndex] = updatedRow;
      } else {
        mergedTable.push(updatedRow);
      }

      // Verify Ahmed's row was untouched
      const firstRow = mergedTable[0]!;
      expect(firstRow.user).toBe("ahmed@example.com");
      expect(firstRow.enabled).toBe(1);
      expect(firstRow.name).toBe("row-1");

      // Verify Fatima's row was updated with her existing doc name
      const secondRow = mergedTable[1]!;
      expect(secondRow.user).toBe("fatima@example.com");
      expect(secondRow.enabled).toBe(0);
      expect(secondRow.deal_stage_change).toBe(0);
      expect(secondRow.name).toBe("row-2");
    });
  });
});

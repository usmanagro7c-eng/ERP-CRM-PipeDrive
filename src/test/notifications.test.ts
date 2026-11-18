import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getNotificationSettings,
  saveNotificationSettings,
  DEFAULT_NOTIFICATION_SETTINGS,
  NOTIFICATION_STORAGE_KEY,
  type NotificationSettings,
} from "@/lib/notification-settings";
import {
  notifyStageChange,
  notifyEntityChange,
  sendTestNotification,
} from "@/lib/change-notifications";
import * as api from "@/lib/api";

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    sendEmail: vi.fn().mockResolvedValue({ message: "queued" }),
    sendTestNotification: vi.fn().mockResolvedValue({
      success: true,
      recipients: ["admin@example.com", "usman.agro7c@gmail.com"],
      count: 2,
    }),
  };
});

describe("Notification Settings & Dispatchers", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  describe("getNotificationSettings & saveNotificationSettings", () => {
    it("returns default settings when storage is empty", () => {
      const settings = getNotificationSettings();
      expect(settings.enabled).toBe(true);
      expect(settings.recipients).toContain("usman.agro7c@gmail.com");
      expect(settings.events.dealStageChange).toBe(true);
      expect(settings.events.salesOrders).toBe(true);
    });

    it("persists updated settings and loads them back", () => {
      const custom: NotificationSettings = {
        enabled: true,
        recipients: ["sales@agrovisions.pk", "ceo@agrovisions.pk"],
        events: {
          dealStageChange: true,
          dealUpdates: false,
          quotations: true,
          salesOrders: false,
          leads: true,
          otherRecords: false,
        },
      };

      saveNotificationSettings(custom);
      const loaded = getNotificationSettings();

      expect(loaded.enabled).toBe(true);
      expect(loaded.recipients).toEqual(["sales@agrovisions.pk", "ceo@agrovisions.pk"]);
      expect(loaded.events.dealUpdates).toBe(false);
      expect(loaded.events.quotations).toBe(true);
      expect(loaded.events.salesOrders).toBe(false);
    });

    it("handles invalid json gracefully by falling back to defaults", () => {
      window.localStorage.setItem(NOTIFICATION_STORAGE_KEY, "invalid-json-string{");
      const loaded = getNotificationSettings();
      expect(loaded.recipients).toEqual(DEFAULT_NOTIFICATION_SETTINGS.recipients);
    });
  });

  describe("notifyStageChange (browser no-op)", () => {
    it("does not call sendEmail directly as dispatch is owned by Frappe doc_events", async () => {
      saveNotificationSettings({
        enabled: true,
        recipients: ["test@example.com"],
        events: {
          ...DEFAULT_NOTIFICATION_SETTINGS.events,
          dealStageChange: true,
        },
      });

      await notifyStageChange({
        dealId: "DEAL-001",
        dealTitle: "Wheat Seeds Supply",
        fromStage: "Lead In",
        toStage: "Negotiation",
        organization: "Punjab Agri Corp",
        dealValue: 500000,
      });

      // Browser dispatch is now retired to prevent duplicate emails
      expect(api.sendEmail).not.toHaveBeenCalled();
    });

    it("safely handles execution without errors when notifications are disabled", async () => {
      saveNotificationSettings({
        enabled: false,
        recipients: ["test@example.com"],
        events: {
          ...DEFAULT_NOTIFICATION_SETTINGS.events,
          dealStageChange: true,
        },
      });

      await expect(
        notifyStageChange({
          dealId: "DEAL-002",
          dealTitle: "Fertilizer Deal",
          toStage: "Won",
        }),
      ).resolves.not.toThrow();

      expect(api.sendEmail).not.toHaveBeenCalled();
    });
  });

  describe("notifyEntityChange (browser no-op)", () => {
    it("does not call sendEmail for Sales Orders or other records (server-side hook owns dispatch)", async () => {
      await notifyEntityChange({
        doctype: "Sales Order",
        docname: "SO-2026-001",
        title: "Kisan Trading Co",
        action: "Created",
        eventCategory: "salesOrders",
        summary: "New order booked",
      });

      expect(api.sendEmail).not.toHaveBeenCalled();
    });

    it("safely handles field update notifications as a no-op", async () => {
      await notifyEntityChange({
        doctype: "CRM Deal",
        docname: "CRM-DEAL-0099",
        title: "Agro Tech Supply",
        action: "Data Updated",
        eventCategory: "dealUpdates",
        summary: "Updated: Deal Value (PKR 750,000) | Probability (75%)",
        details: {
          "Deal Value": "PKR 750,000",
          Probability: "75%",
          Territory: "Punjab North",
        },
      });

      expect(api.sendEmail).not.toHaveBeenCalled();
    });
  });

  describe("sendTestNotification", () => {
    it("calls server api.sendTestNotification endpoint", async () => {
      const res = await sendTestNotification();
      expect(api.sendTestNotification).toHaveBeenCalledTimes(1);
      expect(res).toEqual({
        success: true,
        recipients: ["admin@example.com", "usman.agro7c@gmail.com"],
        count: 2,
      });
    });
  });
});

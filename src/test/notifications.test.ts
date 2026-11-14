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

  describe("notifyStageChange", () => {
    it("sends an HTML email with stage details when enabled", async () => {
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

      expect(api.sendEmail).toHaveBeenCalledTimes(1);
      const emailArgs = (api.sendEmail as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(emailArgs.recipients).toBe("test@example.com");
      expect(emailArgs.subject).toContain("Deal \"Wheat Seeds Supply\" moved to \"Negotiation\"");
      expect(emailArgs.content).toContain("Lead In");
      expect(emailArgs.content).toContain("Negotiation");
      expect(emailArgs.content).toContain("500,000");
      expect(emailArgs.content).toContain("Punjab Agri Corp");
    });

    it("does not dispatch email when master notifications or stage changes are disabled", async () => {
      saveNotificationSettings({
        enabled: false,
        recipients: ["test@example.com"],
        events: {
          ...DEFAULT_NOTIFICATION_SETTINGS.events,
          dealStageChange: true,
        },
      });

      await notifyStageChange({
        dealId: "DEAL-002",
        dealTitle: "Fertilizer Deal",
        toStage: "Won",
      });

      expect(api.sendEmail).not.toHaveBeenCalled();
    });
  });

  describe("notifyEntityChange", () => {
    it("sends formatted notification for entity changes like Sales Orders", async () => {
      saveNotificationSettings({
        enabled: true,
        recipients: ["admin@example.com"],
        events: {
          ...DEFAULT_NOTIFICATION_SETTINGS.events,
          salesOrders: true,
        },
      });

      await notifyEntityChange({
        doctype: "Sales Order",
        docname: "SO-2026-001",
        title: "Kisan Trading Co",
        action: "Created",
        eventCategory: "salesOrders",
        summary: "New order booked",
      });

      expect(api.sendEmail).toHaveBeenCalledTimes(1);
      const emailArgs = (api.sendEmail as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(emailArgs.recipients).toBe("admin@example.com");
      expect(emailArgs.subject).toContain("Sales Order \"SO-2026-001\" was Created");
      expect(emailArgs.content).toContain("Kisan Trading Co");
    });

    it("sends granular field update notifications when deal data changes", async () => {
      saveNotificationSettings({
        enabled: true,
        recipients: ["manager@example.com"],
        events: {
          ...DEFAULT_NOTIFICATION_SETTINGS.events,
          dealUpdates: true,
        },
      });

      await notifyEntityChange({
        doctype: "CRM Deal",
        docname: "CRM-DEAL-0099",
        title: "Agro Tech Supply",
        action: "Data Updated",
        eventCategory: "dealUpdates",
        summary: "Updated: Deal Value (PKR 750,000) | Probability (75%)",
        details: {
          "Deal Value": "PKR 750,000",
          "Probability": "75%",
          "Territory": "Punjab North",
        },
      });

      expect(api.sendEmail).toHaveBeenCalledTimes(1);
      const emailArgs = (api.sendEmail as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(emailArgs.recipients).toBe("manager@example.com");
      expect(emailArgs.subject).toContain("CRM Deal \"CRM-DEAL-0099\" was Data Updated");
      expect(emailArgs.content).toContain("PKR 750,000");
      expect(emailArgs.content).toContain("75%");
      expect(emailArgs.content).toContain("Punjab North");
    });
  });

  describe("sendTestNotification", () => {
    it("dispatches test verification email to provided recipients", async () => {
      await sendTestNotification(["user1@test.com", "user2@test.com"]);
      expect(api.sendEmail).toHaveBeenCalledTimes(1);
      const emailArgs = (api.sendEmail as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(emailArgs.recipients).toBe("user1@test.com, user2@test.com");
      expect(emailArgs.subject).toContain("Test Notification Email");
    });

    it("throws error if no valid email is provided", async () => {
      await expect(sendTestNotification(["invalid-email", ""])).rejects.toThrow(
        "No valid recipient emails configured.",
      );
    });
  });
});

import { toast } from "sonner";
import * as api from "@/lib/api";

export interface OfflineAction {
  id: string;
  doctype: string;
  action: "create" | "update" | "delete";
  name?: string;
  payload: Record<string, unknown>;
  description: string;
  timestamp: number;
}

const STORAGE_KEY = "agrocrm.offline_outbox";
const LISTENERS = new Set<() => void>();

function notifyListeners() {
  for (const listener of LISTENERS) {
    listener();
  }
}

export function subscribeToOfflineSync(listener: () => void) {
  LISTENERS.add(listener);
  return () => {
    LISTENERS.delete(listener);
  };
}

/** Get all pending offline actions in the outbox */
export function getOfflineOutbox(): OfflineAction[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as OfflineAction[]) : [];
  } catch {
    return [];
  }
}

/** Save an action into the offline outbox */
export function queueOfflineAction(action: Omit<OfflineAction, "id" | "timestamp">): OfflineAction {
  const item: OfflineAction = {
    ...action,
    id: `offline_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: Date.now(),
  };

  const queue = getOfflineOutbox();
  queue.push(item);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.warn("Could not save to offline outbox:", err);
  }

  notifyListeners();
  toast.info(`Saved locally (Offline Mode): "${item.description}"`, {
    description: "Will automatically sync as soon as internet is restored.",
    duration: 5000,
  });

  return item;
}

/** Remove an action from the outbox */
export function removeOfflineAction(id: string) {
  const queue = getOfflineOutbox().filter((item) => item.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {
    // ignore
  }
  notifyListeners();
}

/** Clear all outbox items */
export function clearOfflineOutbox() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  notifyListeners();
}

/** Process and sync all pending offline actions to Frappe */
export async function syncOfflineOutbox(): Promise<{ success: number; failed: number }> {
  if (typeof window === "undefined" || !navigator.onLine) {
    return { success: 0, failed: 0 };
  }

  const queue = getOfflineOutbox();
  if (queue.length === 0) return { success: 0, failed: 0 };

  let successCount = 0;
  let failedCount = 0;
  const remainingQueue: OfflineAction[] = [];

  for (const item of queue) {
    try {
      if (item.action === "create") {
        if (item.doctype === api.DEAL_DOCTYPE) {
          await api.createDeal(item.payload);
        } else if (item.doctype === api.ORG_DOCTYPE) {
          await api.createOrganization(item.payload);
        } else if (item.doctype === api.CONTACT_DOCTYPE) {
          await api.createContact(item.payload);
        } else if (item.doctype === api.NOTE_DOCTYPE) {
          await api.createNote(item.payload);
        } else if (item.doctype === api.TASK_DOCTYPE) {
          await api.createTask(item.payload as { title: string; [key: string]: unknown });
        } else if (item.doctype === api.CALL_LOG_DOCTYPE) {
          await api.createCallLog(item.payload);
        } else if (item.doctype === api.LEAD_DOCTYPE) {
          await api.createLead(item.payload);
        } else if (item.doctype === api.QUOTATION_DOCTYPE) {
          await api.createQuotation(item.payload);
        } else if (item.doctype === api.SALES_ORDER_DOCTYPE) {
          await api.createSalesOrder(item.payload);
        }
      } else if (item.action === "update" && item.name) {
        if (item.doctype === api.DEAL_DOCTYPE) {
          await api.updateDeal(item.name, item.payload);
        } else if (item.doctype === api.ORG_DOCTYPE) {
          await api.updateOrganization(item.name, item.payload);
        } else if (item.doctype === api.CONTACT_DOCTYPE) {
          await api.updateContact(item.name, item.payload);
        } else if (item.doctype === api.NOTE_DOCTYPE) {
          await api.updateNote(item.name, item.payload);
        } else if (item.doctype === api.TASK_DOCTYPE) {
          await api.updateTask(item.name, item.payload);
        } else if (item.doctype === api.CALL_LOG_DOCTYPE) {
          await api.updateCallLog(item.name, item.payload);
        } else if (item.doctype === api.LEAD_DOCTYPE) {
          await api.updateLead(item.name, item.payload);
        } else if (item.doctype === api.QUOTATION_DOCTYPE) {
          await api.updateQuotation(item.name, item.payload);
        } else if (item.doctype === api.SALES_ORDER_DOCTYPE) {
          await api.updateSalesOrder(item.name, item.payload);
        }
      }
      successCount++;
    } catch (err) {
      console.error(`Failed to sync offline item ${item.id}:`, err);
      failedCount++;
      remainingQueue.push(item);
    }
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(remainingQueue));
  } catch {
    // ignore
  }

  notifyListeners();

  if (successCount > 0) {
    toast.success(`Synced ${successCount} offline record${successCount > 1 ? "s" : ""} with CRM!`, {
      description: "Your local field updates are now live on the server.",
    });
  }

  if (failedCount > 0) {
    toast.error(`${failedCount} item${failedCount > 1 ? "s" : ""} could not be synced.`, {
      description: "Will retry automatically on next connection check.",
    });
  }

  return { success: successCount, failed: failedCount };
}

/** Setup background auto-sync listeners */
export function initOfflineAutoSync(onSyncComplete?: () => void) {
  if (typeof window === "undefined") return () => {};

  const handleOnline = async () => {
    toast.info("Internet connection restored!", {
      description: "Syncing pending offline changes...",
    });
    const result = await syncOfflineOutbox();
    if (result.success > 0 && onSyncComplete) {
      onSyncComplete();
    }
  };

  window.addEventListener("online", handleOnline);

  // Periodic retry check every 45 seconds if queue has items and we are online
  const interval = setInterval(async () => {
    if (navigator.onLine && getOfflineOutbox().length > 0) {
      const result = await syncOfflineOutbox();
      if (result.success > 0 && onSyncComplete) {
        onSyncComplete();
      }
    }
  }, 45000);

  return () => {
    window.removeEventListener("online", handleOnline);
    clearInterval(interval);
  };
}

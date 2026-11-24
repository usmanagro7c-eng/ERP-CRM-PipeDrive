import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  WifiOff,
  RefreshCw,
  Clock,
  Trash2,
  Send,
  CloudOff,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  getOfflineOutbox,
  removeOfflineAction,
  syncOfflineOutbox,
  subscribeToOfflineSync,
  initOfflineAutoSync,
  type OfflineAction,
} from "@/lib/offline-sync";
import { cn } from "@/lib/utils";

export function OfflineStatusBar() {
  const queryClient = useQueryClient();
  const [isOnline, setIsOnline] = useState(() =>
    typeof window !== "undefined" ? navigator.onLine : true,
  );
  const [outbox, setOutbox] = useState<OfflineAction[]>(() => getOfflineOutbox());
  const [syncing, setSyncing] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const unsubscribe = subscribeToOfflineSync(() => {
      setOutbox(getOfflineOutbox());
    });

    const cleanupAutoSync = initOfflineAutoSync(() => {
      void queryClient.invalidateQueries();
    });

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      unsubscribe();
      cleanupAutoSync();
    };
  }, [queryClient]);

  async function handleSyncNow() {
    setSyncing(true);
    try {
      const result = await syncOfflineOutbox();
      if (result.success > 0) {
        void queryClient.invalidateQueries();
      }
    } finally {
      setSyncing(false);
    }
  }

  // If online and no pending outbox items, don't clutter screen
  if (isOnline && outbox.length === 0) return null;

  return (
    <>
      {/* Top Banner Indicator */}
      <div
        role="status"
        aria-live="polite"
        className={cn(
          "w-full px-3 py-1.5 text-xs font-medium flex items-center justify-between gap-2 transition-colors z-40 border-b",
          !isOnline
            ? "bg-amber-500/15 text-amber-900 dark:text-amber-200 border-amber-500/30"
            : "bg-primary/10 text-primary border-primary/20",
        )}
      >
        <div className="flex items-center gap-2 truncate">
          {!isOnline ? (
            <WifiOff className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400 animate-pulse" />
          ) : (
            <RefreshCw
              className={cn("size-3.5 shrink-0 text-primary", syncing && "animate-spin")}
            />
          )}

          <span className="truncate">
            {!isOnline ? (
              <>
                <strong>Offline Field Mode:</strong> Working without internet. Changes are saved
                locally.
              </>
            ) : (
              <>
                <strong>Internet Restored:</strong> {outbox.length} pending offline record
                {outbox.length > 1 ? "s" : ""} waiting to sync.
              </>
            )}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setDrawerOpen(true)}
            className="h-6 px-2 text-[11px] font-semibold underline-offset-2 hover:underline cursor-pointer"
          >
            Outbox ({outbox.length})
          </Button>

          {isOnline && outbox.length > 0 && (
            <Button
              size="sm"
              disabled={syncing}
              onClick={() => void handleSyncNow()}
              className="h-6 px-2.5 text-[11px] font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-md shadow-2xs gap-1 cursor-pointer"
            >
              <RefreshCw className={cn("size-3", syncing && "animate-spin")} />
              <span>{syncing ? "Syncing…" : "Sync Now"}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Outbox Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
          <SheetHeader className="p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <CloudOff className="size-5 text-amber-600" />
              <SheetTitle className="text-base font-bold">Offline Outbox</SheetTitle>
            </div>
            <SheetDescription className="text-xs text-muted-foreground">
              These records were created or modified while offline. They will sync automatically
              when connected to CRM Backend.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
            {outbox.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
                <CheckCircle2 className="size-8 text-emerald-500/80" />
                <span>Outbox is empty! All changes are synced with the live server.</span>
              </div>
            ) : (
              outbox.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-border bg-card p-3 shadow-2xs space-y-1.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                      {item.doctype} · {item.action}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeOfflineAction(item.id)}
                      className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                      title="Discard local change"
                      aria-label={`Discard local change: ${item.description}`}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>

                  <h5 className="font-semibold text-xs text-foreground">{item.description}</h5>

                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Clock className="size-3" />
                    <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {outbox.length > 0 && (
            <div className="p-4 border-t border-border bg-card/50 flex items-center justify-between gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDrawerOpen(false)}
                className="text-xs"
              >
                Close
              </Button>
              <Button
                size="sm"
                disabled={!isOnline || syncing}
                onClick={() => void handleSyncNow()}
                className="text-xs font-semibold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Send className="size-3.5" />
                <span>{syncing ? "Syncing…" : "Sync All to Frappe"}</span>
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

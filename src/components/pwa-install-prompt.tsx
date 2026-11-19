import { useState, useEffect } from "react";
import { Download, Share, X, Sparkles, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "agrocrm.pwa.prompt_dismissed_until";

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [visible, setVisible] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if already running in standalone / full-screen PWA mode
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-expect-error - iOS Safari non-standard property
      Boolean(window.navigator.standalone);

    setIsStandalone(standalone);
    if (standalone) return;

    // Check if previously dismissed in the last 7 days
    const dismissedUntil = localStorage.getItem(DISMISS_KEY);
    if (dismissedUntil && Number(dismissedUntil) > Date.now()) {
      return;
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleMobile =
      /iphone|ipad|ipod/.test(userAgent) &&
      !Boolean((window as unknown as { MSStream?: unknown }).MSStream);
    setIsIos(isAppleMobile);

    // Capture Android / Chrome PWA install trigger
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Wait 3 seconds after page load before showing prompt
      setTimeout(() => setVisible(true), 3000);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // On iOS Safari, show prompt after 4 seconds if on mobile
    if (isAppleMobile && window.innerWidth < 768) {
      const timer = setTimeout(() => setVisible(true), 4000);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  function handleDismiss() {
    setVisible(false);
    setShowIosGuide(false);
    // Suppress for 7 days
    localStorage.setItem(DISMISS_KEY, String(Date.now() + 7 * 24 * 60 * 60 * 1000));
  }

  async function handleInstallClick() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setVisible(false);
      }
      setDeferredPrompt(null);
    } else if (isIos) {
      setShowIosGuide(true);
    }
  }

  if (isStandalone || !visible) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 left-3 right-3 md:left-auto md:right-6 md:w-96 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-card/95 backdrop-blur-md p-4 shadow-xl shadow-primary/10">
        {/* Subtle accent sheen */}
        <div className="pointer-events-none absolute -top-12 -right-12 size-28 rounded-full bg-primary/15 blur-xl" />

        <div className="flex items-start gap-3">
          {/* Brand Icon Badge */}
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Smartphone className="size-5" />
          </div>

          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs font-bold text-foreground tracking-tight">
                Install AgroCRM
              </h4>
              <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/10 px-1.5 py-0.2 text-[9px] font-semibold text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                <Sparkles className="size-2.5" />
                Full Screen
              </span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground leading-snug">
              Remove the browser bar and run AgroCRM as a 100% full-screen native mobile app.
            </p>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            className="text-muted-foreground/60 hover:text-foreground p-1 rounded-md cursor-pointer transition-colors"
            aria-label="Dismiss banner"
          >
            <X className="size-3.5" />
          </button>
        </div>

        {/* Action Button / iOS Guide */}
        <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between gap-2">
          {showIosGuide ? (
            <div className="text-[11px] text-foreground bg-primary/10 rounded-lg p-2 flex items-center gap-2 w-full animate-in fade-in">
              <Share className="size-4 text-primary shrink-0" />
              <span>
                Tap the <strong>Share</strong> button below in Safari, then select{" "}
                <strong>'Add to Home Screen'</strong> ➕.
              </span>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={handleDismiss}
                className="text-[11px] text-muted-foreground hover:text-foreground font-medium px-2 py-1 cursor-pointer"
              >
                Maybe later
              </button>

              <Button
                size="sm"
                onClick={handleInstallClick}
                className="h-8 text-xs font-semibold px-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs gap-1.5 cursor-pointer ml-auto"
              >
                <Download className="size-3.5" />
                <span>{isIos ? "How to Install" : "Install App"}</span>
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

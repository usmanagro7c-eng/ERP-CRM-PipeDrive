import { useEffect, useState } from "react";
import { useIsFetching, useIsMutating } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import { Leaf, Loader2, Sparkles, RefreshCw, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Global Top Loading Bar
 * Shows automatically across the top of the browser during route transitions
 * and background TanStack Query fetches / mutations.
 */
export function TopLoadingBar() {
  const isRouterLoading = useRouterState({ select: (s) => s.isLoading });
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();

  const active = isRouterLoading || isFetching > 0 || isMutating > 0;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (active) {
      // Delay slightly to prevent flashing on instant cache hits
      timer = setTimeout(() => setVisible(true), 120);
    } else {
      // Smooth fade out
      timer = setTimeout(() => setVisible(false), 250);
    }
    return () => clearTimeout(timer);
  }, [active]);

  if (!visible && !active) return null;

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-50 pointer-events-none transition-opacity duration-300",
        active ? "opacity-100" : "opacity-0",
      )}
    >
      {/* Background Track */}
      <div className="h-[3px] w-full bg-primary/10 overflow-hidden relative">
        {/* Animated Glowing Progress Bar */}
        <div className="absolute top-0 bottom-0 w-1/2 bg-gradient-to-r from-primary/30 via-primary to-emerald-400 shadow-[0_0_12px_rgba(34,197,94,0.6)] animate-loading-bar rounded-full" />
      </div>

      {/* Subtle indicator pill top right */}
      {active && (
        <div className="fixed top-2.5 right-4 z-50 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-background/90 backdrop-blur-md border border-primary/20 shadow-xs text-[11px] font-medium text-foreground transition-all duration-300 animate-in fade-in slide-in-from-top-1">
          <span className="relative flex size-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full size-2 bg-primary" />
          </span>
          <span className="text-muted-foreground">Syncing CRM</span>
        </div>
      )}
    </div>
  );
}

/**
 * Fullscreen App Loader for Initial Launch / Session Auth
 */
export function AppLoadingScreen({ message }: { message?: string }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-b from-background via-muted/20 to-background px-4">
      <div className="relative flex flex-col items-center max-w-sm text-center">
        {/* Pulsing Aura Rings */}
        <div className="relative flex items-center justify-center mb-6">
          <div className="absolute size-24 rounded-full bg-primary/10 animate-pulse-ring" />
          <div className="absolute size-20 rounded-full border border-primary/20 animate-spin-slow" />
          <div className="absolute size-16 rounded-full border-t-2 border-primary animate-spin" />

          {/* Center Logo Card */}
          <div className="relative size-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/25 text-primary-foreground transform transition-transform hover:scale-105">
            <Leaf className="size-7" />
          </div>
        </div>

        {/* Brand & Loading Text */}
        <h2 className="text-xl font-bold tracking-tight text-foreground font-display flex items-center gap-2">
          AgroCRM
          <Sparkles className="size-4 text-primary animate-pulse" />
        </h2>

        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
          {message || (elapsed > 3 ? "Connecting to live Frappe CRM..." : "Loading workspace...")}
        </p>

        {/* Animated Progress Dots */}
        <div className="flex items-center gap-1.5 mt-5">
          <span className="size-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
          <span className="size-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
          <span className="size-2 rounded-full bg-primary animate-bounce" />
        </div>

        {elapsed > 5 && (
          <p className="text-[11px] text-muted-foreground/80 mt-4 bg-muted/60 px-3 py-1.5 rounded-full border border-border/50 animate-in fade-in">
            Communicating with Frappe server, thanks for your patience!
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Beautiful Section / Page Loading State
 * Used inside modules when queries are in progress.
 */
export function LoadingState({
  title = "Loading data...",
  description,
  icon: Icon = RefreshCw,
  className,
}: {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  className?: string;
}) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 px-4 text-center rounded-xl border border-dashed bg-card/60 backdrop-blur-xs",
        className,
      )}
    >
      <div className="relative flex items-center justify-center mb-4">
        <div className="absolute size-14 rounded-full bg-primary/10 animate-pulse-ring" />
        <div className="absolute size-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
        <div className="size-10 rounded-full bg-muted flex items-center justify-center text-primary shadow-xs">
          <Icon className="size-5 animate-pulse" />
        </div>
      </div>

      <h3 className="text-sm font-semibold text-foreground tracking-tight">{title}</h3>

      <p className="text-xs text-muted-foreground mt-1 max-w-sm">
        {description ||
          (seconds > 3
            ? "Syncing live records with Frappe CRM backend..."
            : "Please wait a moment while we fetch the latest records.")}
      </p>

      {seconds > 4 && (
        <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-primary bg-primary/10 px-2.5 py-0.5 rounded-full font-medium animate-in fade-in">
          <Loader2 className="size-3 animate-spin" />
          <span>Server response in progress</span>
        </div>
      )}
    </div>
  );
}

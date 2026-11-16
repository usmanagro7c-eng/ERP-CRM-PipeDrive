import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Plus,
  X,
  Columns3,
  Users,
  CalendarClock,
  PhoneCall,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

const QUICK_ACTIONS = [
  {
    label: "New Deal",
    to: "/deals",
    icon: Columns3,
    color: "bg-orange-500 text-white",
  },
  {
    label: "New Contact",
    to: "/contacts",
    icon: Users,
    color: "bg-blue-500 text-white",
  },
  {
    label: "New Quotation",
    to: "/quotations",
    icon: FileText,
    color: "bg-cyan-600 text-white",
  },
  {
    label: "New Task",
    to: "/activities",
    icon: CalendarClock,
    color: "bg-emerald-600 text-white",
  },
  {
    label: "Call Log",
    to: "/calls",
    icon: PhoneCall,
    color: "bg-rose-500 text-white",
  },
];

export function MobileQuickActionFab() {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden fixed bottom-18 right-4 z-40 flex flex-col items-end">
      {/* Dimmed backdrop when speed-dial is expanded */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 bg-background/60 backdrop-blur-xs z-30 transition-opacity animate-in fade-in"
        />
      )}

      {/* Expanded Speed-Dial Options */}
      {open && (
        <div className="relative z-40 mb-3 flex flex-col items-end gap-2.5 animate-in fade-in slide-in-from-bottom-3 duration-200">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.label}
                to={action.to}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 group cursor-pointer"
              >
                <span className="rounded-lg bg-card/95 backdrop-blur-md px-2.5 py-1 text-xs font-semibold text-foreground shadow-sm border border-border/80">
                  {action.label}
                </span>
                <span
                  className={cn(
                    "flex size-10 items-center justify-center rounded-full shadow-md transition-transform active:scale-95",
                    action.color,
                  )}
                >
                  <Icon className="size-4.5" />
                </span>
              </Link>
            );
          })}
        </div>
      )}

      {/* Main Floating Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label={open ? "Close quick actions" : "Open quick actions"}
        className={cn(
          "relative z-40 flex size-12 items-center justify-center rounded-full shadow-lg transition-all duration-200 active:scale-95 cursor-pointer",
          open
            ? "bg-neutral-800 text-white rotate-45"
            : "bg-primary text-primary-foreground hover:bg-primary/95 shadow-primary/25",
        )}
      >
        <Plus className="size-6 transition-transform duration-200" />
      </button>
    </div>
  );
}

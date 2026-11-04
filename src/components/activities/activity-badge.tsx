import { CheckCircle2, Clock, AlertTriangle, AlertCircle, CircleDot, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string; bar: string }> = {
  Todo: {
    bg: "bg-blue-50 dark:bg-blue-950/40",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-200 dark:border-blue-800",
    bar: "bg-blue-500",
  },
  "In Progress": {
    bg: "bg-orange-50 dark:bg-orange-950/40",
    text: "text-orange-700 dark:text-orange-300",
    border: "border-orange-200 dark:border-orange-800",
    bar: "bg-orange-500",
  },
  Done: {
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200 dark:border-emerald-800",
    bar: "bg-emerald-500",
  },
  Backlog: {
    bg: "bg-slate-100 dark:bg-slate-800",
    text: "text-slate-700 dark:text-slate-300",
    border: "border-slate-300 dark:border-slate-700",
    bar: "bg-slate-400",
  },
  Canceled: {
    bg: "bg-rose-50 dark:bg-rose-950/40",
    text: "text-rose-700 dark:text-rose-300",
    border: "border-rose-200 dark:border-rose-800",
    bar: "bg-rose-500",
  },
};

export function getActivityStatusStyle(status?: string | null) {
  if (!status) {
    return {
      bg: "bg-muted",
      text: "text-muted-foreground",
      border: "border-border",
      bar: "bg-muted-foreground",
    };
  }
  return (
    STATUS_STYLES[status] ?? {
      bg: "bg-sky-50 dark:bg-sky-950/40",
      text: "text-sky-700 dark:text-sky-300",
      border: "border-sky-200 dark:border-sky-800",
      bar: "bg-sky-500",
    }
  );
}

export function ActivityStatusBadge({
  status,
  className,
}: {
  status?: string | null;
  className?: string | undefined;
}) {
  if (!status) return <span className="text-muted-foreground">—</span>;

  const style = getActivityStatusStyle(status);
  const isDone = status === "Done";
  const isCanceled = status === "Canceled";

  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium border rounded-full transition-colors",
        style.bg,
        style.text,
        style.border,
        className,
      )}
    >
      {isDone ? (
        <CheckCircle2 className="size-3 text-emerald-600 dark:text-emerald-400" />
      ) : isCanceled ? (
        <XCircle className="size-3 text-rose-600 dark:text-rose-400" />
      ) : (
        <CircleDot className="size-2.5 opacity-80" />
      )}
      <span>{status}</span>
    </Badge>
  );
}

export function ActivityPriorityBadge({
  priority,
  className,
}: {
  priority?: string | null | undefined;
  className?: string | undefined;
}) {
  if (!priority) return null;

  const isHigh = priority.toLowerCase() === "high";
  const isMed = priority.toLowerCase() === "medium";
  const isLow = priority.toLowerCase() === "low";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider",
        isHigh && "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
        isMed && "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
        isLow && "bg-slate-100 text-slate-700 dark:bg-slate-850 dark:text-slate-300",
        className,
      )}
      title={`Priority: ${priority}`}
    >
      {isHigh ? (
        <AlertTriangle className="size-2.5" />
      ) : isMed ? (
        <AlertCircle className="size-2.5" />
      ) : (
        <Clock className="size-2.5" />
      )}
      {priority}
    </span>
  );
}

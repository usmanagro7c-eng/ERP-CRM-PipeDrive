import {
  CheckCircle2,
  XCircle,
  CircleDot,
  Flame,
  ThermometerSnowflake,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string; bar: string }> = {
  New: {
    bg: "bg-slate-100 dark:bg-slate-800",
    text: "text-slate-700 dark:text-slate-300",
    border: "border-slate-300 dark:border-slate-700",
    bar: "bg-slate-400",
  },
  Contacted: {
    bg: "bg-orange-50 dark:bg-orange-950/40",
    text: "text-orange-700 dark:text-orange-300",
    border: "border-orange-200 dark:border-orange-800",
    bar: "bg-orange-500",
  },
  Nurture: {
    bg: "bg-blue-50 dark:bg-blue-950/40",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-200 dark:border-blue-800",
    bar: "bg-blue-500",
  },
  Qualified: {
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200 dark:border-emerald-800",
    bar: "bg-emerald-500",
  },
  Converted: {
    bg: "bg-teal-50 dark:bg-teal-950/40",
    text: "text-teal-700 dark:text-teal-300",
    border: "border-teal-200 dark:border-teal-800",
    bar: "bg-teal-500",
  },
  Unqualified: {
    bg: "bg-rose-50 dark:bg-rose-950/40",
    text: "text-rose-700 dark:text-rose-300",
    border: "border-rose-200 dark:border-rose-800",
    bar: "bg-rose-500",
  },
  Junk: {
    bg: "bg-purple-50 dark:bg-purple-950/40",
    text: "text-purple-700 dark:text-purple-300",
    border: "border-purple-200 dark:border-purple-800",
    bar: "bg-purple-500",
  },
};

export function getLeadStatusStyle(statusName?: string | null) {
  if (!statusName) {
    return {
      bg: "bg-muted",
      text: "text-muted-foreground",
      border: "border-border",
      bar: "bg-muted-foreground",
    };
  }
  return (
    STATUS_STYLES[statusName] ?? {
      bg: "bg-sky-50 dark:bg-sky-950/40",
      text: "text-sky-700 dark:text-sky-300",
      border: "border-sky-200 dark:border-sky-800",
      bar: "bg-sky-500",
    }
  );
}

export function LeadStatusBadge({
  status,
  className,
}: {
  status?: string | null;
  className?: string;
}) {
  if (!status) return <span className="text-muted-foreground">—</span>;

  const style = getLeadStatusStyle(status);
  const isWon = status === "Qualified" || status === "Converted";
  const isLost = status === "Unqualified" || status === "Junk";

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
      {isWon ? (
        <CheckCircle2 className="size-3 text-emerald-600 dark:text-emerald-400" />
      ) : isLost ? (
        <XCircle className="size-3 text-rose-600 dark:text-rose-400" />
      ) : (
        <CircleDot className="size-2.5 opacity-80" />
      )}
      <span>{status}</span>
    </Badge>
  );
}

export function LeadTemperatureBadge({
  temp,
  className,
}: {
  temp?: string | null | undefined;
  className?: string | undefined;
}) {
  if (!temp) return null;

  const isHot = temp.toLowerCase() === "hot";
  const isWarm = temp.toLowerCase() === "warm";
  const isCold = temp.toLowerCase() === "cold";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider",
        isHot && "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
        isWarm && "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
        isCold && "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
        className,
      )}
      title={`Lead Temperature: ${temp}`}
    >
      {isHot ? (
        <Flame className="size-2.5" />
      ) : isCold ? (
        <ThermometerSnowflake className="size-2.5" />
      ) : (
        <Sparkles className="size-2.5" />
      )}
      {temp}
    </span>
  );
}

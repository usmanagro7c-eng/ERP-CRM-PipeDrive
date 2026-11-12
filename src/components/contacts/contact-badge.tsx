import { CheckCircle2, Clock, MessageSquareQuote } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string; bar: string }> = {
  Open: {
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200 dark:border-emerald-800",
    bar: "bg-emerald-500",
  },
  Passive: {
    bg: "bg-slate-100 dark:bg-slate-800",
    text: "text-slate-700 dark:text-slate-300",
    border: "border-slate-300 dark:border-slate-700",
    bar: "bg-slate-400",
  },
  Replied: {
    bg: "bg-blue-50 dark:bg-blue-950/40",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-200 dark:border-blue-800",
    bar: "bg-blue-500",
  },
};

export function getContactStatusStyle(status?: string | null) {
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

export function ContactStatusBadge({
  status,
  className,
}: {
  status?: string | null;
  className?: string;
}) {
  const value = status || "Passive";
  const style = getContactStatusStyle(value);

  const Icon = value === "Open" ? CheckCircle2 : value === "Replied" ? MessageSquareQuote : Clock;

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 px-2 py-0.5 text-xs font-medium capitalize shrink-0 border",
        style.bg,
        style.text,
        style.border,
        className,
      )}
    >
      <Icon className="size-3 shrink-0" />
      <span>{value}</span>
    </Badge>
  );
}

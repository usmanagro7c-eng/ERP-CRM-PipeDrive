import { CheckCircle2, XCircle, Clock, CircleDot, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface StageInfo {
  name: string;
  type?: string;
  color?: string;
}

const STAGE_STYLES: Record<string, { bg: string; text: string; border: string; bar: string }> = {
  Qualification: {
    bg: "bg-slate-100 dark:bg-slate-800",
    text: "text-slate-700 dark:text-slate-300",
    border: "border-slate-300 dark:border-slate-700",
    bar: "bg-slate-400",
  },
  "Demo/Making": {
    bg: "bg-orange-50 dark:bg-orange-950/40",
    text: "text-orange-700 dark:text-orange-300",
    border: "border-orange-200 dark:border-orange-800",
    bar: "bg-orange-500",
  },
  "Proposal/Quotation": {
    bg: "bg-blue-50 dark:bg-blue-950/40",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-200 dark:border-blue-800",
    bar: "bg-blue-500",
  },
  Negotiation: {
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-800",
    bar: "bg-amber-500",
  },
  "Ready to Close": {
    bg: "bg-purple-50 dark:bg-purple-950/40",
    text: "text-purple-700 dark:text-purple-300",
    border: "border-purple-200 dark:border-purple-800",
    bar: "bg-purple-500",
  },
  Won: {
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200 dark:border-emerald-800",
    bar: "bg-emerald-500",
  },
  Lost: {
    bg: "bg-rose-50 dark:bg-rose-950/40",
    text: "text-rose-700 dark:text-rose-300",
    border: "border-rose-200 dark:border-rose-800",
    bar: "bg-rose-500",
  },
};

export function getStageStyle(stageName?: string | null) {
  if (!stageName) {
    return {
      bg: "bg-muted",
      text: "text-muted-foreground",
      border: "border-border",
      bar: "bg-muted-foreground",
    };
  }
  return (
    STAGE_STYLES[stageName] ?? {
      bg: "bg-sky-50 dark:bg-sky-950/40",
      text: "text-sky-700 dark:text-sky-300",
      border: "border-sky-200 dark:border-sky-800",
      bar: "bg-sky-500",
    }
  );
}

export function formatCurrency(value: unknown, currency = "PKR"): string {
  const num = typeof value === "number" ? value : Number(value);
  if (isNaN(num)) return "—";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "PKR",
      maximumFractionDigits: 0,
    }).format(num);
  } catch {
    return `${currency || "PKR"} ${num.toLocaleString()}`;
  }
}

export function StageBadge({ stage, className }: { stage?: string | null; className?: string }) {
  if (!stage) return <span className="text-muted-foreground">—</span>;

  const style = getStageStyle(stage);
  const isWon = stage === "Won";
  const isLost = stage === "Lost";

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
      <span>{stage}</span>
    </Badge>
  );
}

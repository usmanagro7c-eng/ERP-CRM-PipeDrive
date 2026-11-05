import { useMemo } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { type DashboardNumberChartData } from "@/lib/api";

interface DashboardKpiCardProps {
  data: DashboardNumberChartData;
}

export function DashboardKpiCard({ data }: DashboardKpiCardProps) {
  const formattedValue = useMemo(() => {
    const prefix = data.prefix ?? "";
    const suffix = data.suffix ?? "";
    const num = data.value;
    if (typeof num !== "number") return `${prefix}${num ?? 0}${suffix}`;
    
    // Format with commas if large number
    const formattedNum = num.toLocaleString("en-PK");
    return `${prefix}${formattedNum}${suffix}`;
  }, [data.prefix, data.suffix, data.value]);

  const delta = data.delta ?? 0;
  const deltaSuffix = data.deltaSuffix ?? "%";
  const isPositive = delta > 0;
  const isNegative = delta < 0;

  // Good vs bad depending on negativeIsBetter
  const isGood = data.negativeIsBetter ? isNegative : isPositive;
  const isBad = data.negativeIsBetter ? isPositive : isNegative;

  return (
    <div className="flex flex-col justify-between rounded-lg border border-border bg-card/60 p-4 shadow-xs transition hover:border-border/90 hover:bg-card">
      <div className="flex items-start justify-between gap-2">
        <span
          className="text-xs font-medium text-muted-foreground truncate"
          title={data.tooltip || data.title}
        >
          {data.title}
        </span>
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-2">
        <span className="text-2xl font-bold tracking-tight text-foreground">
          {formattedValue}
        </span>

        {delta !== undefined && (
          <div
            className={`inline-flex items-center gap-0.5 rounded-sm px-1.5 py-0.5 text-xs font-semibold ${
              isGood
                ? "bg-emerald-500/10 text-emerald-500 dark:text-emerald-400"
                : isBad
                ? "bg-rose-500/10 text-rose-500 dark:text-rose-400"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {isPositive && <TrendingUp className="h-3 w-3" />}
            {isNegative && <TrendingDown className="h-3 w-3" />}
            {!isPositive && !isNegative && <Minus className="h-3 w-3" />}
            <span>
              {delta > 0 ? `+${delta}` : delta}
              {deltaSuffix}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

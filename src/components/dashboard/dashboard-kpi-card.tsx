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
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-border/80 bg-card p-3 sm:p-4 shadow-2xs transition-all duration-200 hover:-translate-y-1 hover:border-foreground/20 hover:shadow-md">
      {/* Subtle ambient gradient sheen */}
      <div className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-radial from-primary/5 via-transparent to-transparent rounded-xl" />

      <div className="relative z-10 flex items-start justify-between gap-2">
        <span
          className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground truncate"
          title={data.tooltip || data.title}
        >
          {data.title}
        </span>
        {isGood && (
          <span className="relative flex h-2 w-2 shrink-0 mt-0.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
        )}
      </div>

      <div className="relative z-10 mt-3 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
        <span
          className="min-w-0 text-lg font-bold tracking-tight text-foreground transition-transform duration-200 group-hover:scale-[1.02] sm:text-2xl"
          title={formattedValue}
        >
          {formattedValue}
        </span>

        {delta !== undefined && (
          <div
            className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold transition-all duration-150 ${
              isGood
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                : isBad
                ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                : "bg-muted text-muted-foreground border border-border"
            }`}
          >
            {isPositive && <TrendingUp className="h-3 w-3 stroke-[2.5]" />}
            {isNegative && <TrendingDown className="h-3 w-3 stroke-[2.5]" />}
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

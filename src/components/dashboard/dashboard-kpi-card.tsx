import { useMemo } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { type DashboardNumberChartData } from "@/lib/api";
import { AnimatedCounter } from "@/components/ui/animated-counter";

interface DashboardKpiCardProps {
  data: DashboardNumberChartData;
}

export function DashboardKpiCard({ data }: DashboardKpiCardProps) {
  const prefix = data.prefix ?? "";
  const suffix = data.suffix ?? "";
  const num = typeof data.value === "number" ? data.value : 0;

  const delta = data.delta ?? 0;
  const deltaSuffix = data.deltaSuffix ?? "%";
  const isPositive = delta > 0;
  const isNegative = delta < 0;

  // Good vs bad depending on negativeIsBetter
  const isGood = data.negativeIsBetter ? isNegative : isPositive;
  const isBad = data.negativeIsBetter ? isPositive : isNegative;

  // Auto-determine clean decimals: 0 for currency and large numbers, 1 for small averages (e.g. days)
  const effectiveDecimals = useMemo(() => {
    if (typeof num !== "number" || isNaN(num) || num % 1 === 0) return 0;
    // For currency or numbers >= 100, round to whole integer to prevent dashboard overflow
    if (
      prefix.includes("₨") ||
      prefix.includes("PKR") ||
      prefix.includes("Rs") ||
      prefix.includes("$") ||
      Math.abs(num) >= 100
    ) {
      return 0;
    }
    // For small floating numbers (like 5.4 days or 2.3 deals), 1 decimal is optimal
    return 1;
  }, [num, prefix]);

  const fullFormattedValue = useMemo(() => {
    const formatted =
      effectiveDecimals > 0
        ? num.toLocaleString("en-PK", {
            minimumFractionDigits: effectiveDecimals,
            maximumFractionDigits: effectiveDecimals,
          })
        : Math.round(num).toLocaleString("en-PK");
    return `${prefix}${formatted}${suffix}`;
  }, [num, prefix, suffix, effectiveDecimals]);

  return (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-border/70 bg-card p-3 sm:p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-[border-color,box-shadow] duration-200 hover:border-border hover:shadow-[0_4px_16px_-8px_rgba(0,0,0,0.12)] min-w-0">
      <div className="relative z-10 flex items-start justify-between gap-2 min-w-0">
        <span
          className="block min-w-0 text-[11px] font-medium text-muted-foreground truncate"
          title={data.tooltip || data.title}
        >
          {data.title}
        </span>
        {isGood && <span className="size-1.5 rounded-full bg-emerald-500 shrink-0 mt-1" aria-hidden="true" />}
      </div>

      <div className="relative z-10 mt-3 flex items-end justify-between gap-2 min-w-0">
        <span
          className="min-w-0 truncate text-[1.35rem] sm:text-xl font-semibold tracking-tight text-foreground tabular-nums leading-none"
          title={fullFormattedValue}
        >
          <AnimatedCounter
            value={num}
            prefix={prefix}
            suffix={suffix}
            decimals={effectiveDecimals}
            duration={900}
          />
        </span>

        {delta !== undefined && delta !== 0 && (
          <div
            className={`inline-flex shrink-0 items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-medium tabular-nums ${
              isGood
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : isBad
                  ? "bg-red-500/10 text-red-600 dark:text-red-400"
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

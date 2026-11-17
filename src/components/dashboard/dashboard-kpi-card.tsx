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
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-border/80 bg-card p-3 sm:p-3.5 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-md min-w-0">
      {/* Subtle ambient gradient sheen */}
      <div className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-radial from-primary/5 via-transparent to-transparent rounded-xl" />

      {/* Title */}
      <div className="relative z-10 flex items-start justify-between gap-1.5 min-w-0">
        <span
          className="text-[11px] font-medium text-muted-foreground truncate"
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

      {/* Number Value & Delta */}
      <div className="relative z-10 mt-2 flex items-baseline justify-between gap-1.5 min-w-0">
        <span
          className="min-w-0 truncate text-base sm:text-lg xl:text-xl font-bold tracking-tight text-foreground transition-transform duration-200 group-hover:scale-[1.01] font-mono"
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

        {delta !== undefined && (
          <div
            className={`inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] sm:text-[11px] font-semibold transition-all duration-150 ${
              isGood
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                : isBad
                  ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20"
                  : "bg-muted text-muted-foreground border border-border"
            }`}
          >
            {isPositive && <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3 stroke-[2.5]" />}
            {isNegative && <TrendingDown className="h-2.5 w-2.5 sm:h-3 sm:w-3 stroke-[2.5]" />}
            {!isPositive && !isNegative && <Minus className="h-2.5 w-2.5 sm:h-3 sm:w-3" />}
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

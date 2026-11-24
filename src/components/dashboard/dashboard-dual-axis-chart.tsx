import { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { type DashboardAxisChartData } from "@/lib/api";

interface DashboardDualAxisChartProps {
  data: DashboardAxisChartData;
}

export function DashboardDualAxisChart({ data }: DashboardDualAxisChartProps) {
  const xKey = data.xAxis?.key || "territory";
  const [showDeals, setShowDeals] = useState(true);
  const [showValue, setShowValue] = useState(true);

  const chartData = useMemo(() => {
    return (data.data || []).map((row) => {
      const rawCategory = row[xKey];
      const category =
        rawCategory === null || rawCategory === undefined || String(rawCategory).trim() === ""
          ? "(Blank)"
          : String(rawCategory);
      return {
        ...row,
        [xKey]: category,
        deals: Number(row["deals"]) || 0,
        value: Number(row["value"]) || 0,
      };
    });
  }, [data.data, xKey]);

  return (
    <div className="flex h-full flex-col justify-between rounded-xl border border-border/70 bg-card p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div>
        <h3 className="text-sm font-semibold text-foreground tracking-tight">{data.title}</h3>
        {data.subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{data.subtitle}</p>}
      </div>

      <div className="my-3 h-[240px] sm:h-64 w-full" role="img" aria-label={`${data.title} chart`}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-10" />
            <XAxis
              dataKey={xKey}
              tickLine={false}
              stroke="currentColor"
              className="text-[11px] text-muted-foreground"
            />
            <YAxis
              yAxisId="left"
              tickLine={false}
              stroke="currentColor"
              className="text-[11px] text-muted-foreground"
              allowDecimals={false}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tickLine={false}
              stroke="currentColor"
              className="text-[11px] text-muted-foreground"
              tickFormatter={(v) => {
                if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
                if (v >= 1000) return `${(v / 1000).toFixed(0)}K`;
                return String(v);
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--card)",
                borderColor: "var(--border)",
                borderRadius: "8px",
                color: "var(--foreground)",
                fontSize: "12px",
              }}
              formatter={(val, name) => {
                if (name === "Value (₨)") {
                  return [`₨${Number(val).toLocaleString()}`, "Value"];
                }
                return [val, "Deals"];
              }}
            />
            {showDeals && (
              <Bar
                yAxisId="left"
                dataKey="deals"
                name="Deals"
                fill="var(--chart-1)"
                radius={[4, 4, 0, 0]}
                maxBarSize={32}
              />
            )}
            {showValue && (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="value"
                name="Value (₨)"
                stroke="var(--success)"
                strokeWidth={2}
                dot={{ r: 4, fill: "var(--success)" }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend Toggle Pills */}
      <div className="flex items-center gap-2 pt-2 border-t border-border/50">
        <button
          type="button"
          onClick={() => setShowDeals((p) => !p)}
          aria-pressed={showDeals}
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition cursor-pointer ${
            showDeals
              ? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              : "bg-muted/40 text-muted-foreground/60 line-through hover:bg-muted/60"
          }`}
        >
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: showDeals ? "var(--chart-1)" : "var(--muted-foreground)" }}
          />
          <span>Deals</span>
        </button>

        <button
          type="button"
          onClick={() => setShowValue((p) => !p)}
          aria-pressed={showValue}
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition cursor-pointer ${
            showValue
              ? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              : "bg-muted/40 text-muted-foreground/60 line-through hover:bg-muted/60"
          }`}
        >
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: showValue ? "var(--success)" : "var(--muted-foreground)" }}
          />
          <span>Value</span>
        </button>
      </div>
    </div>
  );
}

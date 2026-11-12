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
    <div className="flex h-full flex-col justify-between rounded-lg border border-border bg-card p-4 shadow-xs">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{data.title}</h3>
        {data.subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{data.subtitle}</p>}
      </div>

      <div className="my-3 h-64 w-full">
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
                backgroundColor: "var(--color-card, #1e1e24)",
                borderColor: "var(--color-border, #333)",
                borderRadius: "6px",
                fontSize: "12px",
              }}
              formatter={(val, name) => {
                if (name === "Value (₨)") {
                  return [`₨${Number(val).toLocaleString("en-PK")}`, "Value"];
                }
                return [val, "Deals"];
              }}
            />
            {showDeals && (
              <Bar
                yAxisId="left"
                dataKey="deals"
                name="Deals"
                fill="#3b82f6"
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
                stroke="#10b981"
                strokeWidth={2}
                dot={{ r: 4, fill: "#10b981" }}
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
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition cursor-pointer ${
            showDeals
              ? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              : "bg-muted/40 text-muted-foreground/60 line-through hover:bg-muted/60"
          }`}
        >
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: showDeals ? "#3b82f6" : "#888" }}
          />
          <span>Deals</span>
        </button>

        <button
          type="button"
          onClick={() => setShowValue((p) => !p)}
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition cursor-pointer ${
            showValue
              ? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              : "bg-muted/40 text-muted-foreground/60 line-through hover:bg-muted/60"
          }`}
        >
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: showValue ? "#10b981" : "#888" }}
          />
          <span>Value</span>
        </button>
      </div>
    </div>
  );
}

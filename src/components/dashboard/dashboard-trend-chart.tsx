import { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { type DashboardAxisChartData } from "@/lib/api";

const SERIES_COLORS: Record<string, string> = {
  leads: "#3b82f6", // blue
  deals: "#f97316", // orange
  won_deals: "#10b981", // green
  forecasted: "#8b5cf6", // purple
  actual: "#06b6d4", // cyan
};

const DEFAULT_COLORS = ["#3b82f6", "#f97316", "#10b981", "#8b5cf6", "#06b6d4", "#ec4899"];

interface DashboardTrendChartProps {
  data: DashboardAxisChartData;
}

export function DashboardTrendChart({ data }: DashboardTrendChartProps) {
  const seriesNames = useMemo(
    () => (data.series || []).map((s) => s.name),
    [data.series],
  );

  // Active series toggle state
  const [activeSeries, setActiveSeries] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const name of seriesNames) {
      initial[name] = true;
    }
    return initial;
  });

  const toggleSeries = (name: string) => {
    setActiveSeries((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  const xKey = data.xAxis?.key || "date";
  const hasData = (data.data || []).length > 0 && data.data.some((row) =>
    seriesNames.some((s) => {
      const v = row[s];
      return v !== null && v !== undefined && v !== "" && Number(v) > 0;
    }),
  );

  return (
    <div className="flex h-full flex-col justify-between rounded-lg border border-border bg-card p-4 shadow-xs">
      {/* Title & Subtitle */}
      <div>
        <h3 className="text-sm font-semibold text-foreground">{data.title}</h3>
        {data.subtitle && (
          <p className="mt-0.5 text-xs text-muted-foreground">{data.subtitle}</p>
        )}
      </div>

      {/* Chart Canvas */}
      <div className="my-4 h-64 w-full">
        {!hasData ? (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            No data to show
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-10" />
              <XAxis
                dataKey={xKey}
                tickLine={false}
                stroke="currentColor"
                className="text-[11px] text-muted-foreground"
              />
              <YAxis
                tickLine={false}
                stroke="currentColor"
                className="text-[11px] text-muted-foreground"
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--color-card, #1e1e24)",
                  borderColor: "var(--color-border, #333)",
                  borderRadius: "6px",
                  fontSize: "12px",
                }}
              />
              {data.series?.map((s, idx) => {
                if (!activeSeries[s.name]) return null;
                const stroke = SERIES_COLORS[s.name] || DEFAULT_COLORS[idx % DEFAULT_COLORS.length];
                return (
                  <Line
                    key={s.name}
                    type="monotone"
                    dataKey={s.name}
                    name={s.name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                    stroke={stroke}
                    strokeWidth={2}
                    dot={{ r: 3, fill: stroke }}
                    activeDot={{ r: 5 }}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Series Toggle Pills at Bottom */}
      <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border/50">
        {data.series?.map((s, idx) => {
          const color = SERIES_COLORS[s.name] || DEFAULT_COLORS[idx % DEFAULT_COLORS.length];
          const isActive = !!activeSeries[s.name];
          const label = s.name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
          return (
            <button
              key={s.name}
              type="button"
              onClick={() => toggleSeries(s.name)}
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition cursor-pointer ${
                isActive
                  ? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  : "bg-muted/40 text-muted-foreground/60 line-through hover:bg-muted/60"
              }`}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: isActive ? color : "#888" }}
              />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

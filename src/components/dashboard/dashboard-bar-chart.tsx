import { useMemo } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { type DashboardAxisChartData } from "@/lib/api";

interface DashboardBarChartProps {
  data: DashboardAxisChartData;
}

export function DashboardBarChart({ data }: DashboardBarChartProps) {
  const xKey = data.xAxis?.key || "reason";

  const chartData = useMemo(() => {
    return (data.data || []).map((row) => ({
      ...row,
      [xKey]: String(row[xKey] || "(Not specified)"),
      count: Number(row["count"]) || 0,
    }));
  }, [data.data, xKey]);

  return (
    <div className="flex h-full flex-col justify-between rounded-xl border border-border/70 bg-card p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div>
        <h3 className="text-sm font-semibold text-foreground tracking-tight">{data.title}</h3>
        {data.subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{data.subtitle}</p>}
      </div>

      <div className="my-3 h-[240px] sm:h-64 w-full" role="img" aria-label={`${data.title} chart`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                backgroundColor: "var(--card)",
                borderColor: "var(--border)",
                borderRadius: "8px",
                color: "var(--foreground)",
                fontSize: "12px",
              }}
              formatter={(val) => [val, "Count"]}
            />
            <Bar dataKey="count" fill="var(--destructive)" radius={[4, 4, 0, 0]} maxBarSize={36} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="pt-2 border-t border-border/50 text-right">
        <span className="text-[11px] text-muted-foreground font-medium">Count</span>
      </div>
    </div>
  );
}

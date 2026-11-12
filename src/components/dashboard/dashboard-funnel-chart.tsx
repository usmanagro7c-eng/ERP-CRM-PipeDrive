import { useMemo } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";
import { type DashboardAxisChartData } from "@/lib/api";

const STAGE_COLORS: Record<string, string> = {
  Leads: "#6366f1", // indigo
  Qualification: "#3b82f6", // blue
  "Demo/Making": "#06b6d4", // cyan
  "Proposal/Quotation": "#eab308", // yellow
  Negotiation: "#f97316", // orange
  "Ready to Close": "#ec4899", // pink
  Won: "#10b981", // emerald
  Lost: "#ef4444", // red
};

interface DashboardFunnelChartProps {
  data: DashboardAxisChartData;
}

export function DashboardFunnelChart({ data }: DashboardFunnelChartProps) {
  const chartData = useMemo(() => {
    return (data.data || []).map((item) => ({
      stage: String(item["stage"] || ""),
      count: Number(item["count"]) || 0,
    }));
  }, [data.data]);

  return (
    <div className="flex h-full flex-col justify-between rounded-lg border border-border bg-card p-4 shadow-xs">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{data.title}</h3>
        {data.subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{data.subtitle}</p>}
      </div>

      <div className="my-3 h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={chartData}
            margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
          >
            <XAxis
              type="number"
              tickLine={false}
              stroke="currentColor"
              className="text-[11px] text-muted-foreground"
              allowDecimals={false}
            />
            <YAxis
              type="category"
              dataKey="stage"
              tickLine={false}
              stroke="currentColor"
              className="text-[11px] text-muted-foreground"
              width={100}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--color-card, #1e1e24)",
                borderColor: "var(--color-border, #333)",
                borderRadius: "6px",
                fontSize: "12px",
              }}
              formatter={(val) => [val, "Count"]}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={20}>
              {chartData.map((entry, index) => {
                const color = STAGE_COLORS[entry.stage] || "#3b82f6";
                return <Cell key={`cell-${index}`} fill={color} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="pt-2 border-t border-border/50 text-right">
        <span className="text-[11px] text-muted-foreground font-medium">Count</span>
      </div>
    </div>
  );
}

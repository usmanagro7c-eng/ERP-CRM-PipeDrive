import { useMemo } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";
import { type DashboardAxisChartData } from "@/lib/api";

const STAGE_COLORS: Record<string, string> = {
  Leads: "var(--info)",
  Qualification: "var(--chart-2)",
  "Demo/Making": "var(--chart-3)",
  "Proposal/Quotation": "var(--chart-4)",
  Negotiation: "var(--chart-5)",
  "Ready to Close": "var(--warning)",
  Won: "var(--success)",
  Lost: "var(--destructive)",
};

const DEFAULT_STAGE_COLOR = "var(--chart-1)";

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
    <div className="flex h-full flex-col justify-between rounded-xl border border-border/70 bg-card p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div>
        <h3 className="text-sm font-semibold text-foreground tracking-tight">{data.title}</h3>
        {data.subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{data.subtitle}</p>}
      </div>

      <div className="my-3 h-[240px] sm:h-64 w-full" role="img" aria-label={`${data.title} chart`}>
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
                backgroundColor: "var(--card)",
                borderColor: "var(--border)",
                borderRadius: "8px",
                color: "var(--foreground)",
                fontSize: "12px",
              }}
              formatter={(val) => [val, "Count"]}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={20}>
              {chartData.map((entry, index) => {
                const color = STAGE_COLORS[entry.stage] || DEFAULT_STAGE_COLOR;
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

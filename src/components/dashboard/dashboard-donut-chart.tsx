import { useState, useMemo } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { type DashboardDonutChartData } from "@/lib/api";

const PIE_COLORS = [
  "#3b82f6", // blue
  "#10b981", // green
  "#f97316", // orange
  "#8b5cf6", // purple
  "#ef4444", // red
  "#06b6d4", // cyan
  "#eab308", // yellow
  "#ec4899", // pink
];

interface DashboardDonutChartProps {
  data: DashboardDonutChartData;
}

export function DashboardDonutChart({ data }: DashboardDonutChartProps) {
  const catKey = data.categoryColumn;
  const valKey = data.valueColumn;

  const rawItems = useMemo(() => {
    return (data.data || []).map((row, idx) => {
      const rawName = String(row[catKey] ?? "");
      const name = rawName.trim() === "" ? "(Blank)" : rawName;
      const value = Number(row[valKey]) || 0;
      return {
        id: `${name}-${idx}`,
        name,
        value,
        color: PIE_COLORS[idx % PIE_COLORS.length],
      };
    });
  }, [data.data, catKey, valKey]);

  // Toggle active slices
  const [hiddenIds, setHiddenIds] = useState<Record<string, boolean>>({});

  const toggleItem = (id: string) => {
    setHiddenIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const filteredItems = useMemo(() => {
    return rawItems.filter((item) => !hiddenIds[item.id]);
  }, [rawItems, hiddenIds]);

  const total = useMemo(() => {
    return filteredItems.reduce((acc, curr) => acc + curr.value, 0);
  }, [filteredItems]);

  const grandTotal = useMemo(() => {
    return rawItems.reduce((acc, curr) => acc + curr.value, 0);
  }, [rawItems]);

  return (
    <div className="flex h-full flex-col justify-between rounded-lg border border-border bg-card p-4 shadow-xs">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{data.title}</h3>
        {data.subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{data.subtitle}</p>}
      </div>

      <div className="relative my-3 h-64 w-full">
        {/* Total number in the center of donut */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold text-foreground">{total}</span>
          <span className="text-[11px] font-medium text-muted-foreground">Count</span>
        </div>

        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={filteredItems}
              dataKey="value"
              nameKey="name"
              innerRadius={65}
              outerRadius={88}
              paddingAngle={3}
              stroke="none"
            >
              {filteredItems.map((entry) => (
                <Cell key={entry.id} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--color-card, #1e1e24)",
                borderColor: "var(--color-border, #333)",
                borderRadius: "6px",
                fontSize: "12px",
              }}
              formatter={(val, name) => {
                const num = Number(val) || 0;
                const pct = total > 0 ? Math.round((num / total) * 100) : 0;
                return [`${num} (${pct}%)`, name];
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Slices legend buttons with percentages */}
      <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border/50">
        {rawItems.map((item) => {
          const isHidden = !!hiddenIds[item.id];
          const pct = grandTotal > 0 ? Math.round((item.value / grandTotal) * 100) : 0;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => toggleItem(item.id)}
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition cursor-pointer ${
                !isHidden
                  ? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  : "bg-muted/40 text-muted-foreground/60 line-through hover:bg-muted/60"
              }`}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: !isHidden ? item.color : "#888" }}
              />
              <span>{item.name}</span>
              <span className="opacity-70 font-normal">{pct}%</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

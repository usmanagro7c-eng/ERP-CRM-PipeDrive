import { useState, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  RotateCw,
  Edit,
  Calendar,
  User as UserIcon,
  ChevronDown,
  Layers,
  Target,
  ShoppingCart,
  FileText,
  Building2,
  Users,
  StickyNote,
  PhoneCall,
  Plus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useDashboard,
  useCrmUsers,
  getDateRangeFromPreset,
  type DateRangePreset,
} from "@/hooks/use-dashboard";
import {
  type DashboardNumberChartData,
  type DashboardAxisChartData,
  type DashboardDonutChartData,
} from "@/lib/api";
import { DashboardKpiCard } from "@/components/dashboard/dashboard-kpi-card";
import { DashboardTrendChart } from "@/components/dashboard/dashboard-trend-chart";
import { DashboardFunnelChart } from "@/components/dashboard/dashboard-funnel-chart";
import { DashboardDonutChart } from "@/components/dashboard/dashboard-donut-chart";
import { DashboardDualAxisChart } from "@/components/dashboard/dashboard-dual-axis-chart";
import { DashboardBarChart } from "@/components/dashboard/dashboard-bar-chart";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "CRM Dashboard · AgroCRM" }] }),
  component: DashboardPage,
});

const PRESETS: DateRangePreset[] = [
  "Today",
  "Yesterday",
  "Last 7 Days",
  "Last 30 Days",
  "This Month",
  "Last Month",
  "This Quarter",
  "This Year",
];

function DashboardPage() {
  const [preset, setPreset] = useState<DateRangePreset>("Last 30 Days");
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  const dateRange = useMemo(() => getDateRangeFromPreset(preset), [preset]);

  const {
    data: widgets = [],
    isLoading,
    isFetching,
    refetch,
  } = useDashboard({
    from_date: dateRange.from_date,
    to_date: dateRange.to_date,
    user: selectedUser,
  });

  const { data: users = [] } = useCrmUsers();

  // Find user label
  const selectedUserLabel = useMemo(() => {
    if (!selectedUser) return "Sales User";
    const found = users.find((u) => u.name === selectedUser || u.email === selectedUser);
    return found ? found.full_name || found.first_name || found.name : selectedUser;
  }, [selectedUser, users]);

  // Separate KPI number widgets and chart widgets
  const numberWidgets = useMemo(() => {
    return widgets.filter((w) => w.type === "number_chart" && w.data);
  }, [widgets]);

  // Map of chart widgets by name
  const chartMap = useMemo(() => {
    const map = new Map<string, (typeof widgets)[number]>();
    for (const w of widgets) {
      if (w.type !== "number_chart" && w.type !== "spacer") {
        map.set(w.name, w);
      }
    }
    return map;
  }, [widgets]);

  const salesTrendWidget = chartMap.get("sales_trend");
  const forecastedRevenueWidget = chartMap.get("forecasted_revenue");
  const funnelWidget = chartMap.get("funnel_conversion");
  const dealsByStageWidget = chartMap.get("deals_by_stage_donut");
  const lostDealReasonsWidget = chartMap.get("lost_deal_reasons");
  const leadsBySourceWidget = chartMap.get("leads_by_source");
  const dealsBySourceWidget = chartMap.get("deals_by_source");
  const dealsByTerritoryWidget = chartMap.get("deals_by_territory");
  const dealsBySalespersonWidget = chartMap.get("deals_by_salesperson");

  return (
    <div className="flex flex-1 flex-col overflow-y-auto bg-background text-foreground">
      {/* Top Banner & Control Bar */}
      <div className="border-b border-border bg-card/40 px-6 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold tracking-tight text-foreground">Dashboard</h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Refresh Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => void refetch()}
              disabled={isFetching}
              className="h-8 gap-1.5 text-xs font-medium cursor-pointer"
            >
              <RotateCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </Button>

            {/* Edit Button */}
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs font-medium cursor-pointer"
            >
              <Edit className="h-3.5 w-3.5" />
              <span>Edit</span>
            </Button>

            {/* Date Range Preset Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs font-medium cursor-pointer"
                >
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{preset}</span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                {PRESETS.map((p) => (
                  <DropdownMenuItem
                    key={p}
                    onClick={() => setPreset(p)}
                    className="text-xs cursor-pointer"
                  >
                    {p}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Sales User Filter Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs font-medium cursor-pointer"
                >
                  <UserIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{selectedUserLabel}</span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 max-h-64 overflow-y-auto">
                <DropdownMenuItem
                  onClick={() => setSelectedUser(null)}
                  className="text-xs font-medium cursor-pointer"
                >
                  All Sales Users
                </DropdownMenuItem>
                {users
                  .filter((u) => u.name && u.full_name)
                  .map((u) => (
                    <DropdownMenuItem
                      key={u.name}
                      onClick={() => setSelectedUser(u.name)}
                      className="text-xs cursor-pointer"
                    >
                      {u.full_name || u.first_name || u.name}
                    </DropdownMenuItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 space-y-6 p-6">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7 animate-pulse">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-24 rounded-lg bg-card/40 border border-border" />
            ))}
          </div>
        ) : (
          <>
            {/* Top 7 KPI Cards */}
            {numberWidgets.length > 0 && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
                {numberWidgets.map((w) => (
                  <DashboardKpiCard
                    key={w.name}
                    data={w.data as unknown as DashboardNumberChartData}
                  />
                ))}
              </div>
            )}

            {/* Charts Grid */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Row 1: Sales Trend & Forecasted Revenue */}
              {salesTrendWidget?.data && (
                <div className="h-full">
                  <DashboardTrendChart
                    data={salesTrendWidget.data as unknown as DashboardAxisChartData}
                  />
                </div>
              )}

              {forecastedRevenueWidget?.data && (
                <div className="h-full">
                  <DashboardTrendChart
                    data={forecastedRevenueWidget.data as unknown as DashboardAxisChartData}
                  />
                </div>
              )}

              {/* Row 2: Funnel Conversion & Deals by Stage */}
              {funnelWidget?.data && (
                <div className="h-full">
                  <DashboardFunnelChart
                    data={funnelWidget.data as unknown as DashboardAxisChartData}
                  />
                </div>
              )}

              {dealsByStageWidget?.data && (
                <div className="h-full">
                  <DashboardDonutChart
                    data={dealsByStageWidget.data as unknown as DashboardDonutChartData}
                  />
                </div>
              )}

              {/* Row 3: Leads by Source & Deals by Source */}
              {leadsBySourceWidget?.data && (
                <div className="h-full">
                  <DashboardDonutChart
                    data={leadsBySourceWidget.data as unknown as DashboardDonutChartData}
                  />
                </div>
              )}

              {dealsBySourceWidget?.data && (
                <div className="h-full">
                  <DashboardDonutChart
                    data={dealsBySourceWidget.data as unknown as DashboardDonutChartData}
                  />
                </div>
              )}

              {/* Row 4: Deals by Territory & Deals by Salesperson */}
              {dealsByTerritoryWidget?.data && (
                <div className="h-full">
                  <DashboardDualAxisChart
                    data={dealsByTerritoryWidget.data as unknown as DashboardAxisChartData}
                  />
                </div>
              )}

              {dealsBySalespersonWidget?.data && (
                <div className="h-full">
                  <DashboardDualAxisChart
                    data={dealsBySalespersonWidget.data as unknown as DashboardAxisChartData}
                  />
                </div>
              )}

              {/* Row 5: Lost Deal Reasons */}
              {lostDealReasonsWidget?.data && (
                <div className="lg:col-span-2">
                  <DashboardBarChart
                    data={lostDealReasonsWidget.data as unknown as DashboardAxisChartData}
                  />
                </div>
              )}
            </div>
          </>
        )}

        {/* Quick Hub Navigation Strip */}
        <div className="pt-6 border-t border-border">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Quick CRM Modules
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            <Link
              to="/leads"
              className="flex items-center gap-2 rounded-lg border border-border bg-card/60 p-3 text-xs font-medium text-foreground transition hover:border-primary/50 hover:bg-card"
            >
              <Target className="h-4 w-4 text-indigo-400" />
              <span>Leads</span>
            </Link>
            <Link
              to="/deals"
              className="flex items-center gap-2 rounded-lg border border-border bg-card/60 p-3 text-xs font-medium text-foreground transition hover:border-primary/50 hover:bg-card"
            >
              <Layers className="h-4 w-4 text-orange-400" />
              <span>Deals</span>
            </Link>
            <Link
              to="/contacts"
              className="flex items-center gap-2 rounded-lg border border-border bg-card/60 p-3 text-xs font-medium text-foreground transition hover:border-primary/50 hover:bg-card"
            >
              <Users className="h-4 w-4 text-blue-400" />
              <span>Contacts</span>
            </Link>
            <Link
              to="/organizations"
              className="flex items-center gap-2 rounded-lg border border-border bg-card/60 p-3 text-xs font-medium text-foreground transition hover:border-primary/50 hover:bg-card"
            >
              <Building2 className="h-4 w-4 text-emerald-400" />
              <span>Organizations</span>
            </Link>
            <Link
              to="/quotations"
              className="flex items-center gap-2 rounded-lg border border-border bg-card/60 p-3 text-xs font-medium text-foreground transition hover:border-primary/50 hover:bg-card"
            >
              <FileText className="h-4 w-4 text-cyan-400" />
              <span>Quotations</span>
            </Link>
            <Link
              to="/sales-orders"
              className="flex items-center gap-2 rounded-lg border border-border bg-card/60 p-3 text-xs font-medium text-foreground transition hover:border-primary/50 hover:bg-card"
            >
              <ShoppingCart className="h-4 w-4 text-violet-400" />
              <span>Sales Orders</span>
            </Link>
            <Link
              to="/notes"
              className="flex items-center gap-2 rounded-lg border border-border bg-card/60 p-3 text-xs font-medium text-foreground transition hover:border-primary/50 hover:bg-card"
            >
              <StickyNote className="h-4 w-4 text-amber-400" />
              <span>Notes</span>
            </Link>
            <Link
              to="/calls"
              className="flex items-center gap-2 rounded-lg border border-border bg-card/60 p-3 text-xs font-medium text-foreground transition hover:border-primary/50 hover:bg-card"
            >
              <PhoneCall className="h-4 w-4 text-rose-400" />
              <span>Call Logs</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

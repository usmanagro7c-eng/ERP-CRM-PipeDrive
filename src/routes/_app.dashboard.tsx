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
      {/* Top Banner Matching Frappe CRM */}
      <div className="flex items-center justify-between border-b border-border bg-card/60 px-3 sm:px-6 py-2 sm:py-2.5 backdrop-blur-xs shrink-0 gap-2 min-h-[42px] sm:min-h-[48px] overflow-x-auto">
        <div className="flex items-center gap-1.5 sm:gap-2.5 text-xs sm:text-sm min-w-0 shrink-0">
          <span className="font-semibold text-foreground">Dashboard</span>
          <span className="text-muted-foreground/60">/</span>
          <span className="text-muted-foreground font-medium">Overview</span>
          <span className="inline-flex items-center gap-1.5 ml-1 sm:ml-2 rounded-full bg-emerald-500/10 px-1.5 sm:px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
            </span>
            <span className="hidden sm:inline">Live Sync</span>
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            aria-label="Refresh dashboard data"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="h-7 px-2 sm:px-2.5 gap-1.5 text-xs font-medium cursor-pointer"
          >
            <RotateCw className={`h-3 w-3 ${isFetching ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>

          {/* Date Range Preset Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 sm:px-2.5 gap-1 text-xs font-medium cursor-pointer"
              >
                <Calendar className="h-3 w-3 text-muted-foreground" />
                <span className="truncate max-w-[70px] sm:max-w-none">{preset}</span>
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
                className="h-7 px-2 sm:px-2.5 gap-1 text-xs font-medium cursor-pointer max-w-[85px] sm:max-w-none"
              >
                <UserIcon className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="truncate">{selectedUserLabel}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground opacity-60 shrink-0" />
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

      {/* Main Content Area */}
      <div className="flex-1 space-y-4 p-4 sm:space-y-6 sm:p-6">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-2 animate-pulse sm:gap-4 sm:grid-cols-4 lg:grid-cols-7">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-24 rounded-lg bg-card/40 border border-border" />
            ))}
          </div>
        ) : (
          <>
            {/* Top 7 KPI Cards */}
            {numberWidgets.length > 0 && (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3 lg:grid-cols-7">
                {numberWidgets.map((w) => (
                  <DashboardKpiCard
                    key={w.name}
                    data={w.data as unknown as DashboardNumberChartData}
                  />
                ))}
              </div>
            )}

            {/* Charts Grid */}
            <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
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
        <div className="border-t border-border pt-4 sm:pt-6">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Quick CRM Modules
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3 lg:grid-cols-8">
            <div
              title="Leads (Temporarily Disabled)"
              aria-disabled="true"
              className="flex items-center gap-2.5 rounded-xl border border-border/40 bg-card/40 p-3 text-xs font-semibold text-muted-foreground opacity-60 cursor-not-allowed select-none"
            >
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Target className="h-4 w-4 opacity-50" />
              </div>
              <span className="truncate">Leads</span>
              <span className="ml-auto text-[9px] uppercase tracking-wider text-muted-foreground/60 bg-muted/80 px-1.5 py-0.5 rounded border border-border/40 font-mono">
                Disabled
              </span>
            </div>
            <Link
              to="/deals"
              className="group flex items-center gap-2.5 rounded-xl border border-border/80 bg-card p-3 text-xs font-semibold text-foreground transition-all duration-200 hover:-translate-y-1 hover:border-foreground/20 hover:shadow-md active:scale-[0.98]"
            >
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-orange-500/10 text-orange-500 dark:text-orange-400 group-hover:scale-110 transition-transform duration-200">
                <Layers className="h-4 w-4" />
              </div>
              <span className="truncate">Deals</span>
            </Link>
            <Link
              to="/contacts"
              className="group flex items-center gap-2.5 rounded-xl border border-border/80 bg-card p-3 text-xs font-semibold text-foreground transition-all duration-200 hover:-translate-y-1 hover:border-foreground/20 hover:shadow-md active:scale-[0.98]"
            >
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500 dark:text-blue-400 group-hover:scale-110 transition-transform duration-200">
                <Users className="h-4 w-4" />
              </div>
              <span className="truncate">Contacts</span>
            </Link>
            <Link
              to="/organizations"
              className="group flex items-center gap-2.5 rounded-xl border border-border/80 bg-card p-3 text-xs font-semibold text-foreground transition-all duration-200 hover:-translate-y-1 hover:border-foreground/20 hover:shadow-md active:scale-[0.98]"
            >
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 group-hover:scale-110 transition-transform duration-200">
                <Building2 className="h-4 w-4" />
              </div>
              <span className="truncate">Organizations</span>
            </Link>
            <Link
              to="/quotations"
              className="group flex items-center gap-2.5 rounded-xl border border-border/80 bg-card p-3 text-xs font-semibold text-foreground transition-all duration-200 hover:-translate-y-1 hover:border-foreground/20 hover:shadow-md active:scale-[0.98]"
            >
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-500 dark:text-cyan-400 group-hover:scale-110 transition-transform duration-200">
                <FileText className="h-4 w-4" />
              </div>
              <span className="truncate">Quotations</span>
            </Link>
            <Link
              to="/sales-orders"
              className="group flex items-center gap-2.5 rounded-xl border border-border/80 bg-card p-3 text-xs font-semibold text-foreground transition-all duration-200 hover:-translate-y-1 hover:border-foreground/20 hover:shadow-md active:scale-[0.98]"
            >
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-500 dark:text-violet-400 group-hover:scale-110 transition-transform duration-200">
                <ShoppingCart className="h-4 w-4" />
              </div>
              <span className="truncate">Sales Orders</span>
            </Link>
            <Link
              to="/notes"
              className="group flex items-center gap-2.5 rounded-xl border border-border/80 bg-card p-3 text-xs font-semibold text-foreground transition-all duration-200 hover:-translate-y-1 hover:border-foreground/20 hover:shadow-md active:scale-[0.98]"
            >
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 dark:text-amber-400 group-hover:scale-110 transition-transform duration-200">
                <StickyNote className="h-4 w-4" />
              </div>
              <span className="truncate">Notes</span>
            </Link>
            <Link
              to="/calls"
              className="group flex items-center gap-2.5 rounded-xl border border-border/80 bg-card p-3 text-xs font-semibold text-foreground transition-all duration-200 hover:-translate-y-1 hover:border-foreground/20 hover:shadow-md active:scale-[0.98]"
            >
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-500 dark:text-rose-400 group-hover:scale-110 transition-transform duration-200">
                <PhoneCall className="h-4 w-4" />
              </div>
              <span className="truncate">Call Logs</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

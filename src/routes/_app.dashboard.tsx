import { useState, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  RotateCw,
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
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Page, PageHeader, PageContainer } from "@/components/page-header";
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
    if (!selectedUser) return "All Users";
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

  const hasWidgetData = useMemo(
    () =>
      widgets.some((widget) => Boolean(widget.data)) ||
      Array.from(chartMap.values()).some((widget) => Boolean(widget.data)),
    [widgets, chartMap],
  );

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
    <Page>
      <PageHeader
        title="Dashboard"
        badge={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            Live
          </span>
        }
        actions={
          <Button
            variant="ghost"
            size="icon"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="h-9 w-9 sm:h-8 sm:w-8 text-muted-foreground"
            aria-label="Refresh dashboard"
          >
            <RotateCw className={`size-4 sm:size-3.5 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        }
        filters={
          <div className="flex items-center gap-2 w-full">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 sm:h-8 px-3 gap-2 text-xs font-medium flex-1 sm:flex-none sm:min-w-[150px] justify-between bg-background/70 border-border/70">
                  <span className="flex items-center gap-2 min-w-0">
                    <Calendar className="size-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">{preset}</span>
                  </span>
                  <ChevronDown className="size-3 text-muted-foreground/70 shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-44">
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

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 sm:h-8 px-3 gap-2 text-xs font-medium flex-1 sm:flex-none sm:min-w-[150px] justify-between bg-background/70 border-border/70">
                  <span className="flex items-center gap-2 min-w-0">
                    <UserIcon className="size-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">{selectedUserLabel}</span>
                  </span>
                  <ChevronDown className="size-3 text-muted-foreground/70 shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 max-h-64 overflow-y-auto">
                <DropdownMenuItem
                  onClick={() => setSelectedUser(null)}
                  className="text-xs font-medium cursor-pointer"
                >
                  All Users
                </DropdownMenuItem>
                {users
                  .filter((u) => u.name && (u.full_name || u.first_name))
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
        }
      />

      <PageContainer className="[&>div]:p-3 sm:[&>div]:p-6 [&>div]:space-y-4 sm:[&>div]:space-y-6">
        {isLoading ? (
          <div
            className="grid grid-cols-2 gap-2.5 sm:gap-3 sm:grid-cols-4 lg:grid-cols-7"
            aria-busy="true"
            aria-label="Loading dashboard"
          >
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className="h-[104px] animate-pulse rounded-xl border border-border/70 bg-card p-3"
              >
                <div className="h-2.5 w-2/3 rounded-full bg-muted" />
                <div className="mt-5 h-6 w-1/2 rounded-full bg-muted" />
                <div className="mt-4 h-4 w-10 rounded-md bg-muted/60 ml-auto" />
              </div>
            ))}
          </div>
        ) : !hasWidgetData ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/40 px-6 py-20 text-center">
            <div className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <Layers className="size-6" />
            </div>
            <h2 className="mt-4 text-sm font-semibold text-foreground">
              No dashboard data for this selection
            </h2>
            <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
              Try a wider date range or switch back to all users to see your CRM overview.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPreset("Last 30 Days");
                setSelectedUser(null);
              }}
              className="mt-4 h-8 text-xs"
            >
              Reset filters
            </Button>
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            {numberWidgets.length > 0 && (
              <div className="-mx-3 px-3 sm:mx-0 sm:px-0">
                <div className="flex gap-2.5 overflow-x-auto pb-1 sm:pb-0 sm:grid sm:grid-cols-4 lg:grid-cols-7 sm:gap-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory">
                  {numberWidgets.map((w) => (
                    <div key={w.name} className="min-w-[152px] sm:min-w-0 snap-start">
                      <DashboardKpiCard
                        data={w.data as unknown as DashboardNumberChartData}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Charts Grid */}
            <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
              {salesTrendWidget?.data && (
                <DashboardTrendChart
                  data={salesTrendWidget.data as unknown as DashboardAxisChartData}
                />
              )}

              {forecastedRevenueWidget?.data && (
                <DashboardTrendChart
                  data={forecastedRevenueWidget.data as unknown as DashboardAxisChartData}
                />
              )}

              {funnelWidget?.data && (
                <DashboardFunnelChart
                  data={funnelWidget.data as unknown as DashboardAxisChartData}
                />
              )}

              {dealsByStageWidget?.data && (
                <DashboardDonutChart
                  data={dealsByStageWidget.data as unknown as DashboardDonutChartData}
                />
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
        <div className="pt-2 sm:pt-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Quick access
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-2.5 lg:grid-cols-8">
            <div
              title="Leads (Temporarily Disabled)"
              aria-disabled="true"
              className="flex items-center gap-2.5 rounded-lg border border-border/50 bg-muted/20 px-3 py-2.5 text-xs font-medium text-muted-foreground/70 cursor-not-allowed select-none"
            >
              <Target className="size-4 shrink-0 opacity-60" />
              <span className="truncate">Leads</span>
            </div>
            {[
              { to: "/deals", label: "Deals", icon: Layers },
              { to: "/contacts", label: "Contacts", icon: Users },
              { to: "/organizations", label: "Organizations", icon: Building2 },
              { to: "/quotations", label: "Quotations", icon: FileText },
              { to: "/sales-orders", label: "Sales Orders", icon: ShoppingCart },
              { to: "/notes", label: "Notes", icon: StickyNote },
              { to: "/calls", label: "Call Logs", icon: PhoneCall },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className="group flex items-center gap-2.5 rounded-lg border border-border/60 bg-card px-3 py-2.5 text-xs font-medium text-foreground/90 transition-colors hover:bg-muted/40 hover:border-border"
                >
                  <Icon className="size-4 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </PageContainer>
    </Page>
  );
}

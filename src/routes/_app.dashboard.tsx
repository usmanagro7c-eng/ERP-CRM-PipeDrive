import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  Target,
  Columns3,
  FileText,
  ShoppingCart,
  Users,
  Building2,
  CheckCircle2,
  ArrowRight,
  Plus,
  ArrowUpRight,
  DollarSign,
  Activity,
  Layers,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { dealListOptions, dealStatusesOptions } from "@/hooks/use-deals";
import { leadListOptions } from "@/hooks/use-leads";
import { quotationListOptions } from "@/hooks/use-quotations";
import { salesOrderListOptions } from "@/hooks/use-sales-orders";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "CRM Dashboard · AgroCRM" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const { data: deals = [] } = useQuery(
    dealListOptions({ search: "", filters: [], limit: 100, start: 0 }),
  );
  const { data: stages = [] } = useQuery(dealStatusesOptions());
  const { data: leads = [] } = useQuery(
    leadListOptions({ search: "", filters: [], limit: 100, start: 0 }),
  );
  const { data: quotations = [] } = useQuery(
    quotationListOptions({ search: "", filters: [], limit: 100, start: 0 }),
  );
  const { data: salesOrders = [] } = useQuery(
    salesOrderListOptions({ search: "", filters: [], limit: 100, start: 0 }),
  );

  // Compute KPI metrics
  const pipelineMetrics = useMemo(() => {
    let activePipelineValue = 0;
    let wonValue = 0;
    let wonCount = 0;
    let lostCount = 0;

    for (const d of deals) {
      const val = Number(d["deal_value"]) || 0;
      const status = String(d["status"] || "").toLowerCase();
      if (status === "won") {
        wonValue += val;
        wonCount++;
      } else if (status === "lost") {
        lostCount++;
      } else {
        activePipelineValue += val;
      }
    }

    const totalClosed = wonCount + lostCount;
    const winRate = totalClosed > 0 ? Math.round((wonCount / totalClosed) * 100) : 0;

    const quotationsValue = quotations.reduce(
      (sum, q) => sum + (Number(q.grand_total) || 0),
      0,
    );
    const ordersValue = salesOrders.reduce(
      (sum, o) => sum + (Number(o.grand_total) || 0),
      0,
    );

    return {
      activePipelineValue,
      wonValue,
      wonCount,
      winRate,
      quotationsValue,
      ordersValue,
    };
  }, [deals, quotations, salesOrders]);

  // Stage distribution
  const stageStats = useMemo(() => {
    return stages.map((st) => {
      const stageDeals = deals.filter((d) => d["status"] === st.name);
      const totalAmount = stageDeals.reduce(
        (sum, d) => sum + (Number(d["deal_value"]) || 0),
        0,
      );
      return {
        name: st.name,
        count: stageDeals.length,
        totalAmount,
      };
    });
  }, [deals, stages]);

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Sales Dashboard</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Real-time pipeline overview, revenue targets, conversion metrics, and key transactions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="outline" className="h-9 gap-1.5 text-xs font-semibold">
            <Link to="/leads">
              <Plus className="size-3.5" />
              <span>New Lead</span>
            </Link>
          </Button>
          <Button asChild size="sm" className="h-9 gap-1.5 text-xs font-semibold">
            <Link to="/deals">
              <Columns3 className="size-3.5" />
              <span>Pipeline Kanban</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Pipeline */}
        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Active Pipeline
            </CardTitle>
            <div className="flex size-7 items-center justify-center rounded-md bg-blue-500/10 text-blue-600">
              <TrendingUp className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-foreground">
              PKR {pipelineMetrics.activePipelineValue.toLocaleString()}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              <span>{deals.length - pipelineMetrics.wonCount} active deals in sales stages</span>
            </p>
          </CardContent>
        </Card>

        {/* Won Revenue */}
        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Won Revenue
            </CardTitle>
            <div className="flex size-7 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-emerald-600">
              PKR {pipelineMetrics.wonValue.toLocaleString()}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              <span>{pipelineMetrics.wonCount} won deals • {pipelineMetrics.winRate}% win rate</span>
            </p>
          </CardContent>
        </Card>

        {/* Active Quotations */}
        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Quotations Total
            </CardTitle>
            <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
              <FileText className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-foreground">
              PKR {pipelineMetrics.quotationsValue.toLocaleString()}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              <span>{quotations.length} total client quotations generated</span>
            </p>
          </CardContent>
        </Card>

        {/* Confirmed Orders */}
        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Sales Orders
            </CardTitle>
            <div className="flex size-7 items-center justify-center rounded-md bg-purple-500/10 text-purple-600">
              <ShoppingCart className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-foreground">
              PKR {pipelineMetrics.ordersValue.toLocaleString()}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              <span>{salesOrders.length} confirmed orders in ERPNext</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Stage Breakdown & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stage Funnel / Distribution */}
        <Card className="lg:col-span-2 shadow-xs">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Deal Pipeline by Stage</CardTitle>
                <CardDescription className="text-xs">
                  Distribution of opportunities across active sales pipeline stages
                </CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm" className="h-8 text-xs gap-1">
                <Link to="/deals">
                  <span>View Board</span>
                  <ArrowRight className="size-3" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {stageStats.map((st) => {
              const maxCount = Math.max(1, ...stageStats.map((s) => s.count));
              const pct = Math.round((st.count / maxCount) * 100);

              return (
                <div key={st.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold">{st.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground font-mono">
                        PKR {st.totalAmount.toLocaleString()}
                      </span>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                        {st.count} {st.count === 1 ? "deal" : "deals"}
                      </Badge>
                    </div>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-300"
                      style={{ width: `${Math.max(5, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Quick Launch & CRM Summary */}
        <div className="flex flex-col gap-4">
          <Card className="shadow-xs flex-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Quick Launch</CardTitle>
              <CardDescription className="text-xs">
                Jump directly to core CRM operations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button asChild variant="outline" className="w-full justify-between h-9 text-xs">
                <Link to="/leads">
                  <div className="flex items-center gap-2">
                    <Target className="size-4 text-primary" />
                    <span>Manage Leads</span>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    {leads.length}
                  </Badge>
                </Link>
              </Button>

              <Button asChild variant="outline" className="w-full justify-between h-9 text-xs">
                <Link to="/deals">
                  <div className="flex items-center gap-2">
                    <Columns3 className="size-4 text-primary" />
                    <span>Sales Pipeline</span>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    {deals.length}
                  </Badge>
                </Link>
              </Button>

              <Button asChild variant="outline" className="w-full justify-between h-9 text-xs">
                <Link to="/quotations">
                  <div className="flex items-center gap-2">
                    <FileText className="size-4 text-primary" />
                    <span>Price Quotations</span>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    {quotations.length}
                  </Badge>
                </Link>
              </Button>

              <Button asChild variant="outline" className="w-full justify-between h-9 text-xs">
                <Link to="/sales-orders">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="size-4 text-primary" />
                    <span>Sales Orders</span>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    {salesOrders.length}
                  </Badge>
                </Link>
              </Button>

              <Button asChild variant="outline" className="w-full justify-between h-9 text-xs">
                <Link to="/activities">
                  <div className="flex items-center gap-2">
                    <Activity className="size-4 text-primary" />
                    <span>Tasks & Activities</span>
                  </div>
                  <ArrowUpRight className="size-3.5 text-muted-foreground" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

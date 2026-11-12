import { queryOptions, useQuery } from "@tanstack/react-query";
import {
  format,
  subDays,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfYear,
  startOfQuarter,
} from "date-fns";

import {
  getCrmDashboard,
  getCrmUsers,
  type DashboardFilter,
  type DashboardWidget,
  type CrmUser,
} from "@/lib/api";

export type DateRangePreset =
  | "Today"
  | "Yesterday"
  | "Last 7 Days"
  | "Last 30 Days"
  | "This Month"
  | "Last Month"
  | "This Quarter"
  | "This Year";

export function getDateRangeFromPreset(preset: DateRangePreset): {
  from_date: string;
  to_date: string;
} {
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");

  switch (preset) {
    case "Today":
      return { from_date: todayStr, to_date: todayStr };
    case "Yesterday": {
      const y = subDays(today, 1);
      const yStr = format(y, "yyyy-MM-dd");
      return { from_date: yStr, to_date: yStr };
    }
    case "Last 7 Days": {
      const from = subDays(today, 7);
      return { from_date: format(from, "yyyy-MM-dd"), to_date: todayStr };
    }
    case "Last 30 Days": {
      const from = subDays(today, 30);
      return { from_date: format(from, "yyyy-MM-dd"), to_date: todayStr };
    }
    case "This Month": {
      const from = startOfMonth(today);
      return { from_date: format(from, "yyyy-MM-dd"), to_date: todayStr };
    }
    case "Last Month": {
      const prevMonth = subMonths(today, 1);
      const from = startOfMonth(prevMonth);
      const to = endOfMonth(prevMonth);
      return { from_date: format(from, "yyyy-MM-dd"), to_date: format(to, "yyyy-MM-dd") };
    }
    case "This Quarter": {
      const from = startOfQuarter(today);
      return { from_date: format(from, "yyyy-MM-dd"), to_date: todayStr };
    }
    case "This Year": {
      const from = startOfYear(today);
      return { from_date: format(from, "yyyy-MM-dd"), to_date: todayStr };
    }
    default: {
      const from = subDays(today, 30);
      return { from_date: format(from, "yyyy-MM-dd"), to_date: todayStr };
    }
  }
}

export function dashboardQueryOptions(filter: DashboardFilter) {
  return queryOptions<DashboardWidget[]>({
    queryKey: ["crm-dashboard", filter.from_date, filter.to_date, filter.user ?? "all"],
    queryFn: () => getCrmDashboard(filter),
    staleTime: 60 * 1000,
  });
}

export function crmUsersQueryOptions() {
  return queryOptions<CrmUser[]>({
    queryKey: ["crm-users"],
    queryFn: () => getCrmUsers(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useDashboard(filter: DashboardFilter) {
  return useQuery(dashboardQueryOptions(filter));
}

export function useCrmUsers() {
  return useQuery(crmUsersQueryOptions());
}

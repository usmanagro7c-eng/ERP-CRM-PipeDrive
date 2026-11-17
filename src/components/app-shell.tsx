import { useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Bell,
  Building2,
  CalendarClock,
  ChevronDown,
  Columns3,
  Download,
  FileText,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  PhoneCall,
  Search,
  Settings,
  ShoppingCart,
  StickyNote,
  Sun,
  Target,
  User,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Kbd } from "@/components/ui/kbd";
import { CommandPalette } from "@/components/command-palette";
import { MobileQuickActionFab } from "@/components/mobile-quick-action-fab";
import { OfflineStatusBar } from "@/components/offline-status-bar";
import { SESSION_QUERY_KEY, logout, sessionQueryOptions } from "@/lib/auth-client";
import { toggleTheme as toggleThemeMode } from "@/lib/theme";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  to: string;
  icon: typeof LayoutDashboard;
  disabled?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Leads", to: "/leads", icon: Target, disabled: true },
  { label: "Deals", to: "/deals", icon: Columns3 },
  { label: "Quotations", to: "/quotations", icon: FileText },
  { label: "Sales Orders", to: "/sales-orders", icon: ShoppingCart },
  { label: "Organizations", to: "/organizations", icon: Building2 },
  { label: "Contacts", to: "/contacts", icon: Users },
  { label: "Notes", to: "/notes", icon: StickyNote },
  { label: "Tasks", to: "/activities", icon: CalendarClock },
  { label: "Call Logs", to: "/calls", icon: PhoneCall },
  { label: "Settings", to: "/settings", icon: Settings },
];

/**
 * The mock backend serves fake records. When the dev server runs against it the
 * whole UI is flagged, so nobody mistakes seeded data for live CRM data.
 */
const IS_TEST_DATA = import.meta.env["VITE_TEST_DATA"] === "1";

function TestDataBadge({ collapsed }: { collapsed?: boolean }) {
  if (!IS_TEST_DATA) return null;
  return (
    <div
      role="status"
      className={cn(
        "flex items-center gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[11px] font-semibold text-amber-800 dark:text-amber-300",
        collapsed && "justify-center px-1",
      )}
      title="This dev server is connected to the mock Frappe backend. The records below are generated test data, not live CRM data."
    >
      <AlertTriangle className="size-3 shrink-0" />
      {!collapsed && <span className="truncate">TEST DATA · mock backend</span>}
    </div>
  );
}

function NavLinks({
  collapsed,
  onItemClick,
  grouped,
}: {
  collapsed?: boolean;
  onItemClick?: () => void;
  grouped?: boolean;
}) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  const groups = grouped
    ? [
        {
          label: "Overview",
          items: NAV_ITEMS.filter((i) => ["/dashboard"].includes(i.to)),
        },
        {
          label: "Sales",
          items: NAV_ITEMS.filter((i) =>
            ["/leads", "/deals", "/quotations", "/sales-orders"].includes(i.to),
          ),
        },
        {
          label: "Contacts",
          items: NAV_ITEMS.filter((i) => ["/organizations", "/contacts"].includes(i.to)),
        },
        {
          label: "Activity",
          items: NAV_ITEMS.filter((i) =>
            ["/notes", "/activities", "/calls"].includes(i.to),
          ),
        },
        {
          label: "System",
          items: NAV_ITEMS.filter((i) => ["/settings"].includes(i.to)),
        },
      ]
    : [{ label: "", items: NAV_ITEMS }];

  const renderItem = (item: NavItem) => {
    if (item.disabled) {
      return (
        <div
          key={item.to}
          title={collapsed ? `${item.label} (Coming Soon)` : "Coming Soon"}
          aria-disabled="true"
          className={cn(
            "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-sidebar-foreground/30 opacity-50 cursor-not-allowed select-none",
            collapsed ? "justify-center px-2" : "",
          )}
        >
          <item.icon className="size-[18px] shrink-0 opacity-40" />
          {!collapsed && (
            <div className="flex flex-1 items-center justify-between min-w-0">
              <span className="truncate">{item.label}</span>
              <span className="text-[10px] text-sidebar-foreground/40 bg-sidebar-accent/50 px-1.5 py-0.5 rounded-md font-medium">
                Soon
              </span>
            </div>
          )}
        </div>
      );
    }

    const active =
      item.to === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.to);

    return (
      <Link
        key={item.to}
        to={item.to}
        title={collapsed ? item.label : undefined}
        onClick={onItemClick}
        className={cn(
          "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-150 cursor-pointer",
          collapsed ? "justify-center px-2" : "",
          active
            ? "bg-sidebar-primary/10 text-sidebar-primary font-semibold shadow-sm"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        )}
      >
        {/* Active indicator */}
        {active && !collapsed && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-sidebar-primary" />
        )}
        <item.icon
          className={cn(
            "size-[18px] shrink-0 transition-transform duration-150",
            active ? "text-sidebar-primary" : "opacity-80 group-hover:opacity-100",
          )}
        />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </Link>
    );
  };

  if (!grouped) {
    return (
      <div className="flex flex-col gap-0.5 px-2">
        {NAV_ITEMS.map((item) => renderItem(item))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 px-3">
      {groups
        .filter((g) => g.items.length > 0)
        .map((group) => (
          <div key={group.label} className="flex flex-col gap-1">
            {group.label && (
              <span className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                {group.label}
              </span>
            )}
            {group.items.map((item) => renderItem(item))}
          </div>
        ))}
    </div>
  );
}

function WorkspaceSwitcher({ collapsed }: { collapsed?: boolean }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: session } = useQuery(sessionQueryOptions());
  const name = session?.name || (session?.user ? session.user.split("@")[0] : "User");
  const email = session?.user || "";

  const [isDark, setIsDark] = useState(() => {
    if (typeof document !== "undefined") {
      return document.documentElement.classList.contains("dark");
    }
    return false;
  });

  function toggleTheme() {
    setIsDark(toggleThemeMode() === "dark");
  }

  async function signOut() {
    await logout();
    queryClient.setQueryData(SESSION_QUERY_KEY, null);
    queryClient.clear();
    await navigate({ to: "/login" });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center gap-3 w-full rounded-lg p-2.5 text-left hover:bg-sidebar-accent transition-colors cursor-pointer group",
            collapsed && "justify-center p-2",
          )}
        >
          {/* User avatar */}
          <div className="flex size-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground shrink-0 text-xs font-bold shadow-sm">
            {(name ?? "User").slice(0, 2).toUpperCase()}
          </div>

          {!collapsed && (
            <div className="flex flex-1 items-center justify-between min-w-0">
              <div className="min-w-0 leading-tight">
                <div className="text-[13px] font-semibold text-sidebar-foreground truncate">{name}</div>
                <div className="text-[11px] text-sidebar-foreground/60 truncate">{email}</div>
              </div>
              <ChevronDown className="size-3.5 text-sidebar-foreground/50 ml-2 shrink-0 group-hover:text-sidebar-foreground/70 transition-colors" />
            </div>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56 text-xs">
        <DropdownMenuLabel className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-bold shrink-0">
            {(name ?? "User").slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-foreground truncate">{name}</div>
            <div className="font-normal text-[11px] text-muted-foreground truncate">{email}</div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={toggleTheme} className="cursor-pointer gap-2">
          {isDark ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
          <span>{isDark ? "Light mode" : "Dark mode"}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/settings" className="cursor-pointer gap-2 flex items-center">
            <Settings className="size-3.5" />
            <span>Settings</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => void signOut()}
          className="cursor-pointer gap-2 text-destructive"
        >
          <LogOut className="size-3.5" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  // Mobile bottom nav — 4 pinned + More sheet
  const MOBILE_NAV = [
    { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
    { label: "Deals", to: "/deals", icon: Columns3 },
    { label: "Contacts", to: "/contacts", icon: Users },
    { label: "Quotations", to: "/quotations", icon: FileText },
  ] as const;

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden text-foreground">
      {/* ── Desktop Sidebar ──────────────────────────────────────── */}
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-all duration-200 md:flex",
          collapsed ? "w-16" : "w-64",
        )}
      >
        {/* Workspace Switcher Header */}
        <div className="px-3 pt-4 pb-2">
          <WorkspaceSwitcher collapsed={collapsed} />
        </div>

        <div className="px-3 pb-2">
          <TestDataBadge collapsed={collapsed} />
        </div>

        {/* Quick Actions */}
        <div className="px-3 py-2 space-y-1">
          <button
            type="button"
            onClick={() => setCommandOpen(true)}
            title={collapsed ? "Search (Ctrl+K)" : undefined}
            className={cn(
              "flex items-center gap-2.5 w-full rounded-lg px-3 py-2 text-[13px] font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-150 cursor-pointer",
              collapsed && "justify-center px-2",
            )}
          >
            <Search className="size-[18px] shrink-0" />
            {!collapsed && (
              <div className="flex flex-1 items-center justify-between">
                <span>Search</span>
                <Kbd>Ctrl K</Kbd>
              </div>
            )}
          </button>

          <button
            type="button"
            title={collapsed ? "Notifications" : undefined}
            className={cn(
              "flex items-center gap-2.5 w-full rounded-lg px-3 py-2 text-[13px] font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-150 cursor-pointer",
              collapsed && "justify-center px-2",
            )}
          >
            <Bell className="size-[18px] shrink-0" />
            {!collapsed && <span>Notifications</span>}
          </button>
        </div>

        <div className="h-px bg-sidebar-border mx-3 my-2" />

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto scrollbar-none py-1" aria-label="Main">
          <NavLinks collapsed={collapsed} grouped />
        </nav>

        {/* Sidebar Footer */}
        <div className="border-t border-sidebar-border p-3 space-y-1 shrink-0">
          <button
            type="button"
            title={collapsed ? "Help" : undefined}
            className={cn(
              "flex items-center gap-2.5 w-full rounded-lg px-3 py-2 text-[13px] font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-150 cursor-pointer",
              collapsed && "justify-center px-2",
            )}
          >
            <HelpCircle className="size-[18px] shrink-0" />
            {!collapsed && <span>Help</span>}
          </button>

          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "flex items-center gap-2.5 w-full rounded-lg px-3 py-2 text-[13px] font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-150 cursor-pointer",
              collapsed && "justify-center px-2",
            )}
          >
            {collapsed ? (
              <PanelLeftOpen className="size-[18px] shrink-0" />
            ) : (
              <>
                <PanelLeftClose className="size-[18px] shrink-0" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* ── Main Content ─────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col h-screen overflow-hidden">
        {/* Mobile Header */}
        <header className="sticky top-0 z-20 flex md:hidden items-center justify-between border-b border-border bg-background/95 backdrop-blur px-3 py-2 shrink-0 safe-top">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <svg className="size-4 fill-current" viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="text-sm font-bold tracking-tight">AgroCRM</span>
            <TestDataBadge />
          </div>

          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCommandOpen(true)}
              className="size-9 text-muted-foreground"
              aria-label="Search"
            >
              <Search className="size-[18px]" />
            </Button>
          </div>
        </header>

        {/* Offline Status & Outbox Bar */}
        <OfflineStatusBar />

        {/* Page Content */}
        <main className="min-w-0 flex-1 h-full overflow-hidden flex flex-col">{children}</main>

        {/* Mobile Quick Action Floating Action Button */}
        <MobileQuickActionFab />

        {/* ── Mobile Bottom Nav ───────────────────────────────────── */}
        <nav
          className="md:hidden shrink-0 border-t border-border bg-background/95 backdrop-blur safe-bottom"
          aria-label="Mobile navigation"
        >
          <div className="flex items-stretch justify-around px-1 py-0.5">
            {MOBILE_NAV.map((item) => {
              const active =
                item.to === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex flex-1 flex-col items-center justify-center gap-1 rounded-xl py-2 text-[10px] font-semibold transition-colors min-h-[52px]",
                    active
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "flex items-center justify-center rounded-lg p-1 transition-colors",
                      active ? "bg-primary/10" : "",
                    )}
                  >
                    <item.icon className="size-[22px]" />
                  </span>
                  <span>{item.label}</span>
                </Link>
              );
            })}

            {/* More Sheet */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  className="flex flex-1 flex-col items-center justify-center gap-1 rounded-xl py-2 text-[10px] font-semibold text-muted-foreground hover:text-foreground min-h-[52px]"
                  aria-label="More"
                >
                  <span className="flex items-center justify-center rounded-lg p-1">
                    <Menu className="size-[22px]" />
                  </span>
                  <span>More</span>
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[85vh] p-0 flex flex-col rounded-t-2xl">
                {/* Handle bar */}
                <div className="flex justify-center pt-2.5 pb-1 shrink-0">
                  <div className="h-1 w-10 rounded-full bg-muted-foreground/25" />
                </div>
                <SheetHeader className="px-4 pb-3 border-b border-border shrink-0">
                  <SheetTitle className="sr-only">All navigation</SheetTitle>
                  <WorkspaceSwitcher />
                </SheetHeader>
                <nav className="flex-1 overflow-y-auto py-4">
                  <NavLinks onItemClick={() => setMobileOpen(false)} grouped />

                  {/* PWA Install Entry in Mobile Menu */}
                  <div className="px-4 pt-4 mt-4 border-t border-border/50">
                    <button
                      type="button"
                      onClick={() => {
                        setMobileOpen(false);
                        localStorage.removeItem("agrocrm.pwa.prompt_dismissed_until");
                        window.location.reload();
                      }}
                      className="flex items-center gap-2.5 w-full rounded-xl bg-primary/10 border border-primary/20 p-3 text-left text-xs font-semibold text-primary transition-colors cursor-pointer"
                    >
                      <Download className="size-4 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div>Install App on Phone</div>
                        <div className="text-[10px] text-muted-foreground font-normal">
                          Full-screen app mode, zero browser bars
                        </div>
                      </div>
                    </button>
                  </div>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </nav>
      </div>

      {/* Global Command Palette */}
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </div>
  );
}

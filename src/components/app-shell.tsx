import { useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Building2,
  CalendarClock,
  ChevronDown,
  Columns3,
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Kbd } from "@/components/ui/kbd";
import { CommandPalette } from "@/components/command-palette";
import { SESSION_QUERY_KEY, logout, sessionQueryOptions } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Leads", to: "/leads", icon: Target },
  { label: "Deals", to: "/deals", icon: Columns3 },
  { label: "Quotations", to: "/quotations", icon: FileText },
  { label: "Sales Orders", to: "/sales-orders", icon: ShoppingCart },
  { label: "Organizations", to: "/organizations", icon: Building2 },
  { label: "Contacts", to: "/contacts", icon: Users },
  { label: "Notes", to: "/notes", icon: StickyNote },
  { label: "Tasks", to: "/activities", icon: CalendarClock },
  { label: "Call Logs", to: "/calls", icon: PhoneCall },
] as const;

function NavLinks({
  collapsed,
  onItemClick,
}: {
  collapsed?: boolean;
  onItemClick?: () => void;
}) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <div className="flex flex-col gap-0.5 px-2">
      {NAV_ITEMS.map((item) => {
        const active =
          item.to === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.to);

        return (
          <Link
            key={item.to}
            to={item.to}
            title={collapsed ? item.label : undefined}
            onClick={onItemClick}
            className={cn(
              "group relative flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-150 cursor-pointer active:scale-[0.98]",
              collapsed ? "justify-center px-1.5" : "",
              active
                ? "bg-neutral-200/90 dark:bg-neutral-800 text-foreground font-semibold shadow-2xs"
                : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
            )}
          >
            <item.icon
              className={cn(
                "size-4 shrink-0 transition-transform duration-150 group-hover:scale-110",
                active ? "opacity-100 text-foreground" : "opacity-75",
              )}
            />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </Link>
        );
      })}
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
    if (typeof document !== "undefined") {
      const isCurrentlyDark = document.documentElement.classList.toggle("dark");
      setIsDark(isCurrentlyDark);
    }
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
            "flex items-center gap-2.5 w-full rounded-md p-2 text-left hover:bg-muted/60 transition-colors cursor-pointer",
            collapsed && "justify-center p-1.5",
          )}
        >
          {/* Brand Icon */}
          <div className="flex size-7 items-center justify-center rounded-lg bg-pink-600 text-white shrink-0 shadow-xs">
            <svg
              className="size-4 fill-current"
              viewBox="0 0 24 24"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>

          {!collapsed && (
            <div className="flex flex-1 items-center justify-between min-w-0">
              <div className="min-w-0 leading-tight">
                <div className="text-xs font-semibold text-foreground truncate">CRM</div>
                <div className="text-[11px] text-muted-foreground truncate">{name}</div>
              </div>
              <ChevronDown className="size-3 text-muted-foreground opacity-60 ml-1 shrink-0" />
            </div>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56 text-xs">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="font-semibold text-foreground truncate">{name}</span>
          <span className="font-normal text-[11px] text-muted-foreground truncate">{email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={toggleTheme} className="cursor-pointer gap-2">
          {isDark ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
          <span>{isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => void signOut()} className="cursor-pointer gap-2 text-destructive">
          <LogOut className="size-3.5" />
          <span>Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden text-foreground">
      {/* Desktop Sidebar Matching Frappe CRM */}
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-border bg-[#fafafa] dark:bg-[#141416] transition-all duration-200 md:flex",
          collapsed ? "w-14" : "w-56",
        )}
      >
        {/* Workspace Switcher Header */}
        <div className="px-2 pt-2.5 pb-1">
          <WorkspaceSwitcher collapsed={collapsed} />
        </div>

        {/* Quick Actions (Search & Notifications) */}
        <div className="px-2 py-1 space-y-0.5">
          <button
            type="button"
            onClick={() => setCommandOpen(true)}
            title={collapsed ? "Search (Ctrl+K)" : undefined}
            className={cn(
              "flex items-center gap-2 w-full rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors cursor-pointer",
              collapsed && "justify-center px-1.5",
            )}
          >
            <Search className="size-3.5 shrink-0 opacity-80" />
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
              "flex items-center gap-2 w-full rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors cursor-pointer",
              collapsed && "justify-center px-1.5",
            )}
          >
            <Bell className="size-3.5 shrink-0 opacity-80" />
            {!collapsed && <span>Notifications</span>}
          </button>
        </div>

        <div className="h-px bg-border/60 mx-3 my-1.5" />

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto scrollbar-none py-1" aria-label="Main">
          <NavLinks collapsed={collapsed} />
        </nav>

        {/* Sidebar Footer with Help and Collapse */}
        <div className="border-t border-border/60 p-2 space-y-0.5 shrink-0">
          <button
            type="button"
            title={collapsed ? "Help" : undefined}
            className={cn(
              "flex items-center gap-2.5 w-full rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors cursor-pointer",
              collapsed && "justify-center px-1.5",
            )}
          >
            <HelpCircle className="size-3.5 shrink-0 opacity-80" />
            {!collapsed && <span>Help</span>}
          </button>

          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "flex items-center gap-2.5 w-full rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors cursor-pointer",
              collapsed && "justify-center px-1.5",
            )}
          >
            {collapsed ? (
              <PanelLeftOpen className="size-3.5 shrink-0" />
            ) : (
              <>
                <PanelLeftClose className="size-3.5 shrink-0" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Main App Content Area */}
      <div className="flex min-w-0 flex-1 flex-col h-screen overflow-hidden">
        {/* Mobile Header (Only visible on screens < md) */}
        <header className="sticky top-0 z-20 flex md:hidden items-center justify-between border-b border-border bg-background px-4 py-2 shrink-0">
          <div className="flex items-center gap-2">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8">
                  <Menu className="size-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64 flex flex-col bg-[#fafafa] dark:bg-[#141416]">
                <SheetHeader className="p-3 border-b border-border">
                  <SheetTitle className="sr-only">Navigation</SheetTitle>
                  <WorkspaceSwitcher />
                </SheetHeader>
                <nav className="flex-1 overflow-y-auto py-3">
                  <NavLinks onItemClick={() => setMobileOpen(false)} />
                </nav>
              </SheetContent>
            </Sheet>

            <div className="flex items-center gap-1.5">
              <div className="flex size-6 items-center justify-center rounded-md bg-pink-600 text-white font-bold text-xs">
                C
              </div>
              <span className="text-xs font-semibold">AgroCRM</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCommandOpen(true)}
              className="size-8 text-muted-foreground"
            >
              <Search className="size-4" />
            </Button>
          </div>
        </header>

        {/* Page Children (Starts directly at page top without redundant desktop header) */}
        <main className="min-w-0 flex-1 h-full overflow-hidden flex flex-col">{children}</main>
      </div>

      {/* Global Command Palette Dialog */}
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </div>
  );
}

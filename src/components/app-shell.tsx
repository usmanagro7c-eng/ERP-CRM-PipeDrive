import { useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  CalendarClock,
  Columns3,
  FileText,
  LayoutDashboard,
  Leaf,
  PanelLeftClose,
  PanelLeftOpen,
  PhoneCall,
  Search,
  ShoppingCart,
  StickyNote,
  Target,
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
  { label: "Activities", to: "/activities", icon: CalendarClock },
  { label: "Notes", to: "/notes", icon: StickyNote },
  { label: "Call Logs", to: "/calls", icon: PhoneCall },
] as const;

function NavLinks({
  vertical,
  collapsed,
}: {
  vertical?: boolean;
  collapsed?: boolean;
}) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  return (
    <>
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
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              vertical ? "" : "shrink-0",
              collapsed && "justify-center px-2",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            )}
          >
            <item.icon className="size-4 shrink-0" />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </Link>
        );
      })}
    </>
  );
}

function CommandSearchTrigger({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex items-center justify-between w-full max-w-[180px] sm:max-w-md h-9 px-3 text-xs rounded-full border bg-card text-muted-foreground hover:bg-accent/40 hover:text-foreground transition-colors cursor-pointer"
      aria-label="Open global search (Ctrl+K)"
    >
      <div className="flex items-center gap-2 truncate">
        <Search className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate">Search CRM or modules...</span>
      </div>
      <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground shrink-0">
        <span className="text-xs">Ctrl</span> K
      </kbd>
    </button>
  );
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.map((part) => part.charAt(0).toUpperCase()).join("") || "?";
}

function UserMenu() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: session } = useQuery(sessionQueryOptions());
  const name = session?.name ?? "";

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
          className="flex size-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-ring cursor-pointer"
          aria-label="Account menu"
        >
          {initialsOf(name)}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 text-xs">
        <DropdownMenuLabel className="truncate">{name || "Signed in"}</DropdownMenuLabel>
        {session?.user && session.user !== name && (
          <p className="truncate px-2 pb-1.5 text-xs text-muted-foreground">{session.user}</p>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void signOut()} className="cursor-pointer">
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);

  return (
    <div className="min-h-screen w-full bg-background">
      <div className="flex min-h-screen w-full">
        {/* Desktop Sidebar */}
        <aside
          className={cn(
            "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-all duration-200 md:flex",
            collapsed ? "w-16" : "w-60",
          )}
        >
          {/* Logo & Brand */}
          <div className={cn("flex items-center gap-2.5 px-4 py-5", collapsed && "justify-center px-2")}>
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
              <Leaf className="size-5" />
            </span>
            {!collapsed && (
              <span className="font-display text-lg font-semibold tracking-tight text-foreground truncate">
                AgroCRM
              </span>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-1 flex-col gap-1 px-3 overflow-y-auto" aria-label="Main">
            <NavLinks vertical collapsed={collapsed} />
          </nav>

          {/* Sidebar Footer with Collapse Toggle */}
          <div className="border-t border-sidebar-border p-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCollapsed(!collapsed)}
              className={cn(
                "w-full text-xs text-muted-foreground hover:text-foreground justify-start gap-2 h-9",
                collapsed && "justify-center px-0",
              )}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? (
                <PanelLeftOpen className="size-4 shrink-0" />
              ) : (
                <>
                  <PanelLeftClose className="size-4 shrink-0" />
                  <span>Collapse</span>
                </>
              )}
            </Button>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex items-center gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur md:px-6">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground md:hidden shadow-xs">
              <Leaf className="size-5" />
            </span>
            <CommandSearchTrigger onClick={() => setCommandOpen(true)} />
            <div className="flex-1" />
            <UserMenu />
          </header>

          {/* Mobile Navigation Bar */}
          <nav
            className="flex gap-1 overflow-x-auto border-b bg-background px-4 py-2 md:hidden scrollbar-none"
            aria-label="Main mobile"
          >
            <NavLinks />
          </nav>

          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>

      {/* Global Command Palette Dialog */}
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </div>
  );
}

export function ModulePlaceholder({ module }: { module: string }) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-4 py-24 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
        <Building2 className="size-7" />
      </span>
      <h1 className="font-display text-2xl font-semibold">{module} is coming soon</h1>
      <p className="text-sm text-muted-foreground">
        {module} will plug into the Frappe CRM backend and metadata-driven architecture.
      </p>
      <Button asChild size="sm">
        <Link to="/leads">Go to Leads</Link>
      </Button>
    </div>
  );
}

import { useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, CalendarClock, Columns3, Leaf, Search, Target, Users } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SESSION_QUERY_KEY, logout, sessionQueryOptions } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Leads", to: "/leads", icon: Target },
  { label: "Deals", to: "/deals", icon: Columns3 },
  { label: "Organizations", to: "/organizations", icon: Building2, functional: true },
  { label: "Contacts", to: "/contacts", icon: Users },
  { label: "Activities", to: "/activities", icon: CalendarClock },
] as const;

function NavLinks({ vertical }: { vertical?: boolean }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  return (
    <>
      {NAV_ITEMS.map((item) => {
        const active = pathname.startsWith(item.to);
        return (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              vertical ? "" : "shrink-0",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            )}
          >
            <item.icon className="size-4 shrink-0" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </>
  );
}

function GlobalSearch() {
  const navigate = useNavigate();
  const [term, setTerm] = useState("");
  return (
    <form
      className="relative w-full max-w-md"
      onSubmit={(event) => {
        event.preventDefault();
        void navigate({ to: "/organizations", search: term ? { q: term } : {} });
      }}
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={term}
        onChange={(event) => setTerm(event.target.value)}
        placeholder="Search organizations…"
        className="pl-9 rounded-full bg-card"
        aria-label="Search organizations"
      />
    </form>
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
          className="flex size-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-ring"
          aria-label="Account menu"
        >
          {initialsOf(name)}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate">{name || "Signed in"}</DropdownMenuLabel>
        {session?.user && session.user !== name && (
          <p className="truncate px-2 pb-1.5 text-xs text-muted-foreground">{session.user}</p>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void signOut()}>Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-background">
      <div className="flex min-h-screen w-full">
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
          <div className="flex items-center gap-2 px-5 py-5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Leaf className="size-5" />
            </span>
            <span className="font-display text-lg font-semibold tracking-tight text-foreground">
              AgroCRM
            </span>
          </div>
          <nav className="flex flex-1 flex-col gap-1 px-3" aria-label="Main">
            <NavLinks vertical />
          </nav>
          <div className="px-5 py-4 text-xs text-muted-foreground">Connected to Frappe CRM</div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex items-center gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur md:px-6">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground md:hidden">
              <Leaf className="size-5" />
            </span>
            <GlobalSearch />
            <div className="flex-1" />
            <UserMenu />
          </header>
          <nav
            className="flex gap-1 overflow-x-auto border-b bg-background px-4 py-2 md:hidden"
            aria-label="Main mobile"
          >
            <NavLinks />
          </nav>
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
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
        The Organizations module is fully live. {module} will plug into the same Frappe backend and
        metadata-driven design.
      </p>
      <Button asChild>
        <Link to="/organizations">Go to Organizations</Link>
      </Button>
    </div>
  );
}

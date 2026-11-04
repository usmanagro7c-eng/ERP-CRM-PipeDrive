import { useEffect } from "react";
import { Outlet, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { AppShell } from "@/components/app-shell";
import { AppLoadingScreen } from "@/components/ui/loading";
import { sessionQueryOptions } from "@/lib/auth-client";

/**
 * Pathless layout for every signed-in page. The data itself is protected server-side
 * (the proxy rejects requests without a valid session); this gate just sends visitors to /login.
 */
export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const navigate = useNavigate();
  const { data: session, isPending, isError } = useQuery(sessionQueryOptions());

  useEffect(() => {
    if (!isPending && !session) void navigate({ to: "/login" });
  }, [isPending, session, navigate]);

  if (isPending || (!session && !isError)) {
    return <AppLoadingScreen message="Checking authorization & workspace session..." />;
  }
  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 text-center text-sm text-muted-foreground">
        Could not check your session. Please refresh the page.
      </div>
    );
  }
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

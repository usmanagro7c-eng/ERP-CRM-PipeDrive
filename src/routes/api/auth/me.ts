import { createFileRoute } from "@tanstack/react-router";

import { getSession, jsonResponse } from "@/lib/server-auth";

export const Route = createFileRoute("/api/auth/me")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const session = await getSession(request);
        if (!session) return jsonResponse({ error: "Not authenticated" }, 401);
        return jsonResponse({ user: session.u, name: session.n });
      },
    },
  },
});

import { createFileRoute } from "@tanstack/react-router";

import { jsonResponse } from "@/lib/server-auth";
import { clearSessionCookie, isSameOrigin, isSecureRequest } from "@/lib/session";

export const Route = createFileRoute("/api/auth/logout")({
  server: {
    handlers: {
      POST: ({ request }) => {
        if (!isSameOrigin(request))
          return jsonResponse({ error: "Cross-site request blocked" }, 403);
        return jsonResponse({ ok: true }, 200, {
          "Set-Cookie": clearSessionCookie(isSecureRequest(request)),
        });
      },
    },
  },
});
